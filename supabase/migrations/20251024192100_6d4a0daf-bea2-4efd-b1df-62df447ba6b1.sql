-- Update user email and password for ian
-- First, find the user_id
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get user_id from the old email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'ianmkt@smolkaimoveis.com.br';

  -- Update email and password using Supabase admin functions
  IF v_user_id IS NOT NULL THEN
    -- Update email
    UPDATE auth.users
    SET email = 'ian.veras@icloud.com',
        raw_user_meta_data = jsonb_set(
          COALESCE(raw_user_meta_data, '{}'::jsonb),
          '{email}',
          '"ian.veras@icloud.com"'::jsonb
        ),
        updated_at = now()
    WHERE id = v_user_id;

    -- Update password (hashed with bcrypt)
    UPDATE auth.users
    SET encrypted_password = crypt('888888', gen_salt('bf')),
        updated_at = now()
    WHERE id = v_user_id;

    -- Ensure email is confirmed
    UPDATE auth.users
    SET email_confirmed_at = now()
    WHERE id = v_user_id AND email_confirmed_at IS NULL;
  END IF;
END $$;