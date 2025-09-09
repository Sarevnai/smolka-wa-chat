export interface Message {
  id: number;
  wa_message_id?: string;
  wa_from?: string;
  wa_to?: string;
  wa_phone_number_id?: string;
  direction: 'inbound' | 'outbound';
  body?: string;
  wa_timestamp?: string;
  raw?: any;
  created_at: string;
}

export interface SendMessageRequest {
  to: string;
  text: string;
}

export interface SendMessageResponse {
  success: boolean;
  message?: string;
  error?: string;
}