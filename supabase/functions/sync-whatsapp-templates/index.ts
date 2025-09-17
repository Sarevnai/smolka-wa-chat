import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const whatsappAccessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
    const whatsappBusinessAccountId = Deno.env.get('WHATSAPP_BUSINESS_ACCOUNT_ID');

    if (!whatsappAccessToken || !whatsappBusinessAccountId) {
      console.error('Missing required environment variables');
      return new Response(JSON.stringify({ 
        error: 'Missing WhatsApp credentials',
        details: 'WHATSAPP_ACCESS_TOKEN and WHATSAPP_BUSINESS_ACCOUNT_ID are required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch templates from Meta Graph API
    const response = await fetch(
      `https://graph.facebook.com/v23.0/${whatsappBusinessAccountId}/message_templates?access_token=${whatsappAccessToken}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Meta API Error:', errorData);
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch templates from Meta',
        details: errorData
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    console.log('Fetched templates from Meta:', data.data?.length || 0);

    const syncResults = {
      fetched: 0,
      synced: 0,
      errors: [] as string[]
    };

    if (data.data && Array.isArray(data.data)) {
      syncResults.fetched = data.data.length;

      for (const template of data.data) {
        try {
          // Insert or update template in our database
          const { error } = await supabaseClient
            .from('whatsapp_templates')
            .upsert({
              template_id: template.id,
              template_name: template.name,
              category: template.category,
              language: template.language,
              status: template.status,
              components: template.components,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'template_id',
              ignoreDuplicates: false
            });

          if (error) {
            console.error('Database error for template:', template.name, error);
            syncResults.errors.push(`${template.name}: ${error.message}`);
          } else {
            syncResults.synced++;
          }
        } catch (err) {
          console.error('Error processing template:', template.name, err);
          syncResults.errors.push(`${template.name}: ${err.message}`);
        }
      }
    }

    console.log('Sync completed:', syncResults);

    return new Response(JSON.stringify({
      success: true,
      message: `Sincronização concluída: ${syncResults.synced}/${syncResults.fetched} templates sincronizados`,
      results: syncResults
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in sync-whatsapp-templates function:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});