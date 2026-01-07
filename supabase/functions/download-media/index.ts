import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mediaId, mediaType, filename } = await req.json();
    
    if (!mediaId) {
      return new Response(
        JSON.stringify({ error: 'Media ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
    if (!accessToken) {
      throw new Error('WHATSAPP_ACCESS_TOKEN not configured');
    }

    console.log(`Downloading media: ${mediaId}, type: ${mediaType}`);

    // Get media URL from WhatsApp API
    const mediaResponse = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!mediaResponse.ok) {
      throw new Error(`Failed to get media info: ${mediaResponse.statusText}`);
    }

    const mediaInfo = await mediaResponse.json();
    console.log('Media info received:', mediaInfo);

    // Download the actual media file
    const fileResponse = await fetch(mediaInfo.url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!fileResponse.ok) {
      throw new Error(`Failed to download media: ${fileResponse.statusText}`);
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    const contentType = fileResponse.headers.get('content-type') || 'application/octet-stream';
    
    // Generate filename if not provided
    const extension = contentType.split('/')[1] || 'bin';
    const finalFilename = filename || `media_${mediaId}.${extension}`;
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Upload to Supabase Storage
    const filePath = `${mediaType}/${mediaId}/${finalFilename}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('whatsapp-media')
      .upload(filePath, new Uint8Array(fileBuffer), {
        contentType,
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Failed to upload media: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('whatsapp-media')
      .getPublicUrl(filePath);

    console.log(`Media uploaded successfully: ${publicUrl}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        url: publicUrl,
        filename: finalFilename,
        contentType
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error downloading media:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});