-- Update Giselle's role to admin
UPDATE user_roles 
SET role = 'admin', updated_at = now()
WHERE user_id = '08ba078d-fb6b-4f38-bc01-cdfaf4c2e77d';