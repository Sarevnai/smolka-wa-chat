import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Default voice ID (Sarah) as fallback
const DEFAULT_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL';

// Convert MP3 to OGG/Opus using CloudConvert API
async function convertToOggOpus(mp3Buffer: ArrayBuffer): Promise<ArrayBuffer | null> {
  const CLOUDCONVERT_API_KEY = Deno.env.get('CLOUDCONVERT_API_KEY');
  
  if (!CLOUDCONVERT_API_KEY) {
    console.log('⚠️ CLOUDCONVERT_API_KEY not configured, skipping conversion');
    return null;
  }

  try {
    console.log('🔄 Starting CloudConvert MP3→OGG/Opus conversion...');

    // Step 1: Create a job with import, convert, and export tasks
    const jobResponse = await fetch('https://api.cloudconvert.com/v2/jobs', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLOUDCONVERT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tasks: {
          'import-audio': {
            operation: 'import/base64',
            file: base64Encode(mp3Buffer),
            filename: 'audio.mp3'
          },
          'convert-audio': {
            operation: 'convert',
            input: 'import-audio',
            output_format: 'ogg',
            audio_codec: 'opus',
            audio_bitrate: 64,
            audio_frequency: 48000
          },
          'export-audio': {
            operation: 'export/url',
            input: 'convert-audio'
          }
        }
      })
    });

    if (!jobResponse.ok) {
      const errorText = await jobResponse.text();
      console.error('❌ CloudConvert job creation failed:', jobResponse.status, errorText);
      return null;
    }

    const jobData = await jobResponse.json();
    const jobId = jobData.data.id;
    console.log('📋 CloudConvert job created:', jobId);

    // Step 2: Wait for job completion (poll status)
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max wait
    let exportTask = null;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      
      const statusResponse = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${CLOUDCONVERT_API_KEY}`,
        }
      });

      if (!statusResponse.ok) {
        console.error('❌ CloudConvert status check failed');
        return null;
      }

      const statusData = await statusResponse.json();
      const status = statusData.data.status;

      if (status === 'finished') {
        exportTask = statusData.data.tasks.find((t: any) => t.name === 'export-audio');
        break;
      } else if (status === 'error') {
        console.error('❌ CloudConvert job failed:', statusData.data);
        return null;
      }

      attempts++;
    }

    if (!exportTask || !exportTask.result?.files?.[0]?.url) {
      console.error('❌ CloudConvert: No export URL found');
      return null;
    }

    // Step 3: Download the converted file
    const downloadUrl = exportTask.result.files[0].url;
    console.log('⬇️ Downloading converted OGG file...');
    
    const downloadResponse = await fetch(downloadUrl);
    if (!downloadResponse.ok) {
      console.error('❌ Failed to download converted file');
      return null;
    }

    const oggBuffer = await downloadResponse.arrayBuffer();
    console.log('✅ CloudConvert conversion complete:', oggBuffer.byteLength, 'bytes');
    
    return oggBuffer;

  } catch (error) {
    console.error('❌ CloudConvert error:', error);
    return null;
  }
}

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

    // Call ElevenLabs TTS API - generate MP3
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
          output_format: 'mp3_44100_128',
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

    const mp3Buffer = await response.arrayBuffer();
    console.log('✅ MP3 audio generated:', mp3Buffer.byteLength, 'bytes');

    // Try to convert MP3 to OGG/Opus for native WhatsApp voice message
    const oggBuffer = await convertToOggOpus(mp3Buffer);
    
    let finalBuffer: ArrayBuffer;
    let fileName: string;
    let contentType: string;
    let isVoiceMessage: boolean;

    if (oggBuffer) {
      // Use converted OGG/Opus
      finalBuffer = oggBuffer;
      fileName = `ai-voice-${Date.now()}.ogg`;
      contentType = 'audio/ogg';
      isVoiceMessage = true;
      console.log('🎤 Using OGG/Opus for native voice message');
    } else {
      // Fallback to MP3
      finalBuffer = mp3Buffer;
      fileName = `ai-audio-${Date.now()}.mp3`;
      contentType = 'audio/mpeg';
      isVoiceMessage = false;
      console.log('📁 Using MP3 fallback (no conversion)');
    }

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('whatsapp-media')
      .upload(fileName, finalBuffer, {
        contentType,
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
        contentType,
        isVoiceMessage,
        byteLength: finalBuffer.byteLength
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
