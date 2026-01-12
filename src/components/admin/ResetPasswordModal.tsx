import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, EyeOff, RefreshCw, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ResetPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  onConfirm: (newPassword: string) => Promise<void>;
}

export function ResetPasswordModal({
  open,
  onOpenChange,
  userName,
  onConfirm,
}: ResetPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copyToClipboard, setCopyToClipboard] = useState(true);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(result);
    setShowPassword(true);
  };

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: 'Erro ao copiar',
        description: 'Não foi possível copiar a senha para a área de transferência.',
        variant: 'destructive',
      });
    }
  };

  const handleConfirm = async () => {
    if (password.length < 6) {
      toast({
        title: 'Senha muito curta',
        description: 'A senha deve ter no mínimo 6 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      if (copyToClipboard) {
        await navigator.clipboard.writeText(password);
      }
      await onConfirm(password);
      onOpenChange(false);
      setPassword('');
      setShowPassword(false);
    } catch (error) {
      // Error handled by parent
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setPassword('');
    setShowPassword(false);
    setCopied(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Redefinir Senha</DialogTitle>
          <DialogDescription>
            Defina uma nova senha para <strong>{userName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">Nova Senha</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="pr-20"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  {password && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={handleCopyPassword}
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={generateRandomPassword}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Gerar Senha Aleatória
          </Button>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="copy-clipboard"
              checked={copyToClipboard}
              onCheckedChange={(checked) => setCopyToClipboard(checked as boolean)}
            />
            <Label htmlFor="copy-clipboard" className="text-sm font-normal cursor-pointer">
              Copiar senha para a área de transferência ao confirmar
            </Label>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!password || loading}>
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Redefinindo...
              </>
            ) : (
              'Redefinir Senha'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
