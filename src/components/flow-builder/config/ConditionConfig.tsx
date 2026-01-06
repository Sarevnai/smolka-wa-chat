import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ConditionNodeConfig, ConditionBranch } from '@/types/flow';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface ConditionConfigProps {
  config: ConditionNodeConfig;
  onChange: (config: ConditionNodeConfig) => void;
}

export function ConditionConfig({ config, onChange }: ConditionConfigProps) {
  const [newKeywords, setNewKeywords] = useState<Record<string, string>>({});
  const [expandedBranches, setExpandedBranches] = useState<Record<string, boolean>>({});

  const handleAddBranch = () => {
    const newBranch: ConditionBranch = {
      id: Date.now().toString(),
      label: `Opção ${config.branches.length + 1}`,
      value: `option_${config.branches.length + 1}`,
      keywords: []
    };
    onChange({
      ...config,
      branches: [...config.branches, newBranch]
    });
  };

  const handleRemoveBranch = (id: string) => {
    if (config.branches.length <= 2) return;
    onChange({
      ...config,
      branches: config.branches.filter(b => b.id !== id)
    });
  };

  const handleUpdateBranch = (id: string, field: keyof ConditionBranch, value: string | string[]) => {
    onChange({
      ...config,
      branches: config.branches.map(b => 
        b.id === id ? { ...b, [field]: value } : b
      )
    });
  };

  const handleAddKeywordToBranch = (branchId: string, e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    const keyword = newKeywords[branchId]?.trim();
    if (!keyword) return;
    
    e.preventDefault();
    const branch = config.branches.find(b => b.id === branchId);
    if (branch) {
      handleUpdateBranch(branchId, 'keywords', [...(branch.keywords || []), keyword]);
      setNewKeywords(prev => ({ ...prev, [branchId]: '' }));
    }
  };

  const handleRemoveKeywordFromBranch = (branchId: string, keyword: string) => {
    const branch = config.branches.find(b => b.id === branchId);
    if (branch) {
      handleUpdateBranch(branchId, 'keywords', (branch.keywords || []).filter(k => k !== keyword));
    }
  };

  const toggleBranch = (id: string) => {
    setExpandedBranches(prev => ({ ...prev, [id]: !prev[id] }));
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
            <SelectItem value="keyword">Palavra-chave por Branch</SelectItem>
            <SelectItem value="intent">Intenção (IA)</SelectItem>
            <SelectItem value="time">Horário</SelectItem>
            <SelectItem value="tag">Tag do Contato</SelectItem>
            <SelectItem value="variable">Valor de Variável</SelectItem>
          </SelectContent>
        </Select>
      </div>

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

      {config.conditionType === 'variable' && (
        <div className="space-y-2">
          <Label>Nome da Variável</Label>
          <Input
            placeholder="Ex: resposta_cliente"
            value={config.variableName || ''}
            onChange={(e) => onChange({ ...config, variableName: e.target.value })}
          />
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Ramificações ({config.branches.length})</Label>
          <Button variant="ghost" size="sm" onClick={handleAddBranch}>
            <Plus className="h-4 w-4 mr-1" />
            Adicionar
          </Button>
        </div>
        
        <div className="space-y-2">
          {config.branches.map((branch, index) => (
            <Collapsible 
              key={branch.id} 
              open={expandedBranches[branch.id]}
              onOpenChange={() => toggleBranch(branch.id)}
            >
              <div className="border rounded-lg p-2 bg-muted/30">
                <div className="flex gap-2 items-center">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      {expandedBranches[branch.id] ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <span className="text-xs text-muted-foreground w-6">{index + 1}.</span>
                  <Input
                    placeholder="Label"
                    value={branch.label}
                    onChange={(e) => handleUpdateBranch(branch.id, 'label', e.target.value)}
                    className="flex-1 h-8"
                  />
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleRemoveBranch(branch.id)}
                    disabled={config.branches.length <= 2}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>

                <CollapsibleContent className="pt-2 space-y-2">
                  {config.conditionType === 'keyword' && (
                    <>
                      <Input
                        placeholder="Digite palavra-chave e Enter"
                        value={newKeywords[branch.id] || ''}
                        onChange={(e) => setNewKeywords(prev => ({ ...prev, [branch.id]: e.target.value }))}
                        onKeyDown={(e) => handleAddKeywordToBranch(branch.id, e)}
                        className="h-8 text-sm"
                      />
                      <div className="flex flex-wrap gap-1">
                        {(branch.keywords || []).map((keyword) => (
                          <Badge key={keyword} variant="secondary" className="gap-1 text-xs">
                            {keyword}
                            <X 
                              className="h-3 w-3 cursor-pointer" 
                              onClick={() => handleRemoveKeywordFromBranch(branch.id, keyword)}
                            />
                          </Badge>
                        ))}
                        {(!branch.keywords || branch.keywords.length === 0) && (
                          <span className="text-xs text-muted-foreground italic">
                            Nenhuma keyword (será opção padrão)
                          </span>
                        )}
                      </div>
                    </>
                  )}

                  {config.conditionType === 'variable' && (
                    <Input
                      placeholder="Valor esperado"
                      value={branch.value}
                      onChange={(e) => handleUpdateBranch(branch.id, 'value', e.target.value)}
                      className="h-8 text-sm"
                    />
                  )}
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}
        </div>
      </div>
    </div>
  );
}
