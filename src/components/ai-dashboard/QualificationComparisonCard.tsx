import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ComparisonData {
  current: {
    total: number;
    qualified: number;
    sentToCrm: number;
    qualificationRate: number;
    conversionRate: number;
  };
  previous: {
    total: number;
    qualified: number;
    sentToCrm: number;
    qualificationRate: number;
    conversionRate: number;
  };
  changes: {
    volume: number;
    qualificationRate: number;
    conversionRate: number;
  };
}

interface QualificationComparisonCardProps {
  data: ComparisonData | undefined;
  month: Date;
  isLoading: boolean;
}

function TrendIndicator({ value, suffix = "%" }: { value: number; suffix?: string }) {
  if (Math.abs(value) < 0.1) {
    return (
      <span className="text-muted-foreground flex items-center gap-1">
        <Minus className="h-3 w-3" />
        0{suffix}
      </span>
    );
  }

  const isPositive = value > 0;
  const Icon = isPositive ? ArrowUpRight : ArrowDownRight;
  const colorClass = isPositive ? "text-green-500" : "text-red-500";

  return (
    <span className={`flex items-center gap-1 ${colorClass}`}>
      <Icon className="h-3 w-3" />
      {isPositive ? "+" : ""}{value.toFixed(1)}{suffix}
    </span>
  );
}

export function QualificationComparisonCard({ data, month, isLoading }: QualificationComparisonCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Comparativo Mensal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-32 mb-2" />
                <div className="h-6 bg-muted rounded w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Comparativo Mensal</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Sem dados para comparação</p>
        </CardContent>
      </Card>
    );
  }

  const monthName = format(month, "MMMM", { locale: ptBR });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Comparativo com Mês Anterior
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Comparando {monthName} com o mês anterior
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Volume */}
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Volume de Leads</div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{data.current.total}</span>
              <TrendIndicator value={data.changes.volume} />
            </div>
            <div className="text-xs text-muted-foreground">
              vs. {data.previous.total} no mês anterior
            </div>
          </div>

          {/* Taxa de Qualificação */}
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Taxa de Qualificação</div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{data.current.qualificationRate.toFixed(1)}%</span>
              <TrendIndicator value={data.changes.qualificationRate} />
            </div>
            <div className="text-xs text-muted-foreground">
              vs. {data.previous.qualificationRate.toFixed(1)}% no mês anterior
            </div>
          </div>

          {/* Taxa de Conversão */}
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Conversão para CRM</div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{data.current.conversionRate.toFixed(1)}%</span>
              <TrendIndicator value={data.changes.conversionRate} />
            </div>
            <div className="text-xs text-muted-foreground">
              vs. {data.previous.conversionRate.toFixed(1)}% no mês anterior
            </div>
          </div>
        </div>

        {/* Detalhes adicionais */}
        <div className="mt-6 pt-4 border-t grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Qualificados</span>
            <div className="font-medium">{data.current.qualified} vs {data.previous.qualified}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Enviados CRM</span>
            <div className="font-medium">{data.current.sentToCrm} vs {data.previous.sentToCrm}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
