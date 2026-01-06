import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { MessageNodeConfig } from '@/types/flow';

interface MessageConfigProps {
  config: MessageNodeConfig;
  onChange: (config: MessageNodeConfig) => void;
}

export function MessageConfig({ config, onChange }: MessageConfigProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Texto da Mensagem</Label>
        <Textarea
          placeholder="Digite a mensagem..."
          value={config.text}
          onChange={(e) => onChange({ ...config, text: e.target.value })}
          rows={4}
        />
        <p className="text-xs text-muted-foreground">
          Use {'{{nome}}'} para inserir o nome do contato
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Delay antes de enviar</Label>
          <span className="text-sm text-muted-foreground">{config.delay || 0}s</span>
        </div>
        <Slider
          value={[config.delay || 0]}
          onValueChange={([value]) => onChange({ ...config, delay: value })}
          max={30}
          step={1}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Usar nome do cliente</Label>
          <p className="text-xs text-muted-foreground">
            Substitui {'{{nome}}'} pelo nome do contato
          </p>
        </div>
        <Switch
          checked={config.useClientName || false}
          onCheckedChange={(checked) => onChange({ ...config, useClientName: checked })}
        />
      </div>
    </div>
  );
}
