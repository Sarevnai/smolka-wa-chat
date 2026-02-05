import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// ========== SHARED IMPORTS ==========
import { corsHeaders } from "../_shared/cors.ts";
import {
  MakeWebhookRequest,
  MediaInfo,
  DepartmentType,
  AIAgentConfig,
  AIBehaviorConfig,
  ConversationMessage,
  QualificationData,
  QualificationProgress,
  ConsultativeState,
  AudioConfig,
  AudioResult,
  EssentialQuestion,
  ExtractedQualificationData,
  defaultConfig,
} from "../_shared/types.ts";

import {
  normalizePhoneNumber,
  getPhoneVariations,
  formatCurrency,
  getRandomEmoji,
  getRandomPhrase,
  validateAIResponse,
  FALLBACK_RESPONSE,
  extractPropertyCodeFromUrl,
  containsPropertyUrl,
  detectConfirmation,
  analyzePropertyFeedback,
  detectPriceFlexibility,
  isSameMessage,
  extractNameFromMessage,
  isWaitingSignal,
} from "../_shared/utils.ts";

import {
  normalizeNeighborhood,
  expandRegionToNeighborhoods,
  generateRegionKnowledge,
  getAllNeighborhoods,
  isRegionName,
} from "../_shared/regions.ts";

import {
  buildQuickTransferPrompt,
  buildLocacaoPrompt,
  buildVendasPrompt,
  buildAdminPrompt,
  buildVirtualAgentPrompt,
  getPromptForDepartment,
  toolsWithVista,
  toolsQuickTransfer,
} from "../_shared/prompts.ts";

import {
  searchProperties,
  searchPropertiesWithFallback,
  buildFallbackMessage,
  getPropertyByListingId,
  formatPropertyMessage,
  sendLeadToC2S,
} from "../_shared/property.ts";

import {
  extractQualificationData,
  updateQualificationData,
  hasMinimumCriteriaToSearch,
  buildSearchParamsFromQualification,
  getQualificationProgress,
  getNextQualificationQuestion,
  buildContextSummary,
  isLoopingQuestion,
  detectFlexibilization,
} from "../_shared/qualification.ts";

import {
  transcribeAudio,
  getAudioConfig,
  generateAudioResponse,
} from "../_shared/audio.ts";

// ========== CONFIG LOADERS ==========

async function getAIAgentConfig(supabase: any): Promise<AIAgentConfig> {
  try {
    const { data } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'ai_agent_config')
      .maybeSingle();
    
    return data?.setting_value 
      ? { ...defaultConfig, ...data.setting_value }
      : defaultConfig;
  } catch (error) {
    console.error('❌ Error loading AI agent config:', error);
    return defaultConfig;
  }
}

async function getAIBehaviorConfig(supabase: any): Promise<AIBehaviorConfig | null> {
  try {
    const { data } = await supabase
      .from('ai_behavior_config')
      .select('*')
      .limit(1)
      .maybeSingle();
    return data;
  } catch (error) {
    console.error('❌ Error loading AI behavior config:', error);
    return null;
  }
}

// ========== DATABASE FUNCTIONS ==========

async function findOrCreateConversation(
  supabase: any, 
  phoneNumber: string, 
  departmentCode: DepartmentType = null
): Promise<{ id: string; department_code: DepartmentType; contact_id: string | null } | null> {
  try {
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id, department_code, contact_id')
      .eq('phone_number', phoneNumber)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingConv) {
      console.log(`✅ Found existing conversation: ${existingConv.id}`);
      return existingConv;
    }

    const { data: contact } = await supabase
      .from('contacts')
      .select('id, department_code')
      .eq('phone', phoneNumber)
      .maybeSingle();

    const { data: newConv, error } = await supabase
      .from('conversations')
      .insert({
        phone_number: phoneNumber,
        contact_id: contact?.id || null,
        department_code: departmentCode || contact?.department_code || null,
        status: 'active',
        last_message_at: new Date().toISOString()
      })
      .select('id, department_code, contact_id')
      .single();

    if (error) {
      console.error('❌ Error creating conversation:', error);
      return null;
    }

    console.log(`✅ New conversation created: ${newConv.id}`);
    return newConv;

  } catch (error) {
    console.error('❌ Error in findOrCreateConversation:', error);
    return null;
  }
}

async function saveMessage(
  supabase: any,
  conversationId: string | null,
  phoneNumber: string,
  body: string,
  direction: 'inbound' | 'outbound',
  messageId?: string,
  mediaInfo?: MediaInfo,
  departmentCode?: DepartmentType
): Promise<number | null> {
  try {
    const messageData: any = {
      conversation_id: conversationId,
      wa_message_id: messageId || `make_${direction}_${Date.now()}`,
      wa_from: direction === 'inbound' ? phoneNumber : null,
      wa_to: direction === 'outbound' ? phoneNumber : null,
      direction,
      body,
      wa_timestamp: new Date().toISOString(),
      department_code: departmentCode || null,
      media_type: mediaInfo?.type || null,
      media_url: mediaInfo?.url || null,
      media_caption: mediaInfo?.caption || null,
      media_filename: mediaInfo?.filename || null,
      media_mime_type: mediaInfo?.mimeType || null
    };

    const { data, error } = await supabase
      .from('messages')
      .insert(messageData)
      .select('id')
      .single();

    if (error) {
      console.error(`❌ Error saving ${direction} message:`, error);
      return null;
    }

    console.log(`💾 ${direction} message saved: ${data.id}`);
    return data.id;
  } catch (error) {
    console.error(`❌ Error in saveMessage:`, error);
    return null;
  }
}

async function getConversationHistory(
  supabase: any,
  conversationId: string,
  limit: number = 10
): Promise<ConversationMessage[]> {
  try {
    const { data: messages } = await supabase
      .from('messages')
      .select('direction, body')
      .eq('conversation_id', conversationId)
      .not('body', 'is', null)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (!messages?.length) return [];

    return messages.map((m: any) => ({
      role: m.direction === 'inbound' ? 'user' : 'assistant',
      content: m.body
    }));
  } catch (error) {
    console.error('❌ Error getting conversation history:', error);
    return [];
  }
}

async function getLastOutboundMessage(supabase: any, conversationId: string): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('messages')
      .select('body')
      .eq('conversation_id', conversationId)
      .eq('direction', 'outbound')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data?.body || null;
  } catch (error) {
    return null;
  }
}

// ========== CONVERSATION STATE ==========

type TriageStage = 'greeting' | 'awaiting_name' | 'awaiting_triage' | 'completed' | null;

interface ConversationState {
  triage_stage: TriageStage;
  customer_name?: string;
}

async function getConversationState(supabase: any, phoneNumber: string): Promise<ConversationState | null> {
  try {
    const { data } = await supabase
      .from('conversation_states')
      .select('triage_stage')
      .eq('phone_number', phoneNumber)
      .maybeSingle();
    return data;
  } catch (error) {
    console.error('❌ Error getting conversation state:', error);
    return null;
  }
}

async function updateTriageStage(supabase: any, phoneNumber: string, stage: TriageStage): Promise<void> {
  try {
    await supabase
      .from('conversation_states')
      .upsert({
        phone_number: phoneNumber,
        triage_stage: stage,
        updated_at: new Date().toISOString()
      }, { onConflict: 'phone_number' });
    console.log(`📊 Triage stage updated to: ${stage}`);
  } catch (error) {
    console.error('❌ Error updating triage stage:', error);
  }
}

async function getConsultativeState(supabase: any, phoneNumber: string): Promise<ConsultativeState | null> {
  try {
    const { data } = await supabase
      .from('conversation_states')
      .select('pending_properties, current_property_index, awaiting_property_feedback, awaiting_c2s_confirmation, c2s_pending_property')
      .eq('phone_number', phoneNumber)
      .maybeSingle();
    return data;
  } catch (error) {
    console.error('❌ Error getting consultative state:', error);
    return null;
  }
}

async function updateConsultativeState(
  supabase: any, 
  phoneNumber: string, 
  updates: Partial<ConsultativeState>
): Promise<void> {
  try {
    await supabase
      .from('conversation_states')
      .upsert({
        phone_number: phoneNumber,
        ...updates,
        updated_at: new Date().toISOString()
      }, { onConflict: 'phone_number' });
    console.log(`📊 Consultative state updated:`, updates);
  } catch (error) {
    console.error('❌ Error updating consultative state:', error);
  }
}

// ========== CONTACT HELPERS ==========

async function getContactName(supabase: any, phoneNumber: string): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('contacts')
      .select('name')
      .eq('phone', phoneNumber)
      .maybeSingle();
    return data?.name || null;
  } catch (error) {
    return null;
  }
}

async function saveContactNameMake(supabase: any, phoneNumber: string, name: string): Promise<void> {
  try {
    await supabase
      .from('contacts')
      .update({ name, updated_at: new Date().toISOString() })
      .eq('phone', phoneNumber);
    console.log(`✅ Contact name saved: ${name}`);
  } catch (error) {
    console.error('❌ Error saving contact name:', error);
  }
}

async function createOrUpdateContact(
  supabase: any,
  phoneNumber: string,
  contactName?: string
): Promise<void> {
  try {
    const { data: existing } = await supabase
      .from('contacts')
      .select('id, name')
      .eq('phone', phoneNumber)
      .maybeSingle();

    if (existing) {
      if (contactName && !existing.name) {
        await supabase
          .from('contacts')
          .update({ name: contactName })
          .eq('id', existing.id);
      }
    } else {
      await supabase
        .from('contacts')
        .insert({
          phone: phoneNumber,
          name: contactName || null,
          status: 'ativo'
        });
    }
  } catch (error) {
    console.error('❌ Error creating/updating contact:', error);
  }
}

// ========== DEVELOPMENT HELPERS ==========

async function checkDevelopmentLead(
  supabase: any,
  phoneNumber: string
): Promise<{ development_id: string; development_name: string; contact_name: string | null } | null> {
  try {
    const phoneVariations = getPhoneVariations(phoneNumber);
    const cutoffTime = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
    
    const { data: portalLead } = await supabase
      .from('portal_leads_log')
      .select(`id, development_id, contact_name, developments!inner(name, slug)`)
      .in('contact_phone', phoneVariations)
      .not('development_id', 'is', null)
      .gte('created_at', cutoffTime)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!portalLead?.development_id) return null;

    console.log(`🏗️ Development lead found: ${(portalLead.developments as any)?.name}`);
    return {
      development_id: portalLead.development_id,
      development_name: (portalLead.developments as any)?.name || 'Unknown',
      contact_name: portalLead.contact_name
    };
  } catch (error) {
    console.error('❌ Error checking development lead:', error);
    return null;
  }
}

async function detectDevelopmentFromMessage(
  supabase: any,
  messageBody: string
): Promise<{ development_id: string; development_name: string } | null> {
  try {
    if (!messageBody || messageBody.length < 5) return null;

    const { data: developments } = await supabase
      .from('developments')
      .select('id, name, slug')
      .eq('is_active', true);

    if (!developments?.length) return null;

    const normalizedMessage = messageBody.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    for (const dev of developments) {
      const normalizedName = dev.name.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      
      if (normalizedName.length >= 5 && normalizedMessage.includes(normalizedName)) {
        console.log(`🏗️ Development detected: "${dev.name}"`);
        return { development_id: dev.id, development_name: dev.name };
      }
    }

    return null;
  } catch (error) {
    console.error('❌ Error detecting development:', error);
    return null;
  }
}

async function getDevelopment(supabase: any, developmentId: string): Promise<any | null> {
  const { data } = await supabase
    .from('developments')
    .select('*')
    .eq('id', developmentId)
    .eq('is_active', true)
    .single();
  return data;
}

// ========== TRIAGE HELPERS ==========

const TRIAGE_BUTTON_MAP: Record<string, 'locacao' | 'vendas' | 'administrativo'> = {
  'alugar': 'locacao',
  'comprar': 'vendas',
  'já sou cliente': 'administrativo',
  'ja sou cliente': 'administrativo',
  'setor de locação': 'locacao',
  'setor de locacao': 'locacao',
  'setor de vendas': 'vendas',
  'setor administrativo': 'administrativo',
  'locacao': 'locacao',
  'vendas': 'vendas',
  'administrativo': 'administrativo',
  '1': 'locacao',
  '2': 'vendas',
  '3': 'administrativo'
};

function inferDepartmentFromButton(buttonText?: string, buttonPayload?: string): 'locacao' | 'vendas' | 'administrativo' | null {
  if (buttonText) {
    const normalized = buttonText.toLowerCase().trim();
    if (TRIAGE_BUTTON_MAP[normalized]) {
      console.log(`🔘 Department from button_text: "${buttonText}" → ${TRIAGE_BUTTON_MAP[normalized]}`);
      return TRIAGE_BUTTON_MAP[normalized];
    }
  }
  
  if (buttonPayload) {
    const normalized = buttonPayload.toLowerCase().trim();
    if (TRIAGE_BUTTON_MAP[normalized]) {
      console.log(`🔘 Department from button_payload: "${buttonPayload}" → ${TRIAGE_BUTTON_MAP[normalized]}`);
      return TRIAGE_BUTTON_MAP[normalized];
    }
  }
  
  return null;
}

function inferDepartmentFromText(text: string): 'locacao' | 'vendas' | 'administrativo' | null {
  const lower = text.toLowerCase().trim();
  
  if (TRIAGE_BUTTON_MAP[lower]) return TRIAGE_BUTTON_MAP[lower];
  if (/alug|locar|loca[çc][aã]o|alugo/.test(lower)) return 'locacao';
  if (/compr|adquir|compra|vender|venda/.test(lower)) return 'vendas';
  if (/cliente|inquilino|propriet[aá]rio|boleto|contrato|manuten[çc][aã]o|segunda via|pagamento/.test(lower)) return 'administrativo';
  
  return null;
}

async function assignDepartmentMake(
  supabase: any, 
  phoneNumber: string, 
  conversationId: string, 
  department: 'locacao' | 'vendas' | 'administrativo'
): Promise<void> {
  try {
    await supabase
      .from('conversations')
      .update({ department_code: department })
      .eq('id', conversationId);
    
    await supabase
      .from('contacts')
      .update({ department_code: department })
      .eq('phone', phoneNumber);
    
    await updateTriageStage(supabase, phoneNumber, 'completed');
    
    console.log(`✅ Department assigned: ${department}`);
  } catch (error) {
    console.error('❌ Error assigning department:', error);
  }
}

// ========== OPENAI INTEGRATION ==========

async function callOpenAI(
  systemPrompt: string, 
  conversationHistory: ConversationMessage[],
  userMessage: string,
  tools?: any[]
): Promise<{ content: string; toolCalls: any[] }> {
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openaiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage }
  ];

  const requestBody: any = {
    model: 'gpt-4o-mini',
    messages,
    temperature: 0.7,
    max_tokens: 500,
  };

  if (tools && tools.length > 0) {
    requestBody.tools = tools;
    requestBody.tool_choice = 'auto';
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  const choice = data.choices[0];
  
  return {
    content: choice.message.content || '',
    toolCalls: choice.message.tool_calls || []
  };
}

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
    // Validate API key
    const apiKey = req.headers.get('x-make-api-key');
    const expectedApiKey = Deno.env.get('MAKE_API_KEY');

    if (!apiKey || apiKey !== expectedApiKey) {
      console.error('❌ Invalid or missing API key');
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Load AI Agent Config from database
    const agentConfig = await getAIAgentConfig(supabase);
    const behaviorConfig = await getAIBehaviorConfig(supabase);
    console.log(`🤖 Loaded config: agent_name=${agentConfig.agent_name}, vista=${agentConfig.vista_integration_enabled}`);

    // Parse request body
    const body: MakeWebhookRequest = await req.json();
    
    const { 
      phone, message, contact_name, message_id, timestamp, message_type,
      media_url, media_id, media_mime, media_caption, media_filename,
      button_text, button_payload
    } = body;
    
    if (button_text || button_payload) {
      console.log(`🔘 Button data: text="${button_text}", payload="${button_payload}"`);
    }

    // Skip status callbacks - return result: null so Make.com Router can proceed
    if (!phone && !message && !media_url) {
      console.log('📌 Ignoring status callback');
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'status_callback', result: null }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📥 Make webhook - Phone: ${phone}, Type: ${message_type || 'text'}, Msg: "${message?.substring(0, 50) || '[media/button]'}..."`);

    // Determine message content based on type
    let messageContent = message || '';
    let mediaInfo: MediaInfo | undefined;
    let mediaProcessed: { type: string; transcribed?: boolean; transcription_preview?: string } | undefined;

    const isButton = message_type === 'button';
    const isAudio = message_type === 'audio' || message_type === 'voice';
    const isMedia = ['image', 'video', 'document', 'sticker'].includes(message_type || '');

    if (isButton) {
      messageContent = button_text || button_payload || message || '[Botão clicado]';
      console.log(`🔘 Button message: "${messageContent}"`);
      mediaProcessed = { type: 'button' };
    } else if (isAudio && media_url) {
      console.log(`🎤 Audio message, transcribing...`);
      const transcribedText = await transcribeAudio(supabase, media_url);
      
      if (transcribedText) {
        messageContent = transcribedText;
        mediaProcessed = { type: 'audio', transcribed: true, transcription_preview: transcribedText.substring(0, 100) };
        console.log(`🎤 Transcribed: "${messageContent.substring(0, 50)}..."`);
      } else {
        messageContent = '[Áudio não transcrito - peça para digitar]';
        mediaProcessed = { type: 'audio', transcribed: false };
      }
      
      mediaInfo = { type: 'audio', url: media_url, caption: transcribedText || undefined, mimeType: media_mime };
    } else if (isMedia && media_url) {
      const mediaLabel = message_type === 'image' ? 'Imagem' : message_type === 'video' ? 'Vídeo' : 'Documento';
      messageContent = media_caption || `[${mediaLabel} recebido]`;
      mediaInfo = { type: message_type, url: media_url, caption: media_caption, filename: media_filename, mimeType: media_mime };
      mediaProcessed = { type: message_type || 'unknown' };
    }

    // Validate required fields
    if (!phone || (!message && !media_url && !button_text && !button_payload)) {
      console.warn('⚠️ Incomplete payload');
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize phone number
    const phoneNumber = normalizePhoneNumber(phone);
    console.log(`📱 Normalized phone: ${phoneNumber}`);

    // Create or update contact
    await createOrUpdateContact(supabase, phoneNumber, contact_name);

    // Find or create conversation
    const conversation = await findOrCreateConversation(supabase, phoneNumber);
    const conversationId = conversation?.id || null;
    const currentDepartment = conversation?.department_code;

    // Save inbound message
    await saveMessage(supabase, conversationId, phoneNumber, messageContent, 'inbound', message_id, mediaInfo, currentDepartment);

    // Get conversation history
    const history = conversationId ? await getConversationHistory(supabase, conversationId) : [];
    
    // Build AI prompt message with context
    let aiPromptMessage = messageContent;
    if (isAudio && mediaProcessed?.transcribed) {
      aiPromptMessage = `[Áudio transcrito]: "${messageContent}"`;
    } else if (isMedia) {
      aiPromptMessage = `[${message_type === 'image' ? 'Imagem' : 'Mídia'} recebida${media_caption ? `: "${media_caption}"` : ''}]`;
    }

    // Process property links
    const propertyCode = extractPropertyCodeFromUrl(messageContent);
    let propertyContext = '';
    if (propertyCode) {
      const property = await getPropertyByListingId(supabase, propertyCode);
      if (property) {
        propertyContext = `\n\n[CONTEXTO: Cliente enviou link do imóvel ${propertyCode}:\n${formatPropertyMessage(property)}]`;
        aiPromptMessage += propertyContext;
      }
    }

    // Initialize response variables
    let aiResponse = '';
    let agent = 'helena';
    let developmentDetected: string | null = null;
    let c2sTransferred = false;
    let sendTriageTemplate = false;
    let propertiesToSend: any[] = [];

    // ===== CHECK DEVELOPMENT LEAD =====
    const developmentLead = await checkDevelopmentLead(supabase, phoneNumber);
    const mentionedDevelopment = await detectDevelopmentFromMessage(supabase, messageContent);
    
    // Process development leads with Helena (Make.com channel handles all portal leads)
    if (developmentLead || mentionedDevelopment) {
      const devInfo = developmentLead || mentionedDevelopment!;
      developmentDetected = devInfo.development_name;
      console.log(`🏗️ Routing to Helena for: ${developmentDetected}`);

      const development = await getDevelopment(supabase, devInfo.development_id);
      
      if (development) {
        const isFirstMessage = history.length === 0;
        const existingContactName = await getContactName(supabase, phoneNumber);
        const resolvedContactName = existingContactName || developmentLead?.contact_name || contact_name;
        
        const systemPrompt = buildQuickTransferPrompt(development, resolvedContactName, isFirstMessage, history);
        const result = await callOpenAI(systemPrompt, history, aiPromptMessage, toolsQuickTransfer);
        
        aiResponse = result.content;

        // Process tool calls
        for (const toolCall of result.toolCalls) {
          if (toolCall.function.name === 'enviar_lead_c2s') {
            const args = JSON.parse(toolCall.function.arguments);
            console.log(`🔧 C2S transfer:`, args);
            
            try {
              await supabase.functions.invoke('c2s-create-lead', {
                body: {
                  name: args.nome || resolvedContactName || 'Lead',
                  phone: phoneNumber,
                  property_type: args.interesse,
                  additional_info: `🚀 LEAD VIA MAKE - ${development.name}\nInteresse: ${args.interesse}\nMotivação: ${args.motivacao || 'N/A'}\nResumo: ${args.resumo}`,
                  development_id: development.id,
                  development_name: development.name,
                }
              });
              c2sTransferred = true;
              console.log('✅ Lead transferred to C2S');
            } catch (error) {
              console.error('❌ Error transferring to C2S:', error);
            }
          }
        }

        if (isFirstMessage) {
          const hasName = !!resolvedContactName && resolvedContactName.toLowerCase() !== 'lead sem nome';
          const greetingMessage = `Que bom seu interesse no ${development.name}! 🏠`;
          const followUpMessage = hasName 
            ? `Prazer, ${resolvedContactName}! 😊 Você está buscando algo para morar ou investir?`
            : 'Pra começar, como posso te chamar?';
          aiResponse = `${greetingMessage}\n\n${followUpMessage}`;
        }
      }
    } else {
      // ===== TRIAGE FLOW FOR NEW LEADS =====
      console.log('🤖 Entering triage flow');
      
      const convState = await getConversationState(supabase, phoneNumber);
      const currentStage = convState?.triage_stage || null;
      const existingName = await getContactName(supabase, phoneNumber);
      
      console.log(`📊 Triage - Stage: ${currentStage}, Name: ${existingName || 'none'}, Dept: ${currentDepartment || 'none'}`);
      
      if (!currentStage || currentStage === 'greeting') {
        const greetingMsg = `Olá! Aqui é a ${agentConfig.agent_name} da ${agentConfig.company_name} 🏠`;
        
        if (existingName) {
          aiResponse = `${greetingMsg}\n\nPrazer em falar com você, ${existingName}! 😊`;
          sendTriageTemplate = true;
          await updateTriageStage(supabase, phoneNumber, 'awaiting_triage');
        } else {
          aiResponse = `${greetingMsg}\n\nComo você se chama?`;
          await updateTriageStage(supabase, phoneNumber, 'awaiting_name');
        }
      } else if (currentStage === 'awaiting_name') {
        const detectedName = extractNameFromMessage(messageContent);
        
        if (detectedName) {
          await saveContactNameMake(supabase, phoneNumber, detectedName);
          aiResponse = `Prazer, ${detectedName}! 😊`;
          sendTriageTemplate = true;
          await updateTriageStage(supabase, phoneNumber, 'awaiting_triage');
        } else {
          aiResponse = 'Desculpa, não consegui entender 😅 Pode me dizer o seu nome?';
        }
      } else if (currentStage === 'awaiting_triage') {
        const department = isButton 
          ? inferDepartmentFromButton(button_text, button_payload) || inferDepartmentFromText(messageContent)
          : inferDepartmentFromText(messageContent);
        
        if (department && conversationId) {
          await assignDepartmentMake(supabase, phoneNumber, conversationId, department);
          
          const nameGreeting = existingName ? `, ${existingName}` : '';
          
          if (department === 'locacao') {
            aiResponse = `Ótimo${nameGreeting}! 🏠\n\nVou te ajudar a encontrar o imóvel ideal para alugar em Florianópolis.\n\nPra buscar as melhores opções, me conta:\n📍 Qual região você prefere?`;
          } else if (department === 'vendas') {
            aiResponse = `Excelente${nameGreeting}! 🏡\n\nVou te ajudar a encontrar o imóvel dos seus sonhos.\n\nPra começar: você está buscando para *morar* ou para *investir*?`;
          } else {
            aiResponse = `Perfeito${nameGreeting}! 😊\n\nSou da Smolka e vou te ajudar com sua solicitação.\n\nQual sua demanda?\n📄 Boleto/2ª via\n📝 Contrato\n🔧 Manutenção\n❓ Outra questão`;
          }
          
          console.log(`✅ Department assigned: ${department}`);
        } else {
          sendTriageTemplate = true;
          aiResponse = `Desculpa, não entendi 😅\n\nPor favor, toque em um dos botões:`;
        }
      } else {
        // ===== TRIAGE COMPLETED - USE DEPARTMENT-SPECIFIC PROMPTS =====
        console.log(`🤖 Triage completed, dept: ${currentDepartment}`);
        
        // Detect flexibilization first
        const flexibilization = detectFlexibilization(messageContent);
        if (flexibilization.detected) {
          console.log(`📝 Flexibilization detected: ${flexibilization.fields.join(', ')}`);
          await updateQualificationData(supabase, phoneNumber, flexibilization.updates as ExtractedQualificationData, true, messageContent);
          
          // Clear consultative state when key criteria change
          const keyFields = ['quartos', 'bairro', 'orçamento', 'tipo'];
          const hasKeyFieldChange = flexibilization.fields.some(f => keyFields.includes(f));
          
          if (hasKeyFieldChange) {
            console.log('🔄 Key criteria changed - clearing consultative state to force new search');
            await updateConsultativeState(supabase, phoneNumber, {
              pending_properties: [],
              current_property_index: 0,
              awaiting_property_feedback: false
            });
          }
        }
        
        // Extract and save qualification data (pass message for correction detection)
        const extractedData = extractQualificationData(messageContent);
        if (Object.keys(extractedData).length > 0) {
          console.log(`📊 Extracted qualification data:`, extractedData);
          await updateQualificationData(supabase, phoneNumber, extractedData, false, messageContent);
        }
        
        // Check for consultative flow state
        const consultativeState = await getConsultativeState(supabase, phoneNumber);
        const isAwaitingFeedback = consultativeState?.awaiting_property_feedback === true;
        const isAwaitingC2SConfirmation = consultativeState?.awaiting_c2s_confirmation === true;
        const pendingProperties = consultativeState?.pending_properties || [];
        const currentIndex = consultativeState?.current_property_index || 0;
        
        // Load qualification data
        const { progress: qualProgress, data: qualData } = await getQualificationProgress(supabase, phoneNumber);
        console.log(`📊 Qualification progress:`, qualProgress);
        
        // ===== HANDLE C2S CONFIRMATION FLOW =====
        if (isAwaitingC2SConfirmation) {
          console.log('📤 Awaiting C2S confirmation - processing response');
          const confirmation = detectConfirmation(messageContent);
          const pendingProp = consultativeState?.c2s_pending_property;
          
          if (confirmation === 'yes') {
            console.log('✅ Client confirmed - sending to C2S directly');
            const historyText = history.map(m => `${m.role}: ${m.content}`).join('\n');
            
            const c2sResult = await sendLeadToC2S(supabase, {
              nome: existingName || 'Cliente',
              interesse: `Interesse em ${pendingProp?.tipo || 'imóvel'} - ${pendingProp?.bairro || ''}`,
              tipo_imovel: pendingProp?.tipo,
              bairro: pendingProp?.bairro,
              resumo: `Imóvel código ${pendingProp?.codigo || 'N/A'}`
            }, phoneNumber, historyText, existingName || undefined);
            
            await updateConsultativeState(supabase, phoneNumber, {
              awaiting_c2s_confirmation: false,
              c2s_pending_property: null
            });
            
            if (c2sResult.success) {
              c2sTransferred = true;
              const nameGreet = existingName ? `, ${existingName}` : '';
              aiResponse = `Perfeito${nameGreet}! 🎉 Seu interesse foi registrado. Um consultor vai entrar em contato em breve para organizar a visita ao imóvel ${pendingProp?.codigo || ''}.`;
            } else {
              aiResponse = `Ops, tive um probleminha técnico 😅 Mas não se preocupe, vou registrar seu interesse manualmente. Um consultor vai entrar em contato em breve!`;
            }
          } else if (confirmation === 'correction') {
            const detectedName = extractNameFromMessage(messageContent);
            if (detectedName) {
              await saveContactNameMake(supabase, phoneNumber, detectedName);
              
              const historyText = history.map(m => `${m.role}: ${m.content}`).join('\n');
              const c2sResult = await sendLeadToC2S(supabase, {
                nome: detectedName,
                interesse: `Interesse em ${pendingProp?.tipo || 'imóvel'} - ${pendingProp?.bairro || ''}`,
                tipo_imovel: pendingProp?.tipo,
                bairro: pendingProp?.bairro,
                resumo: `Imóvel código ${pendingProp?.codigo || 'N/A'}`
              }, phoneNumber, historyText, detectedName);
              
              await updateConsultativeState(supabase, phoneNumber, {
                awaiting_c2s_confirmation: false,
                c2s_pending_property: null
              });
              
              if (c2sResult.success) {
                c2sTransferred = true;
                aiResponse = `Perfeito, ${detectedName}! 🎉 Um consultor vai entrar em contato para organizar a visita ao imóvel ${pendingProp?.codigo || ''}.`;
              }
            } else {
              aiResponse = `Desculpa, não entendi 😅 Pode me confirmar seu nome completo?`;
            }
          } else if (confirmation === 'no') {
            await updateConsultativeState(supabase, phoneNumber, {
              awaiting_c2s_confirmation: false,
              c2s_pending_property: null
            });
            aiResponse = `Sem problemas! 😊 Quer que eu continue mostrando outras opções?`;
          } else {
            aiResponse = `Só pra confirmar: posso encaminhar seu interesse para um consultor entrar em contato? 😊`;
          }
        }
        // ===== PROPERTY FEEDBACK FLOW =====
        else if (isAwaitingFeedback && pendingProperties.length > 0) {
          const feedback = analyzePropertyFeedback(messageContent);
          console.log(`📊 Property feedback: ${feedback}`);
          
          if (feedback === 'positive') {
            const currentProperty = pendingProperties[currentIndex];
            // SEMPRE envia direto para C2S (dados já coletados na triagem)
            const clientName = existingName || 'Cliente';
            
            const historyText = history.map(m => `${m.role}: ${m.content}`).join('\n');
            const c2sResult = await sendLeadToC2S(supabase, {
              nome: clientName,
              interesse: `Interesse em ${currentProperty?.tipo || 'imóvel'} - ${currentProperty?.bairro || ''}`,
              tipo_imovel: currentProperty?.tipo,
              bairro: currentProperty?.bairro,
              resumo: `Imóvel código ${currentProperty?.codigo || 'N/A'}`
            }, phoneNumber, historyText, clientName);
            
            await updateConsultativeState(supabase, phoneNumber, {
              awaiting_property_feedback: false,
              pending_properties: []
            });
            
            if (c2sResult.success) {
              c2sTransferred = true;
              const nameGreet = existingName ? `, ${existingName}` : '';
              aiResponse = `Que ótimo${nameGreet}! 🎉 Seu interesse foi registrado. Um consultor vai entrar em contato em breve para organizar a visita.`;
            } else {
              aiResponse = `Excelente escolha! Vou registrar seu interesse e um consultor entrará em contato 😊`;
            }
          } else if (feedback === 'negative' || feedback === 'more_options' || feedback === 'interested_but_more') {
            const nextIndex = currentIndex + 1;
            
            if (nextIndex < pendingProperties.length) {
              propertiesToSend = [pendingProperties[nextIndex]];
              
              await updateConsultativeState(supabase, phoneNumber, {
                current_property_index: nextIndex,
                awaiting_property_feedback: true
              });
              
              const nameGreet = existingName ? `, ${existingName}` : '';
              
              if (feedback === 'interested_but_more') {
                aiResponse = `Que bom que gostou${nameGreet}! 😊 Vou guardar esse. Enquanto isso, olha essa outra opção:`;
              } else if (feedback === 'more_options') {
                aiResponse = `Claro${nameGreet}! 😊 Tenho mais esta opção:`;
              } else {
                aiResponse = `Entendi${nameGreet}! 😊 Tenho outra opção que pode ser mais adequada.`;
              }
            } else {
              await updateConsultativeState(supabase, phoneNumber, {
                awaiting_property_feedback: false,
                pending_properties: []
              });
              
              if (feedback === 'interested_but_more') {
                aiResponse = `Essas são as opções que encontrei! 😊 Quer que eu encaminhe o primeiro que você curtiu para um consultor entrar em contato?`;
              } else {
                aiResponse = `Entendi! Essas eram as opções que encontrei com esses critérios. 🤔\n\nPodemos ajustar a busca? Me conta o que não se encaixou (preço, tamanho, localização).`;
              }
            }
          } else {
            const currentProperty = pendingProperties[currentIndex];
            aiResponse = `O que você achou desse imóvel em ${currentProperty?.bairro || 'N/A'}? Faz sentido pra você? 😊`;
          }
        } else {
          // ===== NORMAL QUALIFICATION FLOW =====
          const priceFlexibility = detectPriceFlexibility(messageContent);
          if (priceFlexibility.type !== 'none' && !priceFlexibility.hasNewValue) {
            aiResponse = priceFlexibility.suggestedQuestion!;
          }
          else if (isWaitingSignal(messageContent)) {
            if (hasMinimumCriteriaToSearch(currentDepartment, qualProgress)) {
              const searchParams = buildSearchParamsFromQualification(currentDepartment, qualData);
              if (searchParams) {
                const fallbackResult = await searchPropertiesWithFallback(supabase, searchParams);
                
                if (fallbackResult.properties.length > 0) {
                  const allProperties = fallbackResult.properties.slice(0, 5);
                  
                  await updateConsultativeState(supabase, phoneNumber, {
                    pending_properties: allProperties,
                    current_property_index: 0,
                    awaiting_property_feedback: true,
                    last_search_params: searchParams
                  });
                  
                  propertiesToSend = [allProperties[0]];
                  aiResponse = buildFallbackMessage(fallbackResult.searchType, fallbackResult.originalParams, allProperties, existingName || undefined);
                } else {
                  aiResponse = `Não encontrei imóveis com esses critérios no momento 😔\n\nO que você prefere ajustar: preço, região ou número de quartos?`;
                }
              }
            } else {
              const nextQuestion = getNextQualificationQuestion(qualProgress, currentDepartment || 'locacao');
              aiResponse = nextQuestion || `Me conta mais sobre o que você procura 😊`;
            }
          }
          else {
            if (hasMinimumCriteriaToSearch(currentDepartment, qualProgress)) {
              const searchParams = buildSearchParamsFromQualification(currentDepartment, qualData);
              if (searchParams) {
                const fallbackResult = await searchPropertiesWithFallback(supabase, searchParams);
                
                if (fallbackResult.properties.length > 0) {
                  const allProperties = fallbackResult.properties.slice(0, 5);
                  
                  await updateConsultativeState(supabase, phoneNumber, {
                    pending_properties: allProperties,
                    current_property_index: 0,
                    awaiting_property_feedback: true,
                    last_search_params: searchParams
                  });
                  
                  propertiesToSend = [allProperties[0]];
                  aiResponse = buildFallbackMessage(fallbackResult.searchType, fallbackResult.originalParams, allProperties, existingName || undefined);
                } else {
                  aiResponse = `Poxa, não encontrei imóveis com esses critérios 😔\n\nO que você prefere flexibilizar: valor, região ou quartos?`;
                }
              }
            } else {
              const nextQuestion = getNextQualificationQuestion(qualProgress, currentDepartment || 'locacao');
              
              if (nextQuestion) {
                const nameGreet = existingName ? `, ${existingName}` : '';
                aiResponse = `${getRandomPhrase('agreement')}${nameGreet} ${nextQuestion}`;
              } else {
                let tools = toolsWithVista;
                const systemPrompt = getPromptForDepartment(agentConfig, currentDepartment, existingName || undefined, history, qualData);
                
                if (currentDepartment === 'administrativo') {
                  tools = [];
                }
                
                const result = await callOpenAI(systemPrompt, history, aiPromptMessage, tools);
                aiResponse = result.content;
                
                // Anti-loop detection
                if (isLoopingQuestion(aiResponse, qualData)) {
                  console.log('🔄 Loop detected! Replacing with fallback search');
                  if (hasMinimumCriteriaToSearch(currentDepartment, qualProgress)) {
                    const searchParams = buildSearchParamsFromQualification(currentDepartment, qualData);
                    if (searchParams) {
                      const fallbackResult = await searchPropertiesWithFallback(supabase, searchParams);
                      if (fallbackResult.properties.length > 0) {
                        const allProperties = fallbackResult.properties.slice(0, 5);
                        await updateConsultativeState(supabase, phoneNumber, {
                          pending_properties: allProperties,
                          current_property_index: 0,
                          awaiting_property_feedback: true,
                          last_search_params: searchParams
                        });
                        propertiesToSend = [allProperties[0]];
                        aiResponse = buildFallbackMessage(fallbackResult.searchType, fallbackResult.originalParams, allProperties, existingName || undefined);
                      } else {
                        aiResponse = `Não encontrei imóveis com esses critérios 😔 O que você prefere ajustar?`;
                      }
                    }
                  } else {
                    const nextQ = getNextQualificationQuestion(qualProgress, currentDepartment || 'locacao');
                    aiResponse = nextQ || 'Me conta mais sobre o que você busca 😊';
                  }
                }
  
                // Process tool calls
                for (const toolCall of result.toolCalls) {
                  const args = JSON.parse(toolCall.function.arguments);
                  console.log(`🔧 Tool call: ${toolCall.function.name}`, args);
                  
                  if (toolCall.function.name === 'buscar_imoveis') {
                    const fallbackResult = await searchPropertiesWithFallback(supabase, args);
                    
                    if (fallbackResult.properties.length > 0) {
                      const allProperties = fallbackResult.properties.slice(0, 5);
                      
                      await updateConsultativeState(supabase, phoneNumber, {
                        pending_properties: allProperties,
                        current_property_index: 0,
                        awaiting_property_feedback: true
                      });
                      
                      propertiesToSend = [allProperties[0]];
                      
                      if (!aiResponse || aiResponse.length < 10) {
                        aiResponse = buildFallbackMessage(fallbackResult.searchType, fallbackResult.originalParams, allProperties, existingName || undefined);
                      }
                    } else {
                      if (!aiResponse || aiResponse.length < 10) {
                        aiResponse = `Poxa, não encontrei imóveis com esses critérios 😔 Podemos flexibilizar algo?`;
                      }
                    }
                  }
                  
                  if (toolCall.function.name === 'enviar_lead_c2s') {
                    const historyText = history.map(m => `${m.role}: ${m.content}`).join('\n');
                    const c2sResult = await sendLeadToC2S(supabase, args, phoneNumber, historyText, existingName || undefined);
                    
                    if (c2sResult.success) {
                      c2sTransferred = true;
                    }
                  }
                }
              }
            }
          }
        }

        // Validate response
        const validation = validateAIResponse(aiResponse);
        if (!validation.valid) {
          aiResponse = FALLBACK_RESPONSE;
        }
        
        // Anti-repetition check
        if (conversationId && aiResponse) {
          const lastOutbound = await getLastOutboundMessage(supabase, conversationId);
          if (isSameMessage(lastOutbound, aiResponse)) {
            console.log('⚠️ Duplicate message detected - generating alternative');
            
            if (hasMinimumCriteriaToSearch(currentDepartment, qualProgress)) {
              const searchParams = buildSearchParamsFromQualification(currentDepartment, qualData);
              if (searchParams) {
                const fallbackResult = await searchPropertiesWithFallback(supabase, searchParams);
                if (fallbackResult.properties.length > 0) {
                  const allProperties = fallbackResult.properties.slice(0, 5);
                  await updateConsultativeState(supabase, phoneNumber, {
                    pending_properties: allProperties,
                    current_property_index: 0,
                    awaiting_property_feedback: true
                  });
                  propertiesToSend = [allProperties[0]];
                  aiResponse = buildFallbackMessage(fallbackResult.searchType, fallbackResult.originalParams, allProperties, existingName || undefined);
                } else {
                  aiResponse = 'Entendi que você está flexibilizando os critérios. Me confirma: quer que eu busque com qual valor máximo e região? 😊';
                }
              }
            } else {
              aiResponse = 'Entendi! Pra refinar a busca, me conta: qual o valor máximo que você considera? 💰';
            }
          }
        }
      }
    }

    // ===== AUDIO TTS GENERATION =====
    const audioConfig = await getAudioConfig(supabase);
    let audioResult: AudioResult | null = null;

    const userSentVoice = message_type === 'audio' || message_type === 'voice';
    const shouldGenerateAudio = audioConfig?.audio_enabled && aiResponse && userSentVoice;

    if (shouldGenerateAudio) {
      console.log('🎙️ Generating audio response (rapport strategy)');
      audioResult = await generateAudioResponse(aiResponse, audioConfig);
    }

    // Save outbound message
    if (aiResponse && conversationId) {
      await saveMessage(
        supabase, conversationId, phoneNumber, aiResponse, 'outbound',
        undefined,
        audioResult ? { type: 'audio', url: audioResult.audioUrl, mimeType: audioResult.contentType } : undefined,
        currentDepartment
      );
    }

    // Update conversation timestamp
    if (conversationId) {
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);
    }

    // Log the interaction
    await supabase.from('activity_logs').insert({
      user_id: '00000000-0000-0000-0000-000000000000',
      action_type: 'make_webhook_processed',
      target_table: 'messages',
      target_id: phoneNumber,
      metadata: {
        agent,
        development_detected: developmentDetected,
        c2s_transferred: c2sTransferred,
        conversation_id: conversationId,
        department: currentDepartment,
        properties_found: propertiesToSend.length,
        audio_generated: !!audioResult
      }
    });

    console.log(`✅ Processed - Agent: ${agent}, Dept: ${currentDepartment}, Props: ${propertiesToSend.length}, Audio: ${!!audioResult}`);

    // Get final states
    const finalState = await getConversationState(supabase, phoneNumber);
    const finalConsultativeState = await getConsultativeState(supabase, phoneNumber);
    
    const presentationState = finalConsultativeState?.awaiting_property_feedback ? {
      awaiting_feedback: true,
      current_index: finalConsultativeState.current_property_index || 0,
      total_found: (finalConsultativeState.pending_properties || []).length,
      property_code: propertiesToSend[0]?.codigo || null
    } : null;
    
    return new Response(
      JSON.stringify({
        success: true,
        result: aiResponse,
        phone: phoneNumber,
        agent,
        conversation_id: conversationId,
        department: currentDepartment,
        properties: propertiesToSend.length > 0 ? propertiesToSend.map(p => ({
          codigo: p.codigo,
          foto_destaque: p.foto_destaque,
          tipo: p.tipo,
          bairro: p.bairro,
          quartos: p.quartos,
          preco_formatado: p.preco_formatado,
          link: p.link,
          area_util: p.area_util,
          vagas: p.vagas,
          valor_condominio: p.valor_condominio,
          descricao: p.descricao || ''
        })) : undefined,
        presentation_state: presentationState,
        send_template: sendTriageTemplate ? { name: 'triagem', language: 'pt_BR' } : null,
        audio: audioResult ? {
          url: audioResult.audioUrl,
          type: audioResult.contentType,
          is_voice_message: audioResult.isVoiceMessage
        } : null,
        c2s_transferred: c2sTransferred,
        metadata: {
          development_detected: developmentDetected,
          media_processed: mediaProcessed || null,
          audio_enabled: audioConfig?.audio_enabled || false,
          triage_stage: finalState?.triage_stage || null,
          consultative_flow: !!presentationState
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in make-webhook:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error',
        result: 'Desculpe, tive um problema técnico. Pode tentar novamente?'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
