import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// ========== PHONE VARIATION UTILITIES ==========

/**
 * Remove all non-digit characters from phone number
 */
function normalizePhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Generate all possible phone number variations for Brazilian numbers
 * Handles:
 * - With/without country code (55)
 * - With/without the 9th digit after DDD
 * 
 * Examples:
 * - Input: "5548988182882" (13 digits, with 9)
 *   → ["5548988182882", "554888182882"] (also without 9)
 * 
 * - Input: "554888182882" (12 digits, without 9)
 *   → ["554888182882", "5548988182882"] (also with 9)
 * 
 * - Input: "48988182882" (11 digits, local with 9)
 *   → ["48988182882", "5548988182882", "4888182882", "554888182882"]
 */
function buildPhoneVariations(inputPhone: string): string[] {
  const normalized = normalizePhoneNumber(inputPhone);
  const variations = new Set<string>();
  
  // Always add the normalized input
  variations.add(normalized);
  
  // If starts with 55 (country code)
  if (normalized.startsWith('55')) {
    const withoutCountry = normalized.slice(2);
    variations.add(withoutCountry);
    
    // 13 digits with 55 = has the 9 digit (55 + 2 DDD + 9 + 8 number)
    if (normalized.length === 13) {
      // Remove the 9 after DDD: 55 XX 9 XXXXXXXX → 55 XX XXXXXXXX
      const without9 = normalized.slice(0, 4) + normalized.slice(5);
      variations.add(without9);
      variations.add(without9.slice(2)); // Also without country code
    }
    
    // 12 digits with 55 = doesn't have the 9 digit (55 + 2 DDD + 8 number)
    if (normalized.length === 12) {
      // Add the 9 after DDD: 55 XX XXXXXXXX → 55 XX 9 XXXXXXXX
      const with9 = normalized.slice(0, 4) + '9' + normalized.slice(4);
      variations.add(with9);
      variations.add(with9.slice(2)); // Also without country code
    }
  } else {
    // Doesn't start with 55, assume local number
    // Add with country code
    variations.add('55' + normalized);
    
    // 11 digits local = has the 9 digit (2 DDD + 9 + 8 number)
    if (normalized.length === 11) {
      // Remove the 9: XX 9 XXXXXXXX → XX XXXXXXXX
      const without9 = normalized.slice(0, 2) + normalized.slice(3);
      variations.add(without9);
      variations.add('55' + without9);
    }
    
    // 10 digits local = doesn't have the 9 digit (2 DDD + 8 number)
    if (normalized.length === 10) {
      // Add the 9: XX XXXXXXXX → XX 9 XXXXXXXX
      const with9 = normalized.slice(0, 2) + '9' + normalized.slice(2);
      variations.add(with9);
      variations.add('55' + with9);
    }
  }
  
  return Array.from(variations);
}

// ========== MAIN HANDLER ==========

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Auth check
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

    // Build all phone variations to search
    const phoneVariations = buildPhoneVariations(phone_number);
    console.log('🔍 Searching for phone variations:', phoneVariations);

    const deletedCounts: Record<string, number> = {};
    const matchedRecords: Record<string, number> = {};

    // 1. Get ALL contact IDs matching any variation
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, phone')
      .in('phone', phoneVariations);

    const contactIds = contacts?.map(c => c.id) || [];
    matchedRecords.contacts = contacts?.length || 0;
    console.log(`📋 Found ${contactIds.length} contacts:`, contacts?.map(c => c.phone));

    // 2. Get ALL conversation IDs matching any variation
    const { data: conversations } = await supabase
      .from('conversations')
      .select('id, phone_number')
      .in('phone_number', phoneVariations);

    const conversationIds = conversations?.map(c => c.id) || [];
    matchedRecords.conversations = conversations?.length || 0;
    console.log(`📋 Found ${conversationIds.length} conversations:`, conversations?.map(c => c.phone_number));

    // 3. Delete messages by conversation_id
    if (conversationIds.length > 0) {
      const { count: msgByConv } = await supabase
        .from('messages')
        .delete({ count: 'exact' })
        .in('conversation_id', conversationIds);
      deletedCounts.messages_by_conversation = msgByConv || 0;
    }

    // 4. Delete messages by phone (wa_from and wa_to)
    const { count: msgFrom } = await supabase
      .from('messages')
      .delete({ count: 'exact' })
      .in('wa_from', phoneVariations);
    
    const { count: msgTo } = await supabase
      .from('messages')
      .delete({ count: 'exact' })
      .in('wa_to', phoneVariations);
    
    deletedCounts.messages = (deletedCounts.messages_by_conversation || 0) + (msgFrom || 0) + (msgTo || 0);
    delete deletedCounts.messages_by_conversation;

    // 5. Delete lead_qualification
    const { count: qualCount } = await supabase
      .from('lead_qualification')
      .delete({ count: 'exact' })
      .in('phone_number', phoneVariations);
    deletedCounts.lead_qualification = qualCount || 0;

    // 6. Delete conversation_states
    const { count: stateCount } = await supabase
      .from('conversation_states')
      .delete({ count: 'exact' })
      .in('phone_number', phoneVariations);
    deletedCounts.conversation_states = stateCount || 0;

    // 7. Delete ai_suggestions
    const { count: suggestCount } = await supabase
      .from('ai_suggestions')
      .delete({ count: 'exact' })
      .in('contact_phone', phoneVariations);
    deletedCounts.ai_suggestions = suggestCount || 0;

    // 8. Delete records by contact_id (if contacts found)
    if (contactIds.length > 0) {
      // c2s_integration
      const { count: c2sCount } = await supabase
        .from('c2s_integration')
        .delete({ count: 'exact' })
        .in('contact_id', contactIds);
      deletedCounts.c2s_integration = c2sCount || 0;

      // contact_tag_assignments
      const { count: tagCount } = await supabase
        .from('contact_tag_assignments')
        .delete({ count: 'exact' })
        .in('contact_id', contactIds);
      deletedCounts.contact_tag_assignments = tagCount || 0;

      // contact_departments
      const { count: deptCount } = await supabase
        .from('contact_departments')
        .delete({ count: 'exact' })
        .in('contact_id', contactIds);
      deletedCounts.contact_departments = deptCount || 0;

      // contact_contracts
      const { count: contractCount } = await supabase
        .from('contact_contracts')
        .delete({ count: 'exact' })
        .in('contact_id', contactIds);
      deletedCounts.contact_contracts = contractCount || 0;

      // tickets
      const { count: ticketCount } = await supabase
        .from('tickets')
        .delete({ count: 'exact' })
        .in('contact_id', contactIds);
      deletedCounts.tickets = ticketCount || 0;

      // campaign_results
      const { count: campaignCount } = await supabase
        .from('campaign_results')
        .delete({ count: 'exact' })
        .in('contact_id', contactIds);
      deletedCounts.campaign_results = campaignCount || 0;
    }

    // 9. Delete conversations
    if (conversationIds.length > 0) {
      const { count: convCount } = await supabase
        .from('conversations')
        .delete({ count: 'exact' })
        .in('id', conversationIds);
      deletedCounts.conversations = convCount || 0;
    }

    // 10. Delete contacts
    if (contactIds.length > 0) {
      const { count: contactCount } = await supabase
        .from('contacts')
        .delete({ count: 'exact' })
        .in('id', contactIds);
      deletedCounts.contacts = contactCount || 0;
    }

    // Log activity
    if (userId) {
      await supabase.from('activity_logs').insert({
        user_id: userId,
        action_type: 'lead_deleted',
        target_table: 'contacts',
        target_id: contactIds[0] || phone_number,
        metadata: {
          phone_variations: phoneVariations,
          deleted_counts: deletedCounts,
          matched_records: matchedRecords
        }
      });
    }

    const totalDeleted = Object.values(deletedCounts).reduce((sum, count) => sum + (count || 0), 0);
    console.log('✅ Lead deletion complete:', {
      totalDeleted,
      deletedCounts,
      phoneVariations
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        deleted_counts: deletedCounts,
        phone_variations_checked: phoneVariations,
        matched_records: matchedRecords,
        total_deleted: totalDeleted
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
