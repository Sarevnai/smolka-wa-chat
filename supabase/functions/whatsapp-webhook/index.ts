import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
  
  // Send welcome message
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
 * Find an existing active conversation for this phone number, or create a new one.
 * New conversations start with department_code = NULL (pending triage by Helena).
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
 * Assign department to conversation after Helena's triage
 * Also syncs the department_code to the contact for proper RLS filtering
 */
async function assignDepartmentToConversation(
  conversationId: string, 
  department: DepartmentType,
  qualificationData?: any
) {
  try {
    if (!department) return;

    // Get the first stage for this department
    const { data: firstStage } = await supabase
      .from('conversation_stages')
      .select('id')
      .eq('department_code', department)
      .eq('order_index', 1)
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
    console.log('Processing message status:', status);
    
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
          updateData.error_message = status.errors?.[0]?.title || 'Failed to deliver';
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
    
    // Store status in messages raw data
    await supabase
      .from('messages')
      .update({ 
        raw: { status: status }
      })
      .eq('wa_message_id', waMessageId);
      
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

    // Extract message data
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
      conversation_id: conversationId, // 🆕 Link to conversation
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

    // 🆕 If conversation already has a department and is not pending triage, 
    // only trigger AI if explicitly enabled for that conversation
    if (conversation?.department_code && !convState?.is_ai_active) {
      console.log(`⏭️ Conversation ${conversation.id} already assigned to ${conversation.department_code} - human handling`);
      return;
    }

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

    // Check which agent mode to use (native or n8n)
    const agentModeRaw = settingsMap['ai_agent_mode'];
    const agentMode = agentModeRaw?.value ?? agentModeRaw ?? 'native'; // Default to native

    console.log(`🤖 Triggering AI agent (mode: ${agentMode}) - Outside business hours, AI active, or force mode enabled`);

    // Get contact info for context
    const { data: contact } = await supabase
      .from('contacts')
      .select('name, contact_type')
      .eq('phone', phoneNumber)
      .maybeSingle();

    // 🆕 Enhanced payload with conversation info for Helena's triage
    const agentPayload = {
      phoneNumber,
      messageBody,
      messageType: message.type,
      contactName: contact?.name,
      contactType: contact?.contact_type,
      mediaUrl: message.media_url || null,
      mediaType: message.media_type || null,
      // 🆕 Conversation context for triage
      conversationId: conversation?.id || null,
      currentDepartment: conversation?.department_code || null,
      isPendingTriage: !conversation?.department_code,
    };

    // Use native agent or N8N based on configuration
    const functionName = agentMode === 'n8n' ? 'n8n-trigger' : 'ai-virtual-agent';
    
    const { data: triggerResult, error: triggerError } = await supabase.functions.invoke(functionName, {
      body: agentPayload
    });

    if (triggerError) {
      console.error(`❌ Error triggering ${functionName}:`, triggerError);
    } else {
      console.log(`✅ ${functionName} triggered successfully:`, triggerResult);
      
      // 🆕 If AI agent returns a department assignment, apply it
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