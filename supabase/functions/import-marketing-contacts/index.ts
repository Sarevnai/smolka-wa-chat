import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContactToImport {
  phone: string;
  name?: string;
  email?: string;
  notes?: string;
  contact_type?: string;
}

interface ImportRequest {
  contacts: ContactToImport[];
  defaultContactType: string;
  tagIds?: string[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { contacts, defaultContactType, tagIds = [] }: ImportRequest = await req.json();

    console.log(`📥 Starting import of ${contacts.length} marketing contacts`);

    if (!contacts || contacts.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No contacts provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let inserted = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const contact of contacts) {
      try {
        console.log(`📝 Processing contact:`, { phone: contact.phone, hasName: !!contact.name, hasEmail: !!contact.email });
        
        // Check if contact exists
        const { data: existing } = await supabase
          .from('contacts')
          .select('id')
          .eq('phone', contact.phone)
          .maybeSingle();

        if (existing) {
          // Build update object - only include non-empty fields
          const updateData: Record<string, any> = {
            department_code: 'marketing',
            contact_type: defaultContactType,
            updated_at: new Date().toISOString(),
          };
          if (contact.name) updateData.name = contact.name;
          if (contact.email) updateData.email = contact.email;
          if (contact.notes) updateData.notes = contact.notes;

          const { error: updateError } = await supabase
            .from('contacts')
            .update(updateData)
            .eq('id', existing.id);

          if (updateError) throw updateError;

          // Assign tags
          if (tagIds.length > 0) {
            for (const tagId of tagIds) {
              const { error: tagError } = await supabase
                .from('contact_tag_assignments')
                .upsert(
                  { contact_id: existing.id, tag_id: tagId },
                  { onConflict: 'contact_id,tag_id', ignoreDuplicates: true }
                );
              if (tagError) console.warn(`⚠️ Tag assignment error for ${contact.phone}:`, tagError);
            }
          }

          updated++;
          console.log(`✅ Updated contact: ${contact.phone}`);
        } else {
          // Insert new contact
          const { data: newContact, error: insertError } = await supabase
            .from('contacts')
            .insert({
              phone: contact.phone,
              name: contact.name || null,
              email: contact.email || null,
              notes: contact.notes || null,
              department_code: 'marketing',
              contact_type: defaultContactType,
              status: 'ativo',
            })
            .select('id')
            .single();

          if (insertError) throw insertError;

          // Assign tags
          if (tagIds.length > 0 && newContact) {
            for (const tagId of tagIds) {
              const { error: tagError } = await supabase
                .from('contact_tag_assignments')
                .insert({ contact_id: newContact.id, tag_id: tagId });
              if (tagError) console.warn(`⚠️ Tag assignment error for new contact ${contact.phone}:`, tagError);
            }
          }

          inserted++;
          console.log(`✅ Inserted contact: ${contact.phone}`);
        }
      } catch (err: any) {
        console.error(`❌ Error processing ${contact.phone}:`, err);
        errors.push(`${contact.phone}: ${err.message}`);
      }
    }

    const result = {
      success: errors.length === 0,
      totalProcessed: contacts.length,
      inserted,
      updated,
      errors,
      summary: `${inserted} novos contatos criados, ${updated} atualizados.`,
    };

    console.log(`📊 Import complete:`, result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ Import error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
