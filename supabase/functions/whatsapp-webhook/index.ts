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
      const body = await req.json();
      console.log('Received webhook:', JSON.stringify(body, null, 2));

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

async function processIncomingMessage(message: any, value: any) {
  try {
    console.log('Processing message:', message);

    const messageBody = message.text?.body || message.button?.text || message.interactive?.button_reply?.title || '';
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

    // Insert into database
    const { error } = await supabase
      .from('messages')
      .insert([messageData]);

    if (error) {
      console.error('Error inserting message:', error);
    } else {
      console.log('Message inserted successfully:', messageData.wa_message_id);
      
      // Handle auto-triage flow
      await handleAutoTriage(message.from, messageBody, message);
    }

  } catch (error) {
    console.error('Error processing message:', error);
  }
}

async function handleAutoTriage(phoneNumber: string, messageBody: string, message: any) {
  try {
    // Get or create contact
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('id, name, onboarding_status, contact_type')
      .eq('phone', phoneNumber)
      .maybeSingle();

    if (contactError) {
      console.error('Error fetching contact:', contactError);
      return;
    }

    let currentContact = contact;
    
    // Create contact if doesn't exist
    if (!currentContact) {
      const { data: newContact, error: createError } = await supabase
        .from('contacts')
        .insert([{
          phone: phoneNumber,
          status: 'ativo',
          onboarding_status: 'pending'
        }])
        .select()
        .single();

      if (createError) {
        console.error('Error creating contact:', createError);
        return;
      }
      currentContact = newContact;
    }

    // Handle onboarding flow based on current status
    const status = currentContact.onboarding_status || 'pending';
    console.log(`Processing triage for ${phoneNumber}, status: ${status}`);

    switch (status) {
      case 'pending':
        await sendWelcomeMessage(phoneNumber);
        await updateContactStatus(phoneNumber, 'waiting_name');
        break;

      case 'waiting_name':
        if (messageBody && messageBody.trim().length > 0) {
          await updateContactName(phoneNumber, messageBody.trim());
          await sendClassificationMessage(phoneNumber, messageBody.trim());
          await updateContactStatus(phoneNumber, 'waiting_type');
        }
        break;

      case 'waiting_type':
        if (messageBody) {
          const contactType = classifyContactType(messageBody);
          if (contactType) {
            await updateContactType(phoneNumber, contactType);
            await updateContactStatus(phoneNumber, 'completed');
            await sendConfirmationMessage(phoneNumber, contactType);
          }
        }
        break;

      case 'completed':
        // Onboarding complete, check for name extraction from legacy messages
        const extractedName = extractNameFromMessage(messageBody);
        if (extractedName && (!currentContact.name || currentContact.name === phoneNumber)) {
          await updateContactName(phoneNumber, extractedName);
        }
        console.log('Contact onboarding completed, processing normal message');
        break;

      default:
        console.log('Unknown onboarding status:', status);
    }

  } catch (error) {
    console.error('Error in handleAutoTriage:', error);
  }
}

async function sendWelcomeMessage(phoneNumber: string) {
  try {
    await supabase.functions.invoke('send-wa-message', {
      body: {
        to: phoneNumber,
        text: 'Olá! Seja bem-vindo(a)! Para melhor atendê-lo(a), qual é o seu nome?'
      }
    });
  } catch (error) {
    console.error('Error sending welcome message:', error);
  }
}

async function sendClassificationMessage(phoneNumber: string, name: string) {
  try {
    await supabase.functions.invoke('send-wa-message', {
      body: {
        to: phoneNumber,
        text: `Obrigado ${name}! Como posso ajudá-lo(a) hoje?`,
        interactive: {
          type: 'button',
          body: { text: `Olá ${name}! Como posso ajudá-lo(a)?` },
          action: {
            buttons: [
              {
                type: 'reply',
                reply: {
                  id: 'proprietario',
                  title: 'Sou Proprietário'
                }
              },
              {
                type: 'reply',
                reply: {
                  id: 'inquilino',
                  title: 'Sou Inquilino'
                }
              }
            ]
          }
        }
      }
    });
  } catch (error) {
    console.error('Error sending classification message:', error);
  }
}

async function sendConfirmationMessage(phoneNumber: string, contactType: string) {
  const typeText = contactType === 'proprietario' ? 'proprietário' : 'inquilino';
  try {
    await supabase.functions.invoke('send-wa-message', {
      body: {
        to: phoneNumber,
        text: `Perfeito! Registrei você como ${typeText}. Agora posso ajudá-lo(a) com suas necessidades. Em que posso ser útil?`
      }
    });
  } catch (error) {
    console.error('Error sending confirmation message:', error);
  }
}

function classifyContactType(message: string): string | null {
  const text = message.toLowerCase();
  if (text.includes('proprietário') || text.includes('proprietario') || text.includes('dono')) {
    return 'proprietario';
  }
  if (text.includes('inquilino') || text.includes('locatário') || text.includes('locatario')) {
    return 'inquilino';
  }
  return null;
}

async function updateContactStatus(phoneNumber: string, status: string) {
  const { error } = await supabase
    .from('contacts')
    .update({ onboarding_status: status })
    .eq('phone', phoneNumber);

  if (error) {
    console.error('Error updating contact status:', error);
  }
}

async function updateContactName(phoneNumber: string, name: string) {
  const { error } = await supabase
    .from('contacts')
    .update({ name })
    .eq('phone', phoneNumber);

  if (error) {
    console.error('Error updating contact name:', error);
  }
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