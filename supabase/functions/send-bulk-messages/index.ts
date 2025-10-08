import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContactInfo {
  phone: string;
  name?: string;
}

interface BulkMessageRequest {
  contacts: ContactInfo[];
  message: string;
  template_id?: string;
  campaign_id?: string;
}

// Helper function to upload media to WhatsApp and get media_id
async function uploadMediaToWhatsApp(
  mediaUrl: string,
  mediaType: string,
  phoneNumberId: string,
  accessToken: string
): Promise<string | null> {
  try {
    console.log(`📤 Downloading media from: ${mediaUrl}`);
    
    // 1. Download file from URL
    const fileResponse = await fetch(mediaUrl);
    if (!fileResponse.ok) {
      console.error(`Failed to download media: ${fileResponse.statusText}`);
      return null;
    }
    
    const fileBlob = await fileResponse.blob();
    const fileBuffer = await fileBlob.arrayBuffer();
    
    // 2. Prepare FormData for WhatsApp upload
    const formData = new FormData();
    const mimeType = mediaType === 'IMAGE' ? 'image/jpeg' 
                   : mediaType === 'VIDEO' ? 'video/mp4'
                   : mediaType === 'DOCUMENT' ? 'application/pdf'
                   : 'image/jpeg';
    
    const fileName = mediaType === 'IMAGE' ? 'image.jpg'
                   : mediaType === 'VIDEO' ? 'video.mp4'
                   : 'document.pdf';
    
    formData.append('file', new Blob([fileBuffer], { type: mimeType }), fileName);
    formData.append('type', mimeType);
    formData.append('messaging_product', 'whatsapp');
    
    // 3. Upload to WhatsApp Media API
    console.log(`📤 Uploading ${mediaType} to WhatsApp Media API...`);
    const uploadResponse = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/media`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        body: formData
      }
    );
    
    const uploadResult = await uploadResponse.json();
    
    if (!uploadResponse.ok) {
      console.error('❌ WhatsApp Media upload failed:', uploadResult);
      return null;
    }
    
    console.log(`✅ Media uploaded successfully. Media ID: ${uploadResult.id}`);
    return uploadResult.id;
    
  } catch (error) {
    console.error('❌ Error uploading media to WhatsApp:', error);
    return null;
  }
}

// Helper function to get or upload media_id with caching
async function getOrUploadMediaId(
  template: any,
  supabaseAdmin: any,
  phoneNumberId: string,
  accessToken: string
): Promise<string | null> {
  try {
    // 1. Check if template already has valid cached media_id
    if (template.media_id && template.media_uploaded_at) {
      const uploadedAt = new Date(template.media_uploaded_at);
      const now = new Date();
      const hoursDiff = (now.getTime() - uploadedAt.getTime()) / (1000 * 60 * 60);
      
      // WhatsApp media IDs are valid for ~30 days
      // Renew if older than 15 days (360 hours) to be safe
      if (hoursDiff < 360) {
        console.log(`✅ Using cached media_id for template ${template.template_name} (age: ${Math.round(hoursDiff)}h)`);
        return template.media_id;
      } else {
        console.log(`⏰ Cached media_id expired for template ${template.template_name} (age: ${Math.round(hoursDiff)}h)`);
      }
    }
    
    // 2. Extract media URL from template
    const headerComponent = template.components?.find(c => c.type === 'HEADER');
    if (!headerComponent?.example?.header_handle?.[0]) {
      console.error('❌ No media URL found in template header');
      return null;
    }
    
    const mediaUrl = headerComponent.example.header_handle[0];
    const mediaType = headerComponent.format; // IMAGE, VIDEO, DOCUMENT
    
    console.log(`📤 Need to upload ${mediaType} for template ${template.template_name}`);
    
    // 3. Upload media to WhatsApp
    const mediaId = await uploadMediaToWhatsApp(
      mediaUrl,
      mediaType,
      phoneNumberId,
      accessToken
    );
    
    if (!mediaId) {
      console.error('❌ Failed to upload media to WhatsApp');
      return null;
    }
    
    // 4. Cache media_id in database
    const { error: updateError } = await supabaseAdmin
      .from('whatsapp_templates')
      .update({
        media_id: mediaId,
        media_uploaded_at: new Date().toISOString()
      })
      .eq('id', template.id);
    
    if (updateError) {
      console.error('⚠️ Failed to cache media_id:', updateError);
      // Not critical - we still have the media_id to use
    } else {
      console.log(`✅ Cached media_id ${mediaId} for template ${template.template_name}`);
    }
    
    return mediaId;
    
  } catch (error) {
    console.error('❌ Error in getOrUploadMediaId:', error);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header and verify user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ No authorization header');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Autorização necessária' 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client with user context
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify user is authenticated and get user info
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Falha na autenticação' 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      console.error('❌ User not authorized for bulk messaging:', profileError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Privilégios de administrador necessários para envio em massa' 
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('✅ User authenticated as admin:', user.email);

    const { contacts, message, template_id, campaign_id }: BulkMessageRequest = await req.json();

    console.log('Bulk message request:', { contactCount: contacts.length, messageLength: message.length });

    // Validate input
    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Lista de contatos é obrigatória e deve conter pelo menos um contato' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!message || message.trim().length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Mensagem é obrigatória' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Function to clean and validate Brazilian phone numbers
    function cleanPhoneNumber(phone: string): string {
      // Remove all non-numeric characters
      return phone.replace(/\D/g, '');
    }

    function validateBrazilianPhone(phone: string): boolean {
      const cleaned = cleanPhoneNumber(phone);
      
      // Brazilian phone patterns:
      // - 13 digits: +55 XX 9 XXXX-XXXX (with country code and mobile 9)
      // - 12 digits: +55 XX XXXX-XXXX (with country code, no mobile 9)
      // - 11 digits: XX 9 XXXX-XXXX (no country code, with mobile 9)
      // - 10 digits: XX XXXX-XXXX (no country code, no mobile 9)
      
      if (cleaned.length === 13 && cleaned.startsWith('55')) {
        // +55 format with mobile 9
        return true;
      } else if (cleaned.length === 12 && cleaned.startsWith('55')) {
        // +55 format without mobile 9
        return true;
      } else if (cleaned.length === 11) {
        // Brazilian format with mobile 9 (no country code)
        return true;
      } else if (cleaned.length === 10) {
        // Brazilian format without mobile 9 (no country code)
        return true;
      }
      
      return false;
    }

    function normalizePhoneNumber(phone: string): string {
      const cleaned = cleanPhoneNumber(phone);
      
      // Normalize to WhatsApp format (with country code, no + sign)
      if (cleaned.length === 13 && cleaned.startsWith('55')) {
        // Already has country code
        return cleaned;
      } else if (cleaned.length === 12 && cleaned.startsWith('55')) {
        // Has country code but missing mobile 9, add it
        const areaCode = cleaned.slice(2, 4);
        const number = cleaned.slice(4);
        return `55${areaCode}9${number}`;
      } else if (cleaned.length === 11) {
        // No country code, add 55
        return `55${cleaned}`;
      } else if (cleaned.length === 10) {
        // No country code and no mobile 9, add both
        const areaCode = cleaned.slice(0, 2);
        const number = cleaned.slice(2);
        return `55${areaCode}9${number}`;
      }
      
      return cleaned; // Return as-is if doesn't match patterns
    }

    // Validate phone numbers and rate limiting
    const invalidContacts = contacts.filter(contact => {
      if (!contact.phone || typeof contact.phone !== 'string') {
        return true;
      }
      
      const isValid = validateBrazilianPhone(contact.phone);
      if (!isValid) {
        console.log(`❌ Invalid phone format: ${contact.phone} (cleaned: ${cleanPhoneNumber(contact.phone)})`);
      }
      return !isValid;
    });

    if (invalidContacts.length > 0) {
      console.error('❌ Invalid phone numbers found:', invalidContacts);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Números de telefone inválidos encontrados',
          invalid_contacts: invalidContacts
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Rate limiting - max 100 contacts per request
    if (contacts.length > 100) {
      console.error('❌ Too many contacts in single request:', contacts.length);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Máximo de 100 contatos permitidos por solicitação de envio em massa' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get WhatsApp API credentials from secrets
    const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
    
    if (!accessToken || !phoneNumberId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Configuração do WhatsApp não encontrada' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client for database operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let successful = 0;
    let failed = 0;
    const errors: Array<{ phone: string; error: string }> = [];
    const whatsappUrl = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

    // Process each contact with delay to respect rate limits
    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      
      try {
        const normalizedPhone = normalizePhoneNumber(contact.phone);
        console.log(`Sending message ${i + 1}/${contacts.length} to ${contact.phone} (normalized: ${normalizedPhone})`);

        // Prepare WhatsApp API payload - use template if provided, otherwise text
        let whatsappPayload: any;
        let useTemplate = false;

        if (template_id) {
          // Fetch WhatsApp template from database
          const { data: template, error: templateError } = await supabase
            .from('whatsapp_templates')
            .select('*')
            .eq('template_id', template_id)
            .eq('status', 'active')
            .single();

          if (template && !templateError) {
            console.log(`Using WhatsApp template: ${template.template_name}`);
            useTemplate = true;

            // Analyze template components
            const headerComponent = template.components?.find(c => c.type === 'HEADER');
            const bodyComponent = template.components?.find(c => c.type === 'BODY');
            
            // Build components array for WhatsApp API
            const templateComponents: any[] = [];

            // Handle HEADER component (images, videos, documents) with media_id
            if (headerComponent) {
              const headerFormat = headerComponent.format;
              const headerExample = headerComponent.example;
              
              console.log(`Template has HEADER component: format=${headerFormat}`);
              
              if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerFormat) && headerExample?.header_handle?.[0]) {
                // Try to get or upload media_id
                const mediaId = await getOrUploadMediaId(
                  template,
                  supabase,
                  phoneNumberId,
                  accessToken
                );
                
                if (mediaId) {
                  // Use media_id (recommended by WhatsApp)
                  console.log(`✅ Using media_id for ${headerFormat}: ${mediaId}`);
                  
                  const mediaParam = {
                    type: headerFormat.toLowerCase(),
                    [headerFormat.toLowerCase()]: { id: mediaId }
                  };
                  
                  templateComponents.push({
                    type: "header",
                    parameters: [mediaParam]
                  });
                } else {
                  // Fallback to link if media_id failed
                  const mediaUrl = headerExample.header_handle[0];
                  console.log(`⚠️ Fallback to link for ${headerFormat}: ${mediaUrl}`);
                  
                  const mediaParam = {
                    type: headerFormat.toLowerCase(),
                    [headerFormat.toLowerCase()]: { link: mediaUrl }
                  };
                  
                  templateComponents.push({
                    type: "header",
                    parameters: [mediaParam]
                  });
                }
              }
            }

            // Handle BODY component with parameters
            const bodyText = bodyComponent?.text || '';
            const placeholderMatches = bodyText.match(/\{\{\d+\}\}/g);
            const requiredParams = placeholderMatches ? placeholderMatches.length : 0;
            
            console.log(`Template "${template.template_name}" BODY requires ${requiredParams} parameters`);
            
            if (requiredParams > 0) {
              // Build exact number of template parameters
              const templateParams = [];
              
              // Use contact data for parameters
              if (contact.name) {
                templateParams.push({
                  type: "text",
                  text: contact.name
                });
              }
              
              // Add parameters from contact.variables if available
              if (contact.variables && Object.keys(contact.variables).length > 0) {
                const variableValues = Object.values(contact.variables);
                for (let i = templateParams.length; i < requiredParams && i < variableValues.length; i++) {
                  templateParams.push({
                    type: "text",
                    text: String(variableValues[i - templateParams.length])
                  });
                }
              }
              
              // Fill remaining slots with fallback data
              const fallbackData = ["-", "-", "-", "-", "-"];
              while (templateParams.length < requiredParams) {
                const fallbackIndex = templateParams.length - (contact.name ? 1 : 0);
                templateParams.push({
                  type: "text",
                  text: fallbackData[fallbackIndex] || "-"
                });
              }

              templateComponents.push({
                type: "body",
                parameters: templateParams
              });
            }

            console.log(`Template components array:`, JSON.stringify(templateComponents, null, 2));

            whatsappPayload = {
              messaging_product: 'whatsapp',
              to: normalizedPhone,
              type: 'template',
              template: {
                name: template.template_name,
                language: {
                  code: template.language || 'pt_BR'
                },
                ...(templateComponents.length > 0 ? {
                  components: templateComponents
                } : {})
              }
            };
          } else {
            console.log(`Template ${template_id} not found or inactive, falling back to text message`);
            whatsappPayload = {
              messaging_product: 'whatsapp',
              to: normalizedPhone,
              type: 'text',
              text: { body: message }
            };
          }
        } else {
          // Use text message
          whatsappPayload = {
            messaging_product: 'whatsapp',
            to: normalizedPhone,
            type: 'text',
            text: { body: message }
          };
        }

        // Send message via WhatsApp API
        const response = await fetch(whatsappUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(whatsappPayload)
        });

        const result = await response.json();
        
        if (!response.ok) {
          console.log(`WhatsApp API error for ${contact.phone}:`, JSON.stringify(result, null, 2));
          
          // Check for specific template errors
          const isTemplateNotFound = result.error?.code === 132001;
          const isInvalidTemplate = result.error?.message?.includes('Template name does not exist') ||
                                  result.error?.message?.includes('template name') ||
                                  result.error?.message?.includes('does not exist in the translation');
          
          // Enhanced error handling with automatic template fallback
          const isWindowError = result.error?.code === 131047 || 
                               result.error?.code === 131053 ||
                               result.error?.message?.includes('24 hour') ||
                               result.error?.message?.includes('outside the support window');
          
          let fallbackAttempted = false;
          
          if (isWindowError && !template_id) {
            console.log(`24-hour window error detected for ${contact.phone}. Attempting template fallback...`);
            
            // Try multiple approved templates as fallback
            const { data: availableTemplates } = await supabase
              .from('whatsapp_templates')
              .select('template_id, template_name, components, language')
              .eq('status', 'active')
              .in('template_name', ['hello_world', 'triagem_1', 'att_pp'])
              .order('template_name')
              .limit(3);
            
            for (const fallbackTemplate of availableTemplates || []) {
              try {
                const templateMessage = {
                  messaging_product: "whatsapp",
                  to: normalizedPhone,
                  type: "template",
                  template: {
                    name: fallbackTemplate.template_name,
                    language: { code: fallbackTemplate.language || "pt_BR" },
                    ...(fallbackTemplate.components && fallbackTemplate.components.length > 0 ? {
                      components: fallbackTemplate.components
                    } : {})
                  }
                };
                
                console.log(`Trying template "${fallbackTemplate.template_name}" for ${contact.phone}`);
                
                const templateResponse = await fetch(whatsappUrl, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(templateMessage)
                });
                
                if (templateResponse.ok) {
                  const templateData = await templateResponse.json();
                  console.log(`✅ Template fallback successful for ${contact.phone} using "${fallbackTemplate.template_name}"`);
                  
                  // Log successful template message
                  await supabase.from('messages').insert({
                    wa_message_id: templateData.messages?.[0]?.id,
                    wa_from: null,
                    wa_to: normalizedPhone,
                    wa_phone_number_id: phoneNumberId,
                    direction: 'outbound',
                    body: `Template: ${fallbackTemplate.template_name} (Fallback)`,
                    wa_timestamp: new Date().toISOString(),
                    raw: templateData,
                    is_template: true
                  });
                  
                  successful++;
                  fallbackAttempted = true;
                  break; // Success, exit the template loop
                } else {
                  const templateError = await templateResponse.json();
                  console.log(`Template "${fallbackTemplate.template_name}" failed:`, templateError);
                }
              } catch (templateErr) {
                console.log(`Error trying template "${fallbackTemplate.template_name}":`, templateErr);
              }
            }
          }
          
          if (!fallbackAttempted) {
            failed++;
            let errorMsg = '';
            
            if (isTemplateNotFound || isInvalidTemplate) {
              errorMsg = `${contact.phone}: Template inválido ou não encontrado (ID: ${template_id})`;
            } else if (isWindowError) {
              errorMsg = `${contact.phone}: Fora da janela de 24h (nenhum template aprovado funcionou)`;
            } else {
              errorMsg = `${contact.phone}: ${result.error?.message || 'Erro desconhecido'}`;
            }
            
            errors.push({
              phone: contact.phone,
              error: errorMsg
            });
          }
          continue;
        }

        // Save successful message to database
        try {
          const messageData = {
            wa_message_id: result.messages?.[0]?.id || null,
            wa_from: null, // Outbound message
            wa_to: normalizedPhone, // Use normalized phone for consistency with API
            wa_phone_number_id: phoneNumberId,
            direction: 'outbound',
            body: message,
            wa_timestamp: new Date().toISOString(),
            raw: result,
            created_at: new Date().toISOString(),
            is_template: useTemplate || !!template_id
          };

          const { error: dbError } = await supabase
            .from('messages')
            .insert([messageData]);

          if (dbError) {
            console.error(`Database error for ${contact.phone}:`, dbError);
          }

          // Save campaign result if campaign_id is provided
          if (campaign_id) {
            const campaignResultData = {
              campaign_id,
              contact_id: null, // We'd need to find this by phone
              phone: contact.phone,
              status: 'sent' as const,
              sent_at: new Date().toISOString(),
            };

            const { error: campaignError } = await supabase
              .from('campaign_results')
              .insert([campaignResultData]);

            if (campaignError) {
              console.error(`Campaign result error for ${contact.phone}:`, campaignError);
            }
          }
        } catch (dbError) {
          console.error(`Database save error for ${contact.phone}:`, dbError);
        }

        successful++;
        console.log(`Message sent successfully to ${contact.phone}`);

      } catch (error: any) {
        console.error(`Error sending to ${contact.phone}:`, error);
        failed++;
        errors.push({
          phone: contact.phone,
          error: error.message || 'Erro desconhecido'
        });

        // Save failed campaign result if campaign_id is provided
        if (campaign_id) {
          try {
            const campaignResultData = {
              campaign_id,
              contact_id: null,
              phone: contact.phone,
              status: 'failed' as const,
              error_message: error.message || 'Erro desconhecido',
            };

            await supabase
              .from('campaign_results')
              .insert([campaignResultData]);
          } catch (dbError) {
            console.error(`Campaign result error for failed ${contact.phone}:`, dbError);
          }
        }
      }

      // Add delay between messages to respect rate limits (2 seconds)
      if (i < contacts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log(`Bulk message completed: ${successful} successful, ${failed} failed`);

    // Return final results
    return new Response(
      JSON.stringify({ 
        success: true,
        successful,
        failed,
        total: contacts.length,
        errors
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Error in send-bulk-messages function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Erro interno do servidor' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});