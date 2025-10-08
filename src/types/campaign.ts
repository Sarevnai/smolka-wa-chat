export interface MessageTemplate {
  id: string;
  name: string;
  category: 'cobranca' | 'manutencao' | 'promocao' | 'comunicado' | 'lembrete' | 'personalizado';
  content: string;
  variables: string[]; // e.g., ['nome', 'contrato', 'valor']
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  name: string;
  message: string;
  template_id?: string;
  wa_template_id?: string;
  target_contacts: string[]; // contact IDs
  scheduled_at?: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled';
  created_at: string;
  updated_at: string;
  sent_count?: number;
  delivered_count?: number;
  failed_count?: number;
  response_count?: number;
  header_media_id?: string;
  header_media_type?: 'image' | 'video' | 'document';
  header_media_url?: string;
  header_media_mime?: string;
}

export interface CampaignResult {
  id: string;
  campaign_id: string;
  contact_id: string;
  phone: string;
  status: 'sent' | 'delivered' | 'failed' | 'read' | 'replied';
  error_message?: string;
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
  replied_at?: string;
}

export interface CampaignStats {
  total_campaigns: number;
  active_campaigns: number;
  messages_sent_today: number;
  messages_sent_this_month: number;
  average_response_rate: number;
  top_performing_template?: MessageTemplate;
}

export interface ContactGroup {
  id: string;
  name: string;
  description?: string;
  contact_ids: string[];
  filters?: {
    status?: ('ativo' | 'inativo' | 'bloqueado')[];
    contact_type?: ('proprietario' | 'inquilino')[];
    rating_min?: number;
    rating_max?: number;
    has_contracts?: boolean;
    created_after?: string;
    created_before?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface BulkMessageRequest {
  contacts: Array<{
    phone: string;
    name?: string;
    variables?: Record<string, string>;
  }>;
  message: string;
  template_id?: string;
  campaign_id?: string;
  header_media?: {
    id?: string;
    url?: string;
    type: 'image' | 'video' | 'document';
    mime?: string;
    filename?: string;
  };
}

export interface ScheduledMessage {
  id: string;
  campaign_id: string;
  scheduled_at: string;
  status: 'scheduled' | 'cancelled' | 'sent';
  message: string;
  target_contacts: string[];
}