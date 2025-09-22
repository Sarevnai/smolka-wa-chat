-- Add new enum values for gerente and auxiliar to existing enums
ALTER TYPE contact_type ADD VALUE IF NOT EXISTS 'gerente';
ALTER TYPE contact_type ADD VALUE IF NOT EXISTS 'auxiliar';

-- First update constraints to allow both old and new values temporarily
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_type_check;
ALTER TABLE tickets ADD CONSTRAINT tickets_type_check 
CHECK (type IN ('gerente', 'auxiliar', 'proprietario', 'inquilino'));

ALTER TABLE ticket_stages DROP CONSTRAINT IF EXISTS ticket_stages_ticket_type_check;  
ALTER TABLE ticket_stages ADD CONSTRAINT ticket_stages_ticket_type_check 
CHECK (ticket_type IN ('gerente', 'auxiliar', 'proprietario', 'inquilino'));

-- Now update the data
UPDATE tickets 
SET type = CASE 
  WHEN type = 'proprietario' THEN 'gerente'
  WHEN type = 'inquilino' THEN 'auxiliar'
  ELSE type
END;

UPDATE ticket_stages
SET ticket_type = CASE
  WHEN ticket_type = 'proprietario' THEN 'gerente' 
  WHEN ticket_type = 'inquilino' THEN 'auxiliar'
  ELSE ticket_type
END;

UPDATE contacts
SET contact_type = CASE
  WHEN contact_type = 'proprietario' THEN 'gerente'::contact_type
  WHEN contact_type = 'inquilino' THEN 'auxiliar'::contact_type
  ELSE contact_type
END
WHERE contact_type IS NOT NULL;

-- Finally restrict to only new values
ALTER TABLE tickets DROP CONSTRAINT tickets_type_check;
ALTER TABLE tickets ADD CONSTRAINT tickets_type_check 
CHECK (type IN ('gerente', 'auxiliar'));

ALTER TABLE ticket_stages DROP CONSTRAINT ticket_stages_ticket_type_check;
ALTER TABLE ticket_stages ADD CONSTRAINT ticket_stages_ticket_type_check 
CHECK (ticket_type IN ('gerente', 'auxiliar'));