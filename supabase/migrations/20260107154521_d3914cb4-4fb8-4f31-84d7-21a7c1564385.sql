-- Passo 1: Deletar Ticket do contato de locação
DELETE FROM tickets 
WHERE contact_id = 'b365e778-6a9d-4da6-a1c1-ed72e191986d';

-- Passo 2: Deletar Contratos do contato de locação
DELETE FROM contact_contracts 
WHERE contact_id = 'b365e778-6a9d-4da6-a1c1-ed72e191986d';

-- Passo 3: Deletar o contato de locação duplicado
DELETE FROM contacts 
WHERE id = 'b365e778-6a9d-4da6-a1c1-ed72e191986d';