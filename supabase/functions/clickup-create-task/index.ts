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
  property: {
    code: string;
    address: string;
    type: "apartamento" | "casa" | "comercial" | "terreno";
  };
  assignedTo?: string;
  lastContact: string;
  source: string;
  type: "proprietario" | "inquilino";
  value?: number;
}

const priorityMap = {
  "critica": 1, // Urgent
  "alta": 2,    // High
  "media": 3,   // Normal
  "baixa": 4    // Low
};

// Removed status mapping to avoid "Status not found" errors
// ClickUp will use the default status of the list

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

    // Prepare simplified task data for ClickUp (avoiding custom field errors)
    const taskData = {
      name: ticket.title,
      description: `**Descrição:** ${ticket.description}

**Detalhes do Ticket:**
• **ID:** ${ticket.id}
• **Contato:** ${ticket.phone}${ticket.email ? ` | ${ticket.email}` : ''}
• **Tipo:** ${ticket.type}
• **Categoria:** ${ticket.category}
• **Prioridade:** ${ticket.priority}
• **Stage:** ${ticket.stage}
• **Último Contato:** ${ticket.lastContact}
• **Fonte:** ${ticket.source}

**Propriedade:**
• **Código:** ${ticket.property.code}
• **Endereço:** ${ticket.property.address}
• **Tipo:** ${ticket.property.type}

${ticket.value ? `**Valor:** R$ ${ticket.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''}
${ticket.assignedTo ? `**Responsável:** ${ticket.assignedTo}` : ''}`,
      priority: priorityMap[ticket.priority as keyof typeof priorityMap],
      tags: [ticket.category, ticket.type, ticket.property.type, ticket.stage].filter(Boolean)
    }

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

    // Store integration record in Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: dbError } = await supabase
      .from('clickup_integration')
      .insert({
        ticket_id: ticket.id,
        clickup_task_id: clickupTask.id,
        clickup_list_id: listId,
        sync_status: 'synced'
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