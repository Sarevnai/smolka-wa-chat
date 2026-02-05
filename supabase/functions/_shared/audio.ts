// ========== AUDIO TRANSCRIPTION & TTS ==========
// Extracted from make-webhook/index.ts for modularity

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AudioConfig, AudioResult } from './types.ts';

// ========== TRANSCRIBE AUDIO ==========

export async function transcribeAudio(
  supabase: any, 
  audioUrl: string
): Promise<string | null> {
  try {
    console.log('🎤 Transcribing audio from Make:', audioUrl);
    
    const { data, error } = await supabase.functions.invoke('transcribe-audio', {
      body: { audioUrl }
    });
    
    if (error || !data?.success) {
      console.error('❌ Transcription failed:', error || data?.error);
      return null;
    }
    
    console.log('✅ Audio transcribed:', data.text?.substring(0, 100));
    return data.text;
  } catch (error) {
    console.error('❌ Error in transcribeAudio:', error);
    return null;
  }
}

// ========== GET AUDIO CONFIG ==========

export async function getAudioConfig(supabase: any): Promise<AudioConfig | null> {
  try {
    const { data } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'ai_agent_config')
      .maybeSingle();
    
    if (!data?.setting_value) return null;
    
    const config = data.setting_value;
    return {
      audio_enabled: config.audio_enabled || false,
      audio_voice_id: config.audio_voice_id || 'EXAVITQu4vr4xnSDxMaL',
      audio_voice_name: config.audio_voice_name || 'Sarah',
      audio_mode: config.audio_mode || 'text_and_audio',
      audio_max_chars: config.audio_max_chars || 1000
    };
  } catch (error) {
    console.error('❌ Error getting audio config:', error);
    return null;
  }
}

// ========== GENERATE AUDIO RESPONSE (TTS) ==========

export async function generateAudioResponse(
  text: string, 
  audioConfig: AudioConfig
): Promise<AudioResult | null> {
  if (!audioConfig.audio_enabled) return null;
  
  const textToConvert = text.length > audioConfig.audio_max_chars 
    ? text.substring(0, audioConfig.audio_max_chars) + '...'
    : text;
  
  try {
    console.log('🎙️ Generating TTS audio...');
    
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      console.error('❌ ELEVENLABS_API_KEY not configured');
      return null;
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${audioConfig.audio_voice_id}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: textToConvert,
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
      return null;
    }

    const audioBuffer = await response.arrayBuffer();
    console.log('✅ MP3 audio generated:', audioBuffer.byteLength, 'bytes');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const storageSupabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const fileName = `ai-audio-${Date.now()}.mp3`;
    const { error: uploadError } = await storageSupabase
      .storage
      .from('whatsapp-media')
      .upload(fileName, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: false,
      });

    if (uploadError) {
      console.error('❌ Storage upload error:', uploadError);
      return null;
    }

    const { data: urlData } = storageSupabase
      .storage
      .from('whatsapp-media')
      .getPublicUrl(fileName);

    console.log('✅ Audio uploaded:', urlData.publicUrl);
    
    return {
      audioUrl: urlData.publicUrl,
      isVoiceMessage: false,
      contentType: 'audio/mpeg'
    };
  } catch (error) {
    console.error('❌ Error in generateAudioResponse:', error);
    return null;
  }
}
