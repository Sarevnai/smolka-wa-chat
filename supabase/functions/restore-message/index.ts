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

    const { deleted_message_id } = await req.json();
    console.log('Restore message request:', { deleted_message_id, user_id: user.id });

    if (!deleted_message_id) {
      throw new Error('Missing required field: deleted_message_id');
    }

    // Get the deleted message record
    const { data: deletedRecord, error: fetchError } = await supabase
      .from('deleted_messages')
      .select('*')
      .eq('id', deleted_message_id)
      .eq('deleted_by', user.id)
      .single();

    if (fetchError || !deletedRecord) {
      console.error('Error fetching deleted message:', fetchError);
      throw new Error('Deleted message not found or you do not have permission to restore it');
    }

    const messageId = deletedRecord.message_id;
    const deletionType = deletedRecord.deletion_type;

    if (deletionType === 'for_everyone') {
      // Restore message for everyone - unmark as deleted
      const { error: updateError } = await supabase
        .from('messages')
        .update({
          deleted_for_everyone: false,
          deleted_by: null,
          deleted_at: null
        })
        .eq('id', messageId);

      if (updateError) {
        console.error('Error restoring message:', updateError);
        throw new Error('Failed to restore message for everyone');
      }

      console.log('Message restored for everyone:', messageId);
    }

    // Remove from deleted_messages
    const { error: deleteError } = await supabase
      .from('deleted_messages')
      .delete()
      .eq('id', deleted_message_id);

    if (deleteError) {
      console.error('Error removing from deleted_messages:', deleteError);
      throw new Error('Failed to remove from deleted messages');
    }

    // Log activity
    const { error: logError } = await supabase
      .from('activity_logs')
      .insert({
        user_id: user.id,
        action_type: 'message_restored',
        target_table: 'messages',
        target_id: messageId.toString(),
        metadata: {
          deletion_type,
          restored_at: new Date().toISOString()
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
    console.error('Error in restore-message function:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
