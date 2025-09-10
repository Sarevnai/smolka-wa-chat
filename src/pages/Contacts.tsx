import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Search, Plus, MessageCircle, Phone, Mail, Calendar } from "lucide-react";

export default function Contacts() {
  // Mock data para demonstração
  const contacts = [
    {
      id: 1,
      name: "João Silva",
      phone: "+55 11 99999-9999",
      email: "joao@email.com",
      lastContact: "2 dias atrás",
      totalMessages: 15,
      status: "ativo"
    },
    {
      id: 2,
      name: "Maria Santos",
      phone: "+55 11 88888-8888",
      email: "maria@email.com",
      lastContact: "1 semana atrás",
      totalMessages: 8,
      status: "inativo"
    },
    {
      id: 3,
      name: "Pedro Costa",
      phone: "+55 11 77777-7777",
      email: "pedro@email.com",
      lastContact: "hoje",
      totalMessages: 32,
      status: "ativo"
    }
  ];

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
          <Button className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Novo Contato</span>
          </Button>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar contatos por nome, telefone ou email..." 
                  className="pl-10"
                />
              </div>
              <Badge variant="outline" className="px-4 py-2">
                {contacts.length} contatos
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Contacts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {contacts.map((contact) => (
            <Card key={contact.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback>
                        {contact.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{contact.name}</CardTitle>
                      <Badge 
                        variant={contact.status === "ativo" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {contact.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Contact Info */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{contact.phone}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>{contact.email}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Último contato: {contact.lastContact}</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-foreground">
                      {contact.totalMessages}
                    </div>
                    <div className="text-xs text-muted-foreground">mensagens</div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                      <Phone className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

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
              <Button variant="outline" className="justify-start space-x-2">
                <Plus className="h-4 w-4" />
                <span>Importar Contatos</span>
              </Button>
              <Button variant="outline" className="justify-start space-x-2">
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
      </div>
    </Layout>
  );
}