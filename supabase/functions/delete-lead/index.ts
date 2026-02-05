import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Auth check - optional for now, will be required in production
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
      
      if (user) {
        // Check if user has admin function
        const { data: userFunctions } = await supabase
          .from('user_functions')
          .select('function')
          .eq('user_id', user.id)
          .eq('function', 'admin');

        if (!userFunctions || userFunctions.length === 0) {
          return new Response(
            JSON.stringify({ success: false, error: 'Apenas administradores podem excluir leads' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    const { phone_number } = await req.json();
    
    if (!phone_number) {
      throw new Error('phone_number é obrigatório');
    }

    // Normalize phone number - remove non-digits
    const normalizedPhone = phone_number.replace(/\D/g, '');
    console.log('Deleting lead with phone:', normalizedPhone);

    const deletedCounts: Record<string, number> = {};

    // 1. Get contact ID first
    const { data: contact } = await supabase
      .from('contacts')
      .select('id')
      .eq('phone', normalizedPhone)
      .single();

    // 2. Get conversation ID
    const { data: conversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('phone_number', normalizedPhone)
      .single();

    // 3. Delete messages (by conversation_id or by phone)
    if (conversation) {
      const { count: msgCount } = await supabase
        .from('messages')
        .delete({ count: 'exact' })
        .eq('conversation_id', conversation.id);
      deletedCounts.messages = msgCount || 0;
    }

    // Also delete messages by phone number directly
    const { count: msgFromCount } = await supabase
      .from('messages')
      .delete({ count: 'exact' })
      .eq('wa_from', normalizedPhone);
    
    const { count: msgToCount } = await supabase
      .from('messages')
      .delete({ count: 'exact' })
      .eq('wa_to', normalizedPhone);
    
    deletedCounts.messages = (deletedCounts.messages || 0) + (msgFromCount || 0) + (msgToCount || 0);

    // 4. Delete lead_qualification
    const { count: qualCount } = await supabase
      .from('lead_qualification')
      .delete({ count: 'exact' })
      .eq('phone_number', normalizedPhone);
    deletedCounts.lead_qualification = qualCount || 0;

    // 5. Delete conversation_states
    const { count: stateCount } = await supabase
      .from('conversation_states')
      .delete({ count: 'exact' })
      .eq('phone_number', normalizedPhone);
    deletedCounts.conversation_states = stateCount || 0;

    // 6. Delete ai_suggestions
    const { count: suggestCount } = await supabase
      .from('ai_suggestions')
      .delete({ count: 'exact' })
      .eq('contact_phone', normalizedPhone);
    deletedCounts.ai_suggestions = suggestCount || 0;

    // 7. Delete c2s_integration (if contact exists)
    if (contact) {
      const { count: c2sCount } = await supabase
        .from('c2s_integration')
        .delete({ count: 'exact' })
        .eq('contact_id', contact.id);
      deletedCounts.c2s_integration = c2sCount || 0;

      // 8. Delete contact_tag_assignments
      const { count: tagCount } = await supabase
        .from('contact_tag_assignments')
        .delete({ count: 'exact' })
        .eq('contact_id', contact.id);
      deletedCounts.contact_tag_assignments = tagCount || 0;

      // 9. Delete contact_departments
      const { count: deptCount } = await supabase
        .from('contact_departments')
        .delete({ count: 'exact' })
        .eq('contact_id', contact.id);
      deletedCounts.contact_departments = deptCount || 0;

      // 10. Delete contact_contracts
      const { count: contractCount } = await supabase
        .from('contact_contracts')
        .delete({ count: 'exact' })
        .eq('contact_id', contact.id);
      deletedCounts.contact_contracts = contractCount || 0;

      // 11. Delete tickets (detach or delete)
      const { count: ticketCount } = await supabase
        .from('tickets')
        .delete({ count: 'exact' })
        .eq('contact_id', contact.id);
      deletedCounts.tickets = ticketCount || 0;

      // 12. Delete campaign_results
      const { count: campaignCount } = await supabase
        .from('campaign_results')
        .delete({ count: 'exact' })
        .eq('contact_id', contact.id);
      deletedCounts.campaign_results = campaignCount || 0;
    }

    // 13. Delete conversation
    if (conversation) {
      const { count: convCount } = await supabase
        .from('conversations')
        .delete({ count: 'exact' })
        .eq('id', conversation.id);
      deletedCounts.conversations = convCount || 0;
    }

    // 14. Finally delete contact
    if (contact) {
      const { count: contactCount } = await supabase
        .from('contacts')
        .delete({ count: 'exact' })
        .eq('id', contact.id);
      deletedCounts.contacts = contactCount || 0;
    }

    // Log activity (only if userId available)
    if (userId) {
      await supabase.from('activity_logs').insert({
        user_id: userId,
        action_type: 'lead_deleted',
        target_table: 'contacts',
        target_id: contact?.id || normalizedPhone,
        metadata: {
          phone_number: normalizedPhone,
          deleted_counts: deletedCounts
        }
      });
    }

    console.log('Lead deleted successfully:', deletedCounts);

    return new Response(
      JSON.stringify({ 
        success: true, 
        deleted_counts: deletedCounts,
        phone_number: normalizedPhone
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in delete-lead function:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
