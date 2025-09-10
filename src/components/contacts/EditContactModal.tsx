import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X, Phone, Mail, FileText, Edit } from 'lucide-react';
import { useUpdateContact, useAddContract } from '@/hooks/useContacts';
import { Contact } from '@/types/contact';
import { toast } from '@/hooks/use-toast';

interface EditContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact;
}

interface ContractForm {
  contract_number: string;
  contract_type: string;
  property_code: string;
}

export function EditContactModal({ open, onOpenChange, contact }: EditContactModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'ativo' | 'inativo' | 'bloqueado'>('ativo');
  const [newContract, setNewContract] = useState<ContractForm>({
    contract_number: '',
    contract_type: '',
    property_code: ''
  });

  const updateContact = useUpdateContact();
  const addContract = useAddContract();

  // Initialize form with contact data
  useEffect(() => {
    if (contact) {
      setName(contact.name || '');
      setPhone(contact.phone || '');
      setEmail(contact.email || '');
      setStatus(contact.status);
    }
  }, [contact]);

  const handleAddContract = async () => {
    if (!newContract.contract_number.trim()) return;

    try {
      await addContract.mutateAsync({
        contactId: contact.id,
        contract: {
          contract_number: newContract.contract_number,
          contract_type: newContract.contract_type || undefined,
          property_code: newContract.property_code || undefined,
          status: 'ativo'
        }
      });

      toast({
        title: "Sucesso",
        description: "Contrato adicionado com sucesso"
      });

      setNewContract({ contract_number: '', contract_type: '', property_code: '' });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao adicionar contrato",
        variant: "destructive"
      });
    }
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

    try {
      await updateContact.mutateAsync({
        contactId: contact.id,
        updates: {
          name: name.trim() || null,
          phone: phone.trim(),
          email: email.trim() || null,
          status
        }
      });
      
      toast({
        title: "Sucesso",
        description: "Contato atualizado com sucesso"
      });
      
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar contato",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Editar Contato
          </DialogTitle>
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

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(value: any) => setStatus(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
                <SelectItem value="bloqueado">Bloqueado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Existing contracts */}
          {contact.contracts && contact.contracts.length > 0 && (
            <div className="space-y-2">
              <Label>Contratos Existentes</Label>
              <div className="space-y-2">
                {contact.contracts.map((contract) => (
                  <div key={contract.id} className="flex items-center gap-2 p-2 bg-muted rounded-md">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 text-sm font-medium">
                      {contract.contract_number}
                    </span>
                    {contract.contract_type && (
                      <Badge variant="secondary" className="text-xs">
                        {contract.contract_type}
                      </Badge>
                    )}
                    <Badge 
                      variant={contract.status === 'ativo' ? 'default' : 'secondary'} 
                      className="text-xs"
                    >
                      {contract.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add new contract */}
          <div className="space-y-2">
            <Label>Adicionar Novo Contrato</Label>
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
                disabled={!newContract.contract_number.trim() || addContract.isPending}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                {addContract.isPending ? 'Adicionando...' : 'Adicionar Contrato'}
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
              disabled={updateContact.isPending}
              className="flex-1"
            >
              {updateContact.isPending ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
