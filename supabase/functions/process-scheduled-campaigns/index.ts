import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

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

    console.log('🔍 Checking for scheduled campaigns...');

    // Fetch campaigns that are scheduled and due
    const now = new Date().toISOString();
    const { data: campaigns, error: fetchError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_at', now);

    if (fetchError) {
      console.error('Error fetching campaigns:', fetchError);
      throw fetchError;
    }

    if (!campaigns || campaigns.length === 0) {
      console.log('✅ No campaigns to process');
      return new Response(
        JSON.stringify({ message: 'No campaigns to process', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📦 Found ${campaigns.length} campaign(s) to process`);

    let processedCount = 0;
    let errorCount = 0;
    const results = [];

    for (const campaign of campaigns) {
      try {
        console.log(`\n📤 Processing campaign: ${campaign.name} (${campaign.id})`);

        // Update status to sending
        await supabase
          .from('campaigns')
          .update({ status: 'sending' })
          .eq('id', campaign.id);

        // Fetch contacts
        const { data: contacts, error: contactsError } = await supabase
          .from('contacts')
          .select('phone, name')
          .in('id', campaign.target_contacts);

        if (contactsError) {
          throw new Error(`Failed to fetch contacts: ${contactsError.message}`);
        }

        if (!contacts || contacts.length === 0) {
          throw new Error('No valid contacts found');
        }

        // Prepare bulk message request
        const bulkRequest: any = {
          contacts: contacts.map(c => ({
            phone: c.phone,
            name: c.name || undefined,
          })),
          message: campaign.message,
          campaign_id: campaign.id,
        };

        // Add WhatsApp template if specified
        if (campaign.wa_template_id) {
          bulkRequest.template_id = campaign.wa_template_id;
        }

        // Add header media if specified
        if (campaign.header_media_url || campaign.header_media_id) {
          bulkRequest.header_media = {
            id: campaign.header_media_id,
            url: campaign.header_media_url,
            type: campaign.header_media_type,
            mime: campaign.header_media_mime,
          };
        }

        console.log(`📨 Invoking send-bulk-messages for ${contacts.length} contacts`);

        // Invoke send-bulk-messages function
        const { data: sendResult, error: sendError } = await supabase.functions.invoke(
          'send-bulk-messages',
          {
            body: bulkRequest,
          }
        );

        if (sendError) {
          throw new Error(`Send failed: ${sendError.message}`);
        }

        console.log(`✅ Campaign sent: ${sendResult.successful} successful, ${sendResult.failed} failed`);

        // Update campaign with final status
        await supabase
          .from('campaigns')
          .update({
            status: 'sent',
            sent_count: sendResult.successful || 0,
            failed_count: sendResult.failed || 0,
          })
          .eq('id', campaign.id);

        processedCount++;
        results.push({
          campaign_id: campaign.id,
          campaign_name: campaign.name,
          status: 'success',
          sent: sendResult.successful,
          failed: sendResult.failed,
        });

      } catch (error: any) {
        console.error(`❌ Error processing campaign ${campaign.id}:`, error);
        errorCount++;

        // Update campaign status to failed
        await supabase
          .from('campaigns')
          .update({
            status: 'cancelled',
            failed_count: campaign.target_contacts.length,
          })
          .eq('id', campaign.id);

        results.push({
          campaign_id: campaign.id,
          campaign_name: campaign.name,
          status: 'error',
          error: error.message,
        });
      }
    }

    console.log(`\n📊 Summary: ${processedCount} processed, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        message: 'Campaign processing completed',
        processed: processedCount,
        errors: errorCount,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
