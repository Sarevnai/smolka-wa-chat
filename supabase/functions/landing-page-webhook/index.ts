import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LandingPageLead {
  name: string;
  phone: string;
  email?: string;
  development_slug: string;
  source?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  message?: string;
}

function normalizePhone(phone: string): string | null {
  if (!phone) return null;
  
  // Remove tudo que não é número
  const digits = phone.replace(/\D/g, '');
  
  // Se já começa com 55, retorna
  if (digits.startsWith('55') && digits.length >= 12) {
    return digits;
  }
  
  // Adiciona 55 se necessário
  if (digits.length >= 10 && digits.length <= 11) {
    return `55${digits}`;
  }
  
  return digits.length >= 10 ? digits : null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    // Validate method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract token from URL
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    // Fetch configured token (reuse the same token from portal webhook)
    const { data: tokenSetting } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_category', 'portais')
      .eq('setting_key', 'webhook_token')
      .maybeSingle();

    let savedToken = tokenSetting?.setting_value;
    if (typeof savedToken === 'string') {
      try {
        savedToken = JSON.parse(savedToken);
      } catch {
        // Keep as is if not valid JSON
      }
    }

    // Validate token
    if (!token || !savedToken || token !== savedToken) {
      console.error('Invalid or missing token');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse body
    const lead: LandingPageLead = await req.json();
    console.log('📥 Landing page lead received:', JSON.stringify(lead, null, 2));

    // Validate required fields
    if (!lead.phone || !lead.development_slug) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: phone, development_slug' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize phone
    const phone = normalizePhone(lead.phone);
    if (!phone) {
      return new Response(
        JSON.stringify({ error: 'Invalid phone number' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find development by slug
    const { data: development, error: devError } = await supabase
      .from('developments')
      .select('id, name, neighborhood')
      .eq('slug', lead.development_slug)
      .eq('is_active', true)
      .single();

    if (devError || !development) {
      console.error('Development not found:', lead.development_slug);
      return new Response(
        JSON.stringify({ error: `Development not found: ${lead.development_slug}` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🏗️ Development found: ${development.name}`);

    // Create or update contact
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id, name')
      .eq('phone', phone)
      .maybeSingle();

    let contactId: string;

    if (existingContact) {
      contactId = existingContact.id;
      
      // Update contact if name was not set
      if (!existingContact.name && lead.name) {
        await supabase
          .from('contacts')
          .update({ 
            name: lead.name,
            email: lead.email || undefined,
            notes: `Lead de landing page - ${development.name}`,
            department_code: 'vendas'
          })
          .eq('id', contactId);
      }
    } else {
      // Create new contact
      const { data: newContact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          phone,
          name: lead.name || null,
          email: lead.email || null,
          department_code: 'vendas',
          contact_type: 'lead',
          status: 'ativo',
          notes: `Lead de landing page - ${development.name}. ${lead.message || ''}`
        })
        .select('id')
        .single();

      if (contactError) {
        throw new Error(`Failed to create contact: ${contactError.message}`);
      }

      contactId = newContact.id;
    }

    // Create or get conversation
    const { data: existingConversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('phone_number', phone)
      .eq('status', 'active')
      .maybeSingle();

    let conversationId: string | null = existingConversation?.id || null;

    if (!existingConversation) {
      const { data: newConversation } = await supabase
        .from('conversations')
        .insert({
          phone_number: phone,
          contact_id: contactId,
          department_code: 'vendas',
          status: 'active'
        })
        .select('id')
        .single();

      conversationId = newConversation?.id || null;
    }

    // Create portal_leads_log entry with development_id
    const { data: portalLog, error: logError } = await supabase
      .from('portal_leads_log')
      .insert({
        portal_origin: lead.source || `landing_${lead.development_slug}`,
        lead_source_type: 'landing_page',
        development_id: development.id,
        contact_id: contactId,
        contact_name: lead.name,
        contact_phone: phone,
        contact_email: lead.email,
        message: lead.message,
        transaction_type: 'SELL',
        raw_payload: {
          ...lead,
          utm: {
            source: lead.utm_source,
            medium: lead.utm_medium,
            campaign: lead.utm_campaign,
            content: lead.utm_content
          }
        },
        processed_at: new Date().toISOString(),
        status: 'processed',
        hour_of_day: new Date().getHours(),
        day_of_week: new Date().getDay()
      })
      .select('id')
      .single();

    if (logError) {
      console.error('Error creating portal log:', logError);
    }

    // Create lead qualification entry
    if (portalLog?.id) {
      await supabase.from('lead_qualification').insert({
        phone_number: phone,
        conversation_id: conversationId,
        portal_lead_id: portalLog.id,
        qualification_status: 'pending',
        needs_reengagement: true,
        detected_interest: 'compra'
      });
    }

    console.log(`✅ Landing page lead processed: ${contactId} -> ${development.name}`);

    return new Response(
      JSON.stringify({
        success: true,
        contact_id: contactId,
        conversation_id: conversationId,
        development: {
          id: development.id,
          name: development.name
        },
        message: 'Lead processed successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error processing landing page lead:', error);
    
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
