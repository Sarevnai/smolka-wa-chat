import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface LeadData {
  nome?: string;
  interesse?: string;
  tipo_imovel?: string;
  bairro?: string;
  faixa_preco?: string;
}

interface RecentLead {
  id: string;
  c2s_lead_id: string | null;
  sync_status: string;
  created_at: string;
  lead_data: LeadData | null;
  contact_name?: string;
}

interface ChartData {
  name: string;
  count: number;
}

interface TimelineData {
  date: string;
  count: number;
}

interface C2SMetrics {
  totalLeads: number;
  syncedLeads: number;
  errorLeads: number;
  pendingLeads: number;
  successRate: number;
  leadsByNeighborhood: ChartData[];
  leadsByPropertyType: ChartData[];
  leadsByPeriod: TimelineData[];
  recentLeads: RecentLead[];
}

export function useC2SMetrics() {
  return useQuery({
    queryKey: ["c2s-metrics"],
    queryFn: async (): Promise<C2SMetrics> => {
      // Fetch all C2S integration records
      const { data: leads, error } = await supabase
        .from("c2s_integration")
        .select(`
          id,
          c2s_lead_id,
          sync_status,
          created_at,
          lead_data,
          contact:contacts(name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const allLeads = leads || [];

      // Calculate basic metrics
      const totalLeads = allLeads.length;
      const syncedLeads = allLeads.filter(l => l.sync_status === "synced").length;
      const errorLeads = allLeads.filter(l => l.sync_status === "error").length;
      const pendingLeads = allLeads.filter(l => l.sync_status === "pending").length;
      const successRate = totalLeads > 0 ? Math.round((syncedLeads / totalLeads) * 100) : 0;

      // Group by neighborhood
      const neighborhoodMap = new Map<string, number>();
      allLeads.forEach(lead => {
        const leadData = lead.lead_data as LeadData | null;
        const neighborhood = leadData?.bairro || "Não informado";
        neighborhoodMap.set(neighborhood, (neighborhoodMap.get(neighborhood) || 0) + 1);
      });
      const leadsByNeighborhood: ChartData[] = Array.from(neighborhoodMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Group by property type
      const typeMap = new Map<string, number>();
      allLeads.forEach(lead => {
        const leadData = lead.lead_data as LeadData | null;
        const type = leadData?.tipo_imovel || "Não informado";
        typeMap.set(type, (typeMap.get(type) || 0) + 1);
      });
      const leadsByPropertyType: ChartData[] = Array.from(typeMap.entries())
        .map(([name, count]) => ({ name, count }));

      // Group by period (last 7 days)
      const today = new Date();
      const last7Days: TimelineData[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        const count = allLeads.filter(lead => 
          lead.created_at.startsWith(dateStr)
        ).length;
        last7Days.push({
          date: date.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" }),
          count
        });
      }

      // Recent leads (last 10)
      const recentLeads: RecentLead[] = allLeads.slice(0, 10).map(lead => ({
        id: lead.id,
        c2s_lead_id: lead.c2s_lead_id,
        sync_status: lead.sync_status,
        created_at: lead.created_at,
        lead_data: lead.lead_data as LeadData | null,
        contact_name: (lead.contact as { name: string } | null)?.name || undefined
      }));

      return {
        totalLeads,
        syncedLeads,
        errorLeads,
        pendingLeads,
        successRate,
        leadsByNeighborhood,
        leadsByPropertyType,
        leadsByPeriod: last7Days,
        recentLeads
      };
    },
    refetchInterval: 5 * 60 * 1000, // Auto refresh every 5 minutes
  });
}
