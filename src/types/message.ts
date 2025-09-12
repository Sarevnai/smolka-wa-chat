export interface Message {
  id: number;
  wa_message_id?: string | null;
  wa_from?: string | null;
  wa_to?: string | null;
  wa_phone_number_id?: string | null;
  direction: 'inbound' | 'outbound';
  body?: string | null;
  wa_timestamp?: string | null;
  raw?: any;
  created_at: string;
  media_type?: string | null;
  media_url?: string | null;
  media_caption?: string | null;
  media_filename?: string | null;
  media_mime_type?: string | null;
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