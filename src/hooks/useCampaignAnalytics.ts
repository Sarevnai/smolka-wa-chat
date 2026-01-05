import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Campaign } from "@/types/campaign";
import { startOfDay, subDays, format } from "date-fns";

export interface CampaignAnalytics {
  // Métricas gerais
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  totalReplied: number;
  totalFailed: number;
  
  // Taxas
  deliveryRate: number;
  readRate: number;
  responseRate: number;
  
  // Timeline
  sentByDay: Array<{ date: string; count: number; label: string }>;
  
  // Por status
  campaignsByStatus: Record<string, number>;
  
  // Top performers
  topCampaignsByResponse: Array<Campaign & { responseRate: number }>;
}

export const useCampaignAnalytics = (days: number = 30) => {
  return useQuery({
    queryKey: ["campaign-analytics", days],
    queryFn: async (): Promise<CampaignAnalytics> => {
      const startDate = subDays(startOfDay(new Date()), days);
      
      // Get all campaigns
      const { data: campaigns, error: campaignsError } = await supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (campaignsError) throw campaignsError;

      // Get campaign results for the period
      const { data: results, error: resultsError } = await supabase
        .from("campaign_results")
        .select("*")
        .gte("created_at", startDate.toISOString());
      
      if (resultsError) throw resultsError;

      // Calculate totals from results
      const totalSent = results?.filter(r => r.status === 'sent' || r.status === 'delivered' || r.status === 'read' || r.status === 'replied').length || 0;
      const totalDelivered = results?.filter(r => r.status === 'delivered' || r.status === 'read' || r.status === 'replied').length || 0;
      const totalRead = results?.filter(r => r.status === 'read' || r.status === 'replied').length || 0;
      const totalReplied = results?.filter(r => r.status === 'replied').length || 0;
      const totalFailed = results?.filter(r => r.status === 'failed').length || 0;

      // Calculate rates
      const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;
      const readRate = totalDelivered > 0 ? (totalRead / totalDelivered) * 100 : 0;
      const responseRate = totalSent > 0 ? (totalReplied / totalSent) * 100 : 0;

      // Group sent by day
      const sentByDay: Array<{ date: string; count: number; label: string }> = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dateStr = format(date, "yyyy-MM-dd");
        const label = format(date, "dd/MM");
        const count = results?.filter(r => 
          r.sent_at && format(new Date(r.sent_at), "yyyy-MM-dd") === dateStr
        ).length || 0;
        sentByDay.push({ date: dateStr, count, label });
      }

      // Campaigns by status
      const campaignsByStatus: Record<string, number> = {
        draft: 0,
        scheduled: 0,
        sending: 0,
        sent: 0,
        cancelled: 0,
      };
      campaigns?.forEach(c => {
        if (campaignsByStatus[c.status] !== undefined) {
          campaignsByStatus[c.status]++;
        }
      });

      // Top campaigns by response rate
      const topCampaignsByResponse = (campaigns || [])
        .filter(c => (c.sent_count || 0) > 0)
        .map(c => ({
          ...c,
          responseRate: ((c.response_count || 0) / (c.sent_count || 1)) * 100
        }))
        .sort((a, b) => b.responseRate - a.responseRate)
        .slice(0, 5) as Array<Campaign & { responseRate: number }>;

      return {
        totalSent,
        totalDelivered,
        totalRead,
        totalReplied,
        totalFailed,
        deliveryRate,
        readRate,
        responseRate,
        sentByDay,
        campaignsByStatus,
        topCampaignsByResponse,
      };
    },
  });
};

export const useCampaignResultsDetails = (campaignId: string) => {
  return useQuery({
    queryKey: ["campaign-results-details", campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_results")
        .select(`
          *,
          contacts:contact_id (
            id,
            name,
            phone,
            email
          )
        `)
        .eq("campaign_id", campaignId)
        .order("sent_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!campaignId,
  });
};
