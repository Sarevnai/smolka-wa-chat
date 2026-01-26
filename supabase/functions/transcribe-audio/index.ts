import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audioUrl } = await req.json();
    
    if (!audioUrl) {
      throw new Error('No audio URL provided');
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    console.log('🎤 Transcribing audio from:', audioUrl);

    // Check if this is a WhatsApp/Facebook media URL that requires authentication
    const isWhatsAppUrl = audioUrl.includes('lookaside.fbsbx.com') || 
                          audioUrl.includes('whatsapp') ||
                          audioUrl.includes('facebook');

    // Download audio file with appropriate headers
    const fetchHeaders: Record<string, string> = {};
    
    if (isWhatsAppUrl) {
      const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
      if (accessToken) {
        fetchHeaders['Authorization'] = `Bearer ${accessToken}`;
        console.log('🔐 Using WhatsApp access token for authenticated download');
      } else {
        console.warn('⚠️ WhatsApp URL detected but no access token available');
      }
    }

    const audioResponse = await fetch(audioUrl, { headers: fetchHeaders });
    if (!audioResponse.ok) {
      throw new Error(`Failed to download audio: ${audioResponse.status}`);
    }

    const audioBlob = await audioResponse.blob();
    console.log('📥 Audio downloaded, size:', audioBlob.size, 'bytes');

    // Determine file extension from URL or content type
    const contentType = audioResponse.headers.get('content-type') || 'audio/ogg';
    let extension = 'ogg';
    if (contentType.includes('mp3') || contentType.includes('mpeg')) {
      extension = 'mp3';
    } else if (contentType.includes('wav')) {
      extension = 'wav';
    } else if (contentType.includes('m4a')) {
      extension = 'm4a';
    } else if (contentType.includes('webm')) {
      extension = 'webm';
    }

    // Prepare form data for Whisper API
    const formData = new FormData();
    formData.append('file', audioBlob, `audio.${extension}`);
    formData.append('model', 'whisper-1');
    formData.append('language', 'pt'); // Portuguese

    console.log('🔄 Sending to Whisper API...');

    // Send to OpenAI Whisper API
    const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: formData,
    });

    if (!transcriptionResponse.ok) {
      const errorText = await transcriptionResponse.text();
      console.error('❌ Whisper API error:', errorText);
      throw new Error(`Whisper API error: ${transcriptionResponse.status} - ${errorText}`);
    }

    const result = await transcriptionResponse.json();
    console.log('✅ Transcription successful:', result.text?.substring(0, 100));

    return new Response(
      JSON.stringify({ 
        success: true,
        text: result.text 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Transcription error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
