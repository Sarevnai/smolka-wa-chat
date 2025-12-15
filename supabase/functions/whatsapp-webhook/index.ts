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

    const messageBody = message.text?.body || message.button?.text || message.interactive?.button_reply?.title || '';
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
        } else {
          console.error('Failed to download media:', downloadResponse.error);
        }
      } catch (error) {
        console.error('Error downloading media:', error);
        // Continue with original URL as fallback
      }
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
      is_template: false, // Incoming messages are not templates
    };

    console.log('📝 Dados da mensagem a serem inseridos:', {
      wa_message_id: messageData.wa_message_id,
      wa_from: messageData.wa_from,
      wa_to: messageData.wa_to,
      direction: messageData.direction,
      body: messageData.body?.substring(0, 50),
      timestamp: messageData.wa_timestamp
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
        wa_from: messageData.wa_from
      });
      
      // Ensure contact exists (without auto-triage flow)
      await ensureContactExists(message.from);
      
      // Check if should trigger N8N virtual agent
      await handleN8NTrigger(message.from, messageBody, message);
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
 * Handle N8N virtual agent trigger based on business hours and conversation state
 */
async function handleN8NTrigger(phoneNumber: string, messageBody: string, message: any) {
  try {
    // Check conversation state - if operator has taken over, don't trigger N8N
    const { data: convState } = await supabase
      .from('conversation_states')
      .select('is_ai_active, operator_id, operator_takeover_at')
      .eq('phone_number', phoneNumber)
      .maybeSingle();

    // If operator has taken over this conversation, skip N8N
    if (convState?.operator_id && !convState?.is_ai_active) {
      console.log(`⏭️ Skipping N8N - operator ${convState.operator_id} handling conversation`);
      return;
    }

    // Check business hours
    const { data: settings } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'business_hours')
      .single();

    const businessHours = settings?.setting_value as { 
      start: string; 
      end: string; 
      days: number[]; 
      timezone: string 
    } | null;

    const isWithinBusinessHours = checkBusinessHours(businessHours);
    
    // Only trigger N8N outside business hours OR if AI is explicitly active
    if (isWithinBusinessHours && !convState?.is_ai_active) {
      console.log('⏰ Within business hours - human agents available');
      return;
    }

    console.log('🤖 Outside business hours or AI active - triggering N8N');

    // Get contact info for context
    const { data: contact } = await supabase
      .from('contacts')
      .select('name, contact_type')
      .eq('phone', phoneNumber)
      .maybeSingle();

    // Trigger N8N webhook
    const { data: triggerResult, error: triggerError } = await supabase.functions.invoke('n8n-trigger', {
      body: {
        phoneNumber,
        messageBody,
        messageType: message.type,
        contactName: contact?.name,
        contactType: contact?.contact_type,
        mediaUrl: message.media_url || null,
        mediaType: message.media_type || null
      }
    });

    if (triggerError) {
      console.error('❌ Error triggering N8N:', triggerError);
    } else {
      console.log('✅ N8N triggered successfully:', triggerResult);
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