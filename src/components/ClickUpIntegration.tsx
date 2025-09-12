import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { Ticket } from '@/hooks/useTickets';

interface ClickUpIntegrationProps {
  ticket: Ticket;
}

interface IntegrationStatus {
  status: 'not_synced' | 'synced' | 'pending' | 'error';
  clickup_task_id?: string;
  error_message?: string;
  last_sync?: string;
}

export function ClickUpIntegration({ ticket }: ClickUpIntegrationProps) {
  const [loading, setLoading] = useState(false);
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus>({ status: 'not_synced' });
  const { toast } = useToast();

  // Check integration status on component mount
  React.useEffect(() => {
    checkIntegrationStatus();
  }, [ticket.id]);

  const checkIntegrationStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('clickup_integration')
        .select('clickup_task_id, sync_status, error_message, last_sync')
        .eq('ticket_id', ticket.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking integration status:', error);
        return;
      }

      if (data) {
        setIntegrationStatus({
          status: data.sync_status as IntegrationStatus['status'],
          clickup_task_id: data.clickup_task_id,
          error_message: data.error_message,
          last_sync: data.last_sync
        });
      }
    } catch (error) {
      console.error('Error checking integration status:', error);
    }
  };

  const syncToClickUp = async () => {
    setLoading(true);
    setIntegrationStatus({ status: 'pending' });
    try {
      // Get ClickUp configuration from database first, then localStorage fallback
      let config;
      
      try {
        const { data, error } = await supabase
          .from('clickup_config')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data && !error) {
          config = {
            proprietariosListId: data.proprietarios_list_id,
            inquilinosListId: data.inquilinos_list_id
          };
        }
      } catch (error) {
        console.error('Error loading config from database:', error);
      }

      // Fallback to localStorage
      if (!config) {
        const savedConfig = localStorage.getItem('clickup_config');
        if (savedConfig) {
          const parsedConfig = JSON.parse(savedConfig);
          config = {
            proprietariosListId: parsedConfig.proprietariosListId,
            inquilinosListId: parsedConfig.inquilinosListId
          };
        }
      }

      if (!config) {
        throw new Error('ClickUp não configurado. Acesse a página ClickUp para configurar.');
      }

      const listId = ticket.type === 'proprietario' 
        ? config.proprietariosListId 
        : config.inquilinosListId;

      if (!listId) {
        throw new Error(`Lista do ClickUp não configurada para ${ticket.type === 'proprietario' ? 'proprietários' : 'inquilinos'}`);
      }

      console.log('Syncing ticket to ClickUp:', {
        ticketId: ticket.id,
        listId,
        ticketType: ticket.type
      });

      const response = await supabase.functions.invoke('clickup-create-task', {
        body: { ticket, listId }
      });

      console.log('ClickUp sync response:', response);

      if (response.error) {
        console.error('ClickUp sync error details:', response.error);
        throw new Error(response.error.message || 'Failed to sync with ClickUp');
      }

      toast({
        title: "Sucesso!",
        description: "Ticket sincronizado com ClickUp com sucesso.",
      });

      // Refresh status with delay to allow backend processing
      setTimeout(async () => {
        await checkIntegrationStatus();
      }, 1000);

    } catch (error) {
      console.error('Error syncing to ClickUp:', error);
      toast({
        title: "Erro na sincronização",
        description: error instanceof Error ? error.message : "Falha ao sincronizar com ClickUp",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateClickUpTask = async () => {
    if (!integrationStatus.clickup_task_id) return;

    setLoading(true);
    setIntegrationStatus(prev => ({ ...prev, status: 'pending' }));
    
    try {
      // Update general fields
      const updateResponse = await supabase.functions.invoke('clickup-update-task', {
        body: { 
          ticketId: ticket.id, 
          updates: {
            title: ticket.title,
            description: ticket.description,
            priority: ticket.priority,
            type: ticket.type,
            assignedTo: ticket.assigned_to
          }
        }
      });

      if (updateResponse.error) {
        throw new Error(updateResponse.error.message || 'Failed to update ClickUp task');
      }

      // Also update status if stage changed
      const statusResponse = await supabase.functions.invoke('clickup-update-task-status', {
        body: { 
          ticketId: ticket.id, 
          updates: {
            stage: ticket.stage
          }
        }
      });

      if (statusResponse.error) {
        console.warn('Status update failed:', statusResponse.error);
      }

      toast({
        title: "Atualizado!",
        description: "Task do ClickUp atualizada com sucesso.",
      });

      // Refresh status with delay to allow backend processing
      setTimeout(async () => {
        await checkIntegrationStatus();
      }, 1000);

    } catch (error) {
      console.error('Error updating ClickUp task:', error);
      setIntegrationStatus(prev => ({ ...prev, status: 'error', error_message: error instanceof Error ? error.message : 'Update failed' }));
      toast({
        title: "Erro na atualização",
        description: error instanceof Error ? error.message : "Falha ao atualizar task no ClickUp",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openInClickUp = () => {
    if (integrationStatus.clickup_task_id) {
      window.open(`https://app.clickup.com/t/${integrationStatus.clickup_task_id}`, '_blank');
    }
  };

  const getStatusIcon = () => {
    switch (integrationStatus.status) {
      case 'synced':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = () => {
    switch (integrationStatus.status) {
      case 'synced':
        return <Badge variant="outline" className="text-green-600 border-green-200">Sincronizado</Badge>;
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-200">Pendente</Badge>;
      case 'error':
        return <Badge variant="outline" className="text-red-600 border-red-200">Erro</Badge>;
      default:
        return <Badge variant="outline" className="text-gray-600 border-gray-200">Não sincronizado</Badge>;
    }
  };

  return (
    <div className="border border-border rounded-lg p-3 bg-card">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">ClickUp</span>
          {getStatusIcon()}
        </div>
        {getStatusBadge()}
      </div>

      {integrationStatus.status === 'not_synced' && (
        <Button 
          onClick={syncToClickUp} 
          disabled={loading}
          size="sm"
          className="w-full"
        >
          {loading ? <RefreshCw className="h-3 w-3 animate-spin" /> : "Sincronizar"}
        </Button>
      )}

      {integrationStatus.status === 'synced' && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Button 
              onClick={updateClickUpTask} 
              disabled={loading}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              {loading ? <RefreshCw className="h-3 w-3 animate-spin" /> : "Atualizar"}
            </Button>
            <Button 
              onClick={openInClickUp} 
              variant="outline"
              size="sm"
              className="px-2"
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
          {integrationStatus.last_sync && (
            <p className="text-xs text-muted-foreground">
              Última sync: {new Date(integrationStatus.last_sync).toLocaleString('pt-BR', { 
                day: '2-digit', 
                month: '2-digit', 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </p>
          )}
        </div>
      )}

      {integrationStatus.status === 'error' && (
        <div className="space-y-2">
          <p className="text-xs text-red-600 truncate">
            {integrationStatus.error_message}
          </p>
          <Button 
            onClick={syncToClickUp} 
            disabled={loading}
            variant="outline"
            size="sm"
            className="w-full"
          >
            {loading ? <RefreshCw className="h-3 w-3 animate-spin" /> : "Retry"}
          </Button>
        </div>
      )}

      {integrationStatus.status === 'pending' && (
        <div className="text-center py-2">
          <RefreshCw className="mx-auto h-4 w-4 animate-spin text-muted-foreground" />
          <p className="text-xs text-muted-foreground mt-1">Sincronizando...</p>
        </div>
      )}
    </div>
  );
}