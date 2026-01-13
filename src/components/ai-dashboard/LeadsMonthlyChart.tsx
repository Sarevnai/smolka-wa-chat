import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { LeadsByMonth } from "@/types/ai-behavior";

interface LeadsMonthlyChartProps {
  data: LeadsByMonth[];
  isLoading: boolean;
}

export function LeadsMonthlyChart({ data, isLoading }: LeadsMonthlyChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Leads últimos 6 meses</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <div className="animate-pulse space-x-2 flex w-full justify-around">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-40 w-12 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Leads últimos 6 meses</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Bar 
              dataKey="sent" 
              name="Enviado ao CRM" 
              stackId="a" 
              fill="hsl(142, 76%, 36%)" 
              radius={[0, 0, 0, 0]}
            />
            <Bar 
              dataKey="notSent" 
              name="Não enviado" 
              stackId="a" 
              fill="hsl(var(--muted-foreground))" 
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
