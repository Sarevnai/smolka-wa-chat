import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { EndNodeConfig } from '@/types/flow';

interface EndConfigProps {
  config: EndNodeConfig;
  onChange: (config: EndNodeConfig) => void;
}

export function EndConfig({ config, onChange }: EndConfigProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Mensagem Final (opcional)</Label>
        <Textarea
          placeholder="Obrigado pelo contato! Até breve 👋"
          value={config.message || ''}
          onChange={(e) => onChange({ ...config, message: e.target.value })}
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          Esta mensagem será enviada antes de encerrar o fluxo
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Fechar conversa</Label>
          <p className="text-xs text-muted-foreground">
            Marca a conversa como encerrada no sistema
          </p>
        </div>
        <Switch
          checked={config.closeConversation || false}
          onCheckedChange={(checked) => onChange({ ...config, closeConversation: checked })}
        />
      </div>
    </div>
  );
}
