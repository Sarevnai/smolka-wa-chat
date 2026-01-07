import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const priorityMap: Record<string, number> = {
  'baixa': 4,
  'media': 3,
  'alta': 2,
  'critica': 1
};

const statusMap: Record<string, string> = {
  'Pendente': 'to do',
  'Em Progresso': 'in progress', 
  'Concluído': 'complete'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ticketId, updates } = await req.json();
    
    if (!ticketId) {
      throw new Error('Ticket ID is required');
    }

    console.log('Updating ClickUp task for ticket:', ticketId, 'with updates:', updates);

    // Get Supabase credentials
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get ClickUp config from database (prefer DB token over env)
    const { data: config } = await supabase
      .from('clickup_config')
      .select('api_token')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const clickupApiToken = config?.api_token || Deno.env.get('CLICKUP_API_TOKEN');
    
    if (!clickupApiToken) {
      console.error('❌ No ClickUp token found');
      throw new Error('ClickUp API token not configured');
    }

    console.log('🔑 Using token from:', config?.api_token ? 'database' : 'environment');

    // Get ClickUp task ID from integration table
    const { data: integration, error: integrationError } = await supabase
      .from('clickup_integration')
      .select('clickup_task_id, clickup_list_id')
      .eq('ticket_id', ticketId)
      .single();

    if (integrationError || !integration?.clickup_task_id) {
      console.log('No ClickUp integration found for ticket:', ticketId);
      return new Response(
        JSON.stringify({ success: false, message: 'No ClickUp integration found' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // Prepare update data
    const updateData: any = {};
    
    if (updates.name) {
      updateData.name = updates.name;
    }
    
    if (updates.description) {
      updateData.description = updates.description;
    }
    
    if (updates.priority && priorityMap[updates.priority]) {
      updateData.priority = priorityMap[updates.priority];
    }

    if (updates.status && statusMap[updates.status]) {
      updateData.status = statusMap[updates.status];
    }

    // Handle stage updates (drag-and-drop scenarios) 
    if (updates.stage && statusMap[updates.stage]) {
      updateData.status = statusMap[updates.stage];
    }

    console.log('📤 Sending update to ClickUp:', updateData);

    // Update ClickUp task
    const clickupResponse = await fetch(`https://api.clickup.com/api/v2/task/${integration.clickup_task_id}`, {
      method: 'PUT',
      headers: {
        'Authorization': clickupApiToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });

    if (!clickupResponse.ok) {
      const errorText = await clickupResponse.text();
      console.error('❌ ClickUp API error:', clickupResponse.status, errorText);
      
      // Update sync status to error
      await supabase
        .from('clickup_integration')
        .update({ 
          sync_status: 'error',
          error_message: `ClickUp API error (${clickupResponse.status}): ${errorText}`,
          updated_at: new Date().toISOString()
        })
        .eq('ticket_id', ticketId);

      throw new Error(`ClickUp API error: ${clickupResponse.status} ${errorText}`);
    }

    // Update sync status to synced
    await supabase
      .from('clickup_integration')
      .update({ 
        sync_status: 'synced',
        last_sync: new Date().toISOString(),
        error_message: null,
        updated_at: new Date().toISOString()
      })
      .eq('ticket_id', ticketId);

    console.log('✅ ClickUp task updated successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'ClickUp task updated successfully',
        clickup_task_id: integration.clickup_task_id
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in clickup-update-task-status function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
