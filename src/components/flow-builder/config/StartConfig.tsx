import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { StartNodeConfig } from '@/types/flow';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { useState } from 'react';

interface StartConfigProps {
  config: StartNodeConfig;
  onChange: (config: StartNodeConfig) => void;
}

export function StartConfig({ config, onChange }: StartConfigProps) {
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

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Gatilho de Início</Label>
        <Select
          value={config.trigger}
          onValueChange={(value: StartNodeConfig['trigger']) => 
            onChange({ ...config, trigger: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o gatilho" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="first_message">Primeira Mensagem</SelectItem>
            <SelectItem value="keyword">Palavra-chave</SelectItem>
            <SelectItem value="template_response">Resposta de Template</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.trigger === 'keyword' && (
        <div className="space-y-2">
          <Label>Palavras-chave</Label>
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

      {config.trigger === 'template_response' && (
        <div className="space-y-2">
          <Label>ID do Template</Label>
          <Input
            placeholder="ID do template WhatsApp"
            value={config.templateId || ''}
            onChange={(e) => onChange({ ...config, templateId: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}
