import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ActionNodeConfig } from '@/types/flow';

interface ActionConfigProps {
  config: ActionNodeConfig;
  onChange: (config: ActionNodeConfig) => void;
}

export function ActionConfig({ config, onChange }: ActionConfigProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Tipo de Ação</Label>
        <Select
          value={config.actionType}
          onValueChange={(value: ActionNodeConfig['actionType']) => 
            onChange({ ...config, actionType: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione a ação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="update_vista">Atualizar Vista</SelectItem>
            <SelectItem value="add_tag">Adicionar Tag</SelectItem>
            <SelectItem value="remove_tag">Remover Tag</SelectItem>
            <SelectItem value="update_contact">Atualizar Contato</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.actionType === 'update_vista' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Código do Imóvel</Label>
            <Input
              placeholder="Ex: {{codigo_imovel}} ou código fixo"
              value={config.vistaFields?.propertyCode || ''}
              onChange={(e) => onChange({
                ...config,
                vistaFields: { ...config.vistaFields, propertyCode: e.target.value }
              })}
            />
          </div>
          <div className="space-y-2">
            <Label>Status a definir</Label>
            <Select
              value={config.vistaFields?.status || ''}
              onValueChange={(value) => onChange({
                ...config,
                vistaFields: { ...config.vistaFields, status: value }
              })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="disponivel">Disponível</SelectItem>
                <SelectItem value="vendido">Vendido</SelectItem>
                <SelectItem value="alugado">Alugado</SelectItem>
                <SelectItem value="indisponivel">Indisponível</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Valor (opcional)</Label>
            <Input
              placeholder="Novo valor do imóvel"
              value={config.vistaFields?.value || ''}
              onChange={(e) => onChange({
                ...config,
                vistaFields: { ...config.vistaFields, value: e.target.value }
              })}
            />
          </div>
        </div>
      )}

      {(config.actionType === 'add_tag' || config.actionType === 'remove_tag') && (
        <div className="space-y-2">
          <Label>Tag</Label>
          <Input
            placeholder="Nome da tag"
            value={config.tagId || ''}
            onChange={(e) => onChange({ ...config, tagId: e.target.value })}
          />
        </div>
      )}

      {config.actionType === 'update_contact' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input
              placeholder="Deixe vazio para não alterar"
              value={config.contactFields?.name || ''}
              onChange={(e) => onChange({
                ...config,
                contactFields: { ...config.contactFields, name: e.target.value }
              })}
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              placeholder="Deixe vazio para não alterar"
              value={config.contactFields?.email || ''}
              onChange={(e) => onChange({
                ...config,
                contactFields: { ...config.contactFields, email: e.target.value }
              })}
            />
          </div>
          <div className="space-y-2">
            <Label>Tipo de Contato</Label>
            <Select
              value={config.contactFields?.type || ''}
              onValueChange={(value) => onChange({
                ...config,
                contactFields: { ...config.contactFields, type: value }
              })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="interessado">Interessado</SelectItem>
                <SelectItem value="qualificado">Qualificado</SelectItem>
                <SelectItem value="proposta">Proposta</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}
