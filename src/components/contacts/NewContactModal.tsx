import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, X, Phone, Mail, FileText, Heart, Home, ShoppingBag, Building2 } from 'lucide-react';
import { useCreateContact } from '@/hooks/useContacts';
import { CreateContactRequest, ContactType, DepartmentCode } from '@/types/contact';
import { toast } from '@/hooks/use-toast';
import { normalizePhoneNumber, isValidPhoneNumber } from '@/lib/validation';
import { usePermissions } from '@/hooks/usePermissions';
import { useDepartment } from '@/contexts/DepartmentContext';
import { getContactTypesForDepartment } from '@/lib/departmentConfig';

interface NewContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPhone?: string;
}

interface ContractForm {
  contract_number: string;
  contract_type: string;
  property_code: string;
}

export function NewContactModal({ open, onOpenChange, initialPhone }: NewContactModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState(initialPhone || '');
  const [email, setEmail] = useState('');
  const [contactType, setContactType] = useState<ContactType | undefined>(undefined);
  const [description, setDescription] = useState('');
  const [rating, setRating] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [departmentCode, setDepartmentCode] = useState<DepartmentCode | undefined>(undefined);
  const [contracts, setContracts] = useState<ContractForm[]>([]);
  const [newContract, setNewContract] = useState<ContractForm>({
    contract_number: '',
    contract_type: '',
    property_code: ''
  });

  const createContact = useCreateContact();
  const { isAdmin } = usePermissions();
  const { userDepartment } = useDepartment();

  // Set default department for non-admins
  useEffect(() => {
    if (!isAdmin && userDepartment && !departmentCode) {
      setDepartmentCode(userDepartment);
    }
  }, [isAdmin, userDepartment, departmentCode]);

  // Update phone when initialPhone changes
  useEffect(() => {
    if (initialPhone) {
      setPhone(initialPhone);
    }
  }, [initialPhone]);

  const handleAddContract = () => {
    const contractNumber = newContract.contract_number.trim();
    
    if (!contractNumber) {
      return;
    }
    
    // Check for duplicate contract numbers
    if (contracts.some(c => c.contract_number === contractNumber)) {
      toast({
        title: "Contrato duplicado",
        description: "Este número de contrato já foi adicionado",
        variant: "destructive"
      });
      return;
    }
    
    setContracts([...contracts, { ...newContract }]);
    setNewContract({ contract_number: '', contract_type: '', property_code: '' });
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

    // Validate email if provided
    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        toast({
          title: "Erro",
          description: "Formato de email inválido",
          variant: "destructive"
        });
        return;
      }
    }

    const request: CreateContactRequest = {
      name: name.trim() || undefined,
      phone: normalizedPhone,
      email: email.trim() || undefined,
      contact_type: contactType,
      description: description.trim() || undefined,
      rating: rating,
      notes: notes.trim() || undefined,
      contracts: contracts.length > 0 ? contracts : undefined,
      department_code: departmentCode
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
      setContactType(undefined);
      setDescription('');
      setRating(undefined);
      setNotes('');
      setDepartmentCode(isAdmin ? undefined : userDepartment);
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Contato</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <Label htmlFor="contact-type">Tipo de Contato</Label>
              {(() => {
                const effectiveDept = departmentCode || userDepartment;
                const deptConfig = getContactTypesForDepartment(effectiveDept);
                return (
                  <Select 
                    value={contactType || ''} 
                    onValueChange={(value: ContactType) => setContactType(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo (opcional)" />
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

            {/* Department Selector */}
            <div className="space-y-2">
              <Label htmlFor="department">Setor *</Label>
              <Select 
                value={departmentCode || ''} 
                onValueChange={(value: 'locacao' | 'administrativo' | 'vendas') => setDepartmentCode(value)}
                disabled={!isAdmin}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o setor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="locacao">
                    <div className="flex items-center gap-2">
                      <Home className="h-4 w-4" />
                      Locação
                    </div>
                  </SelectItem>
                  <SelectItem value="vendas">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4" />
                      Vendas
                    </div>
                  </SelectItem>
                  <SelectItem value="administrativo">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Administrativo
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {!isAdmin && (
                <p className="text-xs text-muted-foreground">
                  Contato será criado no setor {userDepartment === 'locacao' ? 'Locação' : userDepartment === 'vendas' ? 'Vendas' : 'Administrativo'}
                </p>
              )}
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

          {/* Contratos */}
          <div className="space-y-3 border-t pt-4">
            <Label className="text-base font-semibold">Contratos</Label>
            
            {/* Existing contracts */}
            {contracts.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
                disabled={!newContract.contract_number.trim()}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Contrato
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
