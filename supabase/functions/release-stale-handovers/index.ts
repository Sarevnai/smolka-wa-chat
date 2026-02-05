import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Release Stale Handovers
 * 
 * This edge function runs periodically (via cron or manual trigger) to find
 * conversations that were handed over to humans but haven't received a response
 * within the timeout period (default: 30 minutes).
 * 
 * It releases these conversations back to AI control to prevent users from
 * being stuck in a "dead zone" waiting for human response.
 */

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json().catch(() => ({}));
    const timeoutMinutes = body.timeout_minutes || 30;
    const dryRun = body.dry_run === true;

    console.log(`🔍 [release-stale-handovers] Starting check with ${timeoutMinutes}min timeout (dry_run: ${dryRun})`);

    const cutoffTime = new Date(Date.now() - timeoutMinutes * 60 * 1000).toISOString();
    console.log(`⏰ Cutoff time: ${cutoffTime}`);

    // Find conversations that:
    // 1. Have operator_takeover_at set (human took over)
    // 2. is_ai_active = false (AI is paused)
    // 3. No outbound messages from operator since takeover
    // 4. Takeover happened more than timeout_minutes ago
    const { data: staleHandovers, error: queryError } = await supabase
      .from('conversation_states')
      .select(`
        id,
        phone_number,
        operator_takeover_at,
        operator_id,
        is_ai_active,
        last_human_message_at,
        updated_at
      `)
      .eq('is_ai_active', false)
      .not('operator_takeover_at', 'is', null)
      .lt('operator_takeover_at', cutoffTime);

    if (queryError) {
      console.error('❌ Error querying stale handovers:', queryError);
      throw queryError;
    }

    console.log(`📊 Found ${staleHandovers?.length || 0} potentially stale handovers`);

    const releasedConversations: any[] = [];
    const skippedConversations: any[] = [];

    for (const handover of staleHandovers || []) {
      console.log(`\n🔍 Checking phone: ${handover.phone_number}`);
      console.log(`   Takeover at: ${handover.operator_takeover_at}`);
      
      // Check if operator has sent any messages since takeover
      const { data: operatorMessages, error: msgError } = await supabase
        .from('messages')
        .select('id, created_at, direction')
        .or(`wa_to.eq.${handover.phone_number},wa_from.eq.${handover.phone_number}`)
        .eq('direction', 'outbound')
        .gt('created_at', handover.operator_takeover_at)
        .limit(1);

      if (msgError) {
        console.error(`❌ Error checking messages for ${handover.phone_number}:`, msgError);
        continue;
      }

      const hasOperatorResponse = (operatorMessages?.length || 0) > 0;

      if (hasOperatorResponse) {
        console.log(`   ✅ Operator has responded, skipping`);
        skippedConversations.push({
          phone: handover.phone_number,
          reason: 'operator_responded',
          takeover_at: handover.operator_takeover_at
        });
        continue;
      }

      // Check if customer has sent any messages since takeover (indicating they're still waiting)
      const { data: customerMessages } = await supabase
        .from('messages')
        .select('id, created_at')
        .or(`wa_from.eq.${handover.phone_number}`)
        .eq('direction', 'inbound')
        .gt('created_at', handover.operator_takeover_at)
        .order('created_at', { ascending: false })
        .limit(1);

      const lastCustomerMessage = customerMessages?.[0];

      console.log(`   📱 Customer messages since takeover: ${customerMessages?.length || 0}`);
      console.log(`   🤖 Operator messages since takeover: ${operatorMessages?.length || 0}`);

      if (!dryRun) {
        // Release conversation back to AI
        const { error: updateError } = await supabase
          .from('conversation_states')
          .update({
            is_ai_active: true,
            operator_takeover_at: null,
            operator_id: null,
            updated_at: new Date().toISOString()
          })
          .eq('phone_number', handover.phone_number);

        if (updateError) {
          console.error(`❌ Error releasing ${handover.phone_number}:`, updateError);
          continue;
        }

        console.log(`   ✅ Released back to AI`);

        // Optionally notify the customer that AI is back
        if (lastCustomerMessage) {
          const timeSinceTakeover = Math.floor(
            (Date.now() - new Date(handover.operator_takeover_at).getTime()) / (1000 * 60)
          );

          console.log(`   ⏱️ Time since takeover: ${timeSinceTakeover} minutes`);

          // If customer sent a message while waiting, the AI will respond on next inbound
          // No need to send proactive message here
        }
      }

      releasedConversations.push({
        phone: handover.phone_number,
        takeover_at: handover.operator_takeover_at,
        operator_id: handover.operator_id,
        minutes_waiting: Math.floor(
          (Date.now() - new Date(handover.operator_takeover_at).getTime()) / (1000 * 60)
        ),
        had_customer_messages: (customerMessages?.length || 0) > 0
      });
    }

    const result = {
      success: true,
      dry_run: dryRun,
      timeout_minutes: timeoutMinutes,
      cutoff_time: cutoffTime,
      total_checked: staleHandovers?.length || 0,
      released: releasedConversations.length,
      skipped: skippedConversations.length,
      released_conversations: releasedConversations,
      skipped_conversations: skippedConversations
    };

    console.log(`\n📊 Summary:`);
    console.log(`   Total checked: ${result.total_checked}`);
    console.log(`   Released: ${result.released}`);
    console.log(`   Skipped: ${result.skipped}`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ release-stale-handovers error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
