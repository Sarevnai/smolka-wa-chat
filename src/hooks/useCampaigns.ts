import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Campaign, CampaignResult, CampaignStats, BulkMessageRequest } from "@/types/campaign";
import { useToast } from "@/hooks/use-toast";

export const useCampaigns = () => {
  return useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Campaign[];
    },
  });
};

export const useCampaignResults = (campaignId?: string) => {
  return useQuery({
    queryKey: ["campaign-results", campaignId],
    queryFn: async () => {
      if (!campaignId) return [];
      
      const { data, error } = await supabase
        .from("campaign_results")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("sent_at", { ascending: false });

      if (error) throw error;
      return data as CampaignResult[];
    },
    enabled: !!campaignId,
  });
};

export const useCampaignStats = () => {
  return useQuery({
    queryKey: ["campaign-stats"],
    queryFn: async () => {
      // Get total and active campaigns
      const { data: campaigns, error: campaignsError } = await supabase
        .from("campaigns")
        .select("status, created_at, sent_count, response_count");
      
      if (campaignsError) throw campaignsError;

      // Get campaign results for today and this month
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);

      const { data: resultsToday, error: todayError } = await supabase
        .from("campaign_results")
        .select("id")
        .gte("sent_at", today.toISOString());

      const { data: resultsThisMonth, error: monthError } = await supabase
        .from("campaign_results")
        .select("id")
        .gte("sent_at", thisMonth.toISOString());

      if (todayError) throw todayError;
      if (monthError) throw monthError;

      const totalSent = campaigns?.reduce((sum, c) => sum + (c.sent_count || 0), 0) || 0;
      const totalResponses = campaigns?.reduce((sum, c) => sum + (c.response_count || 0), 0) || 0;

      const stats: CampaignStats = {
        total_campaigns: campaigns?.length || 0,
        active_campaigns: campaigns?.filter(c => c.status === 'scheduled' || c.status === 'sending').length || 0,
        messages_sent_today: resultsToday?.length || 0,
        messages_sent_this_month: resultsThisMonth?.length || 0,
        average_response_rate: totalSent > 0 ? (totalResponses / totalSent) * 100 : 0,
      };
      
      return stats;
    },
  });
};

export const useCreateCampaign = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (campaign: Omit<Campaign, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("campaigns")
        .insert([campaign])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast({
        title: "Campanha criada",
        description: "A campanha foi criada com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar campanha",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useSendCampaign = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ campaignId, request }: { campaignId: string; request: BulkMessageRequest }) => {
      // First update campaign status to 'sending'
      await supabase
        .from("campaigns")
        .update({ status: "sending" })
        .eq("id", campaignId);

      // Send the bulk messages via edge function
      const { data: result, error: functionError } = await supabase.functions.invoke('send-bulk-messages', {
        body: {
          ...request,
          campaign_id: campaignId,
        },
      });

      if (functionError) {
        throw new Error(functionError.message || "Erro ao enviar campanha");
      }

      // Update campaign status to 'sent'
      await supabase
        .from("campaigns")
        .update({ 
          status: "sent", 
          sent_count: result.successful || 0,
          failed_count: result.failed || 0,
        })
        .eq("id", campaignId);

      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaign-results"] });
      toast({
        title: "Campanha enviada",
        description: `${data.successful} mensagens enviadas com sucesso. ${data.failed} falharam.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao enviar campanha",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useScheduleCampaign = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ campaignId, scheduledAt }: { campaignId: string; scheduledAt: string }) => {
      const { data, error } = await supabase
        .from("campaigns")
        .update({ 
          scheduled_at: scheduledAt,
          status: "scheduled",
        })
        .eq("id", campaignId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast({
        title: "Campanha agendada",
        description: "A campanha foi agendada com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao agendar campanha",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};