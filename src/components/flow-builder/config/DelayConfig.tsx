import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DelayNodeConfig } from '@/types/flow';

interface DelayConfigProps {
  config: DelayNodeConfig;
  onChange: (config: DelayNodeConfig) => void;
}

export function DelayConfig({ config, onChange }: DelayConfigProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Duração</Label>
        <div className="flex gap-2">
          <Input
            type="number"
            min={1}
            value={config.duration}
            onChange={(e) => onChange({ ...config, duration: parseInt(e.target.value) || 1 })}
            className="flex-1"
          />
          <Select
            value={config.unit}
            onValueChange={(value: DelayNodeConfig['unit']) => 
              onChange({ ...config, unit: value })
            }
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="seconds">Segundos</SelectItem>
              <SelectItem value="minutes">Minutos</SelectItem>
              <SelectItem value="hours">Horas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="p-3 bg-muted rounded-lg">
        <p className="text-sm text-muted-foreground">
          O fluxo aguardará{' '}
          <span className="font-medium text-foreground">
            {config.duration} {config.unit === 'seconds' ? 'segundo(s)' : config.unit === 'minutes' ? 'minuto(s)' : 'hora(s)'}
          </span>{' '}
          antes de continuar para o próximo passo.
        </p>
      </div>
    </div>
  );
}
