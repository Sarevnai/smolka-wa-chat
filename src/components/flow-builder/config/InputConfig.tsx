import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { InputNodeConfig } from '@/types/flow';

interface InputConfigProps {
  config: InputNodeConfig;
  onChange: (config: InputNodeConfig) => void;
}

export function InputConfig({ config, onChange }: InputConfigProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Nome da Variável</Label>
        <Input
          placeholder="Ex: valor_imovel, resposta_cliente"
          value={config.variableName || ''}
          onChange={(e) => onChange({ ...config, variableName: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          Use em mensagens: {'{{'}variableName{'}}'}
        </p>
      </div>

      <div className="space-y-2">
        <Label>Tipo de Resposta Esperada</Label>
        <Select
          value={config.expectedType || 'text'}
          onValueChange={(value: InputNodeConfig['expectedType']) => 
            onChange({ ...config, expectedType: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text">Texto livre</SelectItem>
            <SelectItem value="number">Número</SelectItem>
            <SelectItem value="currency">Valor (R$)</SelectItem>
            <SelectItem value="yes_no">Sim/Não</SelectItem>
            <SelectItem value="email">E-mail</SelectItem>
            <SelectItem value="phone">Telefone</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Timeout (segundos): {config.timeout || 300}s</Label>
        <Slider
          value={[config.timeout || 300]}
          min={30}
          max={3600}
          step={30}
          onValueChange={([value]) => onChange({ ...config, timeout: value })}
        />
        <p className="text-xs text-muted-foreground">
          Tempo máximo de espera pela resposta
        </p>
      </div>

      <div className="space-y-2">
        <Label>Ação em caso de timeout</Label>
        <Select
          value={config.timeoutAction || 'retry'}
          onValueChange={(value: InputNodeConfig['timeoutAction']) => 
            onChange({ ...config, timeoutAction: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione a ação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="retry">Repetir pergunta</SelectItem>
            <SelectItem value="skip">Pular e continuar</SelectItem>
            <SelectItem value="escalate">Escalar para humano</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
