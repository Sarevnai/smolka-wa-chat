-- Phase 2: Migrate existing messages to conversations (fixed)

-- 1. Create conversations for each unique phone number that has messages
INSERT INTO public.conversations (phone_number, contact_id, department_code, status, last_message_at, created_at)
SELECT 
  msg_phones.phone_number,
  c.id as contact_id,
  NULL as department_code,
  'active' as status,
  msg_phones.last_msg_at as last_message_at,
  msg_phones.first_msg_at as created_at
FROM (
  SELECT 
    COALESCE(
      CASE WHEN direction = 'inbound' THEN wa_from ELSE wa_to END,
      wa_from,
      wa_to
    ) as phone_number,
    MAX(wa_timestamp) as last_msg_at,
    MIN(wa_timestamp) as first_msg_at
  FROM public.messages
  WHERE (wa_from IS NOT NULL OR wa_to IS NOT NULL)
  GROUP BY COALESCE(
    CASE WHEN direction = 'inbound' THEN wa_from ELSE wa_to END,
    wa_from,
    wa_to
  )
) msg_phones
LEFT JOIN public.contacts c ON c.phone = msg_phones.phone_number
WHERE msg_phones.phone_number IS NOT NULL 
  AND msg_phones.phone_number != ''
ON CONFLICT (phone_number, department_code, status) DO NOTHING;

-- 2. Update inbound messages with conversation_id
UPDATE public.messages m
SET conversation_id = conv.id
FROM public.conversations conv
WHERE m.direction = 'inbound'
  AND m.wa_from = conv.phone_number
  AND conv.department_code IS NULL
  AND conv.status = 'active'
  AND m.conversation_id IS NULL;

-- 3. Update outbound messages with conversation_id
UPDATE public.messages m
SET conversation_id = conv.id
FROM public.conversations conv
WHERE m.direction = 'outbound'
  AND m.wa_to = conv.phone_number
  AND conv.department_code IS NULL
  AND conv.status = 'active'
  AND m.conversation_id IS NULL;

-- 4. Update messages without direction
UPDATE public.messages m
SET conversation_id = conv.id
FROM public.conversations conv
WHERE m.direction IS NULL
  AND (m.wa_from = conv.phone_number OR m.wa_to = conv.phone_number)
  AND conv.department_code IS NULL
  AND conv.status = 'active'
  AND m.conversation_id IS NULL;

-- 5. Refresh last_message_at on conversations
UPDATE public.conversations conv
SET last_message_at = sub.max_ts
FROM (
  SELECT conversation_id, MAX(wa_timestamp) as max_ts
  FROM public.messages
  WHERE conversation_id IS NOT NULL
  GROUP BY conversation_id
) sub
WHERE conv.id = sub.conversation_id;

-- 6. Link orphan conversations to contacts
UPDATE public.conversations conv
SET contact_id = c.id
FROM public.contacts c
WHERE conv.contact_id IS NULL
  AND conv.phone_number = c.phone;