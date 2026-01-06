import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ConditionNodeConfig } from '@/types/flow';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';

interface ConditionConfigProps {
  config: ConditionNodeConfig;
  onChange: (config: ConditionNodeConfig) => void;
}

export function ConditionConfig({ config, onChange }: ConditionConfigProps) {
  const [newKeyword, setNewKeyword] = useState('');

  const handleAddKeyword = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newKeyword.trim()) {
      e.preventDefault();
      onChange({
        ...config,
        keywords: [...(config.keywords || []), newKeyword.trim()]
      });
      setNewKeyword('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    onChange({
      ...config,
      keywords: (config.keywords || []).filter(k => k !== keyword)
    });
  };

  const handleAddBranch = () => {
    const newBranch = {
      id: Date.now().toString(),
      label: `Opção ${config.branches.length + 1}`,
      value: ''
    };
    onChange({
      ...config,
      branches: [...config.branches, newBranch]
    });
  };

  const handleRemoveBranch = (id: string) => {
    onChange({
      ...config,
      branches: config.branches.filter(b => b.id !== id)
    });
  };

  const handleUpdateBranch = (id: string, field: 'label' | 'value', value: string) => {
    onChange({
      ...config,
      branches: config.branches.map(b => 
        b.id === id ? { ...b, [field]: value } : b
      )
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Tipo de Condição</Label>
        <Select
          value={config.conditionType}
          onValueChange={(value: ConditionNodeConfig['conditionType']) => 
            onChange({ ...config, conditionType: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="keyword">Palavra-chave</SelectItem>
            <SelectItem value="intent">Intenção (IA)</SelectItem>
            <SelectItem value="time">Horário</SelectItem>
            <SelectItem value="tag">Tag do Contato</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.conditionType === 'keyword' && (
        <div className="space-y-2">
          <Label>Palavras-chave para detectar</Label>
          <Input
            placeholder="Digite e pressione Enter"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={handleAddKeyword}
          />
          <div className="flex flex-wrap gap-1 mt-2">
            {(config.keywords || []).map((keyword) => (
              <Badge key={keyword} variant="secondary" className="gap-1">
                {keyword}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => handleRemoveKeyword(keyword)}
                />
              </Badge>
            ))}
          </div>
        </div>
      )}

      {config.conditionType === 'intent' && (
        <div className="space-y-2">
          <Label>Intenção a detectar</Label>
          <Input
            placeholder="Ex: interesse_compra, agendar_visita"
            value={config.intent || ''}
            onChange={(e) => onChange({ ...config, intent: e.target.value })}
          />
        </div>
      )}

      {config.conditionType === 'time' && (
        <div className="space-y-2">
          <Label>Horário de funcionamento</Label>
          <div className="flex gap-2">
            <Input
              type="time"
              value={config.timeRange?.start || '09:00'}
              onChange={(e) => onChange({ 
                ...config, 
                timeRange: { ...config.timeRange, start: e.target.value, end: config.timeRange?.end || '18:00' }
              })}
            />
            <span className="self-center">até</span>
            <Input
              type="time"
              value={config.timeRange?.end || '18:00'}
              onChange={(e) => onChange({ 
                ...config, 
                timeRange: { ...config.timeRange, start: config.timeRange?.start || '09:00', end: e.target.value }
              })}
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Ramificações</Label>
          <Button variant="ghost" size="sm" onClick={handleAddBranch}>
            <Plus className="h-4 w-4 mr-1" />
            Adicionar
          </Button>
        </div>
        <div className="space-y-2">
          {config.branches.map((branch) => (
            <div key={branch.id} className="flex gap-2 items-center">
              <Input
                placeholder="Label"
                value={branch.label}
                onChange={(e) => handleUpdateBranch(branch.id, 'label', e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder="Valor"
                value={branch.value}
                onChange={(e) => handleUpdateBranch(branch.id, 'value', e.target.value)}
                className="flex-1"
              />
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => handleRemoveBranch(branch.id)}
                disabled={config.branches.length <= 2}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
