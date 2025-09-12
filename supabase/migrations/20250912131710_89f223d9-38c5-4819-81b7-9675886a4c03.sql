-- Update existing ticket stages to align with ClickUp
-- First, update existing stages for proprietarios
UPDATE ticket_stages 
SET name = 'Pendente', color = '#f59e0b' 
WHERE ticket_type = 'proprietario' AND name IN ('Novo', 'Em Análise');

UPDATE ticket_stages 
SET name = 'Em Progresso', color = '#3b82f6'
WHERE ticket_type = 'proprietario' AND name = 'Em Andamento';

UPDATE ticket_stages 
SET name = 'Concluído', color = '#10b981'
WHERE ticket_type = 'proprietario' AND name IN ('Aguardando', 'Resolvido');

-- Update existing stages for inquilinos  
UPDATE ticket_stages 
SET name = 'Pendente', color = '#f59e0b'
WHERE ticket_type = 'inquilino' AND name IN ('Novo', 'Em Análise');

UPDATE ticket_stages 
SET name = 'Em Progresso', color = '#3b82f6'
WHERE ticket_type = 'inquilino' AND name = 'Em Andamento';

UPDATE ticket_stages 
SET name = 'Concluído', color = '#10b981'
WHERE ticket_type = 'inquilino' AND name IN ('Aguardando', 'Resolvido');

-- Update existing tickets to use new stage names
UPDATE tickets 
SET stage = 'Pendente'
WHERE stage IN ('Novo', 'Em Análise');

UPDATE tickets 
SET stage = 'Em Progresso' 
WHERE stage = 'Em Andamento';

UPDATE tickets 
SET stage = 'Concluído'
WHERE stage IN ('Aguardando', 'Resolvido');

-- Ensure we have the correct stages for both types
DELETE FROM ticket_stages WHERE ticket_type = 'proprietario';
DELETE FROM ticket_stages WHERE ticket_type = 'inquilino';

-- Insert new standardized stages for proprietarios
INSERT INTO ticket_stages (ticket_type, name, color, order_index) VALUES
('proprietario', 'Pendente', '#f59e0b', 1),
('proprietario', 'Em Progresso', '#3b82f6', 2), 
('proprietario', 'Concluído', '#10b981', 3);

-- Insert new standardized stages for inquilinos
INSERT INTO ticket_stages (ticket_type, name, color, order_index) VALUES
('inquilino', 'Pendente', '#f59e0b', 1),
('inquilino', 'Em Progresso', '#3b82f6', 2),
('inquilino', 'Concluído', '#10b981', 3);