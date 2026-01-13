import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { LeadsByDay } from "@/types/ai-behavior";

interface LeadsWeeklyChartProps {
  data: LeadsByDay[];
  bestDay: string;
  isLoading: boolean;
}

export function LeadsWeeklyChart({ data, bestDay, isLoading }: LeadsWeeklyChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Leads semanais</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <div className="animate-pulse space-y-2 w-full">
            {[1, 2, 3, 4, 5, 6, 7].map(i => (
              <div key={i} className="h-6 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Leads semanais</CardTitle>
        <CardDescription>
          <span className="font-medium text-foreground">{bestDay}</span> é o melhor dia da semana
        </CardDescription>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 60 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" />
            <YAxis 
              type="category" 
              dataKey="day" 
              tick={{ fontSize: 12 }}
              width={50}
            />
            <Tooltip formatter={(value: number) => [`${value} leads`, 'Leads']} />
            <Bar 
              dataKey="count" 
              fill="hsl(var(--primary))" 
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
