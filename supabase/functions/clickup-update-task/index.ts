import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get ClickUp config from database (prefer DB token over env)
    const { data: config } = await supabase
      .from('clickup_config')
      .select('api_token')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const clickupToken = config?.api_token || Deno.env.get('CLICKUP_API_TOKEN');
    
    if (!clickupToken) {
      console.error('❌ No ClickUp token found');
      return new Response(
        JSON.stringify({ error: 'ClickUp API token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔑 Using token from:', config?.api_token ? 'database' : 'environment');

    // Get ClickUp task ID from integration table
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

    // Prepare simplified update data for ClickUp
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

    console.log('📤 Updating ClickUp task with data:', JSON.stringify(updateData, null, 2));

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
      console.error('❌ ClickUp API Error:', clickupResponse.status, errorData);
      
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
        JSON.stringify({ error: 'Failed to update ClickUp task', details: errorData, status: clickupResponse.status }),
        { status: clickupResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const clickupTask = await clickupResponse.json();
    console.log('✅ ClickUp task updated successfully:', integration.clickup_task_id);

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
