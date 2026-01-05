import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ContactTypeData {
  name: string;
  count: number;
  color: string;
}

interface TimelineData {
  date: string;
  leads: number;
  engajados: number;
}

interface CampaignPerformance {
  id: string;
  name: string;
  sent_count: number;
  delivered_count: number;
  response_count: number;
  response_rate: number;
  created_at: string;
}

interface RecentContact {
  id: string;
  name: string | null;
  phone: string;
  contact_type: string | null;
  created_at: string;
}

export interface MarketingMetrics {
  totalContacts: number;
  leadCount: number;
  prospectCount: number;
  engajadoCount: number;
  campanhaCount: number;
  totalCampaigns: number;
  activeCampaigns: number;
  messagesSentToday: number;
  messagesSentThisMonth: number;
  averageResponseRate: number;
  contactsByType: ContactTypeData[];
  contactsTimeline: TimelineData[];
  topCampaigns: CampaignPerformance[];
  recentContacts: RecentContact[];
  conversionRate: number;
}

export function useMarketingMetrics() {
  return useQuery({
    queryKey: ["marketing-metrics"],
    queryFn: async (): Promise<MarketingMetrics> => {
      // Fetch marketing contacts
      const { data: contacts, error: contactsError } = await supabase
        .from("contacts")
        .select("id, name, phone, contact_type, created_at")
        .eq("department_code", "marketing")
        .order("created_at", { ascending: false });

      if (contactsError) throw contactsError;

      const allContacts = contacts || [];
      const totalContacts = allContacts.length;
      
      // Count by type
      const leadCount = allContacts.filter(c => c.contact_type === "lead").length;
      const prospectCount = allContacts.filter(c => c.contact_type === "prospect").length;
      const engajadoCount = allContacts.filter(c => c.contact_type === "engajado").length;
      const campanhaCount = allContacts.filter(c => c.contact_type === "campanha").length;

      // Chart data for contact types
      const contactsByType: ContactTypeData[] = [
        { name: "Lead", count: leadCount, color: "hsl(330, 80%, 60%)" },
        { name: "Prospect", count: prospectCount, color: "hsl(280, 70%, 55%)" },
        { name: "Engajado", count: engajadoCount, color: "hsl(350, 75%, 55%)" },
        { name: "Campanha", count: campanhaCount, color: "hsl(300, 75%, 55%)" },
      ];

      // Fetch campaigns
      const { data: campaigns, error: campaignsError } = await supabase
        .from("campaigns")
        .select("id, name, status, sent_count, delivered_count, response_count, created_at")
        .order("created_at", { ascending: false });

      if (campaignsError) throw campaignsError;

      const allCampaigns = campaigns || [];
      const totalCampaigns = allCampaigns.length;
      const activeCampaigns = allCampaigns.filter(
        c => c.status === "scheduled" || c.status === "sending"
      ).length;

      // Top performing campaigns
      const topCampaigns: CampaignPerformance[] = allCampaigns
        .filter(c => (c.sent_count || 0) > 0)
        .map(c => ({
          id: c.id,
          name: c.name,
          sent_count: c.sent_count || 0,
          delivered_count: c.delivered_count || 0,
          response_count: c.response_count || 0,
          response_rate: c.sent_count ? ((c.response_count || 0) / c.sent_count) * 100 : 0,
          created_at: c.created_at,
        }))
        .sort((a, b) => b.response_rate - a.response_rate)
        .slice(0, 5);

      // Calculate average response rate
      const totalSent = allCampaigns.reduce((sum, c) => sum + (c.sent_count || 0), 0);
      const totalResponses = allCampaigns.reduce((sum, c) => sum + (c.response_count || 0), 0);
      const averageResponseRate = totalSent > 0 ? (totalResponses / totalSent) * 100 : 0;

      // Campaign results for today and this month
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);

      const { count: todayCount } = await supabase
        .from("campaign_results")
        .select("id", { count: "exact", head: true })
        .gte("sent_at", today.toISOString());

      const { count: monthCount } = await supabase
        .from("campaign_results")
        .select("id", { count: "exact", head: true })
        .gte("sent_at", thisMonth.toISOString());

      // Timeline for last 7 days
      const contactsTimeline: TimelineData[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        
        const leads = allContacts.filter(
          c => c.created_at.startsWith(dateStr) && c.contact_type === "lead"
        ).length;
        
        const engajados = allContacts.filter(
          c => c.created_at.startsWith(dateStr) && c.contact_type === "engajado"
        ).length;

        contactsTimeline.push({
          date: date.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" }),
          leads,
          engajados,
        });
      }

      // Recent contacts
      const recentContacts: RecentContact[] = allContacts.slice(0, 10).map(c => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        contact_type: c.contact_type,
        created_at: c.created_at,
      }));

      // Conversion rate (engajados / total leads that entered)
      const conversionRate = leadCount + engajadoCount > 0 
        ? (engajadoCount / (leadCount + engajadoCount)) * 100 
        : 0;

      return {
        totalContacts,
        leadCount,
        prospectCount,
        engajadoCount,
        campanhaCount,
        totalCampaigns,
        activeCampaigns,
        messagesSentToday: todayCount || 0,
        messagesSentThisMonth: monthCount || 0,
        averageResponseRate,
        contactsByType,
        contactsTimeline,
        topCampaigns,
        recentContacts,
        conversionRate,
      };
    },
    refetchInterval: 5 * 60 * 1000, // Auto refresh every 5 minutes
  });
}
