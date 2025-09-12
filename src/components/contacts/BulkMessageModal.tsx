import React, { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Users, 
  MessageCircle, 
  Send, 
  X, 
  Search, 
  Check, 
  XCircle,
  AlertCircle,
  Clock,
  CheckCircle2
} from "lucide-react";
import { useContacts } from "@/hooks/useContacts";
import { useBulkMessage } from "@/hooks/useBulkMessage";
import { Contact } from "@/types/contact";
import { formatPhoneNumber } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface BulkMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MIGRATION_TEMPLATE = `🔄 *IMPORTANTE - Mudança de Número*

Olá! Este é nosso novo canal oficial de atendimento.

📞 *Novo número:* ${window.location.origin.includes('localhost') ? '[SEU_NOVO_NUMERO]' : '+55 11 9xxxx-xxxx'}
✅ Salve este contato
🚫 O número anterior será desativado em breve

Para garantir que você continue recebendo nossas comunicações importantes, confirme o recebimento desta mensagem.

Obrigado!
[NOME_DA_EMPRESA]`;

export function BulkMessageModal({ open, onOpenChange }: BulkMessageModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState(MIGRATION_TEMPLATE);
  const [statusFilter, setStatusFilter] = useState<'all' | 'ativo' | 'inativo'>('ativo');
  const [showProgress, setShowProgress] = useState(false);
  
  const { data: contacts, isLoading } = useContacts(searchTerm);
  const { sendBulkMessage, isLoading: isSending, progress, results } = useBulkMessage();
  const { toast } = useToast();

  // Filter contacts based on status
  const filteredContacts = contacts?.filter(contact => {
    if (statusFilter === 'all') return true;
    return contact.status === statusFilter;
  }) || [];

  const getInitials = (name?: string, phone?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    }
    if (phone) {
      return phone.slice(-2);
    }
    return '??';
  };

  const handleSelectAll = () => {
    if (selectedContacts.size === filteredContacts.length) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set(filteredContacts.map(c => c.id)));
    }
  };

  const handleContactToggle = (contactId: string) => {
    const newSelection = new Set(selectedContacts);
    if (newSelection.has(contactId)) {
      newSelection.delete(contactId);
    } else {
      newSelection.add(contactId);
    }
    setSelectedContacts(newSelection);
  };

  const handleSend = async () => {
    if (selectedContacts.size === 0) {
      toast({
        title: "Nenhum contato selecionado",
        description: "Selecione pelo menos um contato para enviar a mensagem.",
        variant: "destructive"
      });
      return;
    }

    if (!message.trim()) {
      toast({
        title: "Mensagem vazia",
        description: "Digite uma mensagem para enviar.",
        variant: "destructive"
      });
      return;
    }

    const contactsToSend = filteredContacts.filter(c => selectedContacts.has(c.id));
    setShowProgress(true);

    try {
      await sendBulkMessage({
        contacts: contactsToSend,
        message: message.trim()
      });
      
      toast({
        title: "Envio concluído",
        description: `Mensagens enviadas para ${results?.successful || 0} contatos.`,
      });
    } catch (error) {
      toast({
        title: "Erro no envio",
        description: "Ocorreu um erro durante o envio das mensagens.",
        variant: "destructive"
      });
    }
  };

  const handleReset = () => {
    setShowProgress(false);
    setSelectedContacts(new Set());
    setMessage(MIGRATION_TEMPLATE);
    setSearchTerm("");
  };

  const handleClose = () => {
    if (!isSending) {
      handleReset();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Envio em Massa de Mensagens
          </DialogTitle>
        </DialogHeader>

        {showProgress ? (
          // Progress View
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                {isSending ? (
                  <Clock className="h-8 w-8 text-primary animate-pulse" />
                ) : results?.successful === selectedContacts.size ? (
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                ) : (
                  <AlertCircle className="h-8 w-8 text-yellow-600" />
                )}
              </div>
              
              <div>
                <h3 className="text-lg font-semibold">
                  {isSending ? "Enviando mensagens..." : "Envio concluído"}
                </h3>
                <p className="text-muted-foreground">
                  {isSending 
                    ? `${progress?.sent || 0} de ${selectedContacts.size} mensagens enviadas`
                    : `${results?.successful || 0} mensagens enviadas com sucesso`
                  }
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progresso</span>
                <span>{Math.round(((progress?.sent || 0) / selectedContacts.size) * 100)}%</span>
              </div>
              <Progress 
                value={((progress?.sent || 0) / selectedContacts.size) * 100} 
                className="h-2"
              />
            </div>

            {results && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{results.successful}</div>
                  <div className="text-sm text-muted-foreground">Enviadas</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{results.failed}</div>
                  <div className="text-sm text-muted-foreground">Falharam</div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleReset} disabled={isSending}>
                Novo Envio
              </Button>
              <Button onClick={handleClose} disabled={isSending}>
                Fechar
              </Button>
            </div>
          </div>
        ) : (
          // Selection View
          <div className="space-y-6">
            {/* Search and Filters */}
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar contatos..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={statusFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('all')}
                >
                  Todos
                </Button>
                <Button
                  variant={statusFilter === 'ativo' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('ativo')}
                >
                  Ativos
                </Button>
                <Button
                  variant={statusFilter === 'inativo' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('inativo')}
                >
                  Inativos
                </Button>
              </div>
            </div>

            {/* Selection Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  className="flex items-center gap-2"
                >
                  <Check className="h-4 w-4" />
                  {selectedContacts.size === filteredContacts.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                </Button>
                <Badge variant="secondary">
                  {selectedContacts.size} de {filteredContacts.length} selecionados
                </Badge>
              </div>
              
              {selectedContacts.size > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedContacts(new Set())}
                  className="flex items-center gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  Limpar Seleção
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Contacts List */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Contatos ({filteredContacts.length})
                </h3>
                
                <ScrollArea className="h-64 border rounded-lg p-4">
                  {isLoading ? (
                    <div className="text-center text-muted-foreground">Carregando...</div>
                  ) : filteredContacts.length === 0 ? (
                    <div className="text-center text-muted-foreground">Nenhum contato encontrado</div>
                  ) : (
                    <div className="space-y-3">
                      {filteredContacts.map((contact) => (
                        <div key={contact.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50">
                          <Checkbox
                            checked={selectedContacts.has(contact.id)}
                            onCheckedChange={() => handleContactToggle(contact.id)}
                          />
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {getInitials(contact.name, contact.phone)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">
                              {contact.name || formatPhoneNumber(contact.phone)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatPhoneNumber(contact.phone)}
                            </div>
                          </div>
                          <Badge 
                            variant={contact.status === 'ativo' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {contact.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>

              {/* Message Composition */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Mensagem
                </h3>
                
                <Textarea
                  placeholder="Digite sua mensagem..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={8}
                  className="resize-none"
                />
                
                <div className="text-xs text-muted-foreground">
                  {message.length} caracteres
                </div>

                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-sm font-medium mb-2">💡 Dica</div>
                  <div className="text-xs text-muted-foreground">
                    As mensagens serão enviadas com um intervalo de 2 segundos entre cada envio 
                    para respeitar os limites da API do WhatsApp.
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Action Buttons */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSend}
                disabled={selectedContacts.size === 0 || !message.trim()}
                className="flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                Enviar para {selectedContacts.size} contatos
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}