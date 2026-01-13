export type QualificationStatus = 'pending' | 'qualifying' | 'qualified' | 'disqualified' | 'cold' | 'sent_to_crm';

export type DisqualificationReason = 'corretor' | 'curioso' | 'sem_interesse' | 'sem_resposta' | 'fora_perfil';

export interface LeadQualification {
  id: string;
  phone_number: string;
  conversation_id: string | null;
  portal_lead_id: string | null;
  
  // Respostas às perguntas essenciais
  answers: Record<string, string>;
  
  // Status de qualificação
  qualification_score: number;
  qualification_status: QualificationStatus;
  disqualification_reason: DisqualificationReason | null;
  
  // Contadores
  questions_asked: number;
  questions_answered: number;
  total_messages: number;
  ai_messages: number;
  
  // Timestamps
  started_at: string;
  last_interaction_at: string;
  completed_at: string | null;
  sent_to_crm_at: string | null;
  
  // Dados do lead detectados
  detected_interest: 'compra' | 'locacao' | null;
  detected_property_type: string | null;
  detected_neighborhood: string | null;
  detected_budget_min: number | null;
  detected_budget_max: number | null;
  detected_bedrooms: number | null;
  
  // Flags
  is_broker: boolean;
  is_curious: boolean;
  needs_reengagement: boolean;
  reengagement_attempts: number;
  last_reengagement_at: string | null;
  
  created_at: string;
  updated_at: string;
}

export interface LeadQualificationStats {
  total: number;
  pending: number;
  qualifying: number;
  qualified: number;
  disqualified: number;
  cold: number;
  sentToCrm: number;
  
  // Taxas
  qualificationRate: number; // % de leads qualificados
  conversionRate: number;    // % enviados ao CRM
  disqualificationRate: number;
  
  // Por motivo de desqualificação
  disqualifiedByReason: {
    corretor: number;
    curioso: number;
    sem_interesse: number;
    sem_resposta: number;
    fora_perfil: number;
  };
  
  // Médias
  avgQualificationScore: number;
  avgQuestionsAsked: number;
  avgTimeToQualify: number; // em minutos
}

export interface QualificationMetrics {
  // Métricas de tempo
  avgResponseTime: number; // tempo médio de resposta da IA em segundos
  avgQualificationTime: number; // tempo médio para qualificar em minutos
  
  // Métricas de conversão
  leadToQualifiedRate: number;
  qualifiedToCrmRate: number;
  overallConversionRate: number;
  
  // Métricas de reengajamento
  reengagementSuccessRate: number;
  avgReengagementAttempts: number;
  
  // Comparativo
  comparedToLastPeriod: {
    qualificationRate: number; // % de mudança
    conversionRate: number;
    volume: number;
  };
}
