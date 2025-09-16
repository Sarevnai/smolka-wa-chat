-- Create optimized function to get message statistics for multiple contacts
CREATE OR REPLACE FUNCTION public.get_contact_message_stats(phone_numbers text[])
RETURNS TABLE (
  phone text,
  total_messages bigint,
  last_timestamp timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    m.wa_from as phone,
    COUNT(*) as total_messages,
    MAX(m.wa_timestamp) as last_timestamp
  FROM messages m
  WHERE m.wa_from = ANY(phone_numbers)
  GROUP BY m.wa_from;
END;
$function$;