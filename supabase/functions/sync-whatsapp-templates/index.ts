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
    console.log('=== WhatsApp Template Sync Started ===');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const whatsappAccessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
    const whatsappBusinessAccountId = Deno.env.get('WHATSAPP_BUSINESS_ACCOUNT_ID');

    console.log('Environment check:', {
      hasAccessToken: !!whatsappAccessToken,
      hasBusinessAccountId: !!whatsappBusinessAccountId,
      businessAccountIdLength: whatsappBusinessAccountId?.length,
      businessAccountIdStartsWith: whatsappBusinessAccountId?.substring(0, 5)
    });

    if (!whatsappAccessToken) {
      console.error('WHATSAPP_ACCESS_TOKEN is missing');
      return new Response(JSON.stringify({ 
        success: false,
        error: 'WHATSAPP_ACCESS_TOKEN não configurado',
        details: 'Configure o token de acesso do WhatsApp Business nas configurações do projeto'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!whatsappBusinessAccountId) {
      console.error('WHATSAPP_BUSINESS_ACCOUNT_ID is missing');
      return new Response(JSON.stringify({ 
        success: false,
        error: 'WHATSAPP_BUSINESS_ACCOUNT_ID não configurado',
        details: 'Configure o ID da conta de negócios do WhatsApp nas configurações do projeto'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate Business Account ID format (should be numeric)
    if (!/^\d+$/.test(whatsappBusinessAccountId)) {
      console.error('Invalid Business Account ID format:', whatsappBusinessAccountId);
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Formato inválido do Business Account ID',
        details: `O ID deve ser numérico. Recebido: ${whatsappBusinessAccountId}`,
        debug: { providedId: whatsappBusinessAccountId }
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch templates from Meta Graph API
    const apiUrl = `https://graph.facebook.com/v23.0/${whatsappBusinessAccountId}/message_templates`;
    console.log('Making request to Meta API:', apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${whatsappAccessToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Meta API Response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Meta API Error Response:', errorText);
      
      let errorMessage = 'Erro ao conectar com a Meta API';
      let details = errorText;
      
      try {
        const parsedError = JSON.parse(errorText);
        if (parsedError.error?.message) {
          errorMessage = parsedError.error.message;
        }
        details = JSON.stringify(parsedError, null, 2);
      } catch (e) {
        // Keep original error text
      }

      return new Response(JSON.stringify({ 
        success: false,
        error: errorMessage,
        details: details,
        debug: {
          status: response.status,
          url: apiUrl,
          timestamp: new Date().toISOString()
        }
      }), {
        status: response.status >= 400 ? response.status : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    console.log('Meta API Success Response:', {
      templatesFound: data.data?.length || 0,
      templateNames: data.data?.map((t: any) => t.name) || []
    });

    const syncResults = {
      fetched: 0,
      synced: 0,
      errors: [] as string[],
      templates: [] as any[]
    };

    if (data.data && Array.isArray(data.data)) {
      syncResults.fetched = data.data.length;
      
      for (const template of data.data) {
        try {
          console.log(`Syncing template: ${template.name} (ID: ${template.id})`);
          
          syncResults.templates.push({
            id: template.id,
            name: template.name,
            status: template.status,
            category: template.category,
            language: template.language
          });
          
          // Map Meta status to our status
          const mappedStatus = template.status === 'APPROVED' ? 'active' : 
                               template.status === 'PENDING' ? 'pending' :
                               template.status === 'REJECTED' ? 'rejected' : 'disabled';

          // Insert or update template in our database
          const { error } = await supabaseClient
            .from('whatsapp_templates')
            .upsert({
              template_id: template.id,
              template_name: template.name,
              category: template.category || 'UTILITY',
              language: template.language || 'pt_BR',
              status: mappedStatus,
              components: template.components || [],
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
      console.log('No templates found in API response:', data);
    }

    console.log('=== Sync Results ===', syncResults);

    const message = syncResults.synced > 0 
      ? `Sucesso! ${syncResults.synced}/${syncResults.fetched} templates sincronizados`
      : syncResults.fetched > 0 
        ? `Nenhum template sincronizado. ${syncResults.errors.length} erros encontrados.`
        : 'Nenhum template encontrado na conta Meta.';

    return new Response(JSON.stringify({
      success: syncResults.synced > 0,
      message: message,
      results: syncResults,
      debug: {
        timestamp: new Date().toISOString(),
        businessAccountId: whatsappBusinessAccountId,
        templatesInResponse: data.data?.length || 0
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('=== Critical Error in sync-whatsapp-templates ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Erro interno do servidor',
      details: error.message,
      debug: {
        timestamp: new Date().toISOString(),
        errorType: error.constructor.name
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});