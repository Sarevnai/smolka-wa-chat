import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Campaign, CampaignResult, CampaignStats, BulkMessageRequest } from "@/types/campaign";
import { useToast } from "@/hooks/use-toast";
import { SUPABASE_PROJECT_URL } from "@/lib/supabaseClient";

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
      // This would be implemented as a database function or computed query
      // For now, return mock data structure
      const stats: CampaignStats = {
        total_campaigns: 0,
        active_campaigns: 0,
        messages_sent_today: 0,
        messages_sent_this_month: 0,
        average_response_rate: 0,
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
        .insert([{
          ...campaign,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }])
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
        .update({ status: "sending", updated_at: new Date().toISOString() })
        .eq("id", campaignId);

      // Send the bulk messages via edge function
      const response = await fetch(`${SUPABASE_PROJECT_URL}/functions/v1/send-bulk-messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...request,
          campaign_id: campaignId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao enviar campanha");
      }

      // Update campaign status to 'sent'
      await supabase
        .from("campaigns")
        .update({ 
          status: "sent", 
          sent_count: result.successful,
          updated_at: new Date().toISOString(),
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
          updated_at: new Date().toISOString(),
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