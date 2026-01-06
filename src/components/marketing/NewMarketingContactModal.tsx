import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Phone, Mail, Heart, Building, MapPin, Home } from 'lucide-react';
import { useCreateContact, useUpdateContact } from '@/hooks/useContacts';
import { CreateContactRequest, ContactType } from '@/types/contact';
import { toast } from '@/hooks/use-toast';
import { normalizePhoneNumber, isValidPhoneNumber } from '@/lib/validation';
import { Tables } from '@/integrations/supabase/types';

type Contact = Tables<'contacts'>;

interface NewMarketingContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingContact?: Contact | null;
}

const PROPERTY_STATUS_OPTIONS = [
  { value: 'venda', label: 'Venda' },
  { value: 'aluguel', label: 'Aluguel' },
  { value: 'venda_aluguel', label: 'Venda e Aluguel' },
  { value: 'aluguel_temporada', label: 'Aluguel Temporada' },
  { value: 'vendido_imobiliaria', label: 'Vendido Imobiliária' },
  { value: 'vendido_terceiros', label: 'Vendido Terceiros' },
  { value: 'alugado_terceiros', label: 'Alugado Terceiros' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'suspenso', label: 'Suspenso' },
];

const CONTACT_TYPE_OPTIONS: { value: ContactType; label: string }[] = [
  { value: 'lead', label: 'Lead' },
  { value: 'prospect', label: 'Prospect' },
  { value: 'engajado', label: 'Engajado' },
  { value: 'campanha', label: 'Campanha' },
];

// Parse notes to extract property data
function parseNotesToPropertyData(notes: string | null): {
  propertyCode: string;
  propertyAddress: string;
  propertyNumber: string;
  propertyNeighborhood: string;
  propertyCity: string;
  propertyCep: string;
  propertyStatus: string;
  propertyValue: string;
} {
  const result = {
    propertyCode: '',
    propertyAddress: '',
    propertyNumber: '',
    propertyNeighborhood: '',
    propertyCity: '',
    propertyCep: '',
    propertyStatus: '',
    propertyValue: '',
  };

  if (!notes) return result;

  const parts = notes.split(' | ');

  for (const part of parts) {
    const trimmed = part.trim();

    if (trimmed.startsWith('Imóvel:')) {
      result.propertyCode = trimmed.replace('Imóvel:', '').trim();
    } else if (trimmed.startsWith('CEP:')) {
      result.propertyCep = trimmed.replace('CEP:', '').trim();
    } else if (trimmed.startsWith('Status:')) {
      const statusLabel = trimmed.replace('Status:', '').trim();
      const statusOption = PROPERTY_STATUS_OPTIONS.find(s => s.label === statusLabel);
      result.propertyStatus = statusOption?.value || '';
    } else if (trimmed.startsWith('Valor:')) {
      result.propertyValue = trimmed.replace('Valor:', '').replace('R$', '').trim();
    } else if (trimmed.includes(',') && !trimmed.includes(' - ')) {
      // Address format: "Rua X, 100"
      const [addr, num] = trimmed.split(',').map(s => s.trim());
      result.propertyAddress = addr;
      result.propertyNumber = num || '';
    } else if (trimmed.includes(' - ')) {
      // Location format: "Bairro - Cidade"
      const [neighborhood, city] = trimmed.split(' - ').map(s => s.trim());
      result.propertyNeighborhood = neighborhood;
      result.propertyCity = city || '';
    }
  }

  return result;
}

export function NewMarketingContactModal({ open, onOpenChange, editingContact }: NewMarketingContactModalProps) {
  const isEditing = !!editingContact;

  // Contact fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [contactType, setContactType] = useState<ContactType | undefined>(undefined);
  const [description, setDescription] = useState('');
  const [rating, setRating] = useState<number | undefined>(undefined);

  // Property fields
  const [propertyCode, setPropertyCode] = useState('');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [propertyNumber, setPropertyNumber] = useState('');
  const [propertyNeighborhood, setPropertyNeighborhood] = useState('');
  const [propertyCity, setPropertyCity] = useState('');
  const [propertyCep, setPropertyCep] = useState('');
  const [propertyStatus, setPropertyStatus] = useState('');
  const [propertyValue, setPropertyValue] = useState('');

  const createContact = useCreateContact();
  const updateContact = useUpdateContact();

  // Populate form when editing
  useEffect(() => {
    if (editingContact && open) {
      setName(editingContact.name || '');
      setPhone(editingContact.phone || '');
      setEmail(editingContact.email || '');
      setContactType(editingContact.contact_type as ContactType || undefined);
      setDescription(editingContact.description || '');
      setRating(editingContact.rating || undefined);

      // Parse property data from notes
      const propertyData = parseNotesToPropertyData(editingContact.notes);
      setPropertyCode(propertyData.propertyCode);
      setPropertyAddress(propertyData.propertyAddress);
      setPropertyNumber(propertyData.propertyNumber);
      setPropertyNeighborhood(propertyData.propertyNeighborhood);
      setPropertyCity(propertyData.propertyCity);
      setPropertyCep(propertyData.propertyCep);
      setPropertyStatus(propertyData.propertyStatus);
      setPropertyValue(propertyData.propertyValue);
    } else if (!open) {
      resetForm();
    }
  }, [editingContact, open]);

  const formatCurrency = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const amount = parseInt(numbers || '0', 10) / 100;
    return amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    if (rawValue) {
      setPropertyValue(formatCurrency(rawValue));
    } else {
      setPropertyValue('');
    }
  };

  const buildNotesFromProperty = (): string => {
    const parts: string[] = [];

    if (propertyCode) {
      parts.push(`Imóvel: ${propertyCode}`);
    }

    const addressParts: string[] = [];
    if (propertyAddress) {
      addressParts.push(propertyAddress);
      if (propertyNumber) {
        addressParts[0] += `, ${propertyNumber}`;
      }
    }
    if (addressParts.length > 0) {
      parts.push(addressParts.join(''));
    }

    if (propertyNeighborhood || propertyCity) {
      const location = [propertyNeighborhood, propertyCity].filter(Boolean).join(' - ');
      parts.push(location);
    }

    if (propertyCep) {
      parts.push(`CEP: ${propertyCep}`);
    }

    if (propertyStatus) {
      const statusLabel = PROPERTY_STATUS_OPTIONS.find(s => s.value === propertyStatus)?.label || propertyStatus;
      parts.push(`Status: ${statusLabel}`);
    }

    if (propertyValue) {
      parts.push(`Valor: R$ ${propertyValue}`);
    }

    return parts.join(' | ');
  };

  const resetForm = () => {
    setName('');
    setPhone('');
    setEmail('');
    setContactType(undefined);
    setDescription('');
    setRating(undefined);
    setPropertyCode('');
    setPropertyAddress('');
    setPropertyNumber('');
    setPropertyNeighborhood('');
    setPropertyCity('');
    setPropertyCep('');
    setPropertyStatus('');
    setPropertyValue('');
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

    const normalizedPhone = normalizePhoneNumber(phone.trim());
    if (!isValidPhoneNumber(normalizedPhone)) {
      toast({
        title: "Erro",
        description: "Formato de telefone inválido. Use o formato: +55 11 99999-9999",
        variant: "destructive"
      });
      return;
    }

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

    const notes = buildNotesFromProperty();

    try {
      if (isEditing && editingContact) {
        await updateContact.mutateAsync({
          contactId: editingContact.id,
          updates: {
            name: name.trim() || null,
            phone: normalizedPhone,
            email: email.trim() || null,
            contact_type: contactType || null,
            description: description.trim() || null,
            rating: rating || null,
            notes: notes || null,
          }
        });

        toast({
          title: "Sucesso",
          description: "Contato atualizado com sucesso"
        });
      } else {
        const request: CreateContactRequest = {
          name: name.trim() || undefined,
          phone: normalizedPhone,
          email: email.trim() || undefined,
          contact_type: contactType,
          description: description.trim() || undefined,
          rating: rating,
          notes: notes || undefined,
          department_code: 'marketing'
        };

        await createContact.mutateAsync(request);

        toast({
          title: "Sucesso",
          description: "Contato criado com sucesso"
        });
      }

      resetForm();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Erro",
        description: isEditing 
          ? "Erro ao atualizar contato." 
          : "Erro ao criar contato. Verifique se o telefone já não está cadastrado.",
        variant: "destructive"
      });
    }
  };

  const isPending = createContact.isPending || updateContact.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5 text-pink-500" />
            {isEditing ? 'Editar Contato de Marketing' : 'Novo Contato de Marketing'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dados do Proprietário */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Dados do Proprietário
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome do proprietário"
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
                    disabled={isEditing}
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
                <Select
                  value={contactType || ''}
                  onValueChange={(value: ContactType) => setContactType(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTACT_TYPE_OPTIONS.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Dados do Imóvel */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Home className="h-4 w-4" />
              Dados do Imóvel
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="property-code">Código do Imóvel</Label>
                <Input
                  id="property-code"
                  value={propertyCode}
                  onChange={(e) => setPropertyCode(e.target.value)}
                  placeholder="Ex: 12345"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="property-status">Status do Imóvel</Label>
                <Select
                  value={propertyStatus}
                  onValueChange={setPropertyStatus}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTY_STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="property-address">Endereço</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="property-address"
                      value={propertyAddress}
                      onChange={(e) => setPropertyAddress(e.target.value)}
                      placeholder="Rua, Avenida..."
                      className="pl-10"
                    />
                  </div>
                  <Input
                    value={propertyNumber}
                    onChange={(e) => setPropertyNumber(e.target.value)}
                    placeholder="Nº"
                    className="w-24"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="property-neighborhood">Bairro</Label>
                <Input
                  id="property-neighborhood"
                  value={propertyNeighborhood}
                  onChange={(e) => setPropertyNeighborhood(e.target.value)}
                  placeholder="Bairro"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="property-city">Cidade</Label>
                <Input
                  id="property-city"
                  value={propertyCity}
                  onChange={(e) => setPropertyCity(e.target.value)}
                  placeholder="Cidade"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="property-cep">CEP</Label>
                <Input
                  id="property-cep"
                  value={propertyCep}
                  onChange={(e) => setPropertyCep(e.target.value)}
                  placeholder="00000-000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="property-value">Valor</Label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-sm text-muted-foreground">R$</span>
                  <Input
                    id="property-value"
                    value={propertyValue}
                    onChange={handleValueChange}
                    placeholder="0,00"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Informações Adicionais */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Informações Adicionais
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Informações sobre o contato ou imóvel..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Classificação</Label>
                <div className="flex items-center gap-1 pt-2">
                  {Array.from({ length: 5 }, (_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setRating(rating === i + 1 ? undefined : i + 1)}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Heart
                        className={`h-6 w-6 ${
                          i < (rating || 0) ? 'fill-pink-500 text-pink-500' : 'text-muted-foreground hover:text-pink-300'
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
            </div>
          </div>

          {/* Actions */}
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
              disabled={isPending}
              className="flex-1 bg-pink-500 hover:bg-pink-600"
            >
              {isPending 
                ? (isEditing ? 'Salvando...' : 'Criando...') 
                : (isEditing ? 'Salvar Alterações' : 'Criar Contato')
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
