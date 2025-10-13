import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TicketData {
  id: string;
  title: string;
  description: string;
  phone: string;
  email?: string;
  stage: string;
  category: string;
  priority: "baixa" | "media" | "alta" | "critica";
  assigned_to?: string;
  last_contact: string;
  source: string;
  contact_id?: string;
}

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
    const { ticket, listId } = await req.json();
    
    if (!ticket || !listId) {
      return new Response(
        JSON.stringify({ error: 'Missing ticket data or listId' }),
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

    console.log('🎟️ Ticket data received:', JSON.stringify(ticket, null, 2));
    console.log('📋 List ID:', listId);

    // Validate that the list exists in ClickUp
    const validateResponse = await fetch(`https://api.clickup.com/api/v2/list/${listId}`, {
      headers: {
        'Authorization': clickupToken
      }
    });

    if (!validateResponse.ok) {
      console.error('❌ Invalid ClickUp list:', listId);
      return new Response(
        JSON.stringify({ 
          error: `Lista ${listId} não encontrada no ClickUp. Verifique a configuração.` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Resolve assigned_to UUID to name if present
    let assignedName = null;
    if (ticket.assigned_to) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', ticket.assigned_to)
        .single();
      
      assignedName = profileData?.full_name || ticket.assigned_to;
      console.log('👤 Assigned to:', assignedName);
    }

    // Prepare comprehensive description with all ticket details
    const fullDescription = `**Descrição:** ${ticket.description}

**Detalhes do Contato:**
• Telefone: ${ticket.phone}
• Email: ${ticket.email || 'Não informado'}

**Outras Informações:**
• Último Contato: ${ticket.last_contact}
• Fonte: ${ticket.source}
• Categoria: ${ticket.category}
• Estágio: ${ticket.stage}
${assignedName ? `• Responsável: ${assignedName}` : ''}`;

    // Simplified task data to avoid ClickUp API errors
    const taskData = {
      name: ticket.title,
      description: fullDescription,
      priority: priorityMap[ticket.priority as keyof typeof priorityMap],
      tags: [ticket.category, ticket.stage, ticket.priority].filter(Boolean)
    };

    console.log('📤 Sending to ClickUp:', JSON.stringify(taskData, null, 2));

    // Create task in ClickUp
    const clickupResponse = await fetch(`https://api.clickup.com/api/v2/list/${listId}/task`, {
      method: 'POST',
      headers: {
        'Authorization': clickupToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(taskData)
    });

    if (!clickupResponse.ok) {
      const errorData = await clickupResponse.text();
      console.error('ClickUp API Error:', errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to create ClickUp task', details: errorData }),
        { status: clickupResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const clickupTask = await clickupResponse.json();
    console.log('✅ ClickUp task created successfully:', clickupTask.id);

    const { error: dbError } = await supabase
      .from('clickup_integration')
      .insert({
        ticket_id: ticket.id,
        clickup_task_id: clickupTask.id,
        clickup_list_id: listId,
        sync_status: 'synced',
        last_sync: new Date().toISOString()
      });

    if (dbError) {
      console.error('Database error:', dbError);
      // Task was created in ClickUp but failed to store in DB - log this
      return new Response(
        JSON.stringify({ 
          warning: 'Task created in ClickUp but failed to store tracking record',
          clickup_task: clickupTask,
          db_error: dbError
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        clickup_task: clickupTask,
        integration_id: clickupTask.id
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});