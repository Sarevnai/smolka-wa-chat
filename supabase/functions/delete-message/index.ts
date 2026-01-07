import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify JWT and get user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { message_id, deletion_type } = await req.json();
    console.log('Delete message request:', { message_id, deletion_type, user_id: user.id });

    if (!message_id || !deletion_type) {
      throw new Error('Missing required fields: message_id and deletion_type');
    }

    if (deletion_type !== 'for_me' && deletion_type !== 'for_everyone') {
      throw new Error('Invalid deletion_type. Must be "for_me" or "for_everyone"');
    }

    // Get the message
    const { data: message, error: fetchError } = await supabase
      .from('messages')
      .select('*')
      .eq('id', message_id)
      .single();

    if (fetchError || !message) {
      console.error('Error fetching message:', fetchError);
      throw new Error('Message not found');
    }

    if (deletion_type === 'for_everyone') {
      // Validate permissions for "delete for everyone"
      if (message.direction !== 'outbound') {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Você só pode excluir para todos mensagens que você enviou' 
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check 7-day time limit
      const messageTime = new Date(message.wa_timestamp || message.created_at);
      const now = new Date();
      const daysSinceSent = (now.getTime() - messageTime.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceSent > 7) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Você só pode excluir para todos mensagens enviadas nos últimos 7 dias' 
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update message to mark as deleted for everyone
      const { error: updateError } = await supabase
        .from('messages')
        .update({
          deleted_for_everyone: true,
          deleted_by: user.id,
          deleted_at: new Date().toISOString()
        })
        .eq('id', message_id);

      if (updateError) {
        console.error('Error updating message:', updateError);
        throw new Error('Failed to delete message for everyone');
      }

      console.log('Message deleted for everyone:', message_id);
    }

    // Insert into deleted_messages for trash/restore functionality
    const { error: insertError } = await supabase
      .from('deleted_messages')
      .insert({
        message_id: message_id,
        deleted_by: user.id,
        deletion_type: deletion_type,
        original_message_data: message,
        can_restore: true
      });

    if (insertError) {
      console.error('Error inserting into deleted_messages:', insertError);
      // Continue anyway - the main deletion succeeded
    }

    // Log activity
    const { error: logError } = await supabase
      .from('activity_logs')
      .insert({
        user_id: user.id,
        action_type: 'message_deleted',
        target_table: 'messages',
        target_id: message_id.toString(),
        metadata: {
          deletion_type,
          phone: message.wa_from || message.wa_to,
          message_body: message.body?.substring(0, 100)
        }
      });

    if (logError) {
      console.error('Error logging activity:', logError);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in delete-message function:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
