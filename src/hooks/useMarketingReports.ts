import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, subDays, format, eachDayOfInterval } from "date-fns";

export interface CampaignMetrics {
  totalSent: number;
  totalDelivered: number;
  totalResponded: number;
  deliveryRate: number;
  responseRate: number;
  bestHour: number | null;
  campaignsByStatus: Record<string, number>;
}

export interface LeadMetrics {
  newLeadsToday: number;
  newLeadsThisWeek: number;
  newLeadsThisMonth: number;
  leadsBySource: Record<string, number>;
  conversionFunnel: {
    lead: number;
    prospect: number;
    engajado: number;
    campanha: number;
  };
  dailyLeads: { date: string; count: number }[];
}

export interface EngagementMetrics {
  activeContacts: number;
  averageMessagesPerContact: number;
  averageResponseTime: number; // in hours
  topContacts: {
    id: string;
    name: string | null;
    phone: string;
    messageCount: number;
    lastActive: string;
  }[];
}

export interface MarketingReportData {
  campaigns: CampaignMetrics;
  leads: LeadMetrics;
  engagement: EngagementMetrics;
  period: {
    start: string;
    end: string;
    days: number;
  };
}

export function useMarketingReports(days: number = 30) {
  return useQuery({
    queryKey: ["marketing-reports", days],
    queryFn: async (): Promise<MarketingReportData> => {
      const endDate = new Date();
      const startDate = subDays(endDate, days);
      const startIso = startOfDay(startDate).toISOString();
      const endIso = endDate.toISOString();

      // === CAMPAIGN METRICS ===
      const { data: campaigns } = await supabase
        .from("campaigns")
        .select("id, status, sent_count, delivered_count, response_count, created_at");

      const totalSent = campaigns?.reduce((sum, c) => sum + (c.sent_count || 0), 0) || 0;
      const totalDelivered = campaigns?.reduce((sum, c) => sum + (c.delivered_count || 0), 0) || 0;
      const totalResponded = campaigns?.reduce((sum, c) => sum + (c.response_count || 0), 0) || 0;

      const campaignsByStatus: Record<string, number> = {};
      campaigns?.forEach((c) => {
        campaignsByStatus[c.status] = (campaignsByStatus[c.status] || 0) + 1;
      });

      // Best hour calculation
      const { data: results } = await supabase
        .from("campaign_results")
        .select("sent_at, status")
        .gte("sent_at", startIso)
        .eq("status", "replied");

      const hourCounts: Record<number, number> = {};
      results?.forEach((r) => {
        if (r.sent_at) {
          const hour = new Date(r.sent_at).getHours();
          hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        }
      });
      const bestHour = Object.entries(hourCounts).length > 0
        ? parseInt(Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0][0])
        : null;

      // === LEAD METRICS ===
      const { data: marketingContacts } = await supabase
        .from("contacts")
        .select("id, contact_type, created_at")
        .eq("department_code", "marketing");

      const today = startOfDay(new Date());
      const weekAgo = subDays(today, 7);
      const monthAgo = subDays(today, 30);

      const newLeadsToday = marketingContacts?.filter(
        (c) => c.contact_type === "lead" && new Date(c.created_at) >= today
      ).length || 0;

      const newLeadsThisWeek = marketingContacts?.filter(
        (c) => c.contact_type === "lead" && new Date(c.created_at) >= weekAgo
      ).length || 0;

      const newLeadsThisMonth = marketingContacts?.filter(
        (c) => c.contact_type === "lead" && new Date(c.created_at) >= monthAgo
      ).length || 0;

      // Conversion funnel
      const conversionFunnel = {
        lead: marketingContacts?.filter((c) => c.contact_type === "lead").length || 0,
        prospect: marketingContacts?.filter((c) => c.contact_type === "prospect").length || 0,
        engajado: marketingContacts?.filter((c) => c.contact_type === "engajado").length || 0,
        campanha: marketingContacts?.filter((c) => c.contact_type === "campanha").length || 0,
      };

      // Daily leads for chart
      const dateRange = eachDayOfInterval({ start: startDate, end: endDate });
      const dailyLeads = dateRange.map((date) => {
        const dateStr = format(date, "yyyy-MM-dd");
        const count = marketingContacts?.filter(
          (c) => c.contact_type === "lead" && c.created_at.startsWith(dateStr)
        ).length || 0;
        return { date: format(date, "dd/MM"), count };
      });

      // === ENGAGEMENT METRICS ===
      const { data: contactsWithMessages } = await supabase
        .from("contacts")
        .select("id, name, phone")
        .eq("department_code", "marketing");

      // Get message counts per contact (simplified)
      const { data: messages } = await supabase
        .from("messages")
        .select("id, wa_from, created_at")
        .gte("created_at", startIso)
        .order("created_at", { ascending: false })
        .limit(1000);

      const messagesByPhone: Record<string, { count: number; lastActive: string }> = {};
      messages?.forEach((m) => {
        if (m.wa_from) {
          if (!messagesByPhone[m.wa_from]) {
            messagesByPhone[m.wa_from] = { count: 0, lastActive: m.created_at || "" };
          }
          messagesByPhone[m.wa_from].count++;
        }
      });

      const activeContacts = Object.keys(messagesByPhone).length;
      const totalMessages = Object.values(messagesByPhone).reduce((sum, v) => sum + v.count, 0);
      const averageMessagesPerContact = activeContacts > 0 ? totalMessages / activeContacts : 0;

      // Top contacts
      const topContacts = contactsWithMessages
        ?.map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          messageCount: messagesByPhone[c.phone]?.count || 0,
          lastActive: messagesByPhone[c.phone]?.lastActive || "",
        }))
        .filter((c) => c.messageCount > 0)
        .sort((a, b) => b.messageCount - a.messageCount)
        .slice(0, 10) || [];

      return {
        campaigns: {
          totalSent,
          totalDelivered,
          totalResponded,
          deliveryRate: totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0,
          responseRate: totalSent > 0 ? (totalResponded / totalSent) * 100 : 0,
          bestHour,
          campaignsByStatus,
        },
        leads: {
          newLeadsToday,
          newLeadsThisWeek,
          newLeadsThisMonth,
          leadsBySource: {}, // Could be expanded with source tracking
          conversionFunnel,
          dailyLeads,
        },
        engagement: {
          activeContacts,
          averageMessagesPerContact,
          averageResponseTime: 0, // Would require more complex calculation
          topContacts,
        },
        period: {
          start: startIso,
          end: endIso,
          days,
        },
      };
    },
    refetchInterval: 5 * 60 * 1000,
  });
}
