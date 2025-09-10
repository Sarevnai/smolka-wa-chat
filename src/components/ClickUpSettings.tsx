import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Settings, ExternalLink, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ClickUpWorkspace {
  id: string;
  name: string;
}

interface ClickUpSpace {
  id: string;
  name: string;
}

interface ClickUpList {
  id: string;
  name: string;
  space: {
    id: string;
    name: string;
  };
}

export function ClickUpSettings() {
  const [apiToken, setApiToken] = useState('');
  const [workspaces, setWorkspaces] = useState<ClickUpWorkspace[]>([]);
  const [spaces, setSpaces] = useState<ClickUpSpace[]>([]);
  const [lists, setLists] = useState<ClickUpList[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState('');
  const [selectedSpace, setSelectedSpace] = useState('');
  const [proprietariosList, setProprietariosList] = useState('');
  const [inquilinosList, setInquilinosList] = useState('');
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const loadConfiguration = async () => {
      try {
        // Try to load from database first
        const { data, error } = await supabase
          .from('clickup_config')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data && !error) {
          setApiToken(data.api_token || '');
          setSelectedWorkspace(data.workspace_id || '');
          setSelectedSpace(data.space_id || '');
          setProprietariosList(data.proprietarios_list_id || '');
          setInquilinosList(data.inquilinos_list_id || '');
          if (data.api_token) {
            setConnected(true);
          }
          return;
        }
      } catch (error) {
        console.error('Error loading config from database:', error);
      }

      // Fallback to localStorage
      const savedConfig = localStorage.getItem('clickup_config');
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        setApiToken(config.apiToken || '');
        setSelectedWorkspace(config.workspaceId || '');
        setSelectedSpace(config.spaceId || '');
        setProprietariosList(config.proprietariosListId || '');
        setInquilinosList(config.inquilinosListId || '');
        if (config.apiToken) {
          setConnected(true);
        }
      }
    };

    loadConfiguration();
  }, []);

  const saveConfiguration = async () => {
    if (!apiToken || !selectedWorkspace || !selectedSpace || !proprietariosList || !inquilinosList) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todas as configurações antes de salvar.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Save to database
      const { error } = await supabase
        .from('clickup_config')
        .upsert({
          api_token: apiToken,
          workspace_id: selectedWorkspace,
          space_id: selectedSpace,
          proprietarios_list_id: proprietariosList,
          inquilinos_list_id: inquilinosList
        });

      if (error) {
        console.error('Error saving config:', error);
        toast({
          title: "Erro",
          description: "Erro ao salvar configuração no banco de dados.",
          variant: "destructive"
        });
        return;
      }

      // Also save to localStorage for backward compatibility
      const config = {
        apiToken,
        workspaceId: selectedWorkspace,
        spaceId: selectedSpace,
        proprietariosListId: proprietariosList,
        inquilinosListId: inquilinosList
      };
      localStorage.setItem('clickup_config', JSON.stringify(config));
      
      toast({
        title: "Configuração salva",
        description: "As configurações do ClickUp foram salvas com sucesso.",
      });
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao salvar configuração.",
        variant: "destructive"
      });
    }
  };

  const testConnection = async () => {
    if (!apiToken) {
      toast({
        title: "Token necessário",
        description: "Por favor, insira seu Personal Token API do ClickUp.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('https://api.clickup.com/api/v2/user', {
        headers: {
          'Authorization': apiToken,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Token inválido ou erro na conexão');
      }

      const userData = await response.json();
      setConnected(true);
      
      toast({
        title: "Conexão bem-sucedida!",
        description: `Conectado como ${userData.user.username}`,
      });

      // Load workspaces
      await loadWorkspaces();

    } catch (error) {
      console.error('Connection test failed:', error);
      setConnected(false);
      toast({
        title: "Falha na conexão",
        description: "Verifique seu token API e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadWorkspaces = async () => {
    try {
      const response = await fetch('https://api.clickup.com/api/v2/team', {
        headers: {
          'Authorization': apiToken,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setWorkspaces(data.teams || []);
      }
    } catch (error) {
      console.error('Failed to load workspaces:', error);
    }
  };

  const loadSpaces = async (workspaceId: string) => {
    try {
      const response = await fetch(`https://api.clickup.com/api/v2/team/${workspaceId}/space`, {
        headers: {
          'Authorization': apiToken,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSpaces(data.spaces || []);
      }
    } catch (error) {
      console.error('Failed to load spaces:', error);
    }
  };

  const loadLists = async (spaceId: string) => {
    try {
      const response = await fetch(`https://api.clickup.com/api/v2/space/${spaceId}/list`, {
        headers: {
          'Authorization': apiToken,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLists(data.lists || []);
      }
    } catch (error) {
      console.error('Failed to load lists:', error);
    }
  };

  const handleWorkspaceChange = (workspaceId: string) => {
    setSelectedWorkspace(workspaceId);
    setSelectedSpace('');
    setSpaces([]);
    setLists([]);
    if (workspaceId) {
      loadSpaces(workspaceId);
    }
  };

  const handleSpaceChange = (spaceId: string) => {
    setSelectedSpace(spaceId);
    setLists([]);
    if (spaceId) {
      loadLists(spaceId);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <CardTitle>Configuração ClickUp</CardTitle>
            {connected && <Badge variant="outline" className="text-green-600 border-green-200">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Conectado
            </Badge>}
          </div>
          <CardDescription>
            Configure a integração com o ClickUp para sincronizar seus tickets
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-token">Personal Token API</Label>
            <div className="flex gap-2">
              <Input
                id="api-token"
                type="password"
                placeholder="pk_..."
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
              />
              <Button 
                onClick={testConnection}
                disabled={loading || !apiToken}
                variant="outline"
              >
                {loading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                Testar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Encontre seu token em: ClickUp {'>'} Settings {'>'} Apps {'>'} API Token
              <Button variant="link" className="p-0 h-auto text-xs ml-1" asChild>
                <a href="https://app.clickup.com/settings/apps" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            </p>
          </div>

          {connected && (
            <>
              <Separator />
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="workspace">Workspace</Label>
                  <select
                    id="workspace"
                    className="w-full p-2 border border-input rounded-md bg-background"
                    value={selectedWorkspace}
                    onChange={(e) => handleWorkspaceChange(e.target.value)}
                  >
                    <option value="">Selecione um workspace</option>
                    {workspaces.map((workspace) => (
                      <option key={workspace.id} value={workspace.id}>
                        {workspace.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedWorkspace && (
                  <div className="space-y-2">
                    <Label htmlFor="space">Space</Label>
                    <select
                      id="space"
                      className="w-full p-2 border border-input rounded-md bg-background"
                      value={selectedSpace}
                      onChange={(e) => handleSpaceChange(e.target.value)}
                    >
                      <option value="">Selecione um space</option>
                      {spaces.map((space) => (
                        <option key={space.id} value={space.id}>
                          {space.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedSpace && lists.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="proprietarios-list">Lista Proprietários</Label>
                      <select
                        id="proprietarios-list"
                        className="w-full p-2 border border-input rounded-md bg-background"
                        value={proprietariosList}
                        onChange={(e) => setProprietariosList(e.target.value)}
                      >
                        <option value="">Selecione uma lista</option>
                        {lists.map((list) => (
                          <option key={list.id} value={list.id}>
                            {list.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="inquilinos-list">Lista Inquilinos</Label>
                      <select
                        id="inquilinos-list"
                        className="w-full p-2 border border-input rounded-md bg-background"
                        value={inquilinosList}
                        onChange={(e) => setInquilinosList(e.target.value)}
                      >
                        <option value="">Selecione uma lista</option>
                        {lists.map((list) => (
                          <option key={list.id} value={list.id}>
                            {list.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <Button 
                  onClick={saveConfiguration}
                  className="w-full"
                  disabled={!connected}
                >
                  Salvar Configuração
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Instruções de Setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div>
            <strong>1. Obter Personal Token API:</strong>
            <p>Acesse suas configurações no ClickUp e gere um Personal Token API</p>
          </div>
          <div>
            <strong>2. Criar Structure:</strong>
            <p>Crie um Space chamado "Administradora de Imóveis" e duas listas: "Proprietários" e "Inquilinos"</p>
          </div>
          <div>
            <strong>3. Configurar Webhook (Opcional):</strong>
            <p>Para sincronização bidirecional, configure um webhook apontando para:</p>
            <code className="bg-muted px-2 py-1 rounded text-xs">
              https://wpjxsgxxhogzkkuznyke.supabase.co/functions/v1/clickup-webhook
            </code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}