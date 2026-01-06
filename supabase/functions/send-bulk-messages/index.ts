import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContactInfo {
  phone: string;
  name?: string;
  variables?: Record<string, string>;
}

interface BulkMessageRequest {
  contacts: ContactInfo[];
  message: string;
  template_id?: string;
  campaign_id?: string;
  header_media?: {
    id?: string;
    url?: string;
    type: 'image' | 'video' | 'document';
    mime?: string;
    filename?: string;
  };
}

// Helper function to upload media to WhatsApp and return media_id
async function uploadMediaToWhatsApp(
  mediaUrl: string,
  accessToken: string,
  phoneNumberId: string
): Promise<{ media_id: string; mime_type: string; filename: string }> {
  console.log(`\n📥 Downloading media from: ${mediaUrl}`);
  
  // Download the media file with User-Agent to avoid 403
  const downloadResponse = await fetch(mediaUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; WhatsAppBot/1.0)',
    },
  });

  if (!downloadResponse.ok) {
    throw new Error(`Failed to download media: ${downloadResponse.status} ${downloadResponse.statusText}`);
  }

  const contentType = downloadResponse.headers.get('content-type') || 'application/octet-stream';
  const contentDisposition = downloadResponse.headers.get('content-disposition') || '';
  
  console.log(`📄 Content-Type: ${contentType}`);
  console.log(`📄 Content-Disposition: ${contentDisposition}`);

  // Extract or generate filename
  let filename = 'file';
  const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
  if (filenameMatch && filenameMatch[1]) {
    filename = filenameMatch[1].replace(/['"]/g, '');
  } else {
    // Generate filename based on mime type
    const ext = contentType.split('/')[1]?.split(';')[0] || 'bin';
    filename = `media_${Date.now()}.${ext}`;
  }

  const mediaBlob = await downloadResponse.blob();
  const mediaArrayBuffer = await mediaBlob.arrayBuffer();
  
  console.log(`📦 Media size: ${mediaArrayBuffer.byteLength} bytes`);
  console.log(`📤 Uploading to WhatsApp Media API...`);

  // Create FormData for WhatsApp Media API
  const formData = new FormData();
  formData.append('file', new Blob([mediaArrayBuffer], { type: contentType }), filename);
  formData.append('messaging_product', 'whatsapp');
  formData.append('type', contentType);

  // Upload to WhatsApp Media API
  const uploadResponse = await fetch(
    `https://graph.facebook.com/v21.0/${phoneNumberId}/media`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: formData,
    }
  );

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    console.error('❌ WhatsApp Media API error:', errorText);
    throw new Error(`WhatsApp Media API error: ${uploadResponse.status} - ${errorText}`);
  }

  const uploadResult = await uploadResponse.json();
  console.log(`✅ Media uploaded successfully. ID: ${uploadResult.id}`);

  return {
    media_id: uploadResult.id,
    mime_type: contentType,
    filename,
  };
}

// Helper to get or upload media_id (with caching)
async function getOrUploadMediaId(
  template: any,
  headerMedia: BulkMessageRequest['header_media'],
  accessToken: string,
  phoneNumberId: string,
  supabase: any
): Promise<string> {
  
  // Priority 1: Use provided media_id
  if (headerMedia?.id) {
    console.log(`✅ Using provided media_id: ${headerMedia.id}`);
    return headerMedia.id;
  }

  // Priority 2: Check cache (valid for 15 days)
  if (template.media_id && template.media_uploaded_at) {
    const uploadedAt = new Date(template.media_uploaded_at);
    const now = new Date();
    const daysSinceUpload = (now.getTime() - uploadedAt.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceUpload < 15) {
      console.log(`✅ Using cached media_id (${daysSinceUpload.toFixed(1)} days old): ${template.media_id}`);
      return template.media_id;
    } else {
      console.log(`⏰ Cached media_id expired (${daysSinceUpload.toFixed(1)} days old)`);
    }
  }

  // Priority 3: Upload from provided URL
  if (headerMedia?.url) {
    console.log(`📤 Uploading media from URL: ${headerMedia.url}`);
    const uploadResult = await uploadMediaToWhatsApp(headerMedia.url, accessToken, phoneNumberId);
    
    // Cache the media_id
    console.log(`💾 Caching media_id in database...`);
    await supabase
      .from('whatsapp_templates')
      .update({
        media_id: uploadResult.media_id,
        media_uploaded_at: new Date().toISOString(),
      })
      .eq('template_id', template.template_id);
    
    return uploadResult.media_id;
  }

  // No media available
  throw new Error('Template requires header media, but no media was provided');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin or marketing
    const { data: userFunctions } = await supabase
      .from('user_functions')
      .select('function')
      .eq('user_id', user.id);

    const functions = userFunctions?.map((f: any) => f.function) || [];
    const canSendBulk = functions.includes('admin') || functions.includes('marketing');

    if (!canSendBulk) {
      throw new Error('Only admins or marketing users can send bulk messages');
    }

    console.log(`✅ User authenticated: ${user.email}, functions: ${functions.join(', ')}`);

    // Parse request
    const requestData: BulkMessageRequest = await req.json();
    const { contacts, message, template_id, campaign_id, header_media } = requestData;

    if (!contacts || contacts.length === 0) {
      throw new Error('No contacts provided');
    }

    if (contacts.length > 100) {
      throw new Error('Maximum 100 contacts per request');
    }

    console.log(`Bulk message request: { contactCount: ${contacts.length}, messageLength: ${message?.length || 0} }`);

    // Get WhatsApp credentials
    const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');

    if (!accessToken || !phoneNumberId) {
      throw new Error('WhatsApp credentials not configured');
    }

    let successful = 0;
    let failed = 0;
    const errors: Array<{ phone: string; error: string }> = [];

    // If template_id is provided, fetch template details
    let template: any = null;
    if (template_id) {
      const { data: templateData, error: templateError } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('template_id', template_id)
        .single();

      if (templateError || !templateData) {
        throw new Error(`Template not found: ${template_id}`);
      }

      template = templateData;
      console.log(`Using WhatsApp template: ${template.template_name}`);
    }

    // Process each contact
    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      const normalizedPhone = contact.phone.replace(/\D/g, '');
      
      // Ensure phone starts with country code
      const finalPhone = normalizedPhone.startsWith('55') ? normalizedPhone : `55${normalizedPhone}`;

      console.log(`\nSending message ${i + 1}/${contacts.length} to ${contact.phone} (normalized: ${finalPhone})`);

      try {
        let payload: any;
        let messageType: string;

        if (template) {
          // Using WhatsApp template
          messageType = 'template';
          const components: any[] = [];

          // Check for HEADER component
          const headerComponent = template.components?.find((c: any) => c.type === 'HEADER');
          if (headerComponent) {
            console.log(`Template has HEADER component: format=${headerComponent.format}`);

            if (headerComponent.format === 'IMAGE' || headerComponent.format === 'VIDEO' || headerComponent.format === 'DOCUMENT') {
              try {
                // Get or upload media_id
                const mediaType = headerComponent.format.toLowerCase();
                const media_id = await getOrUploadMediaId(
                  template,
                  header_media,
                  accessToken,
                  phoneNumberId,
                  supabase
                );

                console.log(`Adding ${headerComponent.format} header with media_id: ${media_id}`);

                components.push({
                  type: 'header',
                  parameters: [{
                    type: mediaType,
                    [mediaType]: { id: media_id }
                  }]
                });
              } catch (mediaError: any) {
                console.error(`❌ Failed to handle header media:`, mediaError.message);
                throw new Error(`Header media error: ${mediaError.message}`);
              }
            } else if (headerComponent.format === 'TEXT' && headerComponent.text) {
              // TEXT header - can be fixed text or have variables
              const headerVariables = headerComponent.text.match(/\{\{([a-zA-Z0-9_]+)\}\}/g);
              
              if (headerVariables && contact.variables) {
                // Header has variables - detect if they're named or numeric
                const isNamedMode = headerVariables.some((v: string) => {
                  const varName = v.replace(/\{|\}/g, '');
                  return !/^\d+$/.test(varName); // Not purely numeric
                });

                console.log(`  HEADER mode: ${isNamedMode ? 'NAMED' : 'NUMERIC'} (${headerVariables.length} vars)`);

                const headerParams = headerVariables.map((v: string) => {
                  const varName = v.replace(/\{|\}/g, '');
                  const value = contact.variables?.[varName] || `[${varName}]`;
                  console.log(`    - ${varName}: ${value}`);
                  
                  if (isNamedMode) {
                    return { type: 'text', text: value, parameter_name: varName };
                  } else {
                    return { type: 'text', text: value };
                  }
                });
                
                components.push({ type: 'header', parameters: headerParams });
              } else {
                // Fixed text header (no variables) - DO NOT include in components
                // WhatsApp renders it automatically from the template
                console.log(`  HEADER: Fixed text (not sending in components)`);
              }
            }
          }

          // Handle BODY component variables with named placeholders
          const bodyComponent = template.components?.find((c: any) => c.type === 'BODY');
          if (bodyComponent?.text) {
            const bodyVariables = bodyComponent.text.match(/\{\{([a-zA-Z0-9_]+)\}\}/g);
            console.log(`Template "${template.template_name}" BODY requires ${bodyVariables?.length || 0} parameters`);

            if (bodyVariables && bodyVariables.length > 0) {
              // Detect if variables are named ({{nome}}) or numeric ({{1}})
              const isNamedMode = bodyVariables.some((v: string) => {
                const varName = v.replace(/\{|\}/g, '');
                return !/^\d+$/.test(varName); // Not purely numeric
              });

              console.log(`  BODY mode: ${isNamedMode ? 'NAMED' : 'NUMERIC'}`);

              const bodyParams = bodyVariables.map((v: string) => {
                const varName = v.replace(/\{|\}/g, '');
                const value = contact.variables?.[varName] || `[${varName}]`;
                console.log(`    - ${varName}: ${value}`);
                
                if (isNamedMode) {
                  // Named variables require parameter_name
                  return { type: 'text', text: value, parameter_name: varName };
                } else {
                  // Numeric variables don't use parameter_name
                  return { type: 'text', text: value };
                }
              });
              
              components.push({ type: 'body', parameters: bodyParams });
            }
          }

          console.log(`Template components array: ${JSON.stringify(components, null, 2)}`);

          payload = {
            messaging_product: 'whatsapp',
            to: finalPhone,
            type: 'template',
            template: {
              name: template.template_name,
              language: { code: template.language || 'pt_BR' },
              components: components.length > 0 ? components : undefined,
            },
          };
        } else {
          // Regular text message
          messageType = 'text';
          payload = {
            messaging_product: 'whatsapp',
            to: finalPhone,
            type: 'text',
            text: { body: message },
          };
        }

        // Send message to WhatsApp
        const waResponse = await fetch(
          `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          }
        );

        const waResult = await waResponse.json();

        if (!waResponse.ok || waResult.error) {
          const errorMsg = waResult.error?.message || 'Unknown WhatsApp API error';
          console.error(`❌ WhatsApp API error for ${finalPhone}:`, JSON.stringify(waResult, null, 2));
          throw new Error(errorMsg);
        }

        console.log(`✅ Message sent successfully to ${finalPhone}`);

        // Save to messages table
        await supabase.from('messages').insert({
          wa_message_id: waResult.messages?.[0]?.id,
          wa_from: phoneNumberId,
          wa_to: finalPhone,
          wa_phone_number_id: phoneNumberId,
          direction: 'outbound',
          body: messageType === 'template' ? `[Template: ${template.template_name}]` : message,
          is_template: messageType === 'template',
          wa_timestamp: new Date().toISOString(),
          raw: waResult,
        });

        // Save to campaign_results if campaign_id provided
        if (campaign_id) {
          await supabase.from('campaign_results').insert({
            campaign_id,
            phone: finalPhone,
            status: 'sent',
            sent_at: new Date().toISOString(),
          });
        }

        successful++;

        // Rate limiting: small delay between messages
        if (i < contacts.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

      } catch (error: any) {
        console.error(`❌ Error sending to ${finalPhone}:`, error.message);
        failed++;
        errors.push({ phone: finalPhone, error: error.message });

        // Save failed result
        if (campaign_id) {
          await supabase.from('campaign_results').insert({
            campaign_id,
            phone: finalPhone,
            status: 'failed',
            error_message: error.message,
            sent_at: new Date().toISOString(),
          });
        }
      }
    }

    console.log(`\nBulk message completed: ${successful} successful, ${failed} failed`);

    return new Response(
      JSON.stringify({
        successful,
        failed,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Error in send-bulk-messages:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
