-- Fix tickets with invalid stages and ensure proper data hygiene

-- Update any tickets that have invalid stage values to 'Pendente'
UPDATE tickets 
SET stage = 'Pendente'
WHERE stage NOT IN ('Pendente', 'Em Progresso', 'Concluído');

-- Ensure all ticket integration records have proper sync status
UPDATE clickup_integration 
SET sync_status = 'synced', last_sync = COALESCE(last_sync, now())
WHERE sync_status IS NULL OR sync_status = '';

-- Add an index to improve performance on ticket stage queries
CREATE INDEX IF NOT EXISTS idx_tickets_stage_type ON tickets(stage, type);

-- Add an index to improve performance on clickup integration lookups
CREATE INDEX IF NOT EXISTS idx_clickup_integration_ticket_id ON clickup_integration(ticket_id);