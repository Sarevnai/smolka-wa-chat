import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AppFunction, FUNCTION_LABELS } from '@/types/functions';
import { Loader2, UserPlus, Eye, EyeOff } from 'lucide-react';

interface CreateUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateUser: (data: {
    email: string;
    full_name: string;
    password: string;
    function?: AppFunction;
    department_code?: string;
  }) => Promise<void>;
  isLoading?: boolean;
}

export function CreateUserModal({
  open,
  onOpenChange,
  onCreateUser,
  isLoading = false,
}: CreateUserModalProps) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [userFunction, setUserFunction] = useState<AppFunction | 'none'>('none');
  const [departmentCode, setDepartmentCode] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);

  const resetForm = () => {
    setEmail('');
    setFullName('');
    setPassword('');
    setUserFunction('none');
    setDepartmentCode('');
    setShowPassword(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await onCreateUser({
      email,
      full_name: fullName,
      password,
      function: userFunction === 'none' ? undefined : userFunction,
      department_code: userFunction === 'attendant' ? departmentCode : undefined,
    });
    
    resetForm();
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  const isFormValid = email && fullName && password.length >= 6;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Criar Novo Usuário
          </DialogTitle>
          <DialogDescription>
            Preencha os dados abaixo para criar um novo usuário no sistema.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Nome Completo *</Label>
            <Input
              id="fullName"
              placeholder="João da Silva"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="joao@smolka.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha *</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
                minLength={6}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            {password && password.length < 6 && (
              <p className="text-xs text-destructive">
                A senha deve ter pelo menos 6 caracteres
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="function">Função</Label>
            <Select
              value={userFunction}
              onValueChange={(v) => setUserFunction(v as AppFunction | 'none')}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a função" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem Função (acesso básico)</SelectItem>
                <SelectItem value="admin">{FUNCTION_LABELS.admin}</SelectItem>
                <SelectItem value="manager">{FUNCTION_LABELS.manager}</SelectItem>
                <SelectItem value="attendant">{FUNCTION_LABELS.attendant}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {userFunction === 'attendant' && (
            <div className="space-y-2">
              <Label htmlFor="department">Departamento</Label>
              <Select
                value={departmentCode}
                onValueChange={setDepartmentCode}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o departamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="locacao">Locação</SelectItem>
                  <SelectItem value="vendas">Vendas</SelectItem>
                  <SelectItem value="administrativo">Administrativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!isFormValid || isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Criar Usuário
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
