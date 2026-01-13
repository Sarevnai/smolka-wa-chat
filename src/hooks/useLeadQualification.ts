import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LeadQualification, LeadQualificationStats, QualificationStatus } from '@/types/lead-qualification';
import { startOfMonth, endOfMonth, subMonths, differenceInMinutes } from 'date-fns';
import { toast } from 'sonner';

// Buscar qualificações de leads
export function useLeadQualifications(filters?: {
  status?: QualificationStatus;
  month?: Date;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['lead-qualifications', filters],
    queryFn: async () => {
      let query = supabase
        .from('lead_qualification')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('qualification_status', filters.status);
      }

      if (filters?.month) {
        const start = startOfMonth(filters.month).toISOString();
        const end = endOfMonth(filters.month).toISOString();
        query = query.gte('created_at', start).lte('created_at', end);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as LeadQualification[];
    },
  });
}

// Buscar estatísticas de qualificação
export function useLeadQualificationStats(month: Date) {
  return useQuery({
    queryKey: ['lead-qualification-stats', month.toISOString()],
    queryFn: async () => {
      const start = startOfMonth(month).toISOString();
      const end = endOfMonth(month).toISOString();

      const { data, error } = await supabase
        .from('lead_qualification')
        .select('*')
        .gte('created_at', start)
        .lte('created_at', end);

      if (error) throw error;

      const qualifications = data as LeadQualification[];
      const total = qualifications.length;

      if (total === 0) {
        return {
          total: 0,
          pending: 0,
          qualifying: 0,
          qualified: 0,
          disqualified: 0,
          cold: 0,
          sentToCrm: 0,
          qualificationRate: 0,
          conversionRate: 0,
          disqualificationRate: 0,
          disqualifiedByReason: {
            corretor: 0,
            curioso: 0,
            sem_interesse: 0,
            sem_resposta: 0,
            fora_perfil: 0,
          },
          avgQualificationScore: 0,
          avgQuestionsAsked: 0,
          avgTimeToQualify: 0,
        } as LeadQualificationStats;
      }

      const pending = qualifications.filter(q => q.qualification_status === 'pending').length;
      const qualifying = qualifications.filter(q => q.qualification_status === 'qualifying').length;
      const qualified = qualifications.filter(q => q.qualification_status === 'qualified').length;
      const disqualified = qualifications.filter(q => q.qualification_status === 'disqualified').length;
      const cold = qualifications.filter(q => q.qualification_status === 'cold').length;
      const sentToCrm = qualifications.filter(q => q.qualification_status === 'sent_to_crm').length;

      // Contagem por motivo de desqualificação
      const disqualifiedByReason = {
        corretor: qualifications.filter(q => q.disqualification_reason === 'corretor').length,
        curioso: qualifications.filter(q => q.disqualification_reason === 'curioso').length,
        sem_interesse: qualifications.filter(q => q.disqualification_reason === 'sem_interesse').length,
        sem_resposta: qualifications.filter(q => q.disqualification_reason === 'sem_resposta').length,
        fora_perfil: qualifications.filter(q => q.disqualification_reason === 'fora_perfil').length,
      };

      // Médias
      const avgScore = qualifications.reduce((acc, q) => acc + q.qualification_score, 0) / total;
      const avgQuestions = qualifications.reduce((acc, q) => acc + q.questions_asked, 0) / total;

      // Tempo médio para qualificar (apenas para qualificados/enviados ao CRM)
      const completedQuals = qualifications.filter(q => q.completed_at);
      const avgTimeToQualify = completedQuals.length > 0
        ? completedQuals.reduce((acc, q) => {
            return acc + differenceInMinutes(new Date(q.completed_at!), new Date(q.started_at));
          }, 0) / completedQuals.length
        : 0;

      return {
        total,
        pending,
        qualifying,
        qualified,
        disqualified,
        cold,
        sentToCrm,
        qualificationRate: (qualified + sentToCrm) / total * 100,
        conversionRate: sentToCrm / total * 100,
        disqualificationRate: disqualified / total * 100,
        disqualifiedByReason,
        avgQualificationScore: avgScore,
        avgQuestionsAsked: avgQuestions,
        avgTimeToQualify,
      } as LeadQualificationStats;
    },
  });
}

// Buscar leads que precisam de reengajamento
export function useLeadsNeedingReengagement() {
  return useQuery({
    queryKey: ['leads-needing-reengagement'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_qualification')
        .select('*')
        .eq('needs_reengagement', true)
        .lt('reengagement_attempts', 3)
        .order('last_interaction_at', { ascending: true });

      if (error) throw error;
      return data as LeadQualification[];
    },
  });
}

// Atualizar status de qualificação
export function useUpdateQualificationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      reason 
    }: { 
      id: string; 
      status: QualificationStatus; 
      reason?: string;
    }) => {
      const updateData: Partial<LeadQualification> = {
        qualification_status: status,
        updated_at: new Date().toISOString(),
      };

      if (status === 'disqualified' && reason) {
        updateData.disqualification_reason = reason as LeadQualification['disqualification_reason'];
      }

      if (status === 'qualified' || status === 'sent_to_crm') {
        updateData.completed_at = new Date().toISOString();
      }

      if (status === 'sent_to_crm') {
        updateData.sent_to_crm_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('lead_qualification')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-qualifications'] });
      queryClient.invalidateQueries({ queryKey: ['lead-qualification-stats'] });
      toast.success('Status atualizado com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar status: ' + error.message);
    },
  });
}

// Comparativo com período anterior
export function useQualificationComparison(month: Date) {
  return useQuery({
    queryKey: ['qualification-comparison', month.toISOString()],
    queryFn: async () => {
      const currentStart = startOfMonth(month).toISOString();
      const currentEnd = endOfMonth(month).toISOString();
      
      const previousMonth = subMonths(month, 1);
      const previousStart = startOfMonth(previousMonth).toISOString();
      const previousEnd = endOfMonth(previousMonth).toISOString();

      // Buscar dados do mês atual
      const { data: currentData, error: currentError } = await supabase
        .from('lead_qualification')
        .select('qualification_status')
        .gte('created_at', currentStart)
        .lte('created_at', currentEnd);

      if (currentError) throw currentError;

      // Buscar dados do mês anterior
      const { data: previousData, error: previousError } = await supabase
        .from('lead_qualification')
        .select('qualification_status')
        .gte('created_at', previousStart)
        .lte('created_at', previousEnd);

      if (previousError) throw previousError;

      const currentTotal = currentData?.length || 0;
      const previousTotal = previousData?.length || 0;

      const currentQualified = currentData?.filter(q => 
        q.qualification_status === 'qualified' || q.qualification_status === 'sent_to_crm'
      ).length || 0;
      const previousQualified = previousData?.filter(q => 
        q.qualification_status === 'qualified' || q.qualification_status === 'sent_to_crm'
      ).length || 0;

      const currentSentToCrm = currentData?.filter(q => q.qualification_status === 'sent_to_crm').length || 0;
      const previousSentToCrm = previousData?.filter(q => q.qualification_status === 'sent_to_crm').length || 0;

      // Calcular variações percentuais
      const volumeChange = previousTotal > 0 
        ? ((currentTotal - previousTotal) / previousTotal) * 100 
        : currentTotal > 0 ? 100 : 0;

      const currentQualificationRate = currentTotal > 0 ? (currentQualified / currentTotal) * 100 : 0;
      const previousQualificationRate = previousTotal > 0 ? (previousQualified / previousTotal) * 100 : 0;
      const qualificationRateChange = previousQualificationRate > 0 
        ? ((currentQualificationRate - previousQualificationRate) / previousQualificationRate) * 100 
        : currentQualificationRate > 0 ? 100 : 0;

      const currentConversionRate = currentTotal > 0 ? (currentSentToCrm / currentTotal) * 100 : 0;
      const previousConversionRate = previousTotal > 0 ? (previousSentToCrm / previousTotal) * 100 : 0;
      const conversionRateChange = previousConversionRate > 0 
        ? ((currentConversionRate - previousConversionRate) / previousConversionRate) * 100 
        : currentConversionRate > 0 ? 100 : 0;

      return {
        current: {
          total: currentTotal,
          qualified: currentQualified,
          sentToCrm: currentSentToCrm,
          qualificationRate: currentQualificationRate,
          conversionRate: currentConversionRate,
        },
        previous: {
          total: previousTotal,
          qualified: previousQualified,
          sentToCrm: previousSentToCrm,
          qualificationRate: previousQualificationRate,
          conversionRate: previousConversionRate,
        },
        changes: {
          volume: volumeChange,
          qualificationRate: qualificationRateChange,
          conversionRate: conversionRateChange,
        },
      };
    },
  });
}
