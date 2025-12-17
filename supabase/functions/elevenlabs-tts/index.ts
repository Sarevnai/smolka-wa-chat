import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Default voice ID (Sarah) as fallback
const DEFAULT_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voiceId } = await req.json();

    if (!text) {
      return new Response(
        JSON.stringify({ success: false, error: 'Text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'ELEVENLABS_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use provided voice ID or default
    const finalVoiceId = voiceId || DEFAULT_VOICE_ID;

    console.log('🎙️ ElevenLabs TTS request:', { 
      textLength: text.length, 
      voiceId: finalVoiceId,
      textPreview: text.substring(0, 50) 
    });

    // Call ElevenLabs TTS API
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${finalVoiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          output_format: 'mp3_44100_128', // MP3 format - reliable output from ElevenLabs
          voice_settings: {
            stability: 0.70,
            similarity_boost: 0.85,
            style: 0.25,
            use_speaker_boost: true,
            speed: 0.92,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ ElevenLabs API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: `ElevenLabs error: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const audioBuffer = await response.arrayBuffer();
    console.log('✅ Audio generated:', audioBuffer.byteLength, 'bytes');

    // Upload to Supabase Storage as MP3
    const fileName = `ai-audio-${Date.now()}.mp3`;
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('whatsapp-media')
      .upload(fileName, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: false,
      });

    if (uploadError) {
      console.error('❌ Storage upload error:', uploadError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to upload audio' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get public URL
    const { data: urlData } = supabase
      .storage
      .from('whatsapp-media')
      .getPublicUrl(fileName);

    console.log('📁 Audio uploaded:', urlData.publicUrl);

    return new Response(
      JSON.stringify({ 
        success: true, 
        audioUrl: urlData.publicUrl,
        fileName,
        byteLength: audioBuffer.byteLength
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in elevenlabs-tts:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
