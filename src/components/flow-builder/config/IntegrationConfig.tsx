import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { IntegrationNodeConfig } from '@/types/flow';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface IntegrationConfigProps {
  config: IntegrationNodeConfig;
  onChange: (config: IntegrationNodeConfig) => void;
}

export function IntegrationConfig({ config, onChange }: IntegrationConfigProps) {
  const [newHeaderKey, setNewHeaderKey] = useState('');
  const [newHeaderValue, setNewHeaderValue] = useState('');

  const handleAddHeader = () => {
    if (newHeaderKey.trim() && newHeaderValue.trim()) {
      onChange({
        ...config,
        headers: { ...config.headers, [newHeaderKey]: newHeaderValue }
      });
      setNewHeaderKey('');
      setNewHeaderValue('');
    }
  };

  const handleRemoveHeader = (key: string) => {
    const newHeaders = { ...config.headers };
    delete newHeaders[key];
    onChange({ ...config, headers: newHeaders });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Tipo de Integração</Label>
        <Select
          value={config.integrationType}
          onValueChange={(value: IntegrationNodeConfig['integrationType']) => 
            onChange({ ...config, integrationType: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="webhook">Webhook</SelectItem>
            <SelectItem value="n8n">n8n</SelectItem>
            <SelectItem value="api">API Externa</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>URL</Label>
        <Input
          placeholder="https://..."
          value={config.url || ''}
          onChange={(e) => onChange({ ...config, url: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label>Método HTTP</Label>
        <Select
          value={config.method || 'POST'}
          onValueChange={(value: IntegrationNodeConfig['method']) => 
            onChange({ ...config, method: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o método" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GET">GET</SelectItem>
            <SelectItem value="POST">POST</SelectItem>
            <SelectItem value="PUT">PUT</SelectItem>
            <SelectItem value="DELETE">DELETE</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Headers</Label>
        </div>
        <div className="space-y-2">
          {Object.entries(config.headers || {}).map(([key, value]) => (
            <div key={key} className="flex gap-2 items-center">
              <Input value={key} disabled className="flex-1" />
              <Input value={value} disabled className="flex-1" />
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => handleRemoveHeader(key)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Key"
              value={newHeaderKey}
              onChange={(e) => setNewHeaderKey(e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="Value"
              value={newHeaderValue}
              onChange={(e) => setNewHeaderValue(e.target.value)}
              className="flex-1"
            />
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleAddHeader}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {config.method !== 'GET' && (
        <div className="space-y-2">
          <Label>Body (JSON)</Label>
          <Textarea
            placeholder='{"key": "value"}'
            value={config.body || ''}
            onChange={(e) => onChange({ ...config, body: e.target.value })}
            rows={4}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Use variáveis como {'{{telefone}}'}, {'{{nome}}'}, {'{{mensagem}}'}
          </p>
        </div>
      )}
    </div>
  );
}
