import { useState } from "react";
import Layout from "@/components/Layout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useLeadStats, useLeadsByChannel, useLeadsByStatus, useLeadsByHour, useLeadsByWeekday, useLeadsMonthly } from "@/hooks/useAIDashboard";
import { useLeadQualificationStats, useQualificationComparison } from "@/hooks/useLeadQualification";
import { AttendanceMetricsCard, LeadsByChannelChart, StatusByChannelChart, LeadsByHourChart, LeadsWeeklyChart, LeadsMonthlyChart, QualificationStatsCard, QualificationComparisonCard } from "@/components/ai-dashboard";
import AIErrorDashboard from "@/components/ai-dashboard/AIErrorDashboard";
import { Bot, Calendar, AlertTriangle } from "lucide-react";
export default function AIMainDashboard() {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const {
    data: stats,
    isLoading: statsLoading
  } = useLeadStats(selectedMonth);
  const {
    data: channelData,
    isLoading: channelLoading
  } = useLeadsByChannel(selectedMonth);
  const {
    data: statusData,
    isLoading: statusLoading
  } = useLeadsByStatus(selectedMonth);
  const {
    data: hourData,
    isLoading: hourLoading
  } = useLeadsByHour(selectedMonth);
  const {
    data: weekdayData,
    isLoading: weekdayLoading
  } = useLeadsByWeekday(selectedMonth);
  const {
    data: monthlyData,
    isLoading: monthlyLoading
  } = useLeadsMonthly();
  const {
    data: qualificationStats,
    isLoading: qualStatsLoading
  } = useLeadQualificationStats(selectedMonth);
  const {
    data: comparisonData,
    isLoading: comparisonLoading
  } = useQualificationComparison(selectedMonth);

  // Generate last 12 months for selector
  const months = Array.from({
    length: 12
  }, (_, i) => {
    const date = subMonths(new Date(), i);
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, "MMMM 'de' yyyy", {
        locale: ptBR
      }),
      date
    };
  });
  return <Layout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground">
                Acompanhe as métricas de atendimento da sua IA
              </p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="metricas">
          <TabsList>
            <TabsTrigger value="metricas">📊 Métricas</TabsTrigger>
            <TabsTrigger value="erros" className="flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              Erros IA
            </TabsTrigger>
          </TabsList>

          <TabsContent value="metricas" className="space-y-6 mt-4">
            {/* Month selector */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Select value={format(selectedMonth, 'yyyy-MM')} onValueChange={value => {
                const month = months.find(m => m.value === value);
                if (month) setSelectedMonth(month.date);
              }}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map(month => <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Metrics Card */}
            <AttendanceMetricsCard stats={stats || {
              total: 0, attended: 0, sentToCrm: 0, attendedPercentage: 0, sentToCrmPercentage: 0
            }} isLoading={statsLoading} />

            {/* Qualification Stats */}
            <QualificationStatsCard stats={qualificationStats || {
              total: 0, pending: 0, qualifying: 0, qualified: 0, disqualified: 0, cold: 0, sentToCrm: 0,
              qualificationRate: 0, conversionRate: 0, disqualificationRate: 0,
              disqualifiedByReason: { corretor: 0, curioso: 0, sem_interesse: 0, sem_resposta: 0, fora_perfil: 0 },
              avgQualificationScore: 0, avgQuestionsAsked: 0, avgTimeToQualify: 0
            }} isLoading={qualStatsLoading} />

            {/* Comparison Card */}
            <QualificationComparisonCard data={comparisonData} month={selectedMonth} isLoading={comparisonLoading} />

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <LeadsByChannelChart data={channelData || []} isLoading={channelLoading} />
              <StatusByChannelChart data={statusData || []} isLoading={statusLoading} />
            </div>

            {/* Leads by Hour */}
            <LeadsByHourChart data={hourData?.data || []} outsideBusinessHours={hourData?.outsideBusinessHours || 0} month={selectedMonth} isLoading={hourLoading} />

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <LeadsWeeklyChart data={weekdayData?.data || []} bestDay={weekdayData?.bestDay || 'Segunda'} isLoading={weekdayLoading} />
              <LeadsMonthlyChart data={monthlyData || []} isLoading={monthlyLoading} />
            </div>
          </TabsContent>

          <TabsContent value="erros" className="mt-4">
            <AIErrorDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>;
}