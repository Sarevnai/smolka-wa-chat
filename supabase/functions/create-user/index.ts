import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserRequest {
  email: string;
  full_name: string;
  password: string;
  function?: 'admin' | 'manager' | 'attendant';
  department_code?: 'locacao' | 'administrativo' | 'vendas' | 'marketing';
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify the request is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client with SERVICE_ROLE_KEY
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Create regular client to verify the requester is admin
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get requester's user
    const { data: { user: requester }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !requester) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify requester is admin
    const { data: isAdmin } = await supabaseClient.rpc('is_admin');
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Only admins can create users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: CreateUserRequest = await req.json();
    const { email, full_name, password, function: userFunction, department_code } = body;

    // Validate required fields
    if (!email || !full_name || !password) {
      return new Response(
        JSON.stringify({ error: 'Email, full_name, and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 6 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Creating user: ${email} with name: ${full_name}`);

    // 1. Create user in auth.users via Admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: { full_name },
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = newUser.user.id;
    console.log(`User created with ID: ${userId}`);

    // 2. Profile is created automatically via trigger (handle_new_user)
    // But we need to wait a moment for the trigger to complete
    await new Promise(resolve => setTimeout(resolve, 500));

    // 3. Update profile with full_name and department_code
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        full_name,
        department_code: department_code || null,
      })
      .eq('user_id', userId);

    if (profileError) {
      console.error('Error updating profile:', profileError);
      // Non-critical, continue
    } else {
      console.log(`Profile updated with department: ${department_code || 'none'}`);
    }

    // 4. Insert function if provided
    if (userFunction) {
      const { error: functionError } = await supabaseAdmin
        .from('user_functions')
        .insert({
          user_id: userId,
          function: userFunction,
          department_code: department_code || null,
        });

      if (functionError) {
        console.error('Error inserting function:', functionError);
        // Non-critical, continue
      } else {
        console.log(`Function '${userFunction}' assigned to user`);
      }
    }

    // 5. Create user_status with is_active = true
    const { error: statusError } = await supabaseAdmin
      .from('user_status')
      .insert({
        user_id: userId,
        is_active: true,
        is_blocked: false,
      });

    if (statusError) {
      console.error('Error creating user_status:', statusError);
      // Non-critical, continue
    }

    console.log(`User ${email} created successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        email,
        message: 'User created successfully',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
