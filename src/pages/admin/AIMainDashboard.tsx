import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  useLeadStats, 
  useLeadsByChannel, 
  useLeadsByStatus,
  useLeadsByHour,
  useLeadsByWeekday,
  useLeadsMonthly,
} from "@/hooks/useAIDashboard";
import {
  AttendanceMetricsCard,
  LeadsByChannelChart,
  StatusByChannelChart,
  LeadsByHourChart,
  LeadsWeeklyChart,
  LeadsMonthlyChart,
} from "@/components/ai-dashboard";
import { Bot, Calendar } from "lucide-react";

export default function AIMainDashboard() {
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  const { data: stats, isLoading: statsLoading } = useLeadStats(selectedMonth);
  const { data: channelData, isLoading: channelLoading } = useLeadsByChannel(selectedMonth);
  const { data: statusData, isLoading: statusLoading } = useLeadsByStatus(selectedMonth);
  const { data: hourData, isLoading: hourLoading } = useLeadsByHour(selectedMonth);
  const { data: weekdayData, isLoading: weekdayLoading } = useLeadsByWeekday(selectedMonth);
  const { data: monthlyData, isLoading: monthlyLoading } = useLeadsMonthly();

  // Generate last 12 months for selector
  const months = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, "MMMM 'de' yyyy", { locale: ptBR }),
      date,
    };
  });

  return (
    <Layout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Dashboard da IA</h1>
              <p className="text-muted-foreground">
                Acompanhe as métricas de atendimento da sua IA
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select
              value={format(selectedMonth, 'yyyy-MM')}
              onValueChange={(value) => {
                const month = months.find(m => m.value === value);
                if (month) setSelectedMonth(month.date);
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Metrics Card */}
        <AttendanceMetricsCard 
          stats={stats || { total: 0, attended: 0, sentToCrm: 0, attendedPercentage: 0, sentToCrmPercentage: 0 }} 
          isLoading={statsLoading} 
        />

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LeadsByChannelChart 
            data={channelData || []} 
            isLoading={channelLoading} 
          />
          <StatusByChannelChart 
            data={statusData || []} 
            isLoading={statusLoading} 
          />
        </div>

        {/* Leads by Hour */}
        <LeadsByHourChart 
          data={hourData?.data || []} 
          outsideBusinessHours={hourData?.outsideBusinessHours || 0}
          month={selectedMonth}
          isLoading={hourLoading} 
        />

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LeadsWeeklyChart 
            data={weekdayData?.data || []} 
            bestDay={weekdayData?.bestDay || 'Segunda'}
            isLoading={weekdayLoading} 
          />
          <LeadsMonthlyChart 
            data={monthlyData || []} 
            isLoading={monthlyLoading} 
          />
        </div>
      </div>
    </Layout>
  );
}
