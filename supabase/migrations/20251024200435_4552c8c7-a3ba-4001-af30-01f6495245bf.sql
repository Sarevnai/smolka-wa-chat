-- Fase 1: Corrigir nome do Ian Veras
UPDATE profiles 
SET full_name = 'Ian Veras', updated_at = now()
WHERE user_id = '26050140-117e-46fb-9e41-6eeaa33d4ab7';

-- Fase 2: Adicionar coluna username
ALTER TABLE profiles 
ADD COLUMN username text;

-- Criar índice para performance
CREATE INDEX idx_profiles_username ON profiles(username);

-- Gerar usernames automáticos para usuários existentes
UPDATE profiles
SET username = LOWER(
  REGEXP_REPLACE(
    COALESCE(full_name, user_id::text), 
    '[^a-zA-Z0-9]', 
    '', 
    'g'
  )
) || '_' || SUBSTRING(user_id::text, 1, 6)
WHERE username IS NULL;

-- Tornar obrigatório após popular
ALTER TABLE profiles 
ALTER COLUMN username SET NOT NULL;

-- Adicionar constraint de unicidade
ALTER TABLE profiles
ADD CONSTRAINT profiles_username_unique UNIQUE (username);

-- Fase 3: Adicionar código numérico
CREATE SEQUENCE user_code_seq START 1000;

ALTER TABLE profiles
ADD COLUMN user_code int UNIQUE DEFAULT nextval('user_code_seq');

-- Popular códigos para usuários existentes
UPDATE profiles
SET user_code = nextval('user_code_seq')
WHERE user_code IS NULL;

-- Criar índice
CREATE INDEX idx_profiles_user_code ON profiles(user_code);

-- Fase 5: Guard-rails - Constraint CHECK para formato de username
ALTER TABLE profiles
ADD CONSTRAINT username_format 
CHECK (username ~ '^[a-z0-9_]{3,30}$');

-- Atualizar trigger handle_new_user para incluir username e user_code
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  base_username text;
  final_username text;
  counter int := 1;
BEGIN
  -- Gerar username baseado no nome completo ou email
  base_username := LOWER(
    REGEXP_REPLACE(
      COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
      '[^a-zA-Z0-9]',
      '',
      'g'
    )
  );
  
  -- Limitar tamanho do base_username
  IF LENGTH(base_username) > 20 THEN
    base_username := SUBSTRING(base_username, 1, 20);
  END IF;
  
  -- Garantir unicidade adicionando contador se necessário
  final_username := base_username;
  WHILE EXISTS (SELECT 1 FROM profiles WHERE username = final_username) LOOP
    final_username := base_username || counter;
    counter := counter + 1;
  END LOOP;

  -- Inserir perfil com username e user_code
  INSERT INTO public.profiles (user_id, full_name, username, user_code)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data->>'full_name',
    final_username,
    nextval('user_code_seq')
  );
  
  RETURN NEW;
END;
$$;

-- Fase 5: RLS Policy para username
CREATE POLICY "Users can update own username"
ON profiles FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  username IS NOT NULL 
  AND LENGTH(username) BETWEEN 3 AND 30
  AND username ~ '^[a-z0-9_]+$'
);