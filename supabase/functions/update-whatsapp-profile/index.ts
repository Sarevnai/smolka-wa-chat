import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WhatsAppBusinessProfile {
  about?: string;
  description?: string;
  email?: string;
  websites?: string[];
  address?: string;
  profile_picture_handle?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate authentication
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const token = authHeader.replace('Bearer ', '');
  const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
  
  if (claimsError || !claimsData?.claims) {
    console.error('Auth error:', claimsError);
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const WHATSAPP_ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
  const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');

  if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    console.error('Missing WhatsApp credentials');
    return new Response(
      JSON.stringify({ error: 'WhatsApp credentials not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const apiUrl = `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_NUMBER_ID}/whatsapp_business_profile`;

  try {
    if (req.method === 'GET') {
      // Fetch current profile
      console.log('Fetching WhatsApp Business profile...');
      
      const response = await fetch(
        `${apiUrl}?fields=about,address,description,email,profile_picture_url,websites,vertical`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          },
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        console.error('Meta API error:', data);
        return new Response(
          JSON.stringify({ error: data.error?.message || 'Failed to fetch profile' }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Profile fetched successfully:', data);
      return new Response(
        JSON.stringify({ profile: data.data?.[0] || data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'POST') {
      // Update profile
      const body: WhatsAppBusinessProfile = await req.json();
      console.log('Updating WhatsApp Business profile with:', body);

      // Build the messaging product payload
      const payload: Record<string, unknown> = {
        messaging_product: 'whatsapp',
      };

      // Only include fields that are provided
      if (body.about !== undefined) {
        if (body.about.length > 139) {
          return new Response(
            JSON.stringify({ error: 'About text must be 139 characters or less' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        payload.about = body.about;
      }

      if (body.description !== undefined) {
        if (body.description.length > 512) {
          return new Response(
            JSON.stringify({ error: 'Description must be 512 characters or less' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        payload.description = body.description;
      }

      if (body.email !== undefined) {
        payload.email = body.email;
      }

      if (body.websites !== undefined) {
        if (body.websites.length > 2) {
          return new Response(
            JSON.stringify({ error: 'Maximum 2 websites allowed' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        payload.websites = body.websites.filter(w => w.trim() !== '');
      }

      if (body.address !== undefined) {
        payload.address = body.address;
      }

      if (body.profile_picture_handle !== undefined) {
        payload.profile_picture_handle = body.profile_picture_handle;
      }

      console.log('Sending payload to Meta:', payload);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Meta API error:', data);
        return new Response(
          JSON.stringify({ error: data.error?.message || 'Failed to update profile' }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Profile updated successfully:', data);
      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in update-whatsapp-profile:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
