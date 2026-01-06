import React, { useState } from "react";
import { Plus, Search, MoreVertical, Edit, Trash2, Phone, Mail, Calendar, MessageCircle, Users, Upload, Sparkles, FileText, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { NewContactModal } from "@/components/contacts/NewContactModal";
import { EditContactModal } from "@/components/contacts/EditContactModal";
import { DeleteContactDialog } from "@/components/contacts/DeleteContactDialog";
import { ContactProfile } from "@/components/contacts/ContactProfile";
import { ImportContactsModal } from "@/components/ImportContactsModal";
import { ImportMarketingContactsModal } from "@/components/marketing/ImportMarketingContactsModal";
import { BulkMessageModal } from "@/components/contacts/BulkMessageModal";
import { ContactFilters, ContactFiltersState } from "@/components/contacts/ContactFilters";
import { QuickTemplateSender } from "@/components/chat/QuickTemplateSender";
import { useContacts, useContactStatsByDepartment } from "@/hooks/useContacts";
import { Contact } from "@/types/contact";
import { formatPhoneNumber } from "@/lib/utils";
import { getRatingDescription } from "@/lib/contactRating";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useDepartment } from "@/contexts/DepartmentContext";
import { getContactTypeLabel, getDepartmentUIConfig } from "@/lib/departmentConfig";

export default function Contacts() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<ContactFiltersState>({});
  const [showNewContactModal, setShowNewContactModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showBulkMessageModal, setShowBulkMessageModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showQuickTemplate, setShowQuickTemplate] = useState(false);
  const [quickTemplatePhone, setQuickTemplatePhone] = useState<string>("");
  const navigate = useNavigate();
  const { activeDepartment } = useDepartment();
  
  // Get department-specific UI config
  const uiConfig = getDepartmentUIConfig(activeDepartment);
  
  const { data: contacts, isLoading } = useContacts(searchTerm, filters, activeDepartment || undefined);
  const { data: stats, isLoading: statsLoading } = useContactStatsByDepartment(activeDepartment || undefined);

  const handleContactClick = (contact: Contact) => {
    setSelectedContact(contact);
    setShowProfileModal(true);
  };

  const getInitials = (name?: string, phone?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    }
    if (phone) {
      return phone.slice(-2);
    }
    return '??';
  };

  const getContactTypeInfo = (contactType?: string) => {
    if (!contactType || !activeDepartment) return null;
    const typeConfig = getContactTypeLabel(contactType, activeDepartment);
    if (!typeConfig) return null;
    return {
      label: typeConfig.label,
      icon: typeConfig.icon,
      variant: typeConfig.badgeVariant,
      color: typeConfig.color
    };
  };

  const renderStars = (rating?: number) => {
    if (!rating) return null;
    
    const description = getRatingDescription(rating);
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 cursor-help">
              {Array.from({ length: 5 }, (_, i) => (
                <Star
                  key={i}
                  className={`h-3 w-3 ${
                    i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
                  }`}
                />
              ))}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{description}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativo': return 'default';
      case 'inativo': return 'secondary';
      case 'bloqueado': return 'destructive';
      default: return 'secondary';
    }
  };

  const getContractStatusColor = (status: string) => {
    switch (status) {
      case 'ativo': return 'bg-green-100 text-green-700';
      case 'encerrado': return 'bg-gray-100 text-gray-700';
      case 'suspenso': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold text-foreground">Contatos</h1>
                <p className="text-muted-foreground">Gerencie seus contatos e clientes</p>
              </div>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline"
              onClick={() => setShowImportModal(true)}
            >
              <Upload className="h-4 w-4 mr-2" />
              <span>Importar CSV</span>
            </Button>
            <Button 
              className="flex items-center space-x-2"
              onClick={() => setShowNewContactModal(true)}
            >
              <Plus className="h-4 w-4" />
              <span>Novo Contato</span>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {statsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-12" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {uiConfig.stats.map((statConfig) => {
              const Icon = statConfig.icon;
              const value = stats?.[statConfig.key as keyof typeof stats] || 0;
              return (
                <Card key={statConfig.key}>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-2">
                      <Icon className={`h-4 w-4 ${statConfig.color || 'text-muted-foreground'}`} />
                      <span className="text-sm font-medium text-muted-foreground">{statConfig.label}</span>
                    </div>
                    <div className={`text-2xl font-bold ${statConfig.color || ''}`}>{value}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Search */}
        <div className="sticky top-0 z-10">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder={uiConfig.searchPlaceholder}
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Badge variant="outline" className="px-4 py-2 font-semibold">
                {isLoading ? '...' : `${contacts?.length || 0} contatos`}
              </Badge>
            </div>
          </CardContent>
        </Card>
        </div>

        {/* Filters */}
        <ContactFilters 
          filters={filters}
          onFiltersChange={setFilters}
          contactCount={contacts?.length}
        />

        {/* Contacts Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {Array.from({ length: 10 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-3">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : contacts && contacts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {contacts.map((contact) => (
              <Card 
                key={contact.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleContactClick(contact)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback>
                          {getInitials(contact.name, contact.phone)}
                        </AvatarFallback>
                      </Avatar>
                       <div>
                         <CardTitle className="text-lg">
                           {contact.name || formatPhoneNumber(contact.phone)}
                         </CardTitle>
                         <div className="flex items-center gap-2 mt-1">
                           <Badge 
                             variant={getStatusColor(contact.status) as any}
                             className="text-xs"
                           >
                             {contact.status}
                           </Badge>
                           {(() => {
                             const typeInfo = getContactTypeInfo(contact.contact_type);
                             if (typeInfo) {
                               const TypeIcon = typeInfo.icon;
                               return (
                                 <Badge variant={typeInfo.variant} className="text-xs flex items-center gap-1">
                                   <TypeIcon className="h-3 w-3" />
                                   {typeInfo.label}
                                 </Badge>
                               );
                             }
                             return null;
                           })()}
                           {renderStars(contact.rating)}
                         </div>
                       </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Contact Info */}
                  <div className="space-y-2">
                     <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                       <Phone className="h-4 w-4" />
                       <span>{formatPhoneNumber(contact.phone)}</span>
                     </div>
                    {contact.email && (
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span>{contact.email}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Último contato: {contact.lastContact}</span>
                    </div>
                  </div>

                  {/* Contracts - only show for administrativo department */}
                  {activeDepartment === 'administrativo' && contact.contracts && contact.contracts.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Contratos:</span>
                      </div>
                      <div className="flex flex-wrap gap-1 max-h-16 overflow-hidden relative">
                        {contact.contracts.slice(0, 3).map((contract) => (
                          <Badge
                            key={contract.id}
                            className={`text-xs ${getContractStatusColor(contract.status)}`}
                            variant="secondary"
                          >
                            {contract.contract_number}
                          </Badge>
                        ))}
                        {contact.contracts.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{contact.contracts.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-foreground">
                        {contact.totalMessages}
                      </div>
                      <div className="text-xs text-muted-foreground">mensagens</div>
                    </div>
                    
                    <div className="flex space-x-2">
                      {/* Primary actions - always visible */}
                      <Button 
                        size="sm" 
                        variant="default" 
                        className="h-8 gap-1 flex-1 sm:flex-none"
                        onClick={(e) => {
                          e.stopPropagation();
                          setQuickTemplatePhone(contact.phone);
                          setShowQuickTemplate(true);
                        }}
                      >
                        <Sparkles className="h-3 w-3" />
                        <span className="hidden xs:inline">Iniciar</span>
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-8 gap-1 flex-1 sm:flex-none"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/chat/${contact.phone}`);
                        }}
                      >
                        <MessageCircle className="h-4 w-4" />
                        <span className="hidden xs:inline">Chat</span>
                      </Button>
                      
                      {/* Secondary actions - dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingContact(contact);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DeleteContactDialog contact={contact}>
                            <DropdownMenuItem
                              onClick={(e) => e.stopPropagation()}
                              className="text-destructive focus:text-destructive"
                              onSelect={(e) => e.preventDefault()}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Deletar
                            </DropdownMenuItem>
                          </DeleteContactDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum contato encontrado</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'Tente ajustar sua busca ou ' : ''}Comece criando seu primeiro contato.
              </p>
              <Button onClick={() => setShowNewContactModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Contato
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Ações Rápidas</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                variant="outline" 
                className="justify-start space-x-2"
                onClick={() => setShowImportModal(true)}
              >
                <Upload className="h-4 w-4" />
                <span>Importar Contatos</span>
              </Button>
              <Button 
                variant="outline" 
                className="justify-start space-x-2"
                onClick={() => setShowBulkMessageModal(true)}
              >
                <MessageCircle className="h-4 w-4" />
                <span>Mensagem em Massa</span>
              </Button>
              <Button variant="outline" className="justify-start space-x-2">
                <Calendar className="h-4 w-4" />
                <span>Agendar Contato</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        <NewContactModal 
          open={showNewContactModal} 
          onOpenChange={setShowNewContactModal} 
        />

        {/* Use Marketing-specific import modal when in marketing department */}
        {activeDepartment === 'marketing' ? (
          <ImportMarketingContactsModal
            open={showImportModal}
            onOpenChange={setShowImportModal}
          />
        ) : (
          <ImportContactsModal
            open={showImportModal}
            onOpenChange={setShowImportModal}
          />
        )}

        <BulkMessageModal
          open={showBulkMessageModal}
          onOpenChange={setShowBulkMessageModal}
        />

         {editingContact && (
           <EditContactModal 
             open={!!editingContact} 
             onOpenChange={(open) => !open && setEditingContact(null)}
             contact={editingContact}
           />
         )}

         {selectedContact && (
           <ContactProfile
             phoneNumber={selectedContact.phone}
             open={showProfileModal}
             onOpenChange={setShowProfileModal}
           />
         )}

         <QuickTemplateSender
           phoneNumber={quickTemplatePhone}
           open={showQuickTemplate}
           onOpenChange={setShowQuickTemplate}
           onSuccess={() => {
             navigate(`/chat/${quickTemplatePhone}`);
           }}
         />
      </div>
    </Layout>
  );
}