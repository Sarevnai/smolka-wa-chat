import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Eye, Trash2, Edit, Plus, RefreshCw } from 'lucide-react';
import { ActivityLog } from '@/hooks/admin/useActivityLogs';

interface ActivityLogTableProps {
  logs: ActivityLog[];
  loading: boolean;
}

const actionIcons: Record<string, any> = {
  CREATE: Plus,
  UPDATE: Edit,
  DELETE: Trash2,
  RESTORE: RefreshCw,
};

const actionColors: Record<string, string> = {
  CREATE: 'bg-green-500/10 text-green-500 border-green-500/20',
  UPDATE: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  DELETE: 'bg-red-500/10 text-red-500 border-red-500/20',
  RESTORE: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
};

export function ActivityLogTable({ logs, loading }: ActivityLogTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum log encontrado com os filtros aplicados.
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data/Hora</TableHead>
            <TableHead>Usuário</TableHead>
            <TableHead>Ação</TableHead>
            <TableHead>Tabela</TableHead>
            <TableHead>ID Alvo</TableHead>
            <TableHead className="text-right">Detalhes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => {
            const ActionIcon = actionIcons[log.action_type] || Eye;
            const actionColor = actionColors[log.action_type] || 'bg-muted text-muted-foreground';

            return (
              <TableRow key={log.id}>
                <TableCell className="font-mono text-sm">
                  {format(new Date(log.created_at), "dd/MM/yy HH:mm:ss", { locale: ptBR })}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{log.user_name}</span>
                    <span className="text-xs text-muted-foreground">{log.user_email}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={actionColor}>
                    <ActionIcon className="h-3 w-3 mr-1" />
                    {log.action_type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {log.target_table}
                  </code>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {log.target_id.substring(0, 8)}...
                </TableCell>
                <TableCell className="text-right">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl">
                      <DialogHeader>
                        <DialogTitle>Detalhes do Log</DialogTitle>
                        <DialogDescription>
                          Informações completas sobre a ação realizada
                        </DialogDescription>
                      </DialogHeader>
                      <ScrollArea className="max-h-[600px] pr-4">
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Data/Hora</p>
                              <p className="font-mono">
                                {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Usuário</p>
                              <p>{log.user_name}</p>
                              <p className="text-xs text-muted-foreground">{log.user_email}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Ação</p>
                              <Badge variant="outline" className={actionColor}>
                                <ActionIcon className="h-3 w-3 mr-1" />
                                {log.action_type}
                              </Badge>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Tabela</p>
                              <code className="text-xs bg-muted px-2 py-1 rounded">
                                {log.target_table}
                              </code>
                            </div>
                            <div className="col-span-2">
                              <p className="text-sm font-medium text-muted-foreground">ID do Registro</p>
                              <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                                {log.target_id}
                              </code>
                            </div>
                          </div>

                          {log.old_data && (
                            <div>
                              <p className="text-sm font-medium text-muted-foreground mb-2">
                                Dados Anteriores
                              </p>
                              <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                                {JSON.stringify(log.old_data, null, 2)}
                              </pre>
                            </div>
                          )}

                          {log.new_data && (
                            <div>
                              <p className="text-sm font-medium text-muted-foreground mb-2">
                                Dados Novos
                              </p>
                              <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                                {JSON.stringify(log.new_data, null, 2)}
                              </pre>
                            </div>
                          )}

                          {log.metadata && (
                            <div>
                              <p className="text-sm font-medium text-muted-foreground mb-2">
                                Metadados
                              </p>
                              <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
