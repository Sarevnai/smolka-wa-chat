export type QuestionCategory = 'operation' | 'lead_info' | 'location' | 'property';

export interface EssentialQuestion {
  id: string;
  question: string;
  category: QuestionCategory;
  isQualifying: boolean;
  isLocked: boolean;
  order: number;
  enabled: boolean;
}

export interface AIFunctionConfig {
  requireCpf?: boolean;
  minDays?: number;
  maxDays?: number;
  hours?: number;
  [key: string]: unknown;
}

export interface AIFunction {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  config: AIFunctionConfig;
}

export interface VisitSchedule {
  weekdays?: { start: string; end: string } | null;
  saturday?: { start: string; end: string } | null;
  sunday?: { start: string; end: string } | null;
}

export interface AIBehaviorConfig {
  id: string;
  created_at: string;
  updated_at: string;
  essential_questions: EssentialQuestion[];
  functions: AIFunction[];
  reengagement_hours: number;
  send_cold_leads: boolean;
  require_cpf_for_visit: boolean;
  visit_schedule: VisitSchedule;
}

export interface LeadStats {
  total: number;
  attended: number;
  sentToCrm: number;
  attendedPercentage: number;
  sentToCrmPercentage: number;
}

export interface LeadsByChannel {
  channel: string;
  count: number;
  percentage: number;
}

export interface LeadsByStatus {
  channel: string;
  sent: number;
  error: number;
  notReady: number;
}

export interface LeadsByHour {
  hour: number;
  count: number;
}

export interface LeadsByDay {
  day: string;
  count: number;
}

export interface LeadsByMonth {
  month: string;
  sent: number;
  notSent: number;
}

export interface PortalLead {
  id: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  portal_origin: string;
  transaction_type: string | null;
  origin_listing_id: string | null;
  message: string | null;
  created_at: string | null;
  status: string | null;
  ai_attended: boolean | null;
  crm_status: string | null;
  temperature: string | null;
}

export type CRMStatus = 'sent' | 'error' | 'not_ready';
export type LeadTemperature = 'hot' | 'warm' | 'cold';
