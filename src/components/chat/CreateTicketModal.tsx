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
import { FileText, Phone, User, AlertTriangle, Plus } from 'lucide-react';
import { PRIORITY_CONFIG } from '@/types/crm';
import { Contact } from '@/types/contact';
import { MessageRow } from '@/lib/messages';
import { useToast } from '@/hooks/use-toast';
import { useCreateTicket, useTicketStages } from '@/hooks/useTickets';
import { useTicketCategories } from '@/hooks/useTicketCategories';
import { CreateCategoryDialog } from '@/components/tickets/CreateCategoryDialog';
import { usePermissions } from '@/hooks/usePermissions';
import { useUserProfiles } from '@/hooks/useUserProfiles';

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
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<'baixa' | 'media' | 'alta' | 'critica'>('media');
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [assignedTo, setAssignedTo] = useState('');
  const [includeMessages, setIncludeMessages] = useState(true);
  const [showCreateCategory, setShowCreateCategory] = useState(false);

  const { toast } = useToast();
  const createTicketMutation = useCreateTicket();
  const { data: ticketStages } = useTicketStages();
  const { data: categories } = useTicketCategories();
  const { canManageCategories } = usePermissions();
  const { profiles } = useUserProfiles();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !description.trim() || !selectedCategory || !selectedStage) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    // Prepare description with messages if selected
    let finalDescription = description.trim();
    if (includeMessages && messages.length > 0) {
      const recentMessages = messages.slice(-5); // Last 5 messages
      const messagesText = recentMessages.map(msg => 
        `[${new Date(msg.wa_timestamp!).toLocaleString()}] ${msg.direction === 'inbound' ? 'Cliente' : 'Atendente'}: ${msg.body}`
      ).join('\n');
      
      finalDescription += `\n\n--- Mensagens Recentes ---\n${messagesText}`;
    }
    
    // Find category name for ClickUp integration
    const selectedCategoryData = categories?.find(c => c.id === selectedCategory);
    const categoryName = selectedCategoryData ? `${selectedCategoryData.icon} ${selectedCategoryData.name}` : selectedCategory;
    
    // Prepare ticket data
    const ticketData = {
      title: title.trim(),
      description: finalDescription,
      phone: phoneNumber,
      email: contact?.email || undefined,
      stage: selectedStage,
      category: categoryName,
      priority: selectedPriority,
      assigned_to: assignedTo || undefined,
      source: "WhatsApp",
      contact_type: contact?.contact_type || undefined,
      contact_id: contact?.id
    };

    try {
      await createTicketMutation.mutateAsync(ticketData);
      
      // Reset form
      setTitle('');
      setDescription('');
      setSelectedCategory('');
      setSelectedStage('');
      setAssignedTo('');
      
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao criar ticket:', error);
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
              <Label htmlFor="category">Categoria *</Label>
              <div className="flex gap-2">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {(categories || []).map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.icon} {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {canManageCategories && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowCreateCategory(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>
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
                  {(ticketStages || []).map((stage) => (
                    <SelectItem key={stage.id} value={stage.name}>
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assigned">Responsável</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Não atribuído</SelectItem>
                  {(profiles || []).map((profile) => (
                    <SelectItem key={profile.user_id} value={profile.user_id}>
                      {profile.full_name || 'Sem nome'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

          {/* Additional Options */}
          <div className="flex items-center space-x-2 pt-4 border-t">
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
              disabled={createTicketMutation.isPending}
            >
              <FileText className="h-4 w-4 mr-2" />
              {createTicketMutation.isPending ? "Criando..." : "Criar Ticket"}
            </Button>
          </div>
        </form>

        <CreateCategoryDialog 
          open={showCreateCategory}
          onOpenChange={setShowCreateCategory}
        />
      </DialogContent>
    </Dialog>
  );
}