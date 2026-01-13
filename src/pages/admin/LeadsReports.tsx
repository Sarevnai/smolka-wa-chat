import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart3, Home, MapPin } from "lucide-react";

// Types for reports
interface PropertyTypeReport {
  type: string;
  leadsPercentage: number;
  inventoryPercentage: number;
}

interface TopPropertyReport {
  rank: number;
  code: string;
  type: string;
  price: string;
  leads: number;
}

export default function LeadsReports() {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [transactionType, setTransactionType] = useState<'aluguel' | 'venda'>('aluguel');

  // Generate last 12 months for selector
  const months = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM', { locale: ptBR }),
      date,
    };
  });

  // Query for property type distribution
  const { data: propertyTypes, isLoading: typesLoading } = useQuery({
    queryKey: ['leads-by-property-type', format(selectedMonth, 'yyyy-MM'), transactionType],
    queryFn: async (): Promise<PropertyTypeReport[]> => {
      const start = startOfMonth(selectedMonth);
      const end = endOfMonth(selectedMonth);

      const { data, error } = await supabase
        .from('portal_leads_log')
        .select('raw_payload')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .eq('transaction_type', transactionType);

      if (error) throw error;

      // Mock data since we don't have property types in leads yet
      // In real implementation, parse raw_payload for property types
      return [
        { type: 'Apartamento', leadsPercentage: 57.63, inventoryPercentage: 31 },
        { type: 'Casa', leadsPercentage: 33.9, inventoryPercentage: 25.5 },
        { type: 'Comercial', leadsPercentage: 8.47, inventoryPercentage: 43 },
      ];
    },
  });

  // Query for top properties
  const { data: topProperties, isLoading: propertiesLoading } = useQuery({
    queryKey: ['top-properties-by-leads', format(selectedMonth, 'yyyy-MM'), transactionType],
    queryFn: async (): Promise<TopPropertyReport[]> => {
      const start = startOfMonth(selectedMonth);
      const end = endOfMonth(selectedMonth);

      const { data, error } = await supabase
        .from('portal_leads_log')
        .select('origin_listing_id')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .not('origin_listing_id', 'is', null);

      if (error) throw error;

      // Count leads per listing
      const listingCounts: Record<string, number> = {};
      data?.forEach(lead => {
        if (lead.origin_listing_id) {
          listingCounts[lead.origin_listing_id] = (listingCounts[lead.origin_listing_id] || 0) + 1;
        }
      });

      // Sort and get top 10
      const sorted = Object.entries(listingCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10);

      return sorted.map(([code, leads], index) => ({
        rank: index + 1,
        code,
        type: index % 2 === 0 ? 'Apartamento' : 'Casa', // Mock type
        price: `R$ ${(Math.random() * 10000 + 2000).toFixed(0)}`,
        leads,
      }));
    },
  });

  return (
    <Layout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
              <p className="text-muted-foreground">
                Confira dados sobre as preferências dos seus leads
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={transactionType}
              onValueChange={(v) => setTransactionType(v as 'aluguel' | 'venda')}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aluguel">Aluguel</SelectItem>
                <SelectItem value="venda">Venda</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={format(selectedMonth, 'yyyy-MM')}
              onValueChange={(value) => {
                const month = months.find(m => m.value === value);
                if (month) setSelectedMonth(month.date);
              }}
            >
              <SelectTrigger className="w-[150px]">
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

        <Tabs defaultValue="properties" className="space-y-6">
          <TabsList>
            <TabsTrigger value="properties" className="gap-2">
              <Home className="h-4 w-4" />
              Imóveis
            </TabsTrigger>
            <TabsTrigger value="neighborhoods" className="gap-2">
              <MapPin className="h-4 w-4" />
              Bairros
            </TabsTrigger>
          </TabsList>

          <TabsContent value="properties" className="space-y-6">
            {/* Property Types */}
            <Card>
              <CardHeader>
                <CardTitle>Top tipo de imóveis</CardTitle>
                <CardDescription>
                  Compare a busca dos seus leads de {transactionType} com sua prateleira
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Ranking</TableHead>
                      <TableHead>Tipo de imóvel</TableHead>
                      <TableHead className="text-right">Leads</TableHead>
                      <TableHead className="text-right">Prateleira</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {typesLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={4}>
                            <div className="h-8 bg-muted rounded animate-pulse" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      propertyTypes?.map((item, index) => (
                        <TableRow key={item.type}>
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell>{item.type}</TableCell>
                          <TableCell className="text-right">{item.leadsPercentage}%</TableCell>
                          <TableCell className="text-right">{item.inventoryPercentage}%</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Top Properties */}
            <Card>
              <CardHeader>
                <CardTitle>Top 10 imóveis</CardTitle>
                <CardDescription>
                  Saiba quais imóveis de {transactionType} atraíram mais leads
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Rank</TableHead>
                      <TableHead>Imóvel</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Preço</TableHead>
                      <TableHead className="text-right">Leads</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {propertiesLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={5}>
                            <div className="h-8 bg-muted rounded animate-pulse" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : topProperties?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          Nenhum dado disponível para este período
                        </TableCell>
                      </TableRow>
                    ) : (
                      topProperties?.map((item) => (
                        <TableRow key={item.code}>
                          <TableCell className="font-medium">{item.rank}</TableCell>
                          <TableCell>#{item.code}</TableCell>
                          <TableCell>{item.type}</TableCell>
                          <TableCell>{item.price}</TableCell>
                          <TableCell className="text-right font-medium">{item.leads}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="neighborhoods">
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Relatório de bairros em desenvolvimento
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
