import { AlertTriangle, Phone } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function NoDepartmentContent() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center">
          <AlertTriangle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Setor Não Definido</h2>
          <p className="text-muted-foreground mb-6">
            Seu usuário ainda não foi associado a um setor. 
            Entre em contato com o administrador para configurar seu acesso.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-4 w-4" />
            <span>Contate o suporte para assistência</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
