import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Phone, Mail, FileText } from 'lucide-react';
import { useCreateContact } from '@/hooks/useContacts';
import { CreateContactRequest } from '@/types/contact';
import { toast } from '@/hooks/use-toast';

interface NewContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ContractForm {
  contract_number: string;
  contract_type: string;
  property_code: string;
}

export function NewContactModal({ open, onOpenChange }: NewContactModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [contracts, setContracts] = useState<ContractForm[]>([]);
  const [newContract, setNewContract] = useState<ContractForm>({
    contract_number: '',
    contract_type: '',
    property_code: ''
  });

  const createContact = useCreateContact();

  const handleAddContract = () => {
    if (newContract.contract_number.trim()) {
      setContracts([...contracts, { ...newContract }]);
      setNewContract({ contract_number: '', contract_type: '', property_code: '' });
    }
  };

  const handleRemoveContract = (index: number) => {
    setContracts(contracts.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phone.trim()) {
      toast({
        title: "Erro",
        description: "Telefone é obrigatório",
        variant: "destructive"
      });
      return;
    }

    const request: CreateContactRequest = {
      name: name.trim() || undefined,
      phone: phone.trim(),
      email: email.trim() || undefined,
      contracts: contracts.length > 0 ? contracts : undefined
    };

    try {
      await createContact.mutateAsync(request);
      
      toast({
        title: "Sucesso",
        description: "Contato criado com sucesso"
      });
      
      // Reset form
      setName('');
      setPhone('');
      setEmail('');
      setContracts([]);
      setNewContract({ contract_number: '', contract_type: '', property_code: '' });
      
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao criar contato. Verifique se o telefone já não está cadastrado.",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Contato</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do contato (opcional)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone *</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+55 11 99999-9999"
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Contratos</Label>
            
            {/* Existing contracts */}
            {contracts.length > 0 && (
              <div className="space-y-2">
                {contracts.map((contract, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-md">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 text-sm font-medium">
                      {contract.contract_number}
                    </span>
                    {contract.contract_type && (
                      <Badge variant="secondary" className="text-xs">
                        {contract.contract_type}
                      </Badge>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveContract(index)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new contract */}
            <div className="space-y-2 p-3 border rounded-md">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="CT 123"
                  value={newContract.contract_number}
                  onChange={(e) => setNewContract({ ...newContract, contract_number: e.target.value })}
                />
                <Input
                  placeholder="Tipo (opcional)"
                  value={newContract.contract_type}
                  onChange={(e) => setNewContract({ ...newContract, contract_type: e.target.value })}
                />
              </div>
              <Input
                placeholder="Código do imóvel (opcional)"
                value={newContract.property_code}
                onChange={(e) => setNewContract({ ...newContract, property_code: e.target.value })}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddContract}
                disabled={!newContract.contract_number.trim()}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Contrato
              </Button>
            </div>
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
              disabled={createContact.isPending}
              className="flex-1"
            >
              {createContact.isPending ? 'Criando...' : 'Criar Contato'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
