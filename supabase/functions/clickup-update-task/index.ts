import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const priorityMap = {
  "critica": 1, // Urgent
  "alta": 2,    // High
  "media": 3,   // Normal
  "baixa": 4    // Low
};

// Removed status mapping to avoid "Status not found" errors
// ClickUp will use the existing status or default status

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ticketId, updates } = await req.json();
    
    if (!ticketId || !updates) {
      return new Response(
        JSON.stringify({ error: 'Missing ticketId or updates data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const clickupToken = Deno.env.get('CLICKUP_API_TOKEN');
    if (!clickupToken) {
      return new Response(
        JSON.stringify({ error: 'ClickUp API token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get ClickUp task ID from integration table
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: integration, error: fetchError } = await supabase
      .from('clickup_integration')
      .select('clickup_task_id, clickup_list_id')
      .eq('ticket_id', ticketId)
      .single();

    if (fetchError || !integration) {
      return new Response(
        JSON.stringify({ error: 'Integration record not found for ticket' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare update data for ClickUp
    const updateData: any = {};

    if (updates.title) {
      updateData.name = updates.title;
    }

    if (updates.description) {
      updateData.description = updates.description;
    }

    if (updates.priority) {
      updateData.priority = priorityMap[updates.priority as keyof typeof priorityMap];
    }

    // Skip status updates to avoid "Status not found" errors
    
    if (updates.assignedTo) {
      // Include assignedTo in description instead of custom field
      if (updateData.description) {
        updateData.description += `\n\n**Responsável:** ${updates.assignedTo}`;
      }
    }

    // Update task in ClickUp
    const clickupResponse = await fetch(`https://api.clickup.com/api/v2/task/${integration.clickup_task_id}`, {
      method: 'PUT',
      headers: {
        'Authorization': clickupToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });

    if (!clickupResponse.ok) {
      const errorData = await clickupResponse.text();
      console.error('ClickUp API Error:', errorData);
      
      // Update sync status to error
      await supabase
        .from('clickup_integration')
        .update({ 
          sync_status: 'error',
          error_message: `Failed to update ClickUp task: ${errorData}`,
          last_sync: new Date().toISOString()
        })
        .eq('ticket_id', ticketId);

      return new Response(
        JSON.stringify({ error: 'Failed to update ClickUp task', details: errorData }),
        { status: clickupResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const clickupTask = await clickupResponse.json();

    // Update sync status to synced
    const { error: dbError } = await supabase
      .from('clickup_integration')
      .update({ 
        sync_status: 'synced',
        error_message: null,
        last_sync: new Date().toISOString()
      })
      .eq('ticket_id', ticketId);

    if (dbError) {
      console.error('Database error updating sync status:', dbError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        clickup_task: clickupTask
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});