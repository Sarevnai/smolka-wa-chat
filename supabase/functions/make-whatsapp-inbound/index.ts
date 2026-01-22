import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Department types matching database enum
type DepartmentType = 'locacao' | 'administrativo' | 'vendas' | 'marketing' | null;

interface ConversationRecord {
  id: string;
  phone_number: string;
  department_code: DepartmentType;
  contact_id: string | null;
  status: string;
  stage_id: string | null;
}

// ========== TRIAGE BUTTON MAPPING ==========
const TRIAGE_BUTTON_IDS: Record<string, DepartmentType> = {
  'btn_locacao': 'locacao',
  'btn_vendas': 'vendas', 
  'btn_admin': 'administrativo'
};

const TRIAGE_BUTTON_TEXTS: Record<string, DepartmentType> = {
  'alugar': 'locacao',
  'comprar': 'vendas',
  'já sou cliente': 'administrativo'
};

const DEPARTMENT_WELCOMES: Record<string, string> = {
  locacao: 'Perfeito! Vou te ajudar a encontrar o imóvel ideal para alugar 🏠\n\nQual tipo de imóvel você procura? Apartamento, casa...?',
  vendas: 'Ótimo! Vou te ajudar a encontrar o imóvel perfeito para comprar 🏡\n\nQue tipo de imóvel você tem interesse?',
  administrativo: 'Certo! Estou aqui para te ajudar 📋\n\nPosso auxiliar com boletos, contratos, manutenção ou outras questões. O que você precisa?'
};

// ========== HELPER FUNCTIONS ==========

function extractTriageButtonId(message: any): { buttonId: string, department: DepartmentType } | null {
  const buttonReply = message.interactive?.button_reply;
  if (buttonReply?.id && TRIAGE_BUTTON_IDS[buttonReply.id]) {
    console.log(`🔘 Interactive button detected: ${buttonReply.id}`);
    return { buttonId: buttonReply.id, department: TRIAGE_BUTTON_IDS[buttonReply.id] };
  }
  
  const buttonText = message.button?.text?.toLowerCase()?.trim();
  if (buttonText && TRIAGE_BUTTON_TEXTS[buttonText]) {
    console.log(`🔘 Template quick_reply detected: "${buttonText}"`);
    return { buttonId: buttonText, department: TRIAGE_BUTTON_TEXTS[buttonText] };
  }
  
  const buttonPayload = message.button?.payload?.toLowerCase()?.trim();
  if (buttonPayload && TRIAGE_BUTTON_TEXTS[buttonPayload]) {
    console.log(`🔘 Template quick_reply payload detected: "${buttonPayload}"`);
    return { buttonId: buttonPayload, department: TRIAGE_BUTTON_TEXTS[buttonPayload] };
  }
  
  return null;
}

async function updateTriageStage(phoneNumber: string, stage: string) {
  const { error } = await supabase
    .from('conversation_states')
    .upsert({ 
      phone_number: phoneNumber, 
      triage_stage: stage,
      is_ai_active: true,
      updated_at: new Date().toISOString()
    }, { 
      onConflict: 'phone_number' 
    });
    
  if (error) {
    console.error('❌ Error updating triage stage:', error);
  } else {
    console.log(`✅ Triage stage updated to: ${stage}`);
  }
}

async function sendDepartmentWelcomeAndActivateAI(
  phoneNumber: string, 
  department: DepartmentType, 
  conversationId: string
) {
  if (!department) return;
  
  const { data: contact } = await supabase
    .from('contacts')
    .select('name')
    .eq('phone', phoneNumber)
    .maybeSingle();
  
  const name = contact?.name || '';
  let welcomeMessage = DEPARTMENT_WELCOMES[department] || DEPARTMENT_WELCOMES.locacao;
  
  if (name) {
    welcomeMessage = welcomeMessage.replace('Perfeito!', `Perfeito, ${name}!`);
    welcomeMessage = welcomeMessage.replace('Ótimo!', `Ótimo, ${name}!`);
    welcomeMessage = welcomeMessage.replace('Certo!', `Certo, ${name}!`);
  }
  
  const { error } = await supabase.functions.invoke('send-wa-message', {
    body: {
      to: phoneNumber,
      text: welcomeMessage,
      conversation_id: conversationId
    }
  });
  
  if (error) {
    console.error('❌ Error sending department welcome:', error);
  } else {
    console.log(`✅ Department welcome sent for ${department}`);
  }
}

async function checkCampaignSource(phoneNumber: string): Promise<DepartmentType> {
  try {
    const cutoffTime = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    
    const { data } = await supabase
      .from('campaign_results')
      .select('campaign_id, campaigns!inner(department_code)')
      .eq('phone', phoneNumber)
      .gte('sent_at', cutoffTime)
      .order('sent_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data?.campaigns?.department_code) {
      console.log(`📢 Phone ${phoneNumber} is from campaign with department: ${data.campaigns.department_code}`);
      return data.campaigns.department_code as DepartmentType;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error checking campaign source:', error);
    return null;
  }
}

function getPhoneVariations(phoneNumber: string): string[] {
  const variations = [phoneNumber];
  
  if (phoneNumber.startsWith('55') && phoneNumber.length === 12) {
    const withNine = phoneNumber.slice(0, 4) + '9' + phoneNumber.slice(4);
    variations.push(withNine);
  }
  
  if (phoneNumber.startsWith('55') && phoneNumber.length === 13) {
    const withoutNine = phoneNumber.slice(0, 4) + phoneNumber.slice(5);
    variations.push(withoutNine);
  }
  
  return variations;
}

async function findContactWithData(phoneNumber: string): Promise<{
  id: string;
  name: string | null;
  notes: string | null;
  department_code: string | null;
} | null> {
  const variations = getPhoneVariations(phoneNumber);
  
  const { data: contactWithNotes } = await supabase
    .from('contacts')
    .select('id, name, notes, department_code')
    .in('phone', variations)
    .not('notes', 'is', null)
    .limit(1)
    .maybeSingle();
  
  if (contactWithNotes) {
    console.log(`📇 Found contact WITH notes: ${contactWithNotes.id}`);
    return contactWithNotes;
  }
  
  const { data: anyContact } = await supabase
    .from('contacts')
    .select('id, name, notes, department_code')
    .in('phone', variations)
    .limit(1)
    .maybeSingle();
  
  if (anyContact) {
    console.log(`📇 Found contact (no notes): ${anyContact.id}`);
    return anyContact;
  }
  
  return null;
}

async function checkDevelopmentLead(phoneNumber: string): Promise<{
  development_id: string;
  development_name: string;
  contact_name: string | null;
  contact_phone: string;
} | null> {
  try {
    const phoneVariations = getPhoneVariations(phoneNumber);
    const cutoffTime = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
    
    const { data: portalLead } = await supabase
      .from('portal_leads_log')
      .select(`
        id,
        development_id,
        contact_name,
        contact_phone,
        developments!inner(name, slug)
      `)
      .in('contact_phone', phoneVariations)
      .not('development_id', 'is', null)
      .gte('created_at', cutoffTime)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!portalLead?.development_id) {
      return null;
    }

    console.log(`🏗️ Development lead found: ${(portalLead.developments as any)?.name}`);

    return {
      development_id: portalLead.development_id,
      development_name: (portalLead.developments as any)?.name || 'Unknown',
      contact_name: portalLead.contact_name,
      contact_phone: portalLead.contact_phone || phoneNumber
    };
  } catch (error) {
    console.error('❌ Error checking development lead:', error);
    return null;
  }
}

async function checkMarketingCampaignSource(phoneNumber: string): Promise<{
  isMarketingCampaign: boolean;
  contactNotes: string | null;
  contactName: string | null;
  contactId: string | null;
} | null> {
  try {
    const cutoffTime = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const phoneVariations = getPhoneVariations(phoneNumber);
    
    const { data: campaignResult } = await supabase
      .from('campaign_results')
      .select(`
        id,
        campaign_id,
        contact_id,
        phone,
        campaigns!inner(department_code, name)
      `)
      .in('phone', phoneVariations)
      .eq('campaigns.department_code', 'marketing')
      .gte('sent_at', cutoffTime)
      .order('sent_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!campaignResult) {
      return null;
    }

    console.log(`📢 Marketing campaign detected: ${(campaignResult.campaigns as any)?.name}`);

    const contact = await findContactWithData(phoneNumber);

    return {
      isMarketingCampaign: true,
      contactNotes: contact?.notes || null,
      contactName: contact?.name || null,
      contactId: contact?.id || null,
    };
  } catch (error) {
    console.error('❌ Error checking marketing campaign source:', error);
    return null;
  }
}

async function findOrCreateConversation(phoneNumber: string): Promise<ConversationRecord | null> {
  try {
    const { data: existingConv, error: findError } = await supabase
      .from('conversations')
      .select('id, phone_number, department_code, contact_id, status, stage_id')
      .eq('phone_number', phoneNumber)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (findError) {
      console.error('❌ Error finding conversation:', findError);
      return null;
    }

    if (existingConv) {
      console.log(`✅ Found existing conversation: ${existingConv.id} (dept: ${existingConv.department_code || 'pending'})`);
      return existingConv as ConversationRecord;
    }

    console.log(`📝 Creating new conversation for: ${phoneNumber}`);

    const campaignDepartment = await checkCampaignSource(phoneNumber);

    const { data: contact } = await supabase
      .from('contacts')
      .select('id, department_code')
      .eq('phone', phoneNumber)
      .maybeSingle();

    const departmentCode = campaignDepartment || contact?.department_code || null;
    
    if (campaignDepartment) {
      console.log(`📢 New conversation from campaign - department: ${campaignDepartment}`);
    }

    const { data: newConv, error: createError } = await supabase
      .from('conversations')
      .insert({
        phone_number: phoneNumber,
        contact_id: contact?.id || null,
        department_code: departmentCode,
        status: 'active',
        last_message_at: new Date().toISOString()
      })
      .select('id, phone_number, department_code, contact_id, status, stage_id')
      .single();

    if (createError) {
      console.error('❌ Error creating conversation:', createError);
      return null;
    }

    if (campaignDepartment && contact?.id) {
      await supabase
        .from('contacts')
        .update({ department_code: campaignDepartment })
        .eq('id', contact.id);
    }

    console.log(`✅ New conversation created: ${newConv.id}`);
    return newConv as ConversationRecord;

  } catch (error) {
    console.error('❌ Error in findOrCreateConversation:', error);
    return null;
  }
}

async function updateConversationTimestamp(conversationId: string) {
  try {
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId);
  } catch (error) {
    console.error('Error updating conversation timestamp:', error);
  }
}

async function assignDepartmentToConversation(
  conversationId: string, 
  department: DepartmentType,
  qualificationData?: any
) {
  try {
    if (!department) return;

    const { data: firstStage } = await supabase
      .from('conversation_stages')
      .select('id')
      .eq('department_code', department)
      .order('order_index', { ascending: true })
      .limit(1)
      .maybeSingle();

    const updateData: any = {
      department_code: department,
    };

    if (firstStage) {
      updateData.stage_id = firstStage.id;
    }

    if (qualificationData) {
      updateData.qualification_data = qualificationData;
    }

    const { data: updatedConv, error } = await supabase
      .from('conversations')
      .update(updateData)
      .eq('id', conversationId)
      .select('phone_number, contact_id')
      .single();

    if (error) {
      console.error('❌ Error assigning department:', error);
      return;
    }
    
    console.log(`✅ Department ${department} assigned to conversation ${conversationId}`);

    if (updatedConv?.phone_number) {
      await supabase
        .from('contacts')
        .update({ department_code: department })
        .eq('phone', updatedConv.phone_number);
    }
  } catch (error) {
    console.error('Error in assignDepartmentToConversation:', error);
  }
}

async function ensureContactExists(phoneNumber: string) {
  try {
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id')
      .eq('phone', phoneNumber)
      .maybeSingle();

    if (!existingContact) {
      const { error: createError } = await supabase
        .from('contacts')
        .insert([{
          phone: phoneNumber,
          status: 'ativo',
          onboarding_status: 'completed'
        }]);

      if (createError) {
        console.error('Error creating contact:', createError);
      } else {
        console.log(`✅ New contact created: ${phoneNumber}`);
      }
    }
  } catch (error) {
    console.error('Error in ensureContactExists:', error);
  }
}

function checkBusinessHours(businessHours: { start: string; end: string; days: number[]; timezone: string } | null): boolean {
  if (!businessHours) {
    console.log('⚠️ Business hours not configured, defaulting to within hours');
    return true;
  }

  const now = new Date();
  
  let timezoneOffset = 0;
  if (businessHours.timezone === 'America/Sao_Paulo') {
    timezoneOffset = -3;
  } else if (businessHours.timezone === 'America/New_York') {
    timezoneOffset = -5;
  }
  
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  let localHours = utcHours + timezoneOffset;
  
  let dayOffset = 0;
  if (localHours < 0) {
    localHours += 24;
    dayOffset = -1;
  } else if (localHours >= 24) {
    localHours -= 24;
    dayOffset = 1;
  }
  
  const utcDay = now.getUTCDay();
  let currentDay = utcDay + dayOffset;
  if (currentDay < 0) currentDay = 6;
  if (currentDay > 6) currentDay = 0;
  
  if (!businessHours.days.includes(currentDay)) {
    console.log(`📅 Day ${currentDay} is not a business day`);
    return false;
  }

  const [startHour, startMin] = businessHours.start.split(':').map(Number);
  const [endHour, endMin] = businessHours.end.split(':').map(Number);
  
  const currentTime = localHours * 60 + utcMinutes;
  const startTime = startHour * 60 + startMin;
  const endTime = endHour * 60 + endMin;

  const isWithin = currentTime >= startTime && currentTime <= endTime;
  console.log(`🕐 Local: ${localHours}:${utcMinutes}, Hours: ${businessHours.start}-${businessHours.end}, Within: ${isWithin}`);
  
  return isWithin;
}

async function getConversationHistory(conversationId: string): Promise<Array<{ role: string; content: string }>> {
  const { data: recentMessages } = await supabase
    .from('messages')
    .select('body, direction, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (!recentMessages) return [];

  return recentMessages
    .reverse()
    .filter(msg => msg.body)
    .map(msg => ({
      role: msg.direction === 'inbound' ? 'user' : 'assistant',
      content: msg.body || ''
    }));
}

// ========== OUTBOUND MESSAGE STRUCTURE ==========
interface OutboundMessage {
  to: string;
  type: 'text' | 'template' | 'interactive' | 'image' | 'audio';
  text?: string;
  template_name?: string;
  template_components?: any;
  interactive?: any;
  media_url?: string;
  caption?: string;
}

interface AIRoutingResult {
  agent?: string;
  result?: any;
  skipped?: boolean;
  reason?: string;
  error?: string;
  // Proxy mode fields
  should_send_message?: boolean;
  outbound_messages?: OutboundMessage[];
  escalated?: boolean;
  escalated_to_setor?: string;
  finalized?: boolean;
}

// ========== MAIN AI ROUTING LOGIC ==========

async function handleAIRouting(
  phoneNumber: string, 
  messageBody: string, 
  message: any, 
  conversation: ConversationRecord | null
): Promise<AIRoutingResult> {
  try {
    // Check if operator has taken over
    const { data: convState } = await supabase
      .from('conversation_states')
      .select('is_ai_active, operator_id, operator_takeover_at')
      .eq('phone_number', phoneNumber)
      .maybeSingle();

    if (convState?.operator_id && !convState?.is_ai_active) {
      console.log(`⏭️ Skipping AI - operator ${convState.operator_id} handling conversation`);
      return { skipped: true, reason: 'operator_takeover', should_send_message: false };
    }

    // 🏗️ CHECK FOR DEVELOPMENT LEAD FIRST (Arya Vendas)
    const developmentLead = await checkDevelopmentLead(phoneNumber);
    
    if (developmentLead?.development_id) {
      console.log(`🏗️ Routing to ai-arya-vendas: ${developmentLead.development_name}`);
      
      const conversationHistory = conversation?.id 
        ? await getConversationHistory(conversation.id) 
        : [];

      const { data: aryaResult, error: aryaError } = await supabase.functions.invoke('ai-arya-vendas', {
        body: {
          phone_number: phoneNumber,
          message: messageBody,
          development_id: developmentLead.development_id,
          conversation_history: conversationHistory,
          contact_name: developmentLead.contact_name,
          proxy_mode: true // NEW: Enable proxy mode
        }
      });

      if (aryaError) {
        console.error('❌ Error calling ai-arya-vendas:', aryaError);
        return { agent: 'ai-arya-vendas', error: String(aryaError), should_send_message: false };
      }

      console.log('✅ ai-arya-vendas response:', aryaResult);
      
      if (aryaResult?.c2s_transferred) {
        await supabase
          .from('portal_leads_log')
          .update({ 
            crm_status: 'sent',
            crm_sent_at: new Date().toISOString(),
            ai_attended: true,
            ai_attended_at: new Date().toISOString()
          })
          .eq('contact_phone', phoneNumber)
          .eq('development_id', developmentLead.development_id);
      }

      // Build outbound messages from response
      const outboundMessages: OutboundMessage[] = [];
      
      if (aryaResult?.response) {
        outboundMessages.push({
          to: phoneNumber,
          type: 'text',
          text: aryaResult.response
        });
      }
      
      // Handle materials if sent
      if (aryaResult?.material_sent && aryaResult?.material_url) {
        outboundMessages.push({
          to: phoneNumber,
          type: 'image',
          media_url: aryaResult.material_url,
          caption: aryaResult.material_caption || ''
        });
      }

      return { 
        agent: 'ai-arya-vendas', 
        result: aryaResult,
        should_send_message: outboundMessages.length > 0,
        outbound_messages: outboundMessages
      };
    }

    // 📢 CHECK FOR MARKETING
    let isMarketingFlow = false;
    let marketingContactNotes: string | null = null;
    let marketingContactName: string | null = null;

    const marketingCampaign = await checkMarketingCampaignSource(phoneNumber);
    
    if (marketingCampaign?.isMarketingCampaign) {
      console.log(`📢 Marketing campaign response detected`);
      isMarketingFlow = true;
      marketingContactNotes = marketingCampaign.contactNotes;
      marketingContactName = marketingCampaign.contactName;
    } else {
      const contact = await findContactWithData(phoneNumber);
      if (contact?.department_code === 'marketing' || conversation?.department_code === 'marketing') {
        console.log(`📇 Marketing department detected`);
        isMarketingFlow = true;
        marketingContactNotes = contact?.notes || null;
        marketingContactName = contact?.name || null;
      }
    }
    
    if (isMarketingFlow) {
      console.log(`📢 Routing to ai-marketing-agent`);
      
      const conversationHistory = conversation?.id 
        ? await getConversationHistory(conversation.id) 
        : [];

      const { data: aiResult, error: aiError } = await supabase.functions.invoke('ai-marketing-agent', {
        body: {
          phone_number: phoneNumber,
          message: messageBody,
          contact_name: marketingContactName,
          contact_notes: marketingContactNotes,
          conversation_history: conversationHistory,
        }
      });

      if (aiError) {
        console.error('❌ Error calling ai-marketing-agent:', aiError);
        return { agent: 'ai-marketing-agent', error: String(aiError), should_send_message: false };
      }

      console.log('✅ ai-marketing-agent response:', aiResult);
      
      // ai-marketing-agent already returns response without sending
      // Build outbound message for Make to send
      const outboundMessages: OutboundMessage[] = [];
      
      if (aiResult?.response) {
        outboundMessages.push({
          to: phoneNumber,
          type: 'text',
          text: aiResult.response
        });
      }

      if (aiResult?.escalated) {
        await supabase
          .from('conversation_states')
          .upsert({
            phone_number: phoneNumber,
            is_ai_active: false,
            updated_at: new Date().toISOString()
          }, { onConflict: 'phone_number' });
      }

      if (aiResult?.finalized) {
        await supabase
          .from('campaign_results')
          .update({ replied_at: new Date().toISOString() })
          .eq('phone', phoneNumber)
          .is('replied_at', null);
      }

      return { 
        agent: 'ai-marketing-agent', 
        result: aiResult,
        should_send_message: outboundMessages.length > 0,
        outbound_messages: outboundMessages,
        escalated: aiResult?.escalated,
        escalated_to_setor: aiResult?.escalated_to_setor,
        finalized: aiResult?.finalized
      };
    }

    // 🤖 DEFAULT: AI VIRTUAL AGENT (Vendas/Locação/Admin)
    const { data: allSettings } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['n8n_force_ai_mode', 'business_hours', 'ai_agent_mode']);

    const settingsMap: Record<string, any> = {};
    allSettings?.forEach(s => { settingsMap[s.setting_key] = s.setting_value; });

    const forceAIRaw = settingsMap['n8n_force_ai_mode'];
    const forceAIMode = forceAIRaw?.value === true || forceAIRaw === true;
    
    if (!forceAIMode) {
      const businessHours = settingsMap['business_hours'] as { 
        start: string; end: string; days: number[]; timezone: string 
      } | null;

      const isWithinBusinessHours = checkBusinessHours(businessHours);
      
      if (isWithinBusinessHours && !convState?.is_ai_active) {
        console.log('⏰ Within business hours - human agents available');
        return { skipped: true, reason: 'business_hours', should_send_message: false };
      }
    }

    console.log('🤖 Routing to ai-virtual-agent (proxy_mode=true)');

    const { data: contact } = await supabase
      .from('contacts')
      .select('name, contact_type')
      .eq('phone', phoneNumber)
      .maybeSingle();

    const agentPayload = {
      phoneNumber,
      messageBody,
      messageType: message.type || 'text',
      contactName: contact?.name,
      contactType: contact?.contact_type,
      conversationId: conversation?.id || null,
      currentDepartment: conversation?.department_code || null,
      isPendingTriage: !conversation?.department_code,
      proxy_mode: true // NEW: Enable proxy mode
    };

    const { data: triggerResult, error: triggerError } = await supabase.functions.invoke('ai-virtual-agent', {
      body: agentPayload
    });

    if (triggerError) {
      console.error('❌ Error triggering ai-virtual-agent:', triggerError);
      return { agent: 'ai-virtual-agent', error: String(triggerError), should_send_message: false };
    }

    console.log('✅ ai-virtual-agent response:', triggerResult);
    
    if (triggerResult?.assignedDepartment && conversation?.id) {
      await assignDepartmentToConversation(
        conversation.id,
        triggerResult.assignedDepartment as DepartmentType,
        triggerResult.qualificationData
      );
    }

    // Build outbound messages from virtual agent response
    const outboundMessages: OutboundMessage[] = [];
    
    if (triggerResult?.outbound_messages && Array.isArray(triggerResult.outbound_messages)) {
      // Use messages from agent directly
      outboundMessages.push(...triggerResult.outbound_messages);
    } else if (triggerResult?.response) {
      // Fallback to simple text response
      outboundMessages.push({
        to: phoneNumber,
        type: 'text',
        text: triggerResult.response
      });
    }

    return { 
      agent: 'ai-virtual-agent', 
      result: triggerResult,
      should_send_message: outboundMessages.length > 0,
      outbound_messages: outboundMessages
    };

  } catch (error) {
    console.error('Error in handleAIRouting:', error);
    return { error: String(error), should_send_message: false };
  }
}

// ========== PROCESS INCOMING MESSAGE ==========

async function processIncomingMessage(phoneNumber: string, messageBody: string, rawMessage: any) {
  console.log('🟢 PROCESSING INBOUND MESSAGE via Make');
  console.log('📱 From:', phoneNumber);
  console.log('💬 Body:', messageBody?.substring(0, 100));

  // Find or create conversation
  const conversation = await findOrCreateConversation(phoneNumber);
  const conversationId = conversation?.id || null;

  if (conversation) {
    console.log(`📍 Conversation: ${conversationId} (dept: ${conversation.department_code || 'pending'})`);
  }

  // Build message data
  const messageData = {
    wa_message_id: rawMessage.id || `make_${Date.now()}`,
    wa_from: phoneNumber,
    wa_to: null,
    wa_phone_number_id: null,
    direction: 'inbound' as const,
    body: messageBody || 'Mensagem recebida',
    wa_timestamp: rawMessage.timestamp 
      ? new Date(parseInt(rawMessage.timestamp) * 1000).toISOString() 
      : new Date().toISOString(),
    raw: rawMessage,
    is_template: false,
    conversation_id: conversationId,
    department_code: conversation?.department_code || null,
  };

  // Check for duplicate
  const { data: existingMessage } = await supabase
    .from('messages')
    .select('id')
    .eq('wa_message_id', messageData.wa_message_id)
    .maybeSingle();

  if (existingMessage) {
    console.log(`⏭️ Duplicate message ${messageData.wa_message_id} - skipping`);
    return { duplicate: true };
  }

  // Insert message
  const { data: insertedData, error } = await supabase
    .from('messages')
    .insert([messageData])
    .select();

  if (error) {
    console.error('❌ Error inserting message:', error);
    return { error: String(error) };
  }

  console.log('✅ Message inserted:', insertedData?.[0]?.id);
  
  // Update conversation timestamp
  if (conversationId) {
    await updateConversationTimestamp(conversationId);
  }
  
  // Ensure contact exists
  await ensureContactExists(phoneNumber);
  
  // ========== TRIAGE BUTTON INTERCEPTION ==========
  const triageInfo = extractTriageButtonId(rawMessage);
  if (triageInfo && conversation?.id && !conversation.department_code) {
    const departmentCode = triageInfo.department;
    console.log(`🎯 Triage button: ${triageInfo.buttonId} → ${departmentCode}`);
    
    await assignDepartmentToConversation(conversation.id, departmentCode);
    await updateTriageStage(phoneNumber, 'completed');
    await sendDepartmentWelcomeAndActivateAI(phoneNumber, departmentCode, conversation.id);
    
    // Triage completed - send welcome message via proxy
    const welcomeText = DEPARTMENT_WELCOMES[departmentCode] || DEPARTMENT_WELCOMES.locacao;
    
    return { 
      triage: true, 
      department: departmentCode,
      should_send_message: true,
      outbound_message: {
        to: phoneNumber,
        type: 'text',
        text: welcomeText
      }
    };
  }
  
  // ========== AI ROUTING ==========
  const aiResult = await handleAIRouting(phoneNumber, messageBody, rawMessage, conversation);
  
  // Build response with proxy mode data
  return {
    message_id: insertedData?.[0]?.id,
    conversation_id: conversationId,
    department: conversation?.department_code,
    ai: aiResult,
    // Proxy mode fields at top level for easy access in Make
    should_send_message: aiResult.should_send_message || false,
    outbound_messages: aiResult.outbound_messages || [],
    escalated: aiResult.escalated,
    escalated_to_setor: aiResult.escalated_to_setor,
    finalized: aiResult.finalized
  };
}

// ========== MAIN SERVER ==========

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate API key
    const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace('Bearer ', '');
    const expectedKey = Deno.env.get('MAKE_API_KEY');

    if (!expectedKey || apiKey !== expectedKey) {
      console.error('❌ Invalid or missing API key');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json();
    console.log('📦 Make payload received:', JSON.stringify(body, null, 2));

    let phoneNumber: string;
    let messageBody: string;
    let rawMessage: any;

    // ========== SUPPORT TWO PAYLOAD FORMATS ==========
    
    // Format A: WhatsApp original payload (Make repasses entry[])
    if (body.entry && body.entry.length > 0) {
      console.log('📋 Processing WhatsApp original format');
      
      for (const entry of body.entry) {
        if (entry.changes && entry.changes.length > 0) {
          for (const change of entry.changes) {
            if (change.field === 'messages' && change.value.messages) {
              for (const message of change.value.messages) {
                phoneNumber = message.from;
                messageBody = message.text?.body || message.button?.text || message.interactive?.button_reply?.title || '';
                rawMessage = message;
                
                const result = await processIncomingMessage(phoneNumber, messageBody, rawMessage);
                
                return new Response(JSON.stringify({
                  success: true,
                  format: 'whatsapp_original',
                  result
                }), {
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
              }
            }
          }
        }
      }
      
      return new Response(JSON.stringify({ success: true, message: 'No messages to process' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Format B: Simplified JSON from Make
    if (body.phone_number && body.message !== undefined) {
      console.log('📋 Processing simplified format');
      
      phoneNumber = body.phone_number;
      messageBody = body.message || '';
      rawMessage = {
        id: body.message_id || `make_${Date.now()}`,
        from: phoneNumber,
        timestamp: body.timestamp || null,
        type: body.message_type || 'text',
        text: { body: messageBody },
        // Preserve any additional fields
        ...body
      };
      
      const result = await processIncomingMessage(phoneNumber, messageBody, rawMessage);
      
      return new Response(JSON.stringify({
        success: true,
        format: 'simplified',
        result
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Invalid format
    return new Response(JSON.stringify({ 
      error: 'Invalid payload format',
      hint: 'Use WhatsApp original format (entry[]) or simplified format (phone_number + message)'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error in make-whatsapp-inbound:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
