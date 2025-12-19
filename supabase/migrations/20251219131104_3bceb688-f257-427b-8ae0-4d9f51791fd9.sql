-- Link existing orphaned conversations to their contacts by phone number
UPDATE public.conversations conv
SET contact_id = c.id
FROM public.contacts c
WHERE conv.contact_id IS NULL
  AND conv.phone_number = c.phone;