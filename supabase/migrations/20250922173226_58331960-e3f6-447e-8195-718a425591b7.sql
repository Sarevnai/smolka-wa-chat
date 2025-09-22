-- Update ticket types from proprietario/inquilino to gerente/auxiliar
-- First update existing tickets
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

-- Update contacts table contact_type
UPDATE contacts
SET contact_type = CASE
  WHEN contact_type = 'proprietario' THEN 'gerente'
  WHEN contact_type = 'inquilino' THEN 'auxiliar'
  ELSE contact_type
END;