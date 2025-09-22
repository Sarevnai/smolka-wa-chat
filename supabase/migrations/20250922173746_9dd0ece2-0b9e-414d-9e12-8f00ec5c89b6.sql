-- First drop the existing check constraint and recreate with new values
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_type_check;

-- Add new constraint with gerente/auxiliar types
ALTER TABLE tickets ADD CONSTRAINT tickets_type_check 
CHECK (type IN ('gerente', 'auxiliar', 'proprietario', 'inquilino'));

-- Now safely update existing data
UPDATE tickets 
SET type = CASE 
  WHEN type = 'proprietario' THEN 'gerente'
  WHEN type = 'inquilino' THEN 'auxiliar'
  ELSE type
END;

-- Update ticket stages
UPDATE ticket_stages
SET ticket_type = CASE
  WHEN ticket_type = 'proprietario' THEN 'gerente'
  WHEN ticket_type = 'inquilino' THEN 'auxiliar'
  ELSE ticket_type
END;

-- Update contacts table contact_type (this might be an enum, let's handle it safely)
UPDATE contacts
SET contact_type = CASE
  WHEN contact_type::text = 'proprietario' THEN 'gerente'::contact_type
  WHEN contact_type::text = 'inquilino' THEN 'auxiliar'::contact_type
  ELSE contact_type
END
WHERE contact_type IS NOT NULL;

-- Finally, remove old types from constraint
ALTER TABLE tickets DROP CONSTRAINT tickets_type_check;
ALTER TABLE tickets ADD CONSTRAINT tickets_type_check 
CHECK (type IN ('gerente', 'auxiliar'));