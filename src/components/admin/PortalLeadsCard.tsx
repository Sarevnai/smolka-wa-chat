import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, ArrowRight, Calendar, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { PortalLeadsStats } from "@/hooks/admin/useManagementStats";

interface PortalLeadsCardProps {
  stats: PortalLeadsStats;
}

const PORTAL_CONFIG: Record<string, { emoji: string; color: string }> = {
  'ZAP Imóveis': { emoji: '🏠', color: 'bg-orange-100 text-orange-700' },
  'Viva Real': { emoji: '🏡', color: 'bg-green-100 text-green-700' },
  'OLX Imóveis': { emoji: '📦', color: 'bg-purple-100 text-purple-700' },
  'Chaves na Mão': { emoji: '🔑', color: 'bg-yellow-100 text-yellow-700' }
};

export function PortalLeadsCard({ stats }: PortalLeadsCardProps) {
  const portalEntries = Object.entries(stats.byPortal).sort(([, a], [, b]) => b - a);

  return (
    <Card className="border-l-4 border-l-amber-500 bg-gradient-to-br from-amber-500/10 to-amber-600/5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-lg font-semibold">
              Leads de Portais
            </CardTitle>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin/portal-integration">
              Configurar <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-amber-600">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <p className="text-2xl font-bold">{stats.todayCount}</p>
            </div>
            <p className="text-xs text-muted-foreground">Hoje</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <TrendingUp className="h-3 w-3 text-muted-foreground" />
              <p className="text-2xl font-bold">{stats.weekCount}</p>
            </div>
            <p className="text-xs text-muted-foreground">Semana</p>
          </div>
        </div>

        {/* Leads by Portal */}
        {portalEntries.length > 0 && (
          <div className="pt-2 border-t space-y-2">
            <p className="text-xs text-muted-foreground">Por portal:</p>
            <div className="grid grid-cols-2 gap-2">
              {portalEntries.map(([portal, count]) => {
                const config = PORTAL_CONFIG[portal] || { emoji: '🏢', color: 'bg-gray-100 text-gray-700' };
                return (
                  <Badge 
                    key={portal} 
                    variant="secondary" 
                    className={`justify-between px-2 py-1 ${config.color}`}
                  >
                    <span className="flex items-center gap-1">
                      <span>{config.emoji}</span>
                      <span className="truncate text-xs">{portal}</span>
                    </span>
                    <span className="font-bold">{count}</span>
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {portalEntries.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <p className="text-sm">Nenhum lead recebido ainda</p>
            <p className="text-xs">Configure os webhooks dos portais</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
