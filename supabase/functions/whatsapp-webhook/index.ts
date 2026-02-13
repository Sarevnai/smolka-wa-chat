import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getPhoneVariations } from '../_shared/phone-utils.ts';
import { extractTriageButtonId, updateTriageStage, assignDepartmentToConversation, DEPARTMENT_WELCOMES, type DepartmentType } from '../_shared/triage.ts';
import { extractMediaInfo } from '../_shared/media.ts';
import { checkBusinessHours, type BusinessHoursConfig } from '../_shared/business-hours.ts';
import { getAudioConfig, generateAudioResponse } from '../_shared/audio.ts';
import { logAIError } from '../_shared/error-logging.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ConversationRecord {
  id: string;
  phone_number: string;
  department_code: DepartmentType;
  contact_id: string | null;
  status: string;
  stage_id: string | null;
}

// ========== TTS-AWARE RESPONSE ==========

async function sendAIResponse(
  phoneNumber: string,
  responseText: string,
  conversationId: string | null,
  agentName: string = 'AI'
): Promise<void> {
  const audioConfig = await getAudioConfig(supabase);
  
  const sendText = !audioConfig?.audio_enabled || 
                   audioConfig.audio_mode === 'text_only' || 
                   audioConfig.audio_mode === 'text_and_audio';
  
  const sendAudio = audioConfig?.audio_enabled && 
                    (audioConfig.audio_mode === 'audio_only' || 
                     audioConfig.audio_mode === 'text_and_audio');

  if (sendText) {
    await supabase.functions.invoke('send-wa-message', {
      body: { to: phoneNumber, text: responseText, conversation_id: conversationId }
    });
  }
  
  if (sendAudio && audioConfig) {
    const audioResult = await generateAudioResponse(responseText, audioConfig);
    if (audioResult) {
      await supabase.functions.invoke('send-wa-media', {
        body: {
          to: phoneNumber,
          mediaUrl: audioResult.audioUrl,
          mediaType: 'audio',
          mimeType: audioResult.contentType || 'audio/mpeg',
          conversation_id: conversationId
        }
      });
    } else if (audioConfig.audio_mode === 'audio_only') {
      await supabase.functions.invoke('send-wa-message', {
        body: { to: phoneNumber, text: responseText, conversation_id: conversationId }
      });
    }
  }
}

// ========== CONTACT & CONVERSATION HELPERS ==========

async function findContactWithData(phoneNumber: string) {
  const variations = getPhoneVariations(phoneNumber);
  
  // Priority: contact WITH notes (property data)
  const { data: contactWithNotes } = await supabase
    .from('contacts')
    .select('id, name, notes, department_code')
    .in('phone', variations)
    .not('notes', 'is', null)
    .limit(1)
    .maybeSingle();
  
  if (contactWithNotes) return contactWithNotes;
  
  const { data: anyContact } = await supabase
    .from('contacts')
    .select('id, name, notes, department_code')
    .in('phone', variations)
    .limit(1)
    .maybeSingle();
  
  return anyContact || null;
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
      console.log(`📢 Phone ${phoneNumber} is from campaign: ${data.campaigns.department_code}`);
      return data.campaigns.department_code as DepartmentType;
    }
    return null;
  } catch (error) {
    console.error('❌ Error checking campaign source:', error);
    return null;
  }
}

async function checkMarketingCampaignSource(phoneNumber: string) {
  try {
    const cutoffTime = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const phoneVariations = getPhoneVariations(phoneNumber);
    
    const { data: campaignResult } = await supabase
      .from('campaign_results')
      .select('id, campaign_id, contact_id, phone, campaigns!inner(department_code, name)')
      .in('phone', phoneVariations)
      .eq('campaigns.department_code', 'marketing')
      .gte('sent_at', cutoffTime)
      .order('sent_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!campaignResult) return null;

    console.log(`📢 Marketing campaign detected for ${phoneNumber}: ${(campaignResult.campaigns as any)?.name}`);
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

async function detectDevelopmentFromMessage(messageBody: string) {
  try {
    if (!messageBody || messageBody.length < 5) return null;
    const { data: developments } = await supabase
      .from('developments')
      .select('id, name, slug')
      .eq('is_active', true);

    if (!developments?.length) return null;

    const normalizedMessage = messageBody.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    for (const dev of developments) {
      const normalizedName = dev.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (normalizedName.length >= 5 && normalizedMessage.includes(normalizedName)) {
        return { development_id: dev.id, development_name: dev.name };
      }
      if (dev.slug) {
        const normalizedSlug = dev.slug.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (normalizedSlug.length >= 5 && normalizedMessage.includes(normalizedSlug)) {
          return { development_id: dev.id, development_name: dev.name };
        }
      }
    }
    return null;
  } catch (error) {
    console.error('❌ Error detecting development from message:', error);
    return null;
  }
}

async function checkDevelopmentLead(phoneNumber: string) {
  try {
    const phoneVariations = getPhoneVariations(phoneNumber);
    const cutoffTime = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
    
    const { data: portalLead } = await supabase
      .from('portal_leads_log')
      .select('id, development_id, contact_name, contact_phone, developments!inner(name, slug)')
      .in('contact_phone', phoneVariations)
      .not('development_id', 'is', null)
      .gte('created_at', cutoffTime)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!portalLead?.development_id) return null;

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

    if (findError) { console.error('❌ Error finding conversation:', findError); return null; }
    if (existingConv) {
      console.log(`✅ Found conversation: ${existingConv.id} (dept: ${existingConv.department_code || 'pending'})`);
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

    if (createError) { console.error('❌ Error creating conversation:', createError); return null; }

    if (campaignDepartment && contact?.id) {
      await supabase.from('contacts').update({ department_code: campaignDepartment }).eq('id', contact.id);
    }

    console.log(`✅ New conversation: ${newConv.id} (dept: ${departmentCode || 'pending triage'})`);
    return newConv as ConversationRecord;
  } catch (error) {
    console.error('❌ Error in findOrCreateConversation:', error);
    return null;
  }
}

async function ensureContactExists(phoneNumber: string) {
  try {
    const { data: existing } = await supabase.from('contacts').select('id').eq('phone', phoneNumber).maybeSingle();
    if (!existing) {
      await supabase.from('contacts').insert([{ phone: phoneNumber, status: 'ativo', onboarding_status: 'completed' }]);
      console.log(`✅ New contact created: ${phoneNumber}`);
    }
  } catch (error) {
    console.error('Error in ensureContactExists:', error);
  }
}

function extractNameFromMessage(messageBody: string): string | null {
  if (!messageBody) return null;
  const text = messageBody.toLowerCase().trim();
  
  const namePatterns = [
    /(?:^|[.\s])(?:oi|olá|ola|e ai|eai|hey|hello)[,\s]*(?:sou|eu sou|me chamo|meu nome é|é o|é a|aqui é o|aqui é a)\s+([a-záàâãéêíóôõúç\s]{2,30}?)(?:[.\s]|$)/i,
    /(?:^|[.\s])(?:sou o|sou a|sou)\s+([a-záàâãéêíóôõúç\s]{2,30}?)(?:[.\s]|$)/i,
    /(?:^|[.\s])(?:me chamo|meu nome é)\s+([a-záàâãéêíóôõúç\s]{2,30}?)(?:[.\s]|$)/i,
    /(?:^|[.\s])(?:aqui é o|aqui é a|aqui quem fala é o|aqui quem fala é a)\s+([a-záàâãéêíóôõúç\s]{2,30}?)(?:[.\s]|$)/i,
    /(?:^|[.\s])(?:é o|é a)\s+([a-záàâãéêíóôõúç\s]{2,30}?)(?:\s+(?:falando|aqui|mesmo))?(?:[.\s]|$)/i
  ];
  
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const name = match[1].trim();
      if (name.length >= 2 && name.length <= 30 && !name.match(/^\d+$/) && !name.includes('whatsapp') && !name.includes('número')) {
        return name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }
    }
  }
  return null;
}

// ========== GET CONVERSATION HISTORY ==========

async function getConversationHistory(conversationId: string, skipCurrent: boolean = false) {
  const limit = skipCurrent ? 11 : 10;
  const { data: recentMessages } = await supabase
    .from('messages')
    .select('body, direction, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!recentMessages) return [];
  
  const messages = skipCurrent && recentMessages.length > 1 
    ? recentMessages.slice(1) 
    : recentMessages;
  
  return messages
    .reverse()
    .filter(msg => msg.body)
    .map(msg => ({
      role: msg.direction === 'inbound' ? 'user' : 'assistant',
      content: msg.body || ''
    }));
}

// ========== STATUS PROCESSING ==========

async function processMessageStatus(status: any) {
  try {
    const waMessageId = status.id;
    const statusType = status.status;
    const timestamp = status.timestamp ? new Date(parseInt(status.timestamp) * 1000).toISOString() : new Date().toISOString();
    
    // Update campaign_results
    const { data: campaignResult } = await supabase
      .from('campaign_results')
      .select('id, campaign_id')
      .eq('phone', status.recipient_id)
      .order('sent_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (campaignResult) {
      const updateData: any = { status: statusType };
      switch (statusType) {
        case 'delivered': updateData.delivered_at = timestamp; break;
        case 'read': updateData.read_at = timestamp; break;
        case 'failed':
          const errorInfo = status.errors?.[0];
          updateData.error_message = errorInfo 
            ? `${errorInfo.code}: ${errorInfo.title || errorInfo.message}${errorInfo.details ? ` - ${errorInfo.details}` : ''}`
            : 'Failed to deliver';
          break;
      }
      
      await supabase.from('campaign_results').update(updateData).eq('id', campaignResult.id);
      
      if (statusType === 'delivered') {
        await supabase.rpc('increment_campaign_delivered', { campaign_id_param: campaignResult.campaign_id }).catch(() => {});
      }
    }
    
    // Merge status into message raw data
    const { data: existingMessage } = await supabase
      .from('messages')
      .select('raw')
      .eq('wa_message_id', waMessageId)
      .maybeSingle();
    
    const existingRaw = (existingMessage?.raw as Record<string, unknown>) || {};
    await supabase
      .from('messages')
      .update({ raw: { ...existingRaw, status } })
      .eq('wa_message_id', waMessageId);
      
  } catch (error) {
    console.error('Error processing message status:', error);
  }
}

// ========== DEPARTMENT WELCOME ==========

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
  
  await sendAIResponse(phoneNumber, welcomeMessage, conversationId, 'department-welcome');
}

// ========== AI ROUTING ==========

async function handleAIRouting(
  phoneNumber: string,
  messageBody: string,
  message: any,
  conversation: ConversationRecord | null
) {
  try {
    // Check operator takeover
    const { data: convState } = await supabase
      .from('conversation_states')
      .select('is_ai_active, operator_id, operator_takeover_at')
      .eq('phone_number', phoneNumber)
      .maybeSingle();

    if (convState?.operator_id && !convState?.is_ai_active) {
      console.log(`⏭️ Skipping AI - operator handling conversation`);
      return;
    }

    // === PRIORITY 0: Development/empreendimento lead ===
    let developmentLead = await checkDevelopmentLead(phoneNumber);
    
    if (!developmentLead?.development_id) {
      const detectedDev = await detectDevelopmentFromMessage(messageBody);
      if (detectedDev) {
        const contact = await findContactWithData(phoneNumber);
        await supabase.from('portal_leads_log').insert({
          portal_origin: 'whatsapp_direct',
          lead_source_type: 'whatsapp_mention',
          development_id: detectedDev.development_id,
          contact_phone: phoneNumber,
          contact_name: contact?.name || null,
          message: messageBody,
          status: 'processed',
          processed_at: new Date().toISOString()
        });
        
        developmentLead = {
          development_id: detectedDev.development_id,
          development_name: detectedDev.development_name,
          contact_name: contact?.name || null,
          contact_phone: phoneNumber
        };
      }
    }
    
    if (developmentLead?.development_id) {
      console.log(`🏗️ Routing to ai-vendas: ${developmentLead.development_name}`);
      const conversationHistory = conversation?.id 
        ? await getConversationHistory(conversation.id, true) 
        : [];

      const { data: vendasResult, error: vendasError } = await supabase.functions.invoke('ai-vendas', {
        body: {
          phone_number: phoneNumber,
          message: messageBody,
          development_id: developmentLead.development_id,
          conversation_history: conversationHistory,
          contact_name: developmentLead.contact_name
        }
      });

      if (vendasError) {
        console.error('❌ Error calling ai-vendas:', vendasError);
        await logAIError(supabase, { agent_name: 'ai-vendas', error_type: 'invocation_error', error_message: String(vendasError), phone_number: phoneNumber, conversation_id: conversation?.id });
      } else if (vendasResult?.c2s_transferred) {
        await supabase.from('portal_leads_log')
          .update({ crm_status: 'sent', crm_sent_at: new Date().toISOString(), ai_attended: true, ai_attended_at: new Date().toISOString() })
          .eq('contact_phone', phoneNumber)
          .eq('development_id', developmentLead.development_id);
      }
      return;
    }

    // === PRIORITY 1: Marketing flow ===
    let isMarketingFlow = false;
    let marketingContactNotes: string | null = null;
    let marketingContactName: string | null = null;

    const marketingCampaign = await checkMarketingCampaignSource(phoneNumber);
    if (marketingCampaign?.isMarketingCampaign) {
      isMarketingFlow = true;
      marketingContactNotes = marketingCampaign.contactNotes;
      marketingContactName = marketingCampaign.contactName;
    } else {
      const contact = await findContactWithData(phoneNumber);
      if (contact?.department_code === 'marketing' || conversation?.department_code === 'marketing') {
        isMarketingFlow = true;
        marketingContactNotes = contact?.notes || null;
        marketingContactName = contact?.name || null;
      }
    }
    
    if (isMarketingFlow) {
      console.log(`📢 Routing to ai-marketing-agent`);
      const conversationHistory = conversation?.id ? await getConversationHistory(conversation.id) : [];

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
        await logAIError(supabase, { agent_name: 'ai-marketing-agent', error_type: 'invocation_error', error_message: String(aiError), phone_number: phoneNumber, conversation_id: conversation?.id });
      } else {
        if (aiResult?.response) {
          await sendAIResponse(phoneNumber, aiResult.response, conversation?.id || null, 'ai-marketing-agent');
        }
        if (aiResult?.escalated) {
          await supabase.from('conversation_states')
            .upsert({ phone_number: phoneNumber, is_ai_active: false, updated_at: new Date().toISOString() }, { onConflict: 'phone_number' });
        }
        if (aiResult?.finalized) {
          await supabase.from('campaign_results')
            .update({ replied_at: new Date().toISOString() })
            .eq('phone', phoneNumber)
            .is('replied_at', null);
        }
      }
      return;
    }

    // === PRIORITY 2: General AI (business hours check) ===
    const { data: allSettings } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['n8n_force_ai_mode', 'business_hours', 'ai_agent_mode']);

    const settingsMap: Record<string, any> = {};
    allSettings?.forEach(s => { settingsMap[s.setting_key] = s.setting_value; });

    const forceAIRaw = settingsMap['n8n_force_ai_mode'];
    const forceAIMode = forceAIRaw?.value === true || forceAIRaw === true;
    
    if (!forceAIMode) {
      const businessHours = settingsMap['business_hours'] as BusinessHoursConfig | null;
      const isWithinBusinessHours = checkBusinessHours(businessHours);
      
      if (isWithinBusinessHours && !convState?.is_ai_active) {
        console.log('⏰ Within business hours - human agents available');
        return;
      }
    }

    console.log('🤖 Triggering ai-virtual-agent');

    const { data: contact } = await supabase
      .from('contacts')
      .select('name, contact_type')
      .eq('phone', phoneNumber)
      .maybeSingle();

    const { data: triggerResult, error: triggerError } = await supabase.functions.invoke('ai-virtual-agent', {
      body: {
        phoneNumber,
        messageBody,
        messageType: message.type,
        contactName: contact?.name,
        contactType: contact?.contact_type,
        mediaUrl: message.media_url || null,
        mediaType: message.media_type || null,
        conversationId: conversation?.id || null,
        currentDepartment: conversation?.department_code || null,
        isPendingTriage: !conversation?.department_code,
      }
    });

    if (triggerError) {
      console.error('❌ Error triggering ai-virtual-agent:', triggerError);
      await logAIError(supabase, { agent_name: 'ai-virtual-agent', error_type: 'invocation_error', error_message: String(triggerError), phone_number: phoneNumber, conversation_id: conversation?.id });
    } else {
      console.log('✅ ai-virtual-agent response:', triggerResult);
      if (triggerResult?.assignedDepartment && conversation?.id) {
        await assignDepartmentToConversation(
          supabase,
          conversation.id,
          triggerResult.assignedDepartment as DepartmentType,
          triggerResult.qualificationData
        );
      }
    }
  } catch (error: any) {
    console.error('Error in handleAIRouting:', error);
    await logAIError(supabase, { agent_name: 'whatsapp-webhook', error_type: 'routing_error', error_message: error?.message || String(error), phone_number: phoneNumber });
  }
}

// ========== MESSAGE PROCESSING ==========

async function processIncomingMessage(message: any, value: any) {
  try {
    console.log(`🟢 INBOUND: ${message.from} | Type: ${message.type} | ID: ${message.id}`);

    // Deduplication
    const { data: existingMessage } = await supabase
      .from('messages')
      .select('id')
      .eq('wa_message_id', message.id)
      .maybeSingle();

    if (existingMessage) {
      console.log(`⏭️ Duplicate ${message.id} - skipping`);
      return;
    }

    let messageBody = message.text?.body || message.button?.text || message.interactive?.button_reply?.title || '';
    const mediaInfo = await extractMediaInfo(message, value);

    // Download and store media permanently
    if (mediaInfo?.type && mediaInfo?.id) {
      try {
        const downloadResponse = await supabase.functions.invoke('download-media', {
          body: { mediaId: mediaInfo.id, mediaType: mediaInfo.type, filename: mediaInfo.filename }
        });

        if (downloadResponse.data?.success) {
          mediaInfo.url = downloadResponse.data.url;
          mediaInfo.filename = downloadResponse.data.filename;
          mediaInfo.mimeType = downloadResponse.data.contentType;
          
          // Transcribe audio
          if (mediaInfo.type === 'audio' && mediaInfo.url) {
            try {
              const { data: transcription } = await supabase.functions.invoke('transcribe-audio', {
                body: { audioUrl: mediaInfo.url }
              });
              if (transcription?.success && transcription?.text) {
                messageBody = transcription.text;
                console.log('✅ Audio transcribed:', messageBody.substring(0, 100));
              }
            } catch (e) { console.error('❌ Transcription error:', e); }
          }
        }
      } catch (e) { console.error('❌ Media download error:', e); }
    }

    // Auto-detect name
    const detectedName = extractNameFromMessage(messageBody);
    if (detectedName) {
      console.log(`👤 Name detected: ${detectedName}`);
      await supabase.from('contacts').update({ name: detectedName }).eq('phone', message.from).is('name', null);
    }

    // Find or create conversation
    const conversation = await findOrCreateConversation(message.from);
    const conversationId = conversation?.id || null;

    // Insert message
    const messageData = {
      wa_message_id: message.id,
      wa_from: message.from,
      wa_to: value.metadata?.phone_number_id || null,
      wa_phone_number_id: value.metadata?.phone_number_id || null,
      direction: 'inbound' as const,
      body: messageBody || mediaInfo?.caption || message.type || 'Mídia recebida',
      wa_timestamp: message.timestamp ? new Date(parseInt(message.timestamp) * 1000).toISOString() : new Date().toISOString(),
      raw: message,
      media_type: mediaInfo?.type || null,
      media_url: mediaInfo?.url || null,
      media_caption: mediaInfo?.caption || null,
      media_filename: mediaInfo?.filename || null,
      media_mime_type: mediaInfo?.mimeType || null,
      is_template: false,
      conversation_id: conversationId,
      department_code: conversation?.department_code || null,
    };

    const { error } = await supabase.from('messages').insert([messageData]).select();

    if (error) {
      console.error('❌ Error inserting message:', error);
      return;
    }

    // Update timestamp
    if (conversationId) {
      await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversationId);
    }
    
    await ensureContactExists(message.from);
    
    // Triage button interception
    const triageInfo = extractTriageButtonId(message);
    if (triageInfo && conversation?.id && !conversation.department_code) {
      console.log(`🎯 Triage: ${triageInfo.buttonId} → ${triageInfo.department}`);
      await assignDepartmentToConversation(supabase, conversation.id, triageInfo.department);
      await updateTriageStage(supabase, message.from, 'completed');
      await sendDepartmentWelcomeAndActivateAI(message.from, triageInfo.department, conversation.id);
      return;
    }
    
    // Route to AI
    await handleAIRouting(message.from, messageBody, message, conversation);

  } catch (error) {
    console.error('Error processing message:', error);
  }
}

// ========== SERVE ==========

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');
      const verifyToken = Deno.env.get('WHATSAPP_VERIFY_TOKEN');
      
      if (mode === 'subscribe' && token === verifyToken && challenge) {
        return new Response(challenge, { headers: corsHeaders });
      }
      return new Response('Verification failed', { status: 403, headers: corsHeaders });
    }

    if (req.method === 'POST') {
      const body = await req.json();
      console.log('🔵 WEBHOOK POST received');

      if (body.entry?.length > 0) {
        for (const entry of body.entry) {
          if (entry.changes?.length > 0) {
            for (const change of entry.changes) {
              if (change.field === 'messages' && change.value.messages) {
                for (const message of change.value.messages) {
                  await processIncomingMessage(message, change.value);
                }
              }
              if (change.field === 'messages' && change.value.statuses) {
                for (const status of change.value.statuses) {
                  await processMessageStatus(status);
                }
              }
            }
          }
        }
      }

      return new Response('OK', { headers: corsHeaders });
    }

    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  } catch (error) {
    console.error('Error in whatsapp-webhook:', error);
    return new Response('Internal server error', { status: 500, headers: corsHeaders });
  }
});
