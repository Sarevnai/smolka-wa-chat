import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// Shared modules (Execution Layer)
import { Development, ConversationMessage } from '../_shared/types.ts';
import { formatCurrency } from '../_shared/utils.ts';
import { buildQuickTransferPrompt, toolsQuickTransfer } from '../_shared/prompts.ts';
import { callLLM } from '../_shared/ai-call.ts';
import { sendWhatsAppMessage, sendWhatsAppMedia, saveAndSendMessage, delay } from '../_shared/whatsapp.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ========== DEVELOPMENT MATERIALS ==========

interface DevelopmentMaterial {
  id: string;
  material_type: string;
  title: string;
  description: string | null;
  file_url: string;
  file_type: string | null;
  whatsapp_media_id: string | null;
}

// ========== FULL MODE PROMPT (unique to ai-vendas) ==========

function buildEmpreendimentoPrompt(dev: Development): string {
  const unitTypesFormatted = dev.unit_types
    .map(u => `• ${u.tipo}: ${u.area}m² - A partir de ${formatCurrency(u.preco_de)}`)
    .join('\n');

  const differentialsFormatted = dev.differentials.map(d => `• ${d}`).join('\n');
  const amenitiesFormatted = dev.amenities.map(a => `• ${a}`).join('\n');
  const faqFormatted = dev.faq.map(f => `P: ${f.pergunta}\nR: ${f.resposta}`).join('\n\n');
  const talkingPointsFormatted = dev.talking_points.map(t => `• ${t}`).join('\n');

  return `Você é a Helena, consultora de vendas da Smolka Imóveis 🏠

OBJETIVO: Atender leads interessados no empreendimento ${dev.name} da ${dev.developer}.

📋 ${dev.name.toUpperCase()} - ${dev.developer.toUpperCase()}

📍 LOCALIZAÇÃO:
${dev.address ? `• Endereço: ${dev.address}` : ''}
${dev.neighborhood ? `• Bairro: ${dev.neighborhood}` : ''}
• Cidade: ${dev.city}

💰 VALORES E ENTREGA:
• A partir de: ${formatCurrency(dev.starting_price)}
${dev.delivery_date ? `• Previsão de entrega: ${dev.delivery_date}` : ''}
• Status: ${dev.status === 'lancamento' ? 'Lançamento' : dev.status === 'em_construcao' ? 'Em construção' : 'Pronto para morar'}

🏠 TIPOLOGIAS: ${unitTypesFormatted || '• Consultar disponibilidade'}
✨ DIFERENCIAIS: ${differentialsFormatted || '• Acabamento de alto padrão'}
🎯 LAZER: ${amenitiesFormatted || '• Infraestrutura completa'}
${dev.description ? `📝 SOBRE: ${dev.description}` : ''}
❓ FAQ: ${faqFormatted || 'Consulte o corretor.'}
${talkingPointsFormatted ? `💡 DESTAQUES:\n${talkingPointsFormatted}` : ''}

⚠️ REGRAS:
1. Responda 1-3 perguntas, seja objetiva
2. Após isso, use enviar_lead_c2s para transferir
3. Use enviar_material quando pedirem plantas ou fotos
4. NÃO negocie valores - o corretor fará isso
5. Mensagens curtas, emojis com moderação

${dev.ai_instructions ? `📋 INSTRUÇÕES ESPECÍFICAS:\n${dev.ai_instructions}` : ''}

🔧 FERRAMENTAS:
1. enviar_lead_c2s: Transferir lead para corretor
2. enviar_material: Enviar planta baixa, perspectiva, etc.`;
}

// ========== FULL MODE TOOLS ==========

const toolsFull = [
  {
    type: "function",
    function: {
      name: "enviar_lead_c2s",
      description: "Transferir lead qualificado para corretor especializado no C2S.",
      parameters: {
        type: "object",
        properties: {
          nome: { type: "string", description: "Nome do cliente" },
          interesse: { type: "string", description: "Tipologia ou unidade de interesse" },
          resumo: { type: "string", description: "Resumo breve do atendimento" },
          observacoes: { type: "string", description: "Observações para o corretor" }
        },
        required: ["nome", "resumo"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "enviar_material",
      description: "Enviar material do empreendimento via WhatsApp",
      parameters: {
        type: "object",
        properties: {
          tipo: { type: "string", enum: ["planta_baixa", "perspectiva", "video", "book", "foto"], description: "Tipo de material" },
          tipologia: { type: "string", description: "Tipologia específica se aplicável" }
        },
        required: ["tipo"]
      }
    }
  }
];

// ========== OUT-OF-SCOPE DETECTION ==========

const OUT_OF_SCOPE_PATTERNS = {
  locacao: [
    /\b(alugar|aluguel|loca[çc][aã]o|locar|alugo|quero\s+alugar)\b/i,
    /\b(apartamento|casa|kit(net)?)\s+(pra|para|de)?\s*alug/i,
    /\b(procurando|procuro|busco|quero)\s+.{0,20}(alugar|aluguel|loca[çc][aã]o)\b/i,
    /\b(pra|para)\s+alugar\b/i,
  ],
  administrativo: [
    /\b(boleto|2[ªa]\s*via|segunda\s*via)\b/i,
    /\b(contrato|rescis[aã]o|renova[çc][aã]o|distrato)\b/i,
    /\b(manuten[çc][aã]o|conserto|reparo|vazamento|problema)\s+.{0,15}(im[oó]vel|apartamento|casa)?\b/i,
    /\b(j[aá]\s*sou\s*cliente|inquilino|propriet[aá]rio|locat[aá]rio)\b/i,
    /\b(meu\s+im[oó]vel|minha\s+casa|meu\s+apartamento)\b/i,
    /\b(problema|defeito|quebrou|n[aã]o\s+funciona)\b/i,
  ]
};

function detectOutOfScope(msg: string): 'locacao' | 'administrativo' | null {
  for (const pattern of OUT_OF_SCOPE_PATTERNS.locacao) {
    if (pattern.test(msg)) return 'locacao';
  }
  for (const pattern of OUT_OF_SCOPE_PATTERNS.administrativo) {
    if (pattern.test(msg)) return 'administrativo';
  }
  return null;
}

const REDIRECT_MESSAGES = {
  locacao: `Entendi que você busca um imóvel para alugar! 🏠\n\nPara locação, nossa equipe especializada pode te ajudar melhor pelo número:\n📱 *48 9 9163-1011*\n\nLá você vai ter atendimento completo para encontrar o imóvel ideal! 😊`,
  administrativo: `Entendi! Para questões administrativas como boletos, contratos ou manutenção, nosso time de suporte pode te ajudar:\n📱 *48 9 9163-1011*\n\nEles vão resolver sua solicitação rapidinho! 😊`
};

// ========== MAIN HANDLER ==========

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const { 
      phone_number, 
      message, 
      development_id, 
      development_slug,
      conversation_history = [],
      contact_name 
    } = await req.json();

    console.log(`🏗️ Aimee Vendas - Phone: ${phone_number}, Dev: ${development_id || development_slug}`);

    // ═══ OUT OF SCOPE CHECK ═══
    const outOfScope = detectOutOfScope(message);
    if (outOfScope) {
      console.log(`⚠️ Out of scope: ${outOfScope} - Redirecting`);
      await sendWhatsAppMessage(phone_number, REDIRECT_MESSAGES[outOfScope]);
      
      await supabase.from('activity_logs').insert({
        user_id: '00000000-0000-0000-0000-000000000000',
        action_type: 'ai_vendas_redirect',
        target_table: 'conversations',
        target_id: phone_number,
        metadata: { detected_scope: outOfScope, message_preview: message.substring(0, 100) }
      }).catch(console.error);
      
      return new Response(
        JSON.stringify({ success: true, action: 'redirected_out_of_scope', scope_detected: outOfScope }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ═══ QUICK TRANSFER MODE CHECK ═══
    const { data: quickModeSetting } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_category', 'ai_vendas')
      .eq('setting_key', 'quick_transfer_mode')
      .maybeSingle();

    const isQuickTransferMode = quickModeSetting?.setting_value === true || quickModeSetting?.setting_value === 'true';
    console.log(`⚡ Quick Transfer Mode: ${isQuickTransferMode ? 'ENABLED' : 'DISABLED'}`);

    // ═══ FETCH DEVELOPMENT ═══
    let development: Development | null = null;
    if (development_id) {
      const { data } = await supabase.from('developments').select('*').eq('id', development_id).eq('is_active', true).single();
      development = data;
    } else if (development_slug) {
      const { data } = await supabase.from('developments').select('*').eq('slug', development_slug).eq('is_active', true).single();
      development = data;
    }

    if (!development) {
      return new Response(
        JSON.stringify({ error: 'Development not found', success: false }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ═══ FIND CONVERSATION ═══
    let conversationId: string | null = null;
    const { data: conv } = await supabase
      .from('conversations')
      .select('id')
      .eq('phone_number', phone_number)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    conversationId = conv?.id || null;

    // ═══ FIRST MESSAGE HANDLING ═══
    const isFirstMessage = !conversation_history || conversation_history.length === 0;

    if (isFirstMessage && isQuickTransferMode) {
      console.log(`👋 Sending welcome for ${development.name}`);
      
      const greetingMessage = `Que bom seu interesse no ${development.name}, no bairro João Paulo, em Florianópolis! 🏠 Entre o azul do mar e o verde das montanhas, é um lugar pensado para viver com calma e bem-estar.`;
      await saveAndSendMessage(supabase, conversationId, phone_number, greetingMessage, 'vendas');
      
      await delay(1500);
      
      const hasName = !!contact_name && contact_name.toLowerCase() !== 'lead sem nome';
      const followUpMessage = hasName
        ? `Prazer em te conhecer, ${contact_name}! 😊 Você está buscando algo para morar ou para investir?`
        : 'Pra começar bem, como posso te chamar?';
      
      await saveAndSendMessage(supabase, conversationId, phone_number, followUpMessage, 'vendas');
      
      await supabase.from('activity_logs').insert({
        user_id: '00000000-0000-0000-0000-000000000000',
        action_type: 'ai_vendas_welcome',
        target_table: 'conversations',
        target_id: phone_number,
        metadata: { development_id: development.id, development_name: development.name, has_contact_name: hasName, quick_transfer_mode: true }
      }).catch(console.error);
      
      return new Response(
        JSON.stringify({ success: true, response: `${greetingMessage}\n\n${followUpMessage}`, quick_transfer_mode: true, development: { id: development.id, name: development.name, slug: development.slug } }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ═══ FETCH MATERIALS (full mode only) ═══
    let materials: DevelopmentMaterial[] = [];
    if (!isQuickTransferMode) {
      const { data } = await supabase.from('development_materials').select('*').eq('development_id', development.id).order('order_index');
      materials = data || [];
    }

    // ═══ BUILD PROMPT & CALL AI ═══
    const systemPrompt = isQuickTransferMode
      ? buildQuickTransferPrompt(development, contact_name, isFirstMessage, conversation_history)
      : buildEmpreendimentoPrompt(development);

    const tools = isQuickTransferMode ? toolsQuickTransfer : toolsFull;
    const aiResponse = await callLLM(systemPrompt, conversation_history, message, tools);
    
    console.log(`🤖 AI Response:`, aiResponse.content?.substring(0, 100));

    let finalResponse = aiResponse.content;
    let c2sTransferred = false;
    let materialSent = false;

    // ═══ PROCESS TOOL CALLS ═══
    for (const toolCall of aiResponse.toolCalls) {
      const functionName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);
      console.log(`🔧 Tool: ${functionName}`, args);

      if (functionName === 'enviar_lead_c2s') {
        try {
          const c2sPayload = {
            name: args.nome || contact_name || 'Lead sem nome',
            phone: phone_number,
            email: null,
            property_type: args.interesse || null,
            neighborhood: null,
            budget_max: development.starting_price,
            additional_info: isQuickTransferMode
              ? `🚀 LEAD DE LANDING PAGE - ${development.name}\n${development.developer}\n\nInteresse: ${args.interesse || 'N/I'}\nMotivação: ${args.motivacao || 'N/I'}\nResumo: ${args.resumo}`
              : `Empreendimento: ${development.name}\n${development.developer}\n\nResumo: ${args.resumo}\nObs: ${args.observacoes || 'Nenhuma'}`,
            conversation_summary: args.resumo,
            development_id: development.id,
            development_name: development.name,
            interesse: args.interesse,
            motivacao: args.motivacao
          };

          const { error: c2sError } = await supabase.functions.invoke('c2s-create-lead', { body: c2sPayload });
          if (!c2sError) {
            c2sTransferred = true;
            console.log('✅ Lead sent to C2S');
          }
        } catch (error) {
          console.error('Error sending to C2S:', error);
        }
      }

      if (functionName === 'enviar_material' && !isQuickTransferMode) {
        let material = materials?.find(m => 
          m.material_type === args.tipo && 
          (args.tipologia ? m.title.toLowerCase().includes(args.tipologia.toLowerCase()) : true)
        ) || materials?.find(m => m.material_type === args.tipo);

        if (material) {
          const result = await sendWhatsAppMedia(phone_number, material.file_url, `${development.name} - ${material.title}`);
          if (result.success) {
            materialSent = true;
            console.log(`📸 Material sent: ${material.title}`);
          }
        }
      }
    }

    // ═══ SEND AI RESPONSE ═══
    if (finalResponse) {
      await saveAndSendMessage(supabase, conversationId, phone_number, finalResponse, 'vendas');
    }

    // ═══ LOG ═══
    await supabase.from('activity_logs').insert({
      user_id: '00000000-0000-0000-0000-000000000000',
      action_type: 'ai_vendas',
      target_table: 'conversations',
      target_id: phone_number,
      metadata: { development_id: development.id, development_name: development.name, c2s_transferred: c2sTransferred, material_sent: materialSent, quick_transfer_mode: isQuickTransferMode }
    }).catch(console.error);

    return new Response(
      JSON.stringify({ success: true, response: finalResponse, c2s_transferred: c2sTransferred, material_sent: materialSent, quick_transfer_mode: isQuickTransferMode, development: { id: development.id, name: development.name, slug: development.slug } }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in ai-vendas:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error', success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
