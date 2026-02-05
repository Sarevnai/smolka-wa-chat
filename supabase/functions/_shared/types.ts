// ========== TYPES & INTERFACES ==========

export interface MakeWebhookRequest {
  phone: string;
  message: string;
  contact_name?: string;
  message_id?: string;
  timestamp?: string;
  message_type?: string;
  media_url?: string;
  media_id?: string;
  media_mime?: string;
  media_caption?: string;
  media_filename?: string;
  button_text?: string;
  button_payload?: string;
}

export interface MediaInfo {
  type?: string;
  url?: string;
  caption?: string;
  filename?: string;
  mimeType?: string;
}

export interface AudioConfig {
  audio_enabled: boolean;
  audio_voice_id: string;
  audio_voice_name: string;
  audio_mode: 'text_only' | 'audio_only' | 'text_and_audio';
  audio_max_chars: number;
}

export interface AudioResult {
  audioUrl: string;
  isVoiceMessage: boolean;
  contentType: string;
}

export interface Development {
  id: string;
  name: string;
  slug: string;
  developer: string;
  address: string | null;
  neighborhood: string | null;
  city: string;
  status: string;
  delivery_date: string | null;
  starting_price: number | null;
  description: string | null;
  differentials: string[];
  amenities: string[];
  unit_types: { tipo: string; area: number; preco_de: number }[];
  faq: { pergunta: string; resposta: string }[];
  ai_instructions: string | null;
  talking_points: string[];
  c2s_project_id: string | null;
  hero_image: string | null;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type DepartmentType = 'locacao' | 'administrativo' | 'vendas' | 'marketing' | null;

export interface AIAgentConfig {
  agent_name: string;
  company_name: string;
  company_description: string;
  services: string[];
  tone: 'formal' | 'casual' | 'friendly' | 'technical';
  limitations: string[];
  faqs: { question: string; answer: string }[];
  custom_instructions: string;
  greeting_message: string;
  fallback_message: string;
  ai_provider: 'lovable' | 'openai';
  ai_model: string;
  max_tokens: number;
  max_history_messages: number;
  humanize_responses: boolean;
  fragment_long_messages: boolean;
  message_delay_ms: number;
  emoji_intensity: 'none' | 'low' | 'medium';
  use_customer_name: boolean;
  audio_enabled: boolean;
  audio_voice_id: string;
  audio_voice_name: string;
  audio_mode: 'text_only' | 'audio_only' | 'text_and_audio';
  audio_channel_mirroring: boolean;
  audio_max_chars: number;
  target_audience: string;
  competitive_advantages: string[];
  company_values: string;
  service_areas: string[];
  rapport_enabled: boolean;
  rapport_use_name: boolean;
  rapport_mirror_language: boolean;
  rapport_show_empathy: boolean;
  rapport_validate_emotions: boolean;
  triggers_enabled: boolean;
  trigger_urgency: boolean;
  trigger_scarcity: boolean;
  trigger_social_proof: boolean;
  trigger_authority: boolean;
  social_proof_text: string;
  authority_text: string;
  objections: { objection: string; response: string }[];
  knowledge_base_url: string;
  knowledge_base_content: string;
  knowledge_base_last_update: string;
  spin_enabled: boolean;
  spin_situation_questions: string[];
  spin_problem_questions: string[];
  spin_implication_questions: string[];
  spin_need_questions: string[];
  escalation_criteria: string[];
  vista_integration_enabled: boolean;
  prompt_overrides?: {
    locacao?: string | null;
    vendas?: string | null;
    administrativo?: string | null;
    geral?: string | null;
    empreendimentos?: string | null;
  };
}

export interface QualificationProgress {
  has_region: boolean;
  has_type: boolean;
  has_bedrooms: boolean;
  has_budget: boolean;
  has_purpose: boolean;
}

export interface QualificationData {
  detected_neighborhood?: string | null;
  detected_property_type?: string | null;
  detected_bedrooms?: number | null;
  detected_budget_min?: number | null;
  detected_budget_max?: number | null;
  detected_interest?: string | null;
  qualification_score?: number;
  questions_answered?: number;
}

export interface PropertyResult {
  codigo: string;
  tipo: string;
  bairro: string;
  cidade: string;
  endereco?: string;
  preco: number;
  preco_formatado: string;
  quartos: number;
  suites?: number;
  vagas?: number;
  area_util?: number;
  descricao?: string;
  foto_destaque?: string;
  fotos?: string[];
  link: string;
  caracteristicas?: string[];
  valor_condominio?: number;
}

export interface ConsultativeState {
  pending_properties?: PropertyResult[];
  current_property_index?: number;
  awaiting_property_feedback?: boolean;
  last_search_params?: Record<string, any>;
  suggested_price_max?: number;
  awaiting_c2s_confirmation?: boolean;
  c2s_pending_property?: PropertyResult;
}

export interface PropertyHighlights {
  amenities: string[];
  location: string[];
  condition: string[];
  differential: string[];
  summary: string;
}

export interface FallbackSearchResult {
  success: boolean;
  properties: PropertyResult[];
  searchType: 'exact' | 'sem_quartos' | 'sem_bairro' | 'no_results';
  originalParams: Record<string, any>;
  usedParams: Record<string, any>;
  relaxedFields: string[];
}

export interface ExtractedQualificationData {
  detected_neighborhood?: string;
  detected_property_type?: string;
  detected_bedrooms?: number;
  detected_budget_max?: number;
  detected_interest?: string;
}

export interface FlexibilizationResult {
  detected: boolean;
  updates: {
    detected_bedrooms?: number;
    detected_budget_max?: number;
    detected_neighborhood?: string;
    detected_property_type?: string;
  };
  fields: string[];
}

export interface PriceFlexibility {
  type: 'increase' | 'decrease' | 'none';
  hasNewValue: boolean;
  suggestedQuestion: string | null;
}

export type TriageStage = 'greeting' | 'awaiting_name' | 'awaiting_triage' | 'completed' | null;

export interface EssentialQuestion {
  id: string;
  question: string;
  category: string;
  isQualifying: boolean;
  enabled: boolean;
}

export interface AIBehaviorConfig {
  id: string;
  essential_questions: EssentialQuestion[];
  functions: any[];
  reengagement_hours: number;
  send_cold_leads: boolean;
  require_cpf_for_visit: boolean;
}

export const defaultConfig: AIAgentConfig = {
  agent_name: 'Helena',
  company_name: 'Smolka Imóveis',
  company_description: 'Administradora de imóveis especializada em locação e gestão de propriedades.',
  services: ['Locação de imóveis', 'Gestão de propriedades', 'Administração de condomínios'],
  tone: 'friendly',
  limitations: [],
  faqs: [],
  custom_instructions: '',
  greeting_message: 'Olá! Sou a {agent_name} da {company_name}. Como posso ajudá-lo?',
  fallback_message: 'Entendi sua solicitação. Um de nossos atendentes entrará em contato no próximo dia útil.',
  ai_provider: 'openai',
  ai_model: 'gpt-4o-mini',
  max_tokens: 250,
  max_history_messages: 5,
  humanize_responses: true,
  fragment_long_messages: true,
  message_delay_ms: 2000,
  emoji_intensity: 'low',
  use_customer_name: true,
  audio_enabled: false,
  audio_voice_id: '',
  audio_voice_name: 'Sarah',
  audio_mode: 'text_and_audio',
  audio_channel_mirroring: true,
  audio_max_chars: 400,
  target_audience: '',
  competitive_advantages: [],
  company_values: '',
  service_areas: [],
  rapport_enabled: true,
  rapport_use_name: true,
  rapport_mirror_language: true,
  rapport_show_empathy: true,
  rapport_validate_emotions: true,
  triggers_enabled: true,
  trigger_urgency: true,
  trigger_scarcity: true,
  trigger_social_proof: true,
  trigger_authority: true,
  social_proof_text: '',
  authority_text: '',
  objections: [],
  knowledge_base_url: '',
  knowledge_base_content: '',
  knowledge_base_last_update: '',
  spin_enabled: true,
  spin_situation_questions: [],
  spin_problem_questions: [],
  spin_implication_questions: [],
  spin_need_questions: [],
  escalation_criteria: [],
  vista_integration_enabled: true,
};
