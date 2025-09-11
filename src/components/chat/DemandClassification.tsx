import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Building2, Key, AlertTriangle, CheckCircle, Clock, ArrowRight } from 'lucide-react';
import { CATEGORIES, PRIORITY_CONFIG } from '@/types/crm';
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
  const [selectedType, setSelectedType] = useState<'proprietario' | 'inquilino' | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<'baixa' | 'media' | 'alta' | 'critica' | null>(null);

  const handleCreateTicket = () => {
    onCreateTicket();
  };

  const resetSelection = () => {
    setSelectedType(null);
    setSelectedCategory(null);
    setSelectedPriority(null);
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      resetSelection();
    }
    onOpenChange(open);
  };

  const getTypeIcon = (type: 'proprietario' | 'inquilino') => {
    return type === 'proprietario' ? Building2 : Key;
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'baixa': return CheckCircle;
      case 'media': return Clock;
      case 'alta': return AlertTriangle;
      case 'critica': return AlertTriangle;
      default: return CheckCircle;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Classificar Demanda
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
                {contact.contracts && contact.contracts.length > 0 && (
                  <div className="col-span-2">
                    <span className="font-medium">Contratos:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {contact.contracts.map((contract, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {contract.contract_number}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 1: Tipo de Demanda */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">1. Tipo de Demanda</h3>
            <div className="grid grid-cols-2 gap-4">
              {(['proprietario', 'inquilino'] as const).map((type) => {
                const Icon = getTypeIcon(type);
                const isSelected = selectedType === type;
                const isFromContact = contact?.contact_type === type;
                
                return (
                  <Button
                    key={type}
                    variant={isSelected ? "default" : "outline"}
                    className={`h-20 flex flex-col gap-2 ${isFromContact ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                    onClick={() => setSelectedType(type)}
                  >
                    <Icon className="h-6 w-6" />
                    <span className="font-medium">
                      {type === 'proprietario' ? 'Proprietário' : 'Inquilino'}
                    </span>
                    {isFromContact && (
                      <Badge variant="secondary" className="text-xs">
                        Sugerido
                      </Badge>
                    )}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Categoria */}
          {selectedType && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">2. Categoria da Demanda</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {CATEGORIES[selectedType].map((category) => (
                    <Button
                      key={category.id}
                      variant={selectedCategory === category.id ? "default" : "outline"}
                      className="justify-start h-auto p-4"
                      onClick={() => setSelectedCategory(category.id)}
                    >
                      <div className="text-left">
                        <div className="font-medium">{category.name}</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Step 3: Prioridade */}
          {selectedCategory && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">3. Prioridade</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(Object.keys(PRIORITY_CONFIG) as Array<keyof typeof PRIORITY_CONFIG>).map((priority) => {
                    const config = PRIORITY_CONFIG[priority];
                    const Icon = getPriorityIcon(priority);
                    const isSelected = selectedPriority === priority;
                    
                    return (
                      <Button
                        key={priority}
                        variant={isSelected ? "default" : "outline"}
                        className="h-16 flex flex-col gap-1"
                        onClick={() => setSelectedPriority(priority)}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-sm font-medium">{config.label}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Summary */}
          {selectedType && selectedCategory && selectedPriority && (
            <>
              <Separator />
              <div className="p-4 bg-primary/5 rounded-lg">
                <h3 className="font-semibold mb-3">Resumo da Classificação</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Tipo:</span>
                    <Badge variant="secondary">
                      {selectedType === 'proprietario' ? 'Proprietário' : 'Inquilino'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Categoria:</span>
                    <Badge variant="outline">
                      {CATEGORIES[selectedType].find(c => c.id === selectedCategory)?.name}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Prioridade:</span>
                    <Badge variant="secondary">
                      {PRIORITY_CONFIG[selectedPriority].label}
                    </Badge>
                  </div>
                </div>
              </div>
            </>
          )}

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
              disabled={!selectedType || !selectedCategory || !selectedPriority}
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