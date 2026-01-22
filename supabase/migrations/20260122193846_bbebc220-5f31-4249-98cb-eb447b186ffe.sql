-- Update the hero_image URL to use Supabase Storage (public bucket)
UPDATE developments 
SET hero_image = 'https://wpjxsgxxhogzkkuznyke.supabase.co/storage/v1/object/public/whatsapp-media/developments/villa-maggiore-hero.jpg'
WHERE slug = 'villa-maggiore';