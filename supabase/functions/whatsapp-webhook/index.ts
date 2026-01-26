import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

// Audio TTS configuration
interface AudioConfig {
  audio_enabled: boolean;
  audio_voice_id: string;
  audio_mode: 'text_only' | 'audio_only' | 'text_and_audio';
  audio_max_chars: number;
}

/**
 * Get audio TTS configuration from system_settings
 */
async function getAudioConfig(): Promise<AudioConfig | null> {
  try {
    const { data } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'ai_agent_config')
      .maybeSingle();
    
    if (!data?.setting_value) return null;
    
    const config = data.setting_value as any;
    return {
      audio_enabled: config.audio_enabled || false,
      audio_voice_id: config.audio_voice_id || 'EXAVITQu4vr4xnSDxMaL',
      audio_mode: config.audio_mode || 'text_and_audio',
      audio_max_chars: config.audio_max_chars || 1000
    };
  } catch (error) {
    console.error('❌ Error getting audio config:', error);
    return null;
  }
}

/**
 * Generate audio via ElevenLabs TTS and send via WhatsApp
 */
async function generateAndSendAudio(
  phoneNumber: string,
  text: string,
  conversationId: string | null,
  audioConfig: AudioConfig
): Promise<boolean> {
  try {
    // Limit text for TTS
    const textToConvert = text.length > audioConfig.audio_max_chars 
      ? text.substring(0, audioConfig.audio_max_chars) + '...'
      : text;
    
    console.log('🎙️ Generating TTS audio...', { 
      textLength: textToConvert.length, 
      voiceId: audioConfig.audio_voice_id 
    });
    
    // Generate audio via elevenlabs-tts
    const { data: ttsResult, error: ttsError } = await supabase.functions.invoke('elevenlabs-tts', {
      body: {
        text: textToConvert,
        voiceId: audioConfig.audio_voice_id
      }
    });
    
    if (ttsError || !ttsResult?.success) {
      console.error('❌ TTS generation failed:', ttsError || ttsResult?.error);
      return false;
    }
    
    console.log('✅ Audio generated:', ttsResult.audioUrl, 'isVoiceMessage:', ttsResult.isVoiceMessage);
    
    // Send audio via WhatsApp
    const { error: sendError } = await supabase.functions.invoke('send-wa-media', {
      body: {
        to: phoneNumber,
        mediaUrl: ttsResult.audioUrl,
        mediaType: 'audio',
        mimeType: ttsResult.contentType || 'audio/mpeg',
        conversation_id: conversationId
      }
    });
    
    if (sendError) {
      console.error('❌ Error sending audio to WhatsApp:', sendError);
      return false;
    }
    
    console.log('✅ Audio sent to WhatsApp');
    return true;
    
  } catch (error) {
    console.error('❌ Error in generateAndSendAudio:', error);
    return false;
  }
}

/**
 * Send AI response with optional TTS audio based on configuration
 */
async function sendAIResponse(
  phoneNumber: string,
  responseText: string,
  conversationId: string | null,
  agentName: string = 'AI'
): Promise<void> {
  // Get audio configuration
  const audioConfig = await getAudioConfig();
  
  // Determine what to send based on audio_mode
  const sendText = !audioConfig?.audio_enabled || 
                   audioConfig.audio_mode === 'text_only' || 
                   audioConfig.audio_mode === 'text_and_audio';
  
  const sendAudio = audioConfig?.audio_enabled && 
                    (audioConfig.audio_mode === 'audio_only' || 
                     audioConfig.audio_mode === 'text_and_audio');
  
  console.log(`🔊 ${agentName} response mode:`, { 
    sendText, 
    sendAudio, 
    mode: audioConfig?.audio_mode || 'text_only' 
  });

  // Send text (unless audio_only mode)
  if (sendText) {
    const { error: sendError } = await supabase.functions.invoke('send-wa-message', {
      body: {
        to: phoneNumber,
        text: responseText,
        conversation_id: conversationId
      }
    });
    
    if (sendError) {
      console.error(`❌ Error sending ${agentName} text response:`, sendError);
    } else {
      console.log(`✅ ${agentName} text response sent to WhatsApp`);
    }
  }
  
  // Send audio (if enabled)
  if (sendAudio && audioConfig) {
    const audioSent = await generateAndSendAudio(
      phoneNumber,
      responseText,
      conversationId,
      audioConfig
    );
    
    if (!audioSent && audioConfig.audio_mode === 'audio_only') {
      // Fallback: if audio_only mode failed, send text
      console.log('⚠️ Audio failed in audio_only mode, falling back to text');
      await supabase.functions.invoke('send-wa-message', {
        body: {
          to: phoneNumber,
          text: responseText,
          conversation_id: conversationId
        }
      });
    }
  }
}

// ========== TRIAGE BUTTON MAPPING ==========
// For interactive messages (btn_* IDs)
const TRIAGE_BUTTON_IDS: Record<string, DepartmentType> = {
  'btn_locacao': 'locacao',
  'btn_vendas': 'vendas', 
  'btn_admin': 'administrativo'
};

// For template triagem_ia quick_reply buttons (button text matching)
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

/**
 * Extract triage button info from interactive button_reply OR template quick_reply
 * Returns department directly for easier handling
 */
function extractTriageButtonId(message: any): { buttonId: string, department: DepartmentType } | null {
  // 1. Check interactive button_reply (for interactive messages)
  const buttonReply = message.interactive?.button_reply;
  if (buttonReply?.id && TRIAGE_BUTTON_IDS[buttonReply.id]) {
    console.log(`🔘 Interactive button detected: ${buttonReply.id}`);
    return { buttonId: buttonReply.id, department: TRIAGE_BUTTON_IDS[buttonReply.id] };
  }
  
  // 2. Check button.text (for template quick_reply - triagem_ia)
  const buttonText = message.button?.text?.toLowerCase()?.trim();
  if (buttonText && TRIAGE_BUTTON_TEXTS[buttonText]) {
    console.log(`🔘 Template quick_reply detected: "${buttonText}"`);
    return { buttonId: buttonText, department: TRIAGE_BUTTON_TEXTS[buttonText] };
  }
  
  // 3. Check button.payload (alternative format for quick_reply)
  const buttonPayload = message.button?.payload?.toLowerCase()?.trim();
  if (buttonPayload && TRIAGE_BUTTON_TEXTS[buttonPayload]) {
    console.log(`🔘 Template quick_reply payload detected: "${buttonPayload}"`);
    return { buttonId: buttonPayload, department: TRIAGE_BUTTON_TEXTS[buttonPayload] };
  }
  
  return null;
}

/**
 * Update triage stage in conversation_states
 */
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

/**
 * Send department welcome message and activate AI
 */
async function sendDepartmentWelcomeAndActivateAI(
  phoneNumber: string, 
  department: DepartmentType, 
  conversationId: string
) {
  if (!department) return;
  
  // Get contact name for personalization
  const { data: contact } = await supabase
    .from('contacts')
    .select('name')
    .eq('phone', phoneNumber)
    .maybeSingle();
  
  const name = contact?.name || '';
  let welcomeMessage = DEPARTMENT_WELCOMES[department] || DEPARTMENT_WELCOMES.locacao;
  
  // Personalize with name if available
  if (name) {
    welcomeMessage = welcomeMessage.replace('Perfeito!', `Perfeito, ${name}!`);
    welcomeMessage = welcomeMessage.replace('Ótimo!', `Ótimo, ${name}!`);
    welcomeMessage = welcomeMessage.replace('Certo!', `Certo, ${name}!`);
  }
  
  // Send welcome message with TTS if enabled
  await sendAIResponse(
    phoneNumber,
    welcomeMessage,
    conversationId,
    'department-welcome'
  );
}

/**
 * Check if a phone number recently received a campaign message (last 48h)
 * Returns the department_code of the campaign if found
 */
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

/**
 * 🆕 Generate phone number variations (with/without 9th digit)
 * Brazilian mobile numbers can have 8 or 9 digits after DDD
 */
function getPhoneVariations(phoneNumber: string): string[] {
  const variations = [phoneNumber];
  
  // If starts with 55 and has 12 digits (without 9), add version with 9
  if (phoneNumber.startsWith('55') && phoneNumber.length === 12) {
    // Add 9 after DDD: 5548XXXXXXXX -> 55489XXXXXXXX
    const withNine = phoneNumber.slice(0, 4) + '9' + phoneNumber.slice(4);
    variations.push(withNine);
    console.log(`📱 Phone variations: ${phoneNumber} + ${withNine}`);
  }
  
  // If starts with 55 and has 13 digits (with 9), add version without 9
  if (phoneNumber.startsWith('55') && phoneNumber.length === 13) {
    // Remove 9 after DDD: 55489XXXXXXXX -> 5548XXXXXXXX
    const withoutNine = phoneNumber.slice(0, 4) + phoneNumber.slice(5);
    variations.push(withoutNine);
    console.log(`📱 Phone variations: ${phoneNumber} + ${withoutNine}`);
  }
  
  return variations;
}

/**
 * 🆕 Find contact with property data (notes) by checking phone variations
 * Prioritizes contacts that have notes (property data)
 */
async function findContactWithData(phoneNumber: string): Promise<{
  id: string;
  name: string | null;
  notes: string | null;
  department_code: string | null;
} | null> {
  const variations = getPhoneVariations(phoneNumber);
  
  // First try: Find contact WITH notes (priority - has property data)
  const { data: contactWithNotes } = await supabase
    .from('contacts')
    .select('id, name, notes, department_code')
    .in('phone', variations)
    .not('notes', 'is', null)
    .limit(1)
    .maybeSingle();
  
  if (contactWithNotes) {
    console.log(`📇 Found contact WITH notes (property data): ${contactWithNotes.id} for phone ${phoneNumber}`);
    return contactWithNotes;
  }
  
  // Second try: Find any contact (even without notes)
  const { data: anyContact } = await supabase
    .from('contacts')
    .select('id, name, notes, department_code')
    .in('phone', variations)
    .limit(1)
    .maybeSingle();
  
  if (anyContact) {
    console.log(`📇 Found contact (no notes): ${anyContact.id} for phone ${phoneNumber}`);
    return anyContact;
  }
  
  console.log(`📇 No contact found for phone variations: ${variations.join(', ')}`);
  return null;
}

/**
 * 🆕 Detect development/empreendimento from message body
 * Searches for development names mentioned in the message text
 */
async function detectDevelopmentFromMessage(messageBody: string): Promise<{
  development_id: string;
  development_name: string;
} | null> {
  try {
    if (!messageBody || messageBody.length < 5) return null;

    // Fetch all active developments
    const { data: developments } = await supabase
      .from('developments')
      .select('id, name, slug')
      .eq('is_active', true);

    if (!developments?.length) return null;

    // Normalize message (lowercase, remove accents)
    const normalizedMessage = messageBody.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Search for development name match
    for (const dev of developments) {
      const normalizedName = dev.name.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      
      // Check if message contains development name (at least 5 chars to avoid false positives)
      if (normalizedName.length >= 5 && normalizedMessage.includes(normalizedName)) {
        console.log(`🏗️ Development detected in message: "${dev.name}"`);
        return {
          development_id: dev.id,
          development_name: dev.name
        };
      }
      
      // Also check slug if exists
      if (dev.slug) {
        const normalizedSlug = dev.slug.toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (normalizedSlug.length >= 5 && normalizedMessage.includes(normalizedSlug)) {
          console.log(`🏗️ Development detected by slug in message: "${dev.name}"`);
          return {
            development_id: dev.id,
            development_name: dev.name
          };
        }
      }
    }

    return null;
  } catch (error) {
    console.error('❌ Error detecting development from message:', error);
    return null;
  }
}

/**
 * 🏗️ Check if a phone number has a recent lead from a landing page with development_id
 * Used to route to ai-arya-vendas (Arya Vendas for empreendimentos)
 */
async function checkDevelopmentLead(phoneNumber: string): Promise<{
  development_id: string;
  development_name: string;
  contact_name: string | null;
  contact_phone: string;
} | null> {
  try {
    const phoneVariations = getPhoneVariations(phoneNumber);
    const cutoffTime = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(); // 72 hours
    
    // Check portal_leads_log for recent lead with development_id
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

    console.log(`🏗️ Development lead found for ${phoneNumber}: ${(portalLead.developments as any)?.name}`);

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

/**
 * Check if a phone number is responding to a MARKETING campaign (for property confirmation)
 * Returns contact info with notes (property data) if from marketing campaign
 * 🆕 Now uses findContactWithData to search by phone variations
 */
async function checkMarketingCampaignSource(phoneNumber: string): Promise<{
  isMarketingCampaign: boolean;
  contactNotes: string | null;
  contactName: string | null;
  contactId: string | null;
} | null> {
  try {
    const cutoffTime = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const phoneVariations = getPhoneVariations(phoneNumber);
    
    // Check if any phone variation received a marketing campaign in last 48h
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

    console.log(`📢 Marketing campaign detected for ${phoneNumber}: ${(campaignResult.campaigns as any)?.name}`);

    // 🆕 Use findContactWithData to get contact with notes (property data)
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

/**
 * Find an existing active conversation for this phone number, or create a new one.
 * New conversations start with department_code = NULL (pending triage by Nina).
 * If the phone comes from a recent campaign, inherit the campaign's department.
 */
async function findOrCreateConversation(phoneNumber: string): Promise<ConversationRecord | null> {
  try {
    // First, try to find an active conversation for this phone number
    // We look for conversations without department (pending triage) or active ones
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
      console.log(`✅ Found existing conversation: ${existingConv.id} (department: ${existingConv.department_code || 'pending'})`);
      return existingConv as ConversationRecord;
    }

    // No active conversation found, create a new one
    console.log(`📝 Creating new conversation for: ${phoneNumber}`);

    // 🆕 Check if this phone is responding to a recent campaign
    const campaignDepartment = await checkCampaignSource(phoneNumber);

    // Check if contact exists and get their ID
    const { data: contact } = await supabase
      .from('contacts')
      .select('id, department_code')
      .eq('phone', phoneNumber)
      .maybeSingle();

    // Determine department: campaign > contact > null (pending triage)
    const departmentCode = campaignDepartment || contact?.department_code || null;
    
    if (campaignDepartment) {
      console.log(`📢 New conversation from campaign - assigning department: ${campaignDepartment}`);
    }

    // Create conversation with the determined department
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

    // 🆕 If department came from campaign, also update the contact
    if (campaignDepartment && contact?.id) {
      await supabase
        .from('contacts')
        .update({ department_code: campaignDepartment })
        .eq('id', contact.id);
      console.log(`✅ Contact department synced to ${campaignDepartment}`);
    }

    console.log(`✅ New conversation created: ${newConv.id} (department: ${departmentCode || 'pending triage'})`);
    return newConv as ConversationRecord;

  } catch (error) {
    console.error('❌ Error in findOrCreateConversation:', error);
    return null;
  }
}

/**
 * Update conversation's last_message_at timestamp
 */
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

/**
 * Assign department to conversation after Nina's triage
 * Also syncs the department_code to the contact for proper RLS filtering
 */
async function assignDepartmentToConversation(
  conversationId: string, 
  department: DepartmentType,
  qualificationData?: any
) {
  try {
    if (!department) return;

    // PHASE 3: Get the first stage for this department using order() instead of exact match
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

    // Update conversation with department
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

    // 🆕 SYNC: Also update the contact's department_code for RLS filtering
    if (updatedConv?.phone_number) {
      const { error: contactError } = await supabase
        .from('contacts')
        .update({ department_code: department })
        .eq('phone', updatedConv.phone_number);

      if (contactError) {
        console.error('❌ Error syncing department to contact:', contactError);
      } else {
        console.log(`✅ Contact department synced to ${department} for phone ${updatedConv.phone_number}`);
      }
    }
  } catch (error) {
    console.error('Error in assignDepartmentToConversation:', error);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method === 'GET') {
      // Webhook verification for WhatsApp
      const url = new URL(req.url);
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');

      console.log('Webhook verification request:', { mode, token, challenge });

      // Verify the token matches your configured verify token
      const verifyToken = Deno.env.get('WHATSAPP_VERIFY_TOKEN');
      if (mode === 'subscribe' && token === verifyToken && challenge) {
        console.log('Webhook verified successfully');
        return new Response(challenge, { headers: corsHeaders });
      }

      return new Response('Verification failed', { 
        status: 403, 
        headers: corsHeaders 
      });
    }

    if (req.method === 'POST') {
      // Handle incoming webhook events
      const url = new URL(req.url);
      console.log('🔵 WEBHOOK POST REQUEST RECEIVED');
      console.log('📍 URL:', url.href);
      console.log('🔑 Headers:', Object.fromEntries(req.headers.entries()));
      console.log('🔗 Query params:', Object.fromEntries(url.searchParams.entries()));
      
      const body = await req.json();
      console.log('📦 Full webhook body:', JSON.stringify(body, null, 2));
      
      // Log specific parts of the structure
      if (body.entry) {
        console.log(`📋 Entries count: ${body.entry.length}`);
        body.entry.forEach((entry: any, idx: number) => {
          console.log(`  Entry ${idx}:`, {
            id: entry.id,
            changes: entry.changes?.length || 0
          });
        });
      }

      // Process WhatsApp webhook data
      if (body.entry && body.entry.length > 0) {
        for (const entry of body.entry) {
          if (entry.changes && entry.changes.length > 0) {
            for (const change of entry.changes) {
              if (change.field === 'messages' && change.value.messages) {
                // Process incoming messages
                for (const message of change.value.messages) {
                  await processIncomingMessage(message, change.value);
                }
              }
              // Process message statuses (delivery, read, failed)
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

    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });

  } catch (error) {
    console.error('Error in whatsapp-webhook function:', error);
    return new Response('Internal server error', { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});

function extractNameFromMessage(messageBody: string): string | null {
  if (!messageBody) return null;
  
  const text = messageBody.toLowerCase().trim();
  
  // Patterns to detect name introductions
  const namePatterns = [
    /(?:^|[.\s])(?:oi|olá|ola|e ai|eai|hey|hello)[,\s]*(?:sou|eu sou|me chamo|meu nome é|é o|é a|aqui é o|aqui é a)\s+([a-záàâãéêíóôõúç\s]{2,30}?)(?:[.\s]|$)/i,
    /(?:^|[.\s])(?:sou o|sou a|sou)\s+([a-záàâãéêíóôõúç\s]{2,30}?)(?:[.\s]|$)/i,
    /(?:^|[.\s])(?:me chamo|meu nome é)\s+([a-záàâãéêíóôõúç\s]{2,30}?)(?:[.\s]|$)/i,
    /(?:^|[.\s])(?:aqui é o|aqui é a|aqui quem fala é o|aqui quem fala é a)\s+([a-záàâãéêíóôõúç\s]{2,30}?)(?:[.\s]|$)/i,
    /(?:^|[.\s])(?:é o|é a)\s+([a-záàâãéêíóôõúç\s]{2,30}?)(?:\s+(?:falando|aqui|mesmo))?(?:[.\s]|$)/i
  ];
  
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const extractedName = match[1].trim();
      // Validate the extracted name (basic checks)
      if (extractedName.length >= 2 && extractedName.length <= 30 && 
          !extractedName.match(/^\d+$/) && // Not just numbers
          !extractedName.includes('whatsapp') &&
          !extractedName.includes('número')) {
        // Capitalize properly
        return extractedName
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }
    }
  }
  
  return null;
}

async function processMessageStatus(status: any) {
  try {
    console.log('📊 Processing message status:', status);
    
    const waMessageId = status.id;
    const statusType = status.status; // sent, delivered, read, failed
    const timestamp = status.timestamp ? new Date(parseInt(status.timestamp) * 1000).toISOString() : new Date().toISOString();
    
    // Update campaign_results if this message is from a campaign
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
        case 'delivered':
          updateData.delivered_at = timestamp;
          break;
        case 'read':
          updateData.read_at = timestamp;
          break;
        case 'failed':
          // Store full error details for campaigns
          const errorInfo = status.errors?.[0];
          updateData.error_message = errorInfo 
            ? `${errorInfo.code}: ${errorInfo.title || errorInfo.message}${errorInfo.details ? ` - ${errorInfo.details}` : ''}`
            : 'Failed to deliver';
          break;
      }
      
      await supabase
        .from('campaign_results')
        .update(updateData)
        .eq('id', campaignResult.id);
      
      console.log(`✅ Updated campaign result status to ${statusType}`);
      
      // Update campaign counters
      if (statusType === 'delivered') {
        await supabase.rpc('increment_campaign_delivered', { 
          campaign_id_param: campaignResult.campaign_id 
        }).catch(() => {
          // Fallback if function doesn't exist
          console.log('⚠️ Campaign counter update failed (function may not exist)');
        });
      }
    }
    
    // 🆕 PRESERVE ORIGINAL RAW DATA: Merge status into existing raw instead of overwriting
    // First, fetch the existing message to preserve its raw data
    const { data: existingMessage } = await supabase
      .from('messages')
      .select('raw')
      .eq('wa_message_id', waMessageId)
      .maybeSingle();
    
    // Merge existing raw with new status data
    const existingRaw = (existingMessage?.raw as Record<string, unknown>) || {};
    const mergedRaw = {
      ...existingRaw,
      status: status // Add/update status field while preserving other data
    };
    
    // Update message with merged raw data
    const { error: updateError } = await supabase
      .from('messages')
      .update({ raw: mergedRaw })
      .eq('wa_message_id', waMessageId);
    
    if (updateError) {
      console.error('❌ Error updating message status:', updateError);
    } else {
      console.log(`✅ Message ${waMessageId} status updated to: ${statusType}`);
    }
      
  } catch (error) {
    console.error('Error processing message status:', error);
  }
}

async function processIncomingMessage(message: any, value: any) {
  try {
    console.log('🟢 PROCESSING INBOUND MESSAGE');
    console.log('📱 From:', message.from);
    console.log('🆔 Message ID:', message.id);
    console.log('⏰ Timestamp:', message.timestamp);
    console.log('📝 Type:', message.type);

    // 🛡️ DEDUPLICATION: Check if this message was already processed
    const { data: existingMessage } = await supabase
      .from('messages')
      .select('id')
      .eq('wa_message_id', message.id)
      .maybeSingle();

    if (existingMessage) {
      console.log(`⏭️ Duplicate message ${message.id} already exists (DB id: ${existingMessage.id}) - skipping processing`);
      return;
    }

    console.log('🔍 Full message object:', JSON.stringify(message, null, 2));
    console.log('🔍 Full value object:', JSON.stringify(value, null, 2));

    let messageBody = message.text?.body || message.button?.text || message.interactive?.button_reply?.title || '';
    console.log('💬 Extracted body:', messageBody);
    
    const mediaInfo = await extractMediaInfo(message, value);

    // If media exists, download and store permanently
    if (mediaInfo?.type && mediaInfo?.id) {
      try {
        console.log(`Downloading media for permanent storage: ${mediaInfo.id}`);
        
        const downloadResponse = await supabase.functions.invoke('download-media', {
          body: {
            mediaId: mediaInfo.id,
            mediaType: mediaInfo.type,
            filename: mediaInfo.filename
          }
        });

        if (downloadResponse.data?.success) {
          console.log(`Media downloaded successfully: ${downloadResponse.data.url}`);
          mediaInfo.url = downloadResponse.data.url;
          mediaInfo.filename = downloadResponse.data.filename;
          mediaInfo.mimeType = downloadResponse.data.contentType;
          
          // If audio, transcribe using Whisper
          if (mediaInfo.type === 'audio' && mediaInfo.url) {
            try {
              console.log('🎤 Transcribing audio message...');
              const { data: transcription, error: transcribeError } = await supabase.functions.invoke('transcribe-audio', {
                body: { audioUrl: mediaInfo.url }
              });
              
              if (transcription?.success && transcription?.text) {
                messageBody = transcription.text;
                console.log('✅ Audio transcribed:', messageBody.substring(0, 100));
              } else {
                console.error('❌ Transcription failed:', transcribeError || transcription?.error);
              }
            } catch (transcribeErr) {
              console.error('❌ Error calling transcribe-audio:', transcribeErr);
            }
          }
        } else {
          console.error('Failed to download media:', downloadResponse.error);
        }
      } catch (error) {
        console.error('Error downloading media:', error);
        // Continue with original URL as fallback
      }
    }

    // 🆕 PHASE 3: Find or create conversation BEFORE inserting message
    const conversation = await findOrCreateConversation(message.from);
    const conversationId = conversation?.id || null;

    if (conversation) {
      console.log(`📍 Message will be linked to conversation: ${conversationId} (dept: ${conversation.department_code || 'pending'})`);
    } else {
      console.warn('⚠️ Could not find/create conversation - message will be saved without conversation_id');
    }

    // Extract message data - now including department_code for isolation
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
      department_code: conversation?.department_code || null, // 🆕 Department isolation
    };

    console.log('📝 Dados da mensagem a serem inseridos:', {
      wa_message_id: messageData.wa_message_id,
      wa_from: messageData.wa_from,
      wa_to: messageData.wa_to,
      direction: messageData.direction,
      body: messageData.body?.substring(0, 50),
      timestamp: messageData.wa_timestamp,
      conversation_id: conversationId // 🆕 Log conversation_id
    });

    // Insert into database
    const { data: insertedData, error } = await supabase
      .from('messages')
      .insert([messageData])
      .select();

    if (error) {
      console.error('❌ Erro ao inserir mensagem:', error);
    } else {
      console.log('✅ Mensagem inserida com sucesso!', {
        id: insertedData?.[0]?.id,
        wa_message_id: messageData.wa_message_id,
        wa_from: messageData.wa_from,
        conversation_id: conversationId
      });
      
      // Update conversation timestamp
      if (conversationId) {
        await updateConversationTimestamp(conversationId);
      }
      
      // Ensure contact exists (without auto-triage flow)
      await ensureContactExists(message.from);
      
      // ========== TRIAGE BUTTON INTERCEPTION ==========
      // Check if this is a triage button response BEFORE triggering AI
      const triageInfo = extractTriageButtonId(message);
      if (triageInfo && conversation?.id && !conversation.department_code) {
        const departmentCode = triageInfo.department;
        console.log(`🎯 Triage button clicked: ${triageInfo.buttonId} → ${departmentCode}`);
        
        // Assign department immediately (100% reliable)
        await assignDepartmentToConversation(conversation.id, departmentCode);
        
        // Update triage_stage to completed
        await updateTriageStage(message.from, 'completed');
        
        // Send department welcome + activate AI for follow-up
        await sendDepartmentWelcomeAndActivateAI(
          message.from, 
          departmentCode, 
          conversation.id
        );
        
        // Don't trigger general AI flow - we've handled the triage
        return;
      }
      
      // ========== FASE 3: FLOW BUILDER EXECUTION (TEMPORARIAMENTE DESATIVADO) ==========
      // Desativado para permitir que a Nina responda diretamente
      // TODO: Reativar quando o FlowBuilder estiver pronto para produção
      /*
      if (conversation?.department_code) {
        try {
          console.log(`🔄 Checking for active flow in department: ${conversation.department_code}`);
          
          const { data: flowResult, error: flowError } = await supabase.functions.invoke('flow-executor', {
            body: {
              phone_number: message.from,
              message: messageBody,
              conversation_id: conversation.id,
              department_code: conversation.department_code
            }
          });
          
          if (flowError) {
            console.log(`⚠️ Flow executor error (non-blocking):`, flowError);
          } else if (flowResult?.success) {
            console.log(`✅ Flow executor processed message:`, {
              response: flowResult.response?.substring(0, 50),
              escalated: flowResult.escalated
            });
            
            // If flow handled the message, skip other AI agents
            if (flowResult.response || flowResult.escalated) {
              console.log(`🎯 Flow handled this message - skipping other AI agents`);
              return;
            }
          }
        } catch (flowErr) {
          console.log(`⚠️ Flow executor call failed (non-blocking):`, flowErr);
        }
      }
      */
      console.log(`⏭️ FlowBuilder desativado - passando direto para AI agents`);
      
      // 🆕 Pass conversation info to AI trigger
      await handleN8NTrigger(message.from, messageBody, message, conversation);
    }

  } catch (error) {
    console.error('Error processing message:', error);
  }
}

/**
 * Ensure contact exists in the database (simple creation without auto-triage)
 */
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
          onboarding_status: 'completed' // Already mark as completed, no flow needed
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

/**
 * Handle AI agent trigger based on business hours, conversation state, and agent mode
 * 🆕 Now receives conversation info for department assignment
 * 🆕 Routes marketing campaign responses to ai-marketing-agent
 */
async function handleN8NTrigger(
  phoneNumber: string, 
  messageBody: string, 
  message: any, 
  conversation: ConversationRecord | null
) {
  try {
    // Check conversation state - if operator has taken over, don't trigger AI
    const { data: convState } = await supabase
      .from('conversation_states')
      .select('is_ai_active, operator_id, operator_takeover_at')
      .eq('phone_number', phoneNumber)
      .maybeSingle();

    // If operator has taken over this conversation, skip AI
    if (convState?.operator_id && !convState?.is_ai_active) {
      console.log(`⏭️ Skipping AI - operator ${convState.operator_id} handling conversation`);
      return;
    }
    // 🏗️ CHECK FOR DEVELOPMENT/EMPREENDIMENTO LEAD FIRST (Arya Vendas)
    // Priority 0: Recent lead from landing page with development_id
    let developmentLead = await checkDevelopmentLead(phoneNumber);
    
    // 🆕 Priority 0.5: If no lead exists, try to detect development from message body
    if (!developmentLead?.development_id) {
      const detectedDev = await detectDevelopmentFromMessage(messageBody);
      
      if (detectedDev) {
        console.log(`🏗️ Development detected from message: "${detectedDev.development_name}"`);
        
        // Get contact name if exists
        const contact = await findContactWithData(phoneNumber);
        
        // Create portal_leads_log entry for tracking
        const { error: logError } = await supabase
          .from('portal_leads_log')
          .insert({
            portal_origin: 'whatsapp_direct',
            lead_source_type: 'whatsapp_mention',
            development_id: detectedDev.development_id,
            contact_phone: phoneNumber,
            contact_name: contact?.name || null,
            message: messageBody,
            status: 'processed',
            processed_at: new Date().toISOString()
          });
        
        if (logError) {
          console.error('❌ Error logging detected development lead:', logError);
        } else {
          console.log(`✅ Created portal_leads_log for detected development: ${detectedDev.development_name}`);
        }
        
        // Set developmentLead for routing
        developmentLead = {
          development_id: detectedDev.development_id,
          development_name: detectedDev.development_name,
          contact_name: contact?.name || null,
          contact_phone: phoneNumber
        };
      }
    }
    
    if (developmentLead?.development_id) {
      console.log(`🏗️ Development lead detected: ${developmentLead.development_name}`);
      
      // Get recent messages for conversation history
      // IMPORTANT: Exclude the current message (just inserted) to properly detect first message
      let conversationHistory: Array<{ role: string; content: string }> = [];
      if (conversation?.id) {
        const { data: recentMessages } = await supabase
          .from('messages')
          .select('body, direction, created_at')
          .eq('conversation_id', conversation.id)
          .order('created_at', { ascending: false })
          .limit(11); // Fetch 11 to skip the current one

        if (recentMessages && recentMessages.length > 1) {
          // Skip the first (most recent = current message) and take up to 10 previous
          conversationHistory = recentMessages
            .slice(1) // Skip the message we just inserted
            .reverse()
            .filter(msg => msg.body)
            .map(msg => ({
              role: msg.direction === 'inbound' ? 'user' : 'assistant',
              content: msg.body || ''
            }));
        }
        // If only 1 message exists (the current one), keep history empty = isFirstMessage = true
      }

      // Route to ai-arya-vendas
      console.log(`📤 Sending to ai-arya-vendas:`, {
        phone: phoneNumber,
        development: developmentLead.development_name,
        historyCount: conversationHistory.length
      });

      const { data: aryaResult, error: aryaError } = await supabase.functions.invoke('ai-arya-vendas', {
        body: {
          phone_number: phoneNumber,
          message: messageBody,
          development_id: developmentLead.development_id,
          conversation_history: conversationHistory,
          contact_name: developmentLead.contact_name
        }
      });

      if (aryaError) {
        console.error('❌ Error calling ai-arya-vendas:', aryaError);
      } else {
        console.log('✅ ai-arya-vendas response:', aryaResult);
        
        // Handle C2S transfer notification
        if (aryaResult?.c2s_transferred) {
          console.log('🔄 Lead transferred to C2S');
          
          // Update portal_leads_log with CRM status
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
      }

      // Don't continue to other agents - Arya Vendas handled it
      return;
    }

    // 🆕 CHECK FOR MARKETING FIRST
    // Priority 1: Recent marketing campaign (48h)
    // Priority 2: Contact/conversation with department_code = 'marketing'
    let isMarketingFlow = false;
    let marketingContactNotes: string | null = null;
    let marketingContactName: string | null = null;
    let marketingContactId: string | null = null;

    // Check for recent marketing campaign first
    const marketingCampaign = await checkMarketingCampaignSource(phoneNumber);
    
    if (marketingCampaign?.isMarketingCampaign) {
      console.log(`📢 Marketing campaign response detected (within 48h)`);
      isMarketingFlow = true;
      marketingContactNotes = marketingCampaign.contactNotes;
      marketingContactName = marketingCampaign.contactName;
      marketingContactId = marketingCampaign.contactId;
    } else {
      // No recent campaign - check if contact or conversation is from marketing department
      // Use findContactWithData to search by phone variations (handles 9th digit issue)
      const contact = await findContactWithData(phoneNumber);

      if (contact?.department_code === 'marketing' || conversation?.department_code === 'marketing') {
        console.log(`📇 Marketing contact/conversation detected via department_code`);
        console.log(`📇 Found contact: ${contact?.id} with phone variation, hasNotes: ${!!contact?.notes}`);
        isMarketingFlow = true;
        marketingContactNotes = contact?.notes || null;
        marketingContactName = contact?.name || null;
        marketingContactId = contact?.id || null;
      }
    }
    
    if (isMarketingFlow) {
      console.log(`📢 Routing to ai-marketing-agent (Nina)`);
      
      // Get recent messages for conversation history
      let conversationHistory: Array<{ role: string; content: string }> = [];
      if (conversation?.id) {
        const { data: recentMessages } = await supabase
          .from('messages')
          .select('body, direction, created_at')
          .eq('conversation_id', conversation.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (recentMessages) {
          conversationHistory = recentMessages
            .reverse()
            .filter(msg => msg.body)
            .map(msg => ({
              role: msg.direction === 'inbound' ? 'user' : 'assistant',
              content: msg.body || ''
            }));
        }
      }

      // Build payload for marketing agent
      const marketingPayload = {
        phone_number: phoneNumber,
        message: messageBody,
        contact_name: marketingContactName,
        contact_notes: marketingContactNotes,
        conversation_history: conversationHistory,
      };

      console.log(`📤 Sending to ai-marketing-agent:`, {
        phone: phoneNumber,
        hasNotes: !!marketingContactNotes,
        historyCount: conversationHistory.length
      });

      const { data: aiResult, error: aiError } = await supabase.functions.invoke('ai-marketing-agent', {
        body: marketingPayload
      });

      if (aiError) {
        console.error('❌ Error calling ai-marketing-agent:', aiError);
      } else {
        console.log('✅ ai-marketing-agent response:', aiResult);
        
        // Send AI response back to WhatsApp (with TTS if enabled)
        if (aiResult?.response) {
          await sendAIResponse(
            phoneNumber,
            aiResult.response,
            conversation?.id || null,
            'ai-marketing-agent'
          );
        }

        // Handle escalation to human
        if (aiResult?.escalated) {
          console.log('🔄 Marketing conversation escalated to human');
          await supabase
            .from('conversation_states')
            .upsert({
              phone_number: phoneNumber,
              is_ai_active: false,
              updated_at: new Date().toISOString()
            }, { onConflict: 'phone_number' });
        }

        // Handle conversation finalization
        if (aiResult?.finalized) {
          console.log(`✅ Marketing conversation finalized: ${aiResult.finalization_type}`);
          // Mark replied_at in campaign_results
          await supabase
            .from('campaign_results')
            .update({ replied_at: new Date().toISOString() })
            .eq('phone', phoneNumber)
            .is('replied_at', null);
        }
      }

      // Don't continue to regular agent - marketing agent handled it
      return;
    }

    // 🆕 OPTION B: AI responds to ALL conversations outside business hours
    // Only skip if operator has manually taken over (checked above at line 783-786)
    // Department assignment no longer prevents AI from responding
    console.log(`📋 Conversation department: ${conversation?.department_code || 'pending'} - will check business hours`);


    // Load all relevant settings at once
    const { data: allSettings } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['n8n_force_ai_mode', 'business_hours', 'ai_agent_mode']);

    const settingsMap: Record<string, any> = {};
    allSettings?.forEach(s => { settingsMap[s.setting_key] = s.setting_value; });

    // Check for force AI mode (testing mode)
    const forceAIRaw = settingsMap['n8n_force_ai_mode'];
    const forceAIMode = forceAIRaw?.value === true || forceAIRaw === true;
    
    if (forceAIMode) {
      console.log('🧪 Force AI mode enabled - bypassing business hours check');
    } else {
      // Check business hours only if not in force mode
      const businessHours = settingsMap['business_hours'] as { 
        start: string; 
        end: string; 
        days: number[]; 
        timezone: string 
      } | null;

      const isWithinBusinessHours = checkBusinessHours(businessHours);
      
      // Only trigger AI outside business hours OR if AI is explicitly active
      if (isWithinBusinessHours && !convState?.is_ai_active) {
        console.log('⏰ Within business hours - human agents available');
        return;
      }
    }

    console.log('🤖 Triggering AI virtual agent - Outside business hours, AI active, or force mode enabled');

    // Get contact info for context
    const { data: contact } = await supabase
      .from('contacts')
      .select('name, contact_type')
      .eq('phone', phoneNumber)
      .maybeSingle();

    // Enhanced payload with conversation info for Arya's triage
    const agentPayload = {
      phoneNumber,
      messageBody,
      messageType: message.type,
      contactName: contact?.name,
      contactType: contact?.contact_type,
      mediaUrl: message.media_url || null,
      mediaType: message.media_type || null,
      // Conversation context for triage
      conversationId: conversation?.id || null,
      currentDepartment: conversation?.department_code || null,
      isPendingTriage: !conversation?.department_code,
    };

    // Always use native AI virtual agent
    const { data: triggerResult, error: triggerError } = await supabase.functions.invoke('ai-virtual-agent', {
      body: agentPayload
    });

    if (triggerError) {
      console.error('❌ Error triggering ai-virtual-agent:', triggerError);
    } else {
      console.log('✅ ai-virtual-agent triggered successfully:', triggerResult);
      
      // If AI agent returns a department assignment, apply it
      if (triggerResult?.assignedDepartment && conversation?.id) {
        await assignDepartmentToConversation(
          conversation.id,
          triggerResult.assignedDepartment as DepartmentType,
          triggerResult.qualificationData
        );
      }
    }

  } catch (error) {
    console.error('Error in handleN8NTrigger:', error);
  }
}

/**
 * Check if current time is within business hours
 */
function checkBusinessHours(businessHours: { start: string; end: string; days: number[]; timezone: string } | null): boolean {
  if (!businessHours) {
    console.log('⚠️ Business hours not configured, defaulting to within hours');
    return true;
  }

  // Get current time in the configured timezone
  const now = new Date();
  
  // Convert to the business timezone (America/Sao_Paulo = UTC-3)
  // We need to adjust for the timezone offset
  let timezoneOffset = 0;
  if (businessHours.timezone === 'America/Sao_Paulo') {
    timezoneOffset = -3; // UTC-3
  } else if (businessHours.timezone === 'America/New_York') {
    timezoneOffset = -5; // UTC-5 (simplified, doesn't account for DST)
  }
  
  // Calculate local time in the business timezone
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  let localHours = utcHours + timezoneOffset;
  
  // Handle day wrap-around
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
  
  console.log(`🌐 UTC: ${utcHours}:${utcMinutes}, Timezone: ${businessHours.timezone}, Local: ${localHours}:${utcMinutes}, Day: ${currentDay}`);
  
  // Check if current day is a business day
  if (!businessHours.days.includes(currentDay)) {
    console.log(`📅 Day ${currentDay} is not a business day`);
    return false;
  }

  // Parse business hours
  const [startHour, startMin] = businessHours.start.split(':').map(Number);
  const [endHour, endMin] = businessHours.end.split(':').map(Number);
  
  const currentTime = localHours * 60 + utcMinutes;
  const startTime = startHour * 60 + startMin;
  const endTime = endHour * 60 + endMin;

  const isWithin = currentTime >= startTime && currentTime <= endTime;
  console.log(`🕐 Local time: ${localHours}:${utcMinutes}, Business hours: ${businessHours.start}-${businessHours.end}, Within: ${isWithin}`);
  
  return isWithin;
}

async function updateContactType(phoneNumber: string, contactType: string) {
  const { error } = await supabase
    .from('contacts')
    .update({ contact_type: contactType })
    .eq('phone', phoneNumber);

  if (error) {
    console.error('Error updating contact type:', error);
  }
}

async function extractMediaInfo(message: any, value: any) {
  const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
  
  if (!accessToken) {
    console.error('WhatsApp access token not found');
    return null;
  }

  let mediaInfo = null;

  try {
    // Handle different message types
    switch (message.type) {
      case 'image':
        mediaInfo = {
          type: 'image',
          id: message.image.id,
          caption: message.image.caption || null,
          mimeType: message.image.mime_type || 'image/jpeg',
          filename: null
        };
        break;

      case 'audio':
        mediaInfo = {
          type: 'audio', 
          id: message.audio.id,
          caption: null,
          mimeType: message.audio.mime_type || 'audio/ogg',
          filename: null
        };
        break;

      case 'video':
        mediaInfo = {
          type: 'video',
          id: message.video.id,
          caption: message.video.caption || null,
          mimeType: message.video.mime_type || 'video/mp4',
          filename: null
        };
        break;

      case 'document':
        mediaInfo = {
          type: 'document',
          id: message.document.id,
          caption: message.document.caption || null,
          mimeType: message.document.mime_type || 'application/octet-stream',
          filename: message.document.filename || 'documento'
        };
        break;

      case 'sticker':
        mediaInfo = {
          type: 'sticker',
          id: message.sticker.id,
          caption: null,
          mimeType: message.sticker.mime_type || 'image/webp',
          filename: null
        };
        break;

      case 'voice':
        mediaInfo = {
          type: 'voice',
          id: message.voice.id,
          caption: null,
          mimeType: message.voice.mime_type || 'audio/ogg',
          filename: null
        };
        break;

      case 'location':
        mediaInfo = {
          type: 'location',
          id: null,
          caption: `📍 ${message.location.name || 'Localização'}\n${message.location.address || ''}`,
          mimeType: null,
          filename: null,
          coordinates: {
            latitude: message.location.latitude,
            longitude: message.location.longitude
          }
        };
        break;

      default:
        return null;
    }

    // If we have media with an ID, fetch the URL from WhatsApp API
    if (mediaInfo?.id) {
      try {
        const response = await fetch(`https://graph.facebook.com/v18.0/${mediaInfo.id}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });

        if (response.ok) {
          const mediaData = await response.json();
          mediaInfo.url = mediaData.url;
          console.log('Media URL fetched:', mediaInfo.url);
        } else {
          console.error('Failed to fetch media URL:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Error fetching media URL:', error);
      }
    }

    return mediaInfo;
  } catch (error) {
    console.error('Error extracting media info:', error);
    return null;
  }
}