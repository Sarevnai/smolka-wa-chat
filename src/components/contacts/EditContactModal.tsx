import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, X, Phone, Mail, FileText, Edit, Heart } from 'lucide-react';
import { useUpdateContact, useAddContract } from '@/hooks/useContacts';
import { Contact, ContactType } from '@/types/contact';
import { toast } from '@/hooks/use-toast';
import { AutoNameDetectionBadge } from './AutoNameDetectionBadge';
import { normalizePhoneNumber, isValidPhoneNumber } from '@/lib/validation';
import { useDepartment } from '@/contexts/DepartmentContext';
import { getContactTypesForDepartment } from '@/lib/departmentConfig';

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
  const [contactType, setContactType] = useState<ContactType | undefined>(undefined);
  const [description, setDescription] = useState('');
  const [rating, setRating] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [newContract, setNewContract] = useState<ContractForm>({
    contract_number: '',
    contract_type: '',
    property_code: ''
  });
  
  const { activeDepartment } = useDepartment();

  const updateContact = useUpdateContact();
  const addContract = useAddContract();

  // Initialize form with contact data
  useEffect(() => {
    if (contact) {
      setName(contact.name || '');
      setPhone(contact.phone || '');
      setEmail(contact.email || '');
      setStatus(contact.status);
      setContactType(contact.contact_type);
      setDescription(contact.description || '');
      setRating(contact.rating);
      setNotes(contact.notes || '');
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

    // Normalize and validate phone
    const normalizedPhone = normalizePhoneNumber(phone.trim());
    if (!isValidPhoneNumber(normalizedPhone)) {
      toast({
        title: "Erro",
        description: "Formato de telefone inválido. Use o formato: +55 11 99999-9999",
        variant: "destructive"
      });
      return;
    }

    try {
      await updateContact.mutateAsync({
        contactId: contact.id,
        updates: {
          name: name.trim() || null,
          phone: normalizedPhone,
          email: email.trim() || null,
          status,
          contact_type: contactType,
          description: description.trim() || null,
          rating: rating,
          notes: notes.trim() || null
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Editar Contato
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="name">Nome</Label>
                {contact.name && <AutoNameDetectionBadge name={contact.name} />}
              </div>
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
              <Label htmlFor="contact-type">Tipo de Contato</Label>
              {(() => {
                const effectiveDept = contact.department_code || activeDepartment;
                const deptConfig = getContactTypesForDepartment(effectiveDept || undefined);
                return (
                  <Select 
                    value={contactType || ''} 
                    onValueChange={(value: ContactType) => setContactType(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {deptConfig?.types.map((type) => {
                        const typeConfig = deptConfig.labels[type];
                        const TypeIcon = typeConfig.icon;
                        return (
                          <SelectItem key={type} value={type}>
                            <div className="flex items-center gap-2">
                              <TypeIcon className={`h-4 w-4 ${typeConfig.color}`} />
                              {typeConfig.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                );
              })()}
            </div>
          </div>

          {/* Descrição e Classificação */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição sobre o contato..."
                rows={3}
              />
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rating">Classificação</Label>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }, (_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setRating(rating === i + 1 ? undefined : i + 1)}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Heart
                        className={`h-5 w-5 ${
                          i < (rating || 0) ? 'fill-rose-500 text-rose-500' : 'text-muted-foreground hover:text-rose-300'
                        }`}
                      />
                    </button>
                  ))}
                  {rating && (
                    <button
                      type="button"
                      onClick={() => setRating(undefined)}
                      className="ml-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notas Internas</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas internas sobre o contato..."
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Contratos Existentes */}
          {contact.contracts && contact.contracts.length > 0 && (
            <div className="space-y-3 border-t pt-4">
              <Label className="text-base font-semibold">Contratos Existentes</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {contact.contracts.map((contract) => (
                  <div key={contract.id} className="flex items-center gap-2 p-3 bg-muted rounded-md">
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

          {/* Adicionar Novo Contrato */}
          <div className="space-y-3 border-t pt-4">
            <Label className="text-base font-semibold">Adicionar Novo Contrato</Label>
            <div className="space-y-2 p-4 border rounded-md bg-muted/20">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Input
                  placeholder="Número do Contrato"
                  value={newContract.contract_number}
                  onChange={(e) => setNewContract({ ...newContract, contract_number: e.target.value })}
                />
                <Input
                  placeholder="Tipo do Contrato (opcional)"
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

          <div className="flex gap-2 pt-4 border-t">
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
