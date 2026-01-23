import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // URL da imagem no app preview (usa a versão mais recente)
    const previewUrl = Deno.env.get('SUPABASE_URL')?.includes('lovable') 
      ? 'https://id-preview--12b59a46-c28e-4ee4-90fd-f0235513f414.lovable.app/developments/villa-maggiore-hero.jpg'
      : 'https://locacaoatt.lovable.app/developments/villa-maggiore-hero.jpg';
    const targetPath = 'developments/villa-maggiore-hero.jpg';

    console.log(`Downloading image from: ${previewUrl}`);

    // Baixar a imagem
    const imageResponse = await fetch(previewUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.status}`);
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const uint8Array = new Uint8Array(imageBuffer);

    console.log(`Downloaded ${uint8Array.length} bytes, uploading to Storage...`);

    // Upload para o Supabase Storage
    const { data, error } = await supabase.storage
      .from('whatsapp-media')
      .upload(targetPath, uint8Array, {
        contentType: 'image/jpeg',
        upsert: true  // Sobrescrever se existir
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Obter URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('whatsapp-media')
      .getPublicUrl(targetPath);

    console.log(`Upload successful! Public URL: ${publicUrl}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        publicUrl,
        bytesUploaded: uint8Array.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
