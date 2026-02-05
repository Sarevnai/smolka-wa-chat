import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PortalLead {
  leadOrigin: string;
  timestamp?: string;
  originLeadId?: string;
  originListingId?: string;
  clientListingId?: string;
  name: string;
  email?: string;
  ddd?: string;
  phone?: string;
  phoneNumber?: string;
  message?: string;
  temperature?: string;
  transactionType?: string;
}

function normalizePhone(ddd?: string, phone?: string, phoneNumber?: string): string | null {
  let rawPhone = phoneNumber || '';
  
  if (!rawPhone && ddd && phone) {
    rawPhone = `${ddd}${phone}`;
  }
  
  if (!rawPhone) return null;
  
  // Remove tudo que não é número
  const digits = rawPhone.replace(/\D/g, '');
  
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
    // Validar método
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extrair token da URL
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    // Buscar token configurado
    const { data: tokenSetting } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_category', 'portais')
      .eq('setting_key', 'webhook_token')
      .maybeSingle();

    // Parse token value - it's stored as JSON in setting_value
    let savedToken = tokenSetting?.setting_value;
    if (typeof savedToken === 'string') {
      try {
        savedToken = JSON.parse(savedToken);
      } catch {
        // Keep as is if not valid JSON
      }
    }

    // Validar token
    if (!token || !savedToken || token !== savedToken) {
      console.error('Invalid or missing token');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse do body
    const lead: PortalLead = await req.json();
    console.log('Received lead:', JSON.stringify(lead, null, 2));

    // Normalizar telefone
    const phone = normalizePhone(lead.ddd, lead.phone, lead.phoneNumber);

    if (!phone) {
      // Registrar log de erro
      await supabase.from('portal_leads_log').insert({
        portal_origin: lead.leadOrigin || 'unknown',
        origin_lead_id: lead.originLeadId,
        origin_listing_id: lead.originListingId,
        client_listing_id: lead.clientListingId,
        contact_name: lead.name,
        contact_email: lead.email,
        message: lead.message,
        temperature: lead.temperature,
        transaction_type: lead.transactionType,
        raw_payload: lead,
        status: 'error',
        error_message: 'Invalid phone number'
      });

      return new Response(
        JSON.stringify({ error: 'Invalid phone number' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar configurações
    const { data: settings } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value')
      .eq('setting_category', 'portais');

    const config: Record<string, string> = {};
    settings?.forEach(s => {
      config[s.setting_key] = s.setting_value as string;
    });

    // Determinar departamento baseado no tipo de transação
    let departmentCode = 'marketing';
    if (lead.transactionType === 'SELL' && config.sell_department) {
      departmentCode = config.sell_department;
    } else if (lead.transactionType === 'RENT' && config.rent_department) {
      departmentCode = config.rent_department;
    }

    // Criar ou atualizar contato
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id, name')
      .eq('phone', phone)
      .maybeSingle();

    let contactId: string;

    if (existingContact) {
      contactId = existingContact.id;
      // Atualizar nome se não existir
      if (!existingContact.name && lead.name) {
        await supabase
          .from('contacts')
          .update({ 
            name: lead.name,
            email: lead.email || undefined,
            notes: `Lead recebido do ${lead.leadOrigin || 'portal'}`
          })
          .eq('id', contactId);
      }
    } else {
      // Criar novo contato
      const { data: newContact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          phone,
          name: lead.name || null,
          email: lead.email || null,
          department_code: departmentCode as 'locacao' | 'administrativo' | 'vendas' | 'marketing',
          contact_type: 'lead',
          status: 'ativo',
          notes: `Lead recebido do ${lead.leadOrigin || 'portal'}. ${lead.message || ''}`
        })
        .select('id')
        .single();

      if (contactError) {
        throw new Error(`Failed to create contact: ${contactError.message}`);
      }

      contactId = newContact.id;
    }

    // Adicionar à lista padrão configurada
    if (config.default_list_id) {
      const { data: list } = await supabase
        .from('contact_groups')
        .select('contact_ids')
        .eq('id', config.default_list_id)
        .single();

      if (list) {
        const contactIds = list.contact_ids || [];
        if (!contactIds.includes(contactId)) {
          await supabase
            .from('contact_groups')
            .update({ 
              contact_ids: [...contactIds, contactId],
              updated_at: new Date().toISOString()
            })
            .eq('id', config.default_list_id);
        }
      }
    }

    // Criar conversa automaticamente se configurado
    if (config.auto_create_conversation === 'true') {
      const { data: existingConversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('phone_number', phone)
        .eq('status', 'open')
        .maybeSingle();

      if (!existingConversation) {
        await supabase.from('conversations').insert({
          phone_number: phone,
          contact_id: contactId,
          department_code: departmentCode as 'locacao' | 'administrativo' | 'vendas' | 'marketing',
          status: 'open'
        });
      }
    }

    // Registrar log de sucesso
    const { data: portalLog } = await supabase.from('portal_leads_log').insert({
      portal_origin: lead.leadOrigin || 'unknown',
      origin_lead_id: lead.originLeadId,
      origin_listing_id: lead.originListingId,
      client_listing_id: lead.clientListingId,
      contact_id: contactId,
      contact_name: lead.name,
      contact_phone: phone,
      contact_email: lead.email,
      message: lead.message,
      temperature: lead.temperature,
      transaction_type: lead.transactionType,
      raw_payload: lead,
      processed_at: new Date().toISOString(),
      status: 'processed',
      hour_of_day: new Date().getHours(),
      day_of_week: new Date().getDay()
    }).select('id').single();

    // Criar registro de qualificação para pré-atendimento da IA
    if (portalLog?.id) {
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('phone_number', phone)
        .eq('status', 'active')
        .maybeSingle();

      await supabase.from('lead_qualification').insert({
        phone_number: phone,
        conversation_id: existingConv?.id || null,
        portal_lead_id: portalLog.id,
        qualification_status: 'pending',
        needs_reengagement: true,
        detected_interest: lead.transactionType === 'SELL' ? 'compra' : lead.transactionType === 'RENT' ? 'locacao' : null,
      });

      // Atualizar portal_leads_log com o ID da qualificação
      const { data: qualData } = await supabase
        .from('lead_qualification')
        .select('id')
        .eq('portal_lead_id', portalLog.id)
        .maybeSingle();

      if (qualData?.id) {
        await supabase
          .from('portal_leads_log')
          .update({ qualification_id: qualData.id })
          .eq('id', portalLog.id);
      }
    }

    console.log('Lead processed successfully:', { contactId, phone, portal: lead.leadOrigin });

    return new Response(
      JSON.stringify({ 
        success: true, 
        contactId,
        message: 'Lead processed successfully' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing lead:', error);
    
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
