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

    // Enhanced validation and logging
    console.log('=== WhatsApp Template Sync Debug ===');
    console.log('Access Token exists:', !!whatsappAccessToken);
    console.log('Business Account ID exists:', !!whatsappBusinessAccountId);
    console.log('Business Account ID format:', whatsappBusinessAccountId?.length, 'characters');
    console.log('Business Account ID value:', whatsappBusinessAccountId);

    if (!whatsappAccessToken || !whatsappBusinessAccountId) {
      const missingVars = [];
      if (!whatsappAccessToken) missingVars.push('WHATSAPP_ACCESS_TOKEN');
      if (!whatsappBusinessAccountId) missingVars.push('WHATSAPP_BUSINESS_ACCOUNT_ID');
      
      console.error('Missing required environment variables:', missingVars);
      return new Response(JSON.stringify({ 
        error: 'Missing WhatsApp credentials',
        details: `Missing: ${missingVars.join(', ')}`,
        debug: {
          hasAccessToken: !!whatsappAccessToken,
          hasBusinessAccountId: !!whatsappBusinessAccountId,
          businessAccountIdLength: whatsappBusinessAccountId?.length || 0
        }
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate Business Account ID format (should be numeric)
    if (!/^\d+$/.test(whatsappBusinessAccountId)) {
      console.error('Invalid Business Account ID format:', whatsappBusinessAccountId);
      return new Response(JSON.stringify({ 
        error: 'Invalid Business Account ID format',
        details: 'Business Account ID must be numeric (e.g., "123456789012345")',
        debug: {
          providedId: whatsappBusinessAccountId,
          isNumeric: /^\d+$/.test(whatsappBusinessAccountId)
        }
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch templates from Meta Graph API with enhanced logging
    const apiUrl = `https://graph.facebook.com/v23.0/${whatsappBusinessAccountId}/message_templates?access_token=${whatsappAccessToken}`;
    console.log('Making request to Meta API...');
    console.log('API URL (token masked):', apiUrl.replace(/access_token=[^&]+/, 'access_token=***'));
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('Meta API Response Status:', response.status);
    console.log('Meta API Response Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Meta API Error Response:', errorData);
      
      let parsedError;
      try {
        parsedError = JSON.parse(errorData);
      } catch (e) {
        parsedError = { message: errorData };
      }

      return new Response(JSON.stringify({ 
        error: 'Failed to fetch templates from Meta',
        details: parsedError,
        debug: {
          status: response.status,
          businessAccountId: whatsappBusinessAccountId,
          apiUrl: apiUrl.replace(/access_token=[^&]+/, 'access_token=***'),
          responseHeaders: Object.fromEntries(response.headers.entries())
        }
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    console.log('=== Meta API Response Data ===');
    console.log('Full response:', JSON.stringify(data, null, 2));
    console.log('Templates found:', data.data?.length || 0);
    
    if (data.data && data.data.length > 0) {
      console.log('Template names:', data.data.map((t: any) => t.name));
    }

    const syncResults = {
      fetched: 0,
      synced: 0,
      errors: [] as string[],
      templates: [] as any[]
    };

    if (data.data && Array.isArray(data.data)) {
      syncResults.fetched = data.data.length;
      syncResults.templates = data.data.map((t: any) => ({
        id: t.id,
        name: t.name,
        status: t.status,
        category: t.category,
        language: t.language
      }));

      for (const template of data.data) {
        try {
          console.log(`Processing template: ${template.name} (${template.id})`);
          
          // Insert or update template in our database
          const { error } = await supabaseClient
            .from('whatsapp_templates')
            .upsert({
              template_id: template.id,
              template_name: template.name,
              category: template.category,
              language: template.language || 'pt_BR',
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
            console.log(`Successfully synced template: ${template.name}`);
            syncResults.synced++;
          }
        } catch (err) {
          console.error('Error processing template:', template.name, err);
          syncResults.errors.push(`${template.name}: ${err.message}`);
        }
      }
    } else {
      console.log('No templates found in API response');
    }

    console.log('=== Sync Results ===');
    console.log('Sync completed:', syncResults);

    return new Response(JSON.stringify({
      success: true,
      message: syncResults.synced > 0 
        ? `Sincronização concluída: ${syncResults.synced}/${syncResults.fetched} templates sincronizados`
        : syncResults.fetched > 0 
          ? `Nenhum template foi sincronizado. ${syncResults.errors.length} erros encontrados.`
          : 'Nenhum template encontrado na conta Meta.',
      results: syncResults,
      debug: {
        timestamp: new Date().toISOString(),
        businessAccountId: whatsappBusinessAccountId,
        apiResponseReceived: !!data,
        templatesInResponse: data.data?.length || 0
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('=== Critical Error in sync-whatsapp-templates ===');
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message,
      debug: {
        timestamp: new Date().toISOString(),
        errorType: error.constructor.name,
        stack: error.stack
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});