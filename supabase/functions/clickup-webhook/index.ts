import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Reverse mapping from ClickUp status to CRM status
const reverseStatusMap = {
  proprietario: {
    "open": "recebido",
    "in progress": "em-analise",
    "in review": "em-andamento", 
    "blocked": "aguardando",
    "complete": "resolvido"
  },
  inquilino: {
    "open": "recebido",
    "in progress": "triagem",
    "in review": "em-execucao",
    "blocked": "aguardando-pagamento", 
    "complete": "concluido"
  }
};

const reversePriorityMap = {
  1: "critica", // Urgent
  2: "alta",    // High
  3: "media",   // Normal
  4: "baixa"    // Low
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const webhookData = await req.json();
    console.log('ClickUp Webhook received:', JSON.stringify(webhookData, null, 2));

    // Validate webhook signature if needed
    // const signature = req.headers.get('X-Signature');
    
    const { event, task_id, history_items } = webhookData;
    
    if (!task_id || !event) {
      return new Response(
        JSON.stringify({ error: 'Invalid webhook data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get integration record to find corresponding ticket
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!; // Use service role for webhook
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: integration, error: fetchError } = await supabase
      .from('clickup_integration')
      .select('ticket_id, clickup_task_id')
      .eq('clickup_task_id', task_id)
      .single();

    if (fetchError || !integration) {
      console.log('Integration record not found for ClickUp task:', task_id);
      return new Response(
        JSON.stringify({ message: 'Task not tracked in CRM' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process different webhook events
    let shouldUpdateTicket = false;
    const ticketUpdates: any = {};

    switch (event) {
      case 'taskStatusUpdated':
        if (history_items && history_items.length > 0) {
          const statusChange = history_items.find((item: any) => item.field === 'status');
          if (statusChange && statusChange.after) {
            const newStatus = statusChange.after.status.toLowerCase();
            
            // We need to know the ticket type to map status correctly
            // For now, we'll try to determine from the list or fetch the ticket
            // This is a simplified approach - in practice you'd want to store ticket type in integration table
            
            // Try both mappings to find a match
            let newStage = null;
            if (reverseStatusMap.proprietario[newStatus as keyof typeof reverseStatusMap.proprietario]) {
              newStage = reverseStatusMap.proprietario[newStatus as keyof typeof reverseStatusMap.proprietario];
            } else if (reverseStatusMap.inquilino[newStatus as keyof typeof reverseStatusMap.inquilino]) {
              newStage = reverseStatusMap.inquilino[newStatus as keyof typeof reverseStatusMap.inquilino];
            }
            
            if (newStage) {
              ticketUpdates.stage = newStage;
              shouldUpdateTicket = true;
            }
          }
        }
        break;

      case 'taskPriorityUpdated':
        if (history_items && history_items.length > 0) {
          const priorityChange = history_items.find((item: any) => item.field === 'priority');
          if (priorityChange && priorityChange.after) {
            const newPriority = priorityChange.after.priority;
            const mappedPriority = reversePriorityMap[newPriority as keyof typeof reversePriorityMap];
            if (mappedPriority) {
              ticketUpdates.priority = mappedPriority;
              shouldUpdateTicket = true;
            }
          }
        }
        break;

      case 'taskUpdated':
      case 'taskCommentPosted':
        // For these events, you might want to add comments or notes to the CRM
        console.log(`Received ${event} for task ${task_id}`);
        break;

      default:
        console.log('Unhandled webhook event:', event);
    }

    // Update ticket in CRM if needed
    if (shouldUpdateTicket && Object.keys(ticketUpdates).length > 0) {
      console.log('Updating ticket in CRM:', integration.ticket_id, ticketUpdates);
      
      // Since we're using mock data, we can't actually update a database table for tickets
      // In a real implementation, you would update your tickets table here
      // For now, we'll just log the update and update the sync status
      
      const { error: syncError } = await supabase
        .from('clickup_integration')
        .update({ 
          sync_status: 'synced',
          last_sync: new Date().toISOString()
        })
        .eq('clickup_task_id', task_id);

      if (syncError) {
        console.error('Error updating sync status:', syncError);
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Webhook processed successfully',
        updated: shouldUpdateTicket,
        ticket_id: integration.ticket_id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});