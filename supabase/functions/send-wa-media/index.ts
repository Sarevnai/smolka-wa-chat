import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const WHATSAPP_ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, mediaUrl, mediaType, caption, filename } = await req.json();

    console.log('Sending WhatsApp media:', { to, mediaUrl, mediaType, caption, filename });

    if (!to || !mediaUrl || !mediaType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, mediaUrl, mediaType' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
      console.error('Missing WhatsApp configuration');
      return new Response(
        JSON.stringify({ error: 'WhatsApp configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine WhatsApp media type
    let waMediaType = 'document';
    if (mediaType.startsWith('image/')) {
      waMediaType = 'image';
    } else if (mediaType.startsWith('video/')) {
      waMediaType = 'video';
    } else if (mediaType.startsWith('audio/')) {
      waMediaType = 'audio';
    }

    // Build message payload
    const messagePayload: any = {
      messaging_product: "whatsapp",
      to: to,
      type: waMediaType,
      [waMediaType]: {
        link: mediaUrl
      }
    };

    // Add caption if provided (only for images and videos)
    if (caption && (waMediaType === 'image' || waMediaType === 'video')) {
      messagePayload[waMediaType].caption = caption;
    }

    // Add filename for documents
    if (waMediaType === 'document' && filename) {
      messagePayload[waMediaType].filename = filename;
    }

    console.log('WhatsApp message payload:', JSON.stringify(messagePayload, null, 2));

    // Send to WhatsApp
    const whatsappResponse = await fetch(
      `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messagePayload),
      }
    );

    const whatsappData = await whatsappResponse.json();

    if (!whatsappResponse.ok) {
      console.error('WhatsApp API error:', whatsappData);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send message via WhatsApp',
          details: whatsappData 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('WhatsApp response:', whatsappData);

    // Save message to database
    const messageData = {
      wa_message_id: whatsappData.messages?.[0]?.id,
      wa_from: null,
      wa_to: to,
      wa_phone_number_id: WHATSAPP_PHONE_NUMBER_ID,
      direction: 'outbound',
      body: caption || null,
      wa_timestamp: new Date().toISOString(),
      raw: whatsappData,
      media_type: waMediaType,
      media_url: mediaUrl,
      media_caption: caption,
      media_filename: filename,
      media_mime_type: mediaType,
      is_template: false
    };

    const { error: dbError } = await supabase
      .from('messages')
      .insert([messageData]);

    if (dbError) {
      console.error('Database error:', dbError);
      // Don't fail the request if DB save fails, message was sent successfully
    }

    return new Response(
      JSON.stringify({
        success: true,
        message_id: whatsappData.messages?.[0]?.id,
        whatsapp_response: whatsappData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-wa-media function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});