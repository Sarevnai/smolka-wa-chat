import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { EscalationNodeConfig } from '@/types/flow';

interface EscalationConfigProps {
  config: EscalationNodeConfig;
  onChange: (config: EscalationNodeConfig) => void;
}

export function EscalationConfig({ config, onChange }: EscalationConfigProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Departamento</Label>
        <Select
          value={config.department}
          onValueChange={(value: EscalationNodeConfig['department']) => 
            onChange({ ...config, department: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o departamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="locacao">Locação</SelectItem>
            <SelectItem value="vendas">Vendas</SelectItem>
            <SelectItem value="administrativo">Administrativo</SelectItem>
            <SelectItem value="marketing">Marketing</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Prioridade</Label>
        <Select
          value={config.priority}
          onValueChange={(value: EscalationNodeConfig['priority']) => 
            onChange({ ...config, priority: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione a prioridade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Baixa</SelectItem>
            <SelectItem value="medium">Média</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Motivo da Escalação</Label>
        <Textarea
          placeholder="Descreva o motivo da transferência para humano..."
          value={config.reason || ''}
          onChange={(e) => onChange({ ...config, reason: e.target.value })}
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          Este texto será visível para o atendente que receber a conversa
        </p>
      </div>
    </div>
  );
}
