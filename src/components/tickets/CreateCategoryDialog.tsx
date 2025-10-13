import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateCategory } from '@/hooks/useTicketCategories';

interface CreateCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const COLOR_OPTIONS = [
  { value: 'bg-blue-100 text-blue-700', label: 'Azul' },
  { value: 'bg-green-100 text-green-700', label: 'Verde' },
  { value: 'bg-red-100 text-red-700', label: 'Vermelho' },
  { value: 'bg-yellow-100 text-yellow-700', label: 'Amarelo' },
  { value: 'bg-purple-100 text-purple-700', label: 'Roxo' },
  { value: 'bg-orange-100 text-orange-700', label: 'Laranja' },
  { value: 'bg-indigo-100 text-indigo-700', label: 'Índigo' },
  { value: 'bg-gray-100 text-gray-700', label: 'Cinza' }
];

export function CreateCategoryDialog({ open, onOpenChange }: CreateCategoryDialogProps) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [color, setColor] = useState(COLOR_OPTIONS[0].value);
  
  const createMutation = useCreateCategory();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createMutation.mutateAsync({
      name,
      icon,
      color,
      is_active: true
    });
    
    setName('');
    setIcon('');
    setColor(COLOR_OPTIONS[0].value);
    onOpenChange(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Categoria</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Categoria</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Suporte Técnico"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="icon">Emoji/Ícone</Label>
            <Input
              id="icon"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="Ex: 🔧"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="color">Cor</Label>
            <Select value={color} onValueChange={setColor}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COLOR_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span className={`px-2 py-1 rounded ${opt.value}`}>
                      {opt.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Criando..." : "Criar Categoria"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
