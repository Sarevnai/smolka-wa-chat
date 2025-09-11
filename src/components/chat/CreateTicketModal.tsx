import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Phone, Building2, User, Calendar, AlertTriangle } from 'lucide-react';
import { CATEGORIES, PRIORITY_CONFIG } from '@/types/crm';
import { stages } from '@/data/mockTickets';
import { Contact } from '@/types/contact';
import { MessageRow } from '@/lib/messages';
import { useToast } from '@/hooks/use-toast';

interface CreateTicketModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phoneNumber: string;
  contact?: Contact | null;
  messages: MessageRow[];
}

export function CreateTicketModal({ 
  open, 
  onOpenChange, 
  phoneNumber, 
  contact,
  messages 
}: CreateTicketModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedType, setSelectedType] = useState<'proprietario' | 'inquilino'>(
    contact?.contact_type || 'inquilino'
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<'baixa' | 'media' | 'alta' | 'critica'>('media');
  const [selectedStage, setSelectedStage] = useState<string>('recebido');
  const [assignedTo, setAssignedTo] = useState('');
  const [propertyCode, setPropertyCode] = useState('');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [propertyType, setPropertyType] = useState<'apartamento' | 'casa' | 'comercial' | 'terreno'>('apartamento');
  const [ticketValue, setTicketValue] = useState<string>('');
  const [includeMessages, setIncludeMessages] = useState(true);

  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !description.trim() || !selectedCategory) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    // Generate ticket ID
    const ticketId = `${selectedType === 'proprietario' ? 'P' : 'I'}${Date.now().toString().slice(-3)}`;
    
    // Prepare ticket data
    const ticketData = {
      id: ticketId,
      title: title.trim(),
      description: description.trim(),
      phone: phoneNumber,
      email: contact?.email,
      stage: selectedStage,
      category: selectedCategory,
      priority: selectedPriority,
      property: {
        code: propertyCode || `${selectedType.toUpperCase()}${Date.now().toString().slice(-3)}`,
        address: propertyAddress || 'Endereço não informado',
        type: propertyType
      },
      assignedTo: assignedTo || undefined,
      lastContact: new Date().toISOString(),
      source: "WhatsApp",
      type: selectedType,
      createdAt: new Date().toISOString(),
      value: ticketValue ? parseFloat(ticketValue) : undefined
    };

    // Include recent messages if selected
    if (includeMessages && messages.length > 0) {
      const recentMessages = messages.slice(-5); // Last 5 messages
      const messagesText = recentMessages.map(msg => 
        `[${new Date(msg.wa_timestamp!).toLocaleString()}] ${msg.direction === 'inbound' ? 'Cliente' : 'Atendente'}: ${msg.body}`
      ).join('\n');
      
      ticketData.description += `\n\n--- Mensagens Recentes ---\n${messagesText}`;
    }

    try {
      // Here you would normally save to database
      // For now, we'll just show success message
      console.log('Ticket criado:', ticketData);
      
      toast({
        title: "Ticket criado com sucesso!",
        description: `Ticket ${ticketId} foi criado e será gerenciado no CRM.`,
      });
      
      // Reset form
      setTitle('');
      setDescription('');
      setSelectedCategory('');
      setAssignedTo('');
      setPropertyCode('');
      setPropertyAddress('');
      setTicketValue('');
      
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Erro ao criar ticket",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive"
      });
    }
  };

  const recentMessages = messages.slice(-3);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Criar Ticket/Demanda
            <Badge variant="outline" className="ml-2">
              {phoneNumber}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Contact & Messages Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Contact Info */}
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <User className="h-4 w-4" />
                Informações do Contato
              </h3>
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">Nome:</span> {contact?.name || 'Não informado'}</div>
                <div><span className="font-medium">Telefone:</span> {phoneNumber}</div>
                <div><span className="font-medium">Email:</span> {contact?.email || 'Não informado'}</div>
                <div><span className="font-medium">Tipo:</span> {contact?.contact_type || 'Não definido'}</div>
              </div>
            </div>

            {/* Recent Messages */}
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Mensagens Recentes
              </h3>
              <ScrollArea className="h-32">
                <div className="space-y-2">
                  {recentMessages.map((message, index) => (
                    <div key={index} className="text-xs p-2 bg-background rounded">
                      <div className="font-medium text-muted-foreground">
                        {message.direction === 'inbound' ? 'Cliente' : 'Atendente'} - {' '}
                        {new Date(message.wa_timestamp!).toLocaleString()}
                      </div>
                      <div className="mt-1">{message.body}</div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>

          <Separator />

          {/* Ticket Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título do Ticket *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Vazamento na cozinha - Apto 302"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tipo de Demanda *</Label>
              <Select value={selectedType} onValueChange={(value: 'proprietario' | 'inquilino') => setSelectedType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="proprietario">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Proprietário
                    </div>
                  </SelectItem>
                  <SelectItem value="inquilino">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Inquilino
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoria *</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES[selectedType].map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Prioridade *</Label>
              <Select value={selectedPriority} onValueChange={(value: 'baixa' | 'media' | 'alta' | 'critica') => setSelectedPriority(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        {key === 'critica' && <AlertTriangle className="h-4 w-4 text-red-500" />}
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stage">Estágio Inicial</Label>
              <Select value={selectedStage} onValueChange={setSelectedStage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stages[selectedType].map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assigned">Responsável</Label>
              <Input
                id="assigned"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                placeholder="Nome do responsável"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição da Demanda *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva detalhadamente a demanda do cliente..."
              rows={4}
              required
            />
          </div>

          {/* Property Info */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold">Informações do Imóvel</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="property-code">Código do Imóvel</Label>
                <Input
                  id="property-code"
                  value={propertyCode}
                  onChange={(e) => setPropertyCode(e.target.value)}
                  placeholder="Ex: ED001-302"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="property-type">Tipo do Imóvel</Label>
                <Select value={propertyType} onValueChange={(value: 'apartamento' | 'casa' | 'comercial' | 'terreno') => setPropertyType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apartamento">Apartamento</SelectItem>
                    <SelectItem value="casa">Casa</SelectItem>
                    <SelectItem value="comercial">Comercial</SelectItem>
                    <SelectItem value="terreno">Terreno</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="property-address">Endereço do Imóvel</Label>
                <Input
                  id="property-address"
                  value={propertyAddress}
                  onChange={(e) => setPropertyAddress(e.target.value)}
                  placeholder="Ex: Rua das Flores, 123 - Apto 302"
                />
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
            <div className="space-y-2">
              <Label htmlFor="value">Valor Envolvido (R$)</Label>
              <Input
                id="value"
                type="number"
                step="0.01"
                value={ticketValue}
                onChange={(e) => setTicketValue(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="flex items-center space-x-2 pt-6">
              <input
                type="checkbox"
                id="include-messages"
                checked={includeMessages}
                onChange={(e) => setIncludeMessages(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="include-messages" className="text-sm">
                Incluir mensagens recentes na descrição
              </Label>
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
              className="flex-1"
            >
              <FileText className="h-4 w-4 mr-2" />
              Criar Ticket
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}