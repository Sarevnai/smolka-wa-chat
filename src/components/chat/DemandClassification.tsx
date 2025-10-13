import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight } from 'lucide-react';
import { Contact } from '@/types/contact';

interface DemandClassificationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phoneNumber: string;
  contact?: Contact | null;
  onCreateTicket: () => void;
}

export function DemandClassification({ 
  open, 
  onOpenChange, 
  phoneNumber, 
  contact,
  onCreateTicket 
}: DemandClassificationProps) {
  const handleCreateTicket = () => {
    onCreateTicket();
  };

  const handleClose = (open: boolean) => {
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Criar Demanda
            <Badge variant="outline" className="ml-2">
              {phoneNumber}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Contact Info */}
          {contact && (
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">Informações do Contato</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Nome:</span> {contact.name || 'Não informado'}
                </div>
                <div>
                  <span className="font-medium">Tipo:</span> 
                  {contact.contact_type ? (
                    <Badge variant="secondary" className="ml-2">
                      {contact.contact_type === 'proprietario' ? 'Proprietário' : 'Inquilino'}
                    </Badge>
                  ) : 'Não definido'}
                </div>
              </div>
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            Prossiga para criar um ticket completo com todas as informações necessárias.
          </p>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => handleClose(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateTicket}
              className="flex-1"
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Criar Ticket
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
