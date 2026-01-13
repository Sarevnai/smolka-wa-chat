import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { LeadsByHour } from "@/types/ai-behavior";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LeadsByHourChartProps {
  data: LeadsByHour[];
  outsideBusinessHours: number;
  month: Date;
  isLoading: boolean;
}

export function LeadsByHourChart({ data, outsideBusinessHours, month, isLoading }: LeadsByHourChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Leads por horário</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <div className="animate-pulse h-full w-full bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  const monthName = format(month, 'MMMM', { locale: ptBR });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Leads por horário em {monthName}</CardTitle>
        <CardDescription>
          {outsideBusinessHours.toFixed(2)}% leads foram atendidos fora do horário comercial
        </CardDescription>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis 
              dataKey="hour" 
              tickFormatter={(h) => `${h}h`}
              tick={{ fontSize: 11 }}
            />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip 
              labelFormatter={(h) => `${h}:00 - ${h}:59`}
              formatter={(value: number) => [`${value} leads`, 'Leads']}
            />
            <Area 
              type="monotone" 
              dataKey="count" 
              stroke="hsl(var(--primary))" 
              fillOpacity={1} 
              fill="url(#colorCount)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
