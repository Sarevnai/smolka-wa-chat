import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useContactByPhone, useUpdateContact, useDeleteContact } from "@/hooks/useContacts";
import { DeleteContactDialog } from "@/components/contacts/DeleteContactDialog";
import { EditContactModal } from "@/components/contacts/EditContactModal";
import { useToast } from "@/hooks/use-toast";
import { 
  User, 
  Phone, 
  Mail, 
  FileText, 
  Star,
  Edit,
  Trash2,
  MessageSquare,
  Calendar,
  Building2,
  Key
} from "lucide-react";

interface ContactProfileProps {
  phoneNumber: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContactProfile({ phoneNumber, open, onOpenChange }: ContactProfileProps) {
  const { data: contact, isLoading } = useContactByPhone(phoneNumber);
  const updateContact = useUpdateContact();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [notes, setNotes] = useState(contact?.notes || "");
  const { toast } = useToast();

  const getInitials = (name?: string, phone?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    }
    if (phone) {
      return phone.slice(-2);
    }
    return '??';
  };

  const getContactTypeInfo = (type?: string) => {
    switch (type) {
      case 'proprietario':
        return { label: 'Proprietário', icon: Building2, variant: 'default' as const };
      case 'inquilino':
        return { label: 'Inquilino', icon: Key, variant: 'secondary' as const };
      default:
        return { label: 'Não definido', icon: User, variant: 'outline' as const };
    }
  };

  const renderStars = (rating?: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < (rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
        }`}
      />
    ));
  };

  const handleUpdateNotes = async () => {
    if (!contact) return;
    
    try {
      await updateContact.mutateAsync({
        contactId: contact.id,
        updates: { notes }
      });
      toast({
        title: "Notas atualizadas",
        description: "As notas do contato foram salvas com sucesso."
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar as notas.",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!contact) {
    return null;
  }

  const typeInfo = getContactTypeInfo(contact.contact_type);
  const TypeIcon = typeInfo.icon;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-primary/10 text-primary font-medium text-lg">
                    {getInitials(contact.name, contact.phone)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <DialogTitle className="text-2xl">
                    {contact.name || contact.phone}
                  </DialogTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={typeInfo.variant} className="flex items-center gap-1">
                      <TypeIcon className="h-3 w-3" />
                      {typeInfo.label}
                    </Badge>
                    {contact.rating && (
                      <div className="flex items-center gap-1">
                        {renderStars(contact.rating)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEditModal(true)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Informações Básicas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Informações Básicas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{contact.phone}</span>
                </div>
                {contact.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{contact.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Cadastrado em {new Date(contact.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                {contact.totalMessages && (
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{contact.totalMessages} mensagens</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contratos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Contratos ({contact.contracts?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {contact.contracts && contact.contracts.length > 0 ? (
                  <div className="space-y-2">
                    {contact.contracts.map((contract) => (
                      <div key={contract.id} className="p-2 border rounded-md">
                        <div className="font-medium text-sm">{contract.contract_number}</div>
                        {contract.contract_type && (
                          <div className="text-xs text-muted-foreground">{contract.contract_type}</div>
                        )}
                        {contract.property_code && (
                          <div className="text-xs text-muted-foreground">
                            Imóvel: {contract.property_code}
                          </div>
                        )}
                        <Badge 
                          variant={contract.status === 'ativo' ? 'default' : 'secondary'}
                          className="text-xs mt-1"
                        >
                          {contract.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum contrato cadastrado</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Descrição */}
          {contact.description && (
            <Card>
              <CardHeader>
                <CardTitle>Descrição</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{contact.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Notas */}
          <Card>
            <CardHeader>
              <CardTitle>Notas Internas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Adicione notas sobre este contato..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
              <Button 
                onClick={handleUpdateNotes}
                disabled={updateContact.isPending}
                size="sm"
              >
                {updateContact.isPending ? "Salvando..." : "Salvar Notas"}
              </Button>
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>

      <EditContactModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        contact={contact}
      />

      <DeleteContactDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        contact={contact}
      />
    </>
  );
}