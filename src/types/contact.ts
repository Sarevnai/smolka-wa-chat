export interface Contact {
  id: string;
  name?: string;
  phone: string;
  email?: string;
  status: 'ativo' | 'inativo' | 'bloqueado';
  contact_type?: 'proprietario' | 'inquilino';
  notes?: string;
  rating?: number;
  description?: string;
  created_at: string;
  updated_at: string;
  contracts?: Contract[];
  totalMessages?: number;
  lastContact?: string;
}

export interface Contract {
  id: string;
  contact_id: string;
  contract_number: string;
  contract_type?: string;
  property_code?: string;
  status: 'ativo' | 'encerrado' | 'suspenso';
  created_at: string;
  updated_at: string;
}

export interface ContactStats {
  totalContacts: number;
  activeContacts: number;
  totalContracts: number;
  activeContracts: number;
}

export interface CreateContactRequest {
  name?: string;
  phone: string;
  email?: string;
  contact_type?: 'proprietario' | 'inquilino';
  notes?: string;
  rating?: number;
  description?: string;
  contracts?: Array<{
    contract_number: string;
    contract_type?: string;
    property_code?: string;
    status?: 'ativo' | 'encerrado' | 'suspenso';
  }>;
}