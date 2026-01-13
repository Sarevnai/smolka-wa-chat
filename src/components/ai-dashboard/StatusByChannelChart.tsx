import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { LeadsByStatus } from "@/types/ai-behavior";

interface StatusByChannelChartProps {
  data: LeadsByStatus[];
  isLoading: boolean;
}

export function StatusByChannelChart({ data, isLoading }: StatusByChannelChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Status por canal</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <div className="animate-pulse space-y-2 w-full">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-8 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Status por canal</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={data} 
            layout="vertical"
            margin={{ left: 80 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" />
            <YAxis 
              type="category" 
              dataKey="channel" 
              tick={{ fontSize: 12 }}
              width={70}
            />
            <Tooltip />
            <Legend />
            <Bar 
              dataKey="sent" 
              name="Enviado ao CRM" 
              stackId="a" 
              fill="hsl(142, 76%, 36%)" 
            />
            <Bar 
              dataKey="error" 
              name="Erro no envio" 
              stackId="a" 
              fill="hsl(0, 84%, 60%)" 
            />
            <Bar 
              dataKey="notReady" 
              name="Não pronto" 
              stackId="a" 
              fill="hsl(var(--muted-foreground))" 
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
