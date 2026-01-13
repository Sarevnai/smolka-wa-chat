import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface AIBehaviorConfig {
  reengagement_hours: number;
  send_cold_leads: boolean;
  essential_questions: Array<{
    id: string;
    question: string;
    enabled: boolean;
  }>;
}

interface LeadToReengage {
  id: string;
  phone_number: string;
  conversation_id: string | null;
  portal_lead_id: string | null;
  reengagement_attempts: number;
  detected_interest: string | null;
  detected_property_type: string | null;
  detected_neighborhood: string | null;
}

/**
 * Busca a configuração de comportamento da IA
 */
async function getAIBehaviorConfig(): Promise<AIBehaviorConfig | null> {
  const { data, error } = await supabase
    .from('ai_behavior_config')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    console.error('Error fetching AI behavior config:', error);
    return null;
  }

  return {
    reengagement_hours: data.reengagement_hours ?? 6,
    send_cold_leads: data.send_cold_leads ?? false,
    essential_questions: (data.essential_questions as AIBehaviorConfig['essential_questions']) || [],
  };
}

/**
 * Busca leads que precisam de reengajamento
 */
async function getLeadsNeedingReengagement(reengagementHours: number): Promise<LeadToReengage[]> {
  const cutoffTime = new Date(Date.now() - reengagementHours * 60 * 60 * 1000).toISOString();
  
  const { data, error } = await supabase
    .from('lead_qualification')
    .select('*')
    .eq('needs_reengagement', true)
    .eq('qualification_status', 'qualifying')
    .lt('reengagement_attempts', 3)
    .lt('last_interaction_at', cutoffTime)
    .order('last_interaction_at', { ascending: true })
    .limit(50);

  if (error) {
    console.error('Error fetching leads for reengagement:', error);
    return [];
  }

  return data as LeadToReengage[];
}

/**
 * Busca dados do lead do portal (se existir)
 */
async function getPortalLeadData(portalLeadId: string | null): Promise<{
  propertyInfo: string | null;
  contactName: string | null;
} | null> {
  if (!portalLeadId) return null;

  const { data, error } = await supabase
    .from('portal_leads_log')
    .select('contact_name, origin_listing_id, message, transaction_type')
    .eq('id', portalLeadId)
    .maybeSingle();

  if (error || !data) return null;

  let propertyInfo = '';
  if (data.transaction_type === 'SELL') {
    propertyInfo = 'comprar um imóvel';
  } else if (data.transaction_type === 'RENT') {
    propertyInfo = 'alugar um imóvel';
  }

  if (data.origin_listing_id) {
    propertyInfo += ` (código ${data.origin_listing_id})`;
  }

  return {
    propertyInfo: propertyInfo || null,
    contactName: data.contact_name,
  };
}

/**
 * Gera mensagem de reengajamento personalizada
 */
function generateReengagementMessage(
  attempt: number,
  contactName: string | null,
  propertyInfo: string | null,
  interest: string | null
): string {
  const name = contactName ? `, ${contactName}` : '';
  
  const messages = {
    1: [
      `Oi${name}! 👋 Vi que você estava interessado${propertyInfo ? ` em ${propertyInfo}` : ' em imóveis'}. Posso te ajudar com mais informações?`,
      `Olá${name}! 😊 Lembrei de você! Ainda está buscando${interest === 'locacao' ? ' um imóvel para alugar' : interest === 'compra' ? ' um imóvel para comprar' : ' imóveis'}?`,
      `Oi${name}! Tudo bem? 🏠 Só passando para ver se ainda posso te ajudar com sua busca de imóveis!`,
    ],
    2: [
      `Oi${name}! Apareceram algumas opções novas que podem te interessar. Quer dar uma olhada? 🏡`,
      `Olá${name}! Só um lembrete amigável 😊 Ainda estou aqui para te ajudar a encontrar o imóvel ideal!`,
      `Oi${name}! Temos novidades que podem combinar com o que você busca. Posso te mostrar?`,
    ],
    3: [
      `Oi${name}! Última tentativa de contato 😅 Se mudar de ideia, é só me chamar aqui!`,
      `Olá${name}! Se ainda estiver buscando imóveis, estou à disposição. Qualquer dúvida, me chama!`,
    ],
  };

  const attemptMessages = messages[attempt as keyof typeof messages] || messages[3];
  const randomIndex = Math.floor(Math.random() * attemptMessages.length);
  
  return attemptMessages[randomIndex];
}

/**
 * Envia mensagem via WhatsApp
 */
async function sendReengagementMessage(phoneNumber: string, message: string): Promise<boolean> {
  try {
    const { error } = await supabase.functions.invoke('send-wa-message', {
      body: { to: phoneNumber, text: message }
    });

    if (error) {
      console.error(`Error sending message to ${phoneNumber}:`, error);
      return false;
    }

    console.log(`✅ Reengagement message sent to ${phoneNumber}`);
    return true;
  } catch (error) {
    console.error(`Error sending message to ${phoneNumber}:`, error);
    return false;
  }
}

/**
 * Atualiza o registro de qualificação após tentativa de reengajamento
 */
async function updateLeadAfterReengagement(
  leadId: string,
  success: boolean,
  attempt: number
): Promise<void> {
  const now = new Date().toISOString();
  
  const updateData: Record<string, unknown> = {
    reengagement_attempts: attempt,
    last_reengagement_at: now,
    updated_at: now,
  };

  // Se for a 3ª tentativa sem resposta, marcar como frio
  if (attempt >= 3) {
    updateData.needs_reengagement = false;
    updateData.qualification_status = 'cold';
    updateData.disqualification_reason = 'sem_resposta';
    updateData.completed_at = now;
    console.log(`❄️ Lead ${leadId} marked as cold after ${attempt} attempts`);
  }

  await supabase
    .from('lead_qualification')
    .update(updateData)
    .eq('id', leadId);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 AI Reengagement job started');

    // Buscar configuração
    const config = await getAIBehaviorConfig();
    if (!config) {
      console.log('⚠️ No AI behavior config found, using defaults');
    }

    const reengagementHours = config?.reengagement_hours ?? 6;
    console.log(`⏰ Looking for leads inactive for ${reengagementHours}+ hours`);

    // Buscar leads para reengajar
    const leads = await getLeadsNeedingReengagement(reengagementHours);
    console.log(`📋 Found ${leads.length} leads to reengage`);

    if (leads.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No leads to reengage', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let successCount = 0;
    let failCount = 0;

    for (const lead of leads) {
      const nextAttempt = lead.reengagement_attempts + 1;
      
      // Buscar dados adicionais do portal
      const portalData = await getPortalLeadData(lead.portal_lead_id);
      
      // Buscar nome do contato se não tiver nos dados do portal
      let contactName = portalData?.contactName || null;
      if (!contactName) {
        const { data: contact } = await supabase
          .from('contacts')
          .select('name')
          .eq('phone', lead.phone_number)
          .maybeSingle();
        contactName = contact?.name || null;
      }

      // Gerar mensagem personalizada
      const message = generateReengagementMessage(
        nextAttempt,
        contactName,
        portalData?.propertyInfo || null,
        lead.detected_interest
      );

      // Enviar mensagem
      const sent = await sendReengagementMessage(lead.phone_number, message);
      
      // Atualizar registro
      await updateLeadAfterReengagement(lead.id, sent, nextAttempt);

      if (sent) {
        successCount++;
      } else {
        failCount++;
      }

      // Pequeno delay entre mensagens para não sobrecarregar
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`✅ Reengagement completed: ${successCount} sent, ${failCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: leads.length,
        sent: successCount,
        failed: failCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Reengagement error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
