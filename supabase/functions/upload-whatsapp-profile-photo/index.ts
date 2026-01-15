import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const WHATSAPP_ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
  const WHATSAPP_APP_ID = Deno.env.get('WHATSAPP_APP_ID');
  const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');

  if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_APP_ID || !WHATSAPP_PHONE_NUMBER_ID) {
    console.error('Missing WhatsApp credentials');
    return new Response(
      JSON.stringify({ error: 'WhatsApp credentials not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return new Response(
        JSON.stringify({ error: 'File must be an image' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fileBuffer = await file.arrayBuffer();
    const fileBytes = new Uint8Array(fileBuffer);
    const fileSize = fileBytes.length;

    console.log(`Uploading profile photo: ${file.name}, size: ${fileSize}, type: ${file.type}`);

    // Step 1: Create upload session
    console.log('Creating upload session...');
    const createSessionUrl = `https://graph.facebook.com/v21.0/${WHATSAPP_APP_ID}/uploads`;
    
    const sessionResponse = await fetch(createSessionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file_length: fileSize,
        file_type: file.type,
        file_name: file.name,
      }),
    });

    const sessionData = await sessionResponse.json();

    if (!sessionResponse.ok) {
      console.error('Failed to create upload session:', sessionData);
      return new Response(
        JSON.stringify({ error: sessionData.error?.message || 'Failed to create upload session' }),
        { status: sessionResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const uploadSessionId = sessionData.id;
    console.log('Upload session created:', uploadSessionId);

    // Step 2: Upload the file
    console.log('Uploading file bytes...');
    const uploadUrl = `https://graph.facebook.com/v21.0/${uploadSessionId}`;
    
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `OAuth ${WHATSAPP_ACCESS_TOKEN}`,
        'file_offset': '0',
        'Content-Type': file.type,
      },
      body: fileBytes,
    });

    const uploadData = await uploadResponse.json();

    if (!uploadResponse.ok) {
      console.error('Failed to upload file:', uploadData);
      return new Response(
        JSON.stringify({ error: uploadData.error?.message || 'Failed to upload file' }),
        { status: uploadResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const handle = uploadData.h;
    console.log('File uploaded, handle:', handle);

    // Step 3: Update the profile with the new photo
    console.log('Updating profile with new photo...');
    const profileUrl = `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_NUMBER_ID}/whatsapp_business_profile`;
    
    const profileResponse = await fetch(profileUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        profile_picture_handle: handle,
      }),
    });

    const profileData = await profileResponse.json();

    if (!profileResponse.ok) {
      console.error('Failed to update profile photo:', profileData);
      return new Response(
        JSON.stringify({ error: profileData.error?.message || 'Failed to update profile photo' }),
        { status: profileResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Profile photo updated successfully:', profileData);
    return new Response(
      JSON.stringify({ success: true, handle, data: profileData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in upload-whatsapp-profile-photo:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
