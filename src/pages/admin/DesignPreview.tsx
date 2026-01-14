import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CardPremium, CardPremiumContent, CardPremiumDescription, CardPremiumHeader, CardPremiumTitle } from "@/components/ui/card-premium";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { 
  Palette, 
  Type, 
  Square, 
  Tag, 
  CreditCard, 
  FormInput, 
  MessageSquare, 
  PanelLeft,
  Users,
  TrendingUp,
  MessageCircle,
  Calendar,
  Moon,
  Sun,
  ToggleLeft,
  ToggleRight,
  Home,
  Settings,
  Mail,
  Phone
} from "lucide-react";

// Tema Scaza - CSS Variables isoladas
const scazaTheme: Record<string, string> = {
  // Core
  '--background': '200 25% 98%',
  '--foreground': '218 52% 10%',
  '--card': '0 0% 100%',
  '--card-foreground': '218 52% 10%',
  
  // Primary - Teal
  '--primary': '173 100% 39%',
  '--primary-foreground': '0 0% 100%',
  '--primary-glow': '173 100% 45%',
  
  // Secondary
  '--secondary': '210 40% 96%',
  '--secondary-foreground': '218 52% 10%',
  
  // Muted
  '--muted': '210 40% 96%',
  '--muted-foreground': '215 16% 47%',
  
  // Accent
  '--accent': '173 60% 94%',
  '--accent-foreground': '173 100% 25%',
  
  // Borders
  '--border': '210 40% 91%',
  '--input': '210 40% 96%',
  '--ring': '173 100% 39%',
  
  // Chat
  '--message-outbound': '173 50% 90%',
  '--message-inbound': '0 0% 100%',
  '--chat-background': '200 25% 96%',
  
  // Gold -> Teal redirect
  '--gold-primary': '173 100% 39%',
  '--gold-accent': '173 80% 50%',
  '--gold-dark': '173 100% 30%',
  '--gold-light': '173 60% 94%',
  
  // Sidebar - Navy
  '--sidebar-background': '218 52% 10%',
  '--sidebar-header': '218 52% 10%',
  '--sidebar-foreground': '0 0% 95%',
  '--sidebar-primary': '173 100% 39%',
  '--sidebar-primary-foreground': '0 0% 100%',
  '--sidebar-accent': '218 52% 15%',
  '--sidebar-accent-foreground': '0 0% 95%',
  '--sidebar-border': '218 52% 20%',
  '--sidebar-ring': '173 100% 39%',
  
  // Surface
  '--surface-elevated': '0 0% 100%',
  
  // Radius
  '--radius': '0.75rem',
};

// Paleta de cores para exibição
const colorPalette = [
  { name: 'Navy (Primary)', hsl: '218 52% 10%', hex: '#0A1628', usage: 'Textos, headers, sidebar' },
  { name: 'Teal (Accent)', hsl: '173 100% 39%', hex: '#00C9B7', usage: 'Botões, CTAs, links' },
  { name: 'Light Teal', hsl: '173 60% 94%', hex: '#E6FAF8', usage: 'Backgrounds de accent' },
  { name: 'White', hsl: '0 0% 100%', hex: '#FFFFFF', usage: 'Cards, backgrounds' },
  { name: 'Off-white', hsl: '200 25% 98%', hex: '#F8FAFB', usage: 'Background geral' },
  { name: 'Gray 100', hsl: '210 40% 96%', hex: '#F1F5F9', usage: 'Separadores, inputs' },
  { name: 'Gray 500', hsl: '215 16% 47%', hex: '#64748B', usage: 'Textos secundários' },
];

const statusColors = [
  { name: 'Success', hsl: '160 84% 39%', hex: '#10B981', usage: 'Sucesso, confirmação' },
  { name: 'Warning', hsl: '38 92% 50%', hex: '#F59E0B', usage: 'Alertas' },
  { name: 'Error', hsl: '0 84% 60%', hex: '#EF4444', usage: 'Erros, destructive' },
  { name: 'Info', hsl: '199 89% 48%', hex: '#0EA5E9', usage: 'Informações' },
];

export default function DesignPreview() {
  const [useNewTheme, setUseNewTheme] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Converter objeto de tema para estilo inline
  const themeStyle = useNewTheme 
    ? Object.entries(scazaTheme).reduce((acc, [key, value]) => {
        acc[key as any] = value;
        return acc;
      }, {} as React.CSSProperties)
    : {};

  return (
    <Layout>
      <div 
        className={`min-h-screen p-6 transition-colors duration-300 ${isDarkMode ? 'dark' : ''}`}
        style={themeStyle as React.CSSProperties}
      >
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10">
                <Palette className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Design System Preview</h1>
                <p className="text-muted-foreground">Tema Scaza - Navy + Teal</p>
              </div>
            </div>
            
            {/* Controls */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Label htmlFor="theme-toggle" className="text-sm font-medium">
                  {useNewTheme ? 'Novo Tema' : 'Tema Atual'}
                </Label>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setUseNewTheme(!useNewTheme)}
                  className="gap-2"
                >
                  {useNewTheme ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                  {useNewTheme ? 'Scaza' : 'Gold'}
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <Sun className="h-4 w-4 text-muted-foreground" />
                <Switch 
                  checked={isDarkMode} 
                  onCheckedChange={setIsDarkMode}
                />
                <Moon className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </div>
          
          {useNewTheme && (
            <div className="p-4 rounded-lg bg-accent border border-primary/20">
              <p className="text-sm text-accent-foreground">
                ✨ <strong>Preview ativo:</strong> As variáveis CSS estão sendo aplicadas apenas nesta página. 
                O resto da aplicação permanece inalterado.
              </p>
            </div>
          )}
        </div>

        <div className="grid gap-8">
          {/* Seção: Paleta de Cores */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Palette className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Paleta de Cores</h2>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-4">
              {colorPalette.map((color) => (
                <div key={color.name} className="flex flex-col">
                  <div 
                    className="h-20 rounded-lg border shadow-sm mb-2"
                    style={{ backgroundColor: color.hex }}
                  />
                  <span className="text-sm font-medium text-foreground">{color.name}</span>
                  <span className="text-xs text-muted-foreground">{color.hex}</span>
                  <span className="text-xs text-muted-foreground mt-1">{color.usage}</span>
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {statusColors.map((color) => (
                <div key={color.name} className="flex flex-col">
                  <div 
                    className="h-16 rounded-lg border shadow-sm mb-2"
                    style={{ backgroundColor: color.hex }}
                  />
                  <span className="text-sm font-medium text-foreground">{color.name}</span>
                  <span className="text-xs text-muted-foreground">{color.hex}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Seção: Tipografia */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Type className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Tipografia</h2>
            </div>
            
            <Card>
              <CardContent className="pt-6 space-y-4">
                <h1 className="text-4xl font-bold text-foreground">Heading 1 - Dashboard Principal</h1>
                <h2 className="text-3xl font-semibold text-foreground">Heading 2 - Seção de Contatos</h2>
                <h3 className="text-2xl font-semibold text-foreground">Heading 3 - Detalhes do Lead</h3>
                <h4 className="text-xl font-medium text-foreground">Heading 4 - Configurações</h4>
                <p className="text-base text-foreground">
                  Body text - Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
                  Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                </p>
                <p className="text-sm text-muted-foreground">
                  Texto secundário/muted - Informações complementares que não precisam de destaque.
                </p>
                <p className="text-xs text-muted-foreground">
                  Caption - Última atualização: 14/01/2026
                </p>
              </CardContent>
            </Card>
          </section>

          {/* Seção: Botões */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Square className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Botões</h2>
            </div>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-4">
                  <Button variant="default">Primary/Default</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="gold">Gold/Accent</Button>
                  <Button variant="gold-outline">Gold Outline</Button>
                  <Button variant="destructive">Destructive</Button>
                  <Button variant="link">Link</Button>
                </div>
                
                <div className="flex flex-wrap gap-4 mt-4">
                  <Button size="sm">Small</Button>
                  <Button size="default">Default</Button>
                  <Button size="lg">Large</Button>
                  <Button size="icon"><Settings className="h-4 w-4" /></Button>
                </div>
                
                <div className="flex flex-wrap gap-4 mt-4">
                  <Button disabled>Disabled</Button>
                  <Button variant="gold" disabled>Gold Disabled</Button>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Seção: Badges */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Tag className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Badges</h2>
            </div>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-3">
                  <Badge variant="default">Default</Badge>
                  <Badge variant="secondary">Secondary</Badge>
                  <Badge variant="outline">Outline</Badge>
                  <Badge variant="gold">Gold/Accent</Badge>
                  <Badge variant="gold-outline">Gold Outline</Badge>
                  <Badge variant="success">Success</Badge>
                  <Badge variant="warning">Warning</Badge>
                  <Badge variant="error">Error</Badge>
                  <Badge variant="info">Info</Badge>
                  <Badge variant="destructive">Destructive</Badge>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Seção: Cards */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Cards</h2>
            </div>
            
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <StatsCard 
                title="Total de Leads" 
                value={156} 
                icon={Users}
                description="Este mês"
                trend={{ value: 12, isPositive: true }}
              />
              <StatsCard 
                title="Conversões" 
                value={42} 
                icon={TrendingUp}
                description="Taxa de 27%"
                trend={{ value: 5, isPositive: true }}
              />
              <StatsCard 
                title="Mensagens" 
                value="2.4k" 
                icon={MessageCircle}
                description="Últimos 7 dias"
                trend={{ value: 3, isPositive: false }}
              />
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Card Padrão</CardTitle>
                  <CardDescription>Descrição do card com informações complementares</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Conteúdo do card com estilo padrão. Pode conter qualquer tipo de informação.
                  </p>
                </CardContent>
              </Card>
              
              <CardPremium>
                <CardPremiumHeader>
                  <CardPremiumTitle>Card Premium</CardPremiumTitle>
                  <CardPremiumDescription>Com gradiente e bordas douradas (agora teal)</CardPremiumDescription>
                </CardPremiumHeader>
                <CardPremiumContent>
                  <p className="text-sm text-muted-foreground">
                    Versão premium do card com efeitos visuais diferenciados.
                  </p>
                </CardPremiumContent>
              </CardPremium>
            </div>
          </section>

          {/* Seção: Formulários */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <FormInput className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Formulários</h2>
            </div>
            
            <Card>
              <CardContent className="pt-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome completo</Label>
                      <Input id="name" placeholder="Digite seu nome..." />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail</Label>
                      <Input id="email" type="email" placeholder="seu@email.com" />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="select">Departamento</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="locacao">Locação</SelectItem>
                          <SelectItem value="vendas">Vendas</SelectItem>
                          <SelectItem value="marketing">Marketing</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="message">Mensagem</Label>
                      <Textarea id="message" placeholder="Digite sua mensagem..." rows={4} />
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="terms" />
                        <Label htmlFor="terms" className="text-sm">Aceito os termos</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch id="notifications" />
                        <Label htmlFor="notifications" className="text-sm">Notificações</Label>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Seção: Chat Preview */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Chat Preview</h2>
            </div>
            
            <Card className="overflow-hidden">
              <div 
                className="p-4 space-y-4"
                style={{ backgroundColor: 'hsl(var(--chat-background, 200 25% 96%))' }}
              >
                {/* Mensagem recebida */}
                <div className="flex justify-start">
                  <div 
                    className="max-w-[70%] p-3 rounded-2xl rounded-bl-md shadow-sm"
                    style={{ backgroundColor: 'hsl(var(--message-inbound, 0 0% 100%))' }}
                  >
                    <p className="text-sm text-foreground">
                      Olá! Gostaria de mais informações sobre o apartamento na Rua das Flores.
                    </p>
                    <span className="text-xs text-muted-foreground mt-1 block">10:32</span>
                  </div>
                </div>
                
                {/* Mensagem enviada */}
                <div className="flex justify-end">
                  <div 
                    className="max-w-[70%] p-3 rounded-2xl rounded-br-md shadow-sm"
                    style={{ backgroundColor: 'hsl(var(--message-outbound, 173 50% 90%))' }}
                  >
                    <p className="text-sm text-foreground">
                      Olá! Claro, posso ajudá-lo. O apartamento possui 3 quartos, 2 banheiros e 1 vaga de garagem.
                    </p>
                    <span className="text-xs text-muted-foreground mt-1 block">10:34 ✓✓</span>
                  </div>
                </div>
                
                {/* Mensagem recebida */}
                <div className="flex justify-start">
                  <div 
                    className="max-w-[70%] p-3 rounded-2xl rounded-bl-md shadow-sm"
                    style={{ backgroundColor: 'hsl(var(--message-inbound, 0 0% 100%))' }}
                  >
                    <p className="text-sm text-foreground">
                      Qual o valor do aluguel?
                    </p>
                    <span className="text-xs text-muted-foreground mt-1 block">10:35</span>
                  </div>
                </div>
                
                {/* Mensagem enviada */}
                <div className="flex justify-end">
                  <div 
                    className="max-w-[70%] p-3 rounded-2xl rounded-br-md shadow-sm"
                    style={{ backgroundColor: 'hsl(var(--message-outbound, 173 50% 90%))' }}
                  >
                    <p className="text-sm text-foreground">
                      O valor é R$ 3.500/mês. Posso agendar uma visita para você?
                    </p>
                    <span className="text-xs text-muted-foreground mt-1 block">10:36 ✓✓</span>
                  </div>
                </div>
              </div>
            </Card>
          </section>

          {/* Seção: Sidebar Preview */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <PanelLeft className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Sidebar Preview</h2>
            </div>
            
            <Card className="overflow-hidden">
              <div className="flex">
                {/* Sidebar */}
                <div 
                  className="w-64 p-4 space-y-4"
                  style={{ 
                    backgroundColor: 'hsl(var(--sidebar-background, 218 52% 10%))',
                    color: 'hsl(var(--sidebar-foreground, 0 0% 95%))'
                  }}
                >
                  <div className="flex items-center gap-2 mb-6">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: 'hsl(var(--sidebar-primary, 173 100% 39%))' }}
                    >
                      <span className="text-white font-bold text-sm">S</span>
                    </div>
                    <span className="font-semibold">Smolka CRM</span>
                  </div>
                  
                  <nav className="space-y-1">
                    {[
                      { icon: Home, label: 'Dashboard', active: true },
                      { icon: Users, label: 'Contatos', active: false },
                      { icon: MessageSquare, label: 'Chat', active: false },
                      { icon: Calendar, label: 'Agenda', active: false },
                      { icon: Mail, label: 'Campanhas', active: false },
                      { icon: Settings, label: 'Configurações', active: false },
                    ].map((item) => (
                      <div 
                        key={item.label}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors"
                        style={{ 
                          backgroundColor: item.active 
                            ? 'hsl(var(--sidebar-accent, 218 52% 15%))' 
                            : 'transparent',
                          color: item.active 
                            ? 'hsl(var(--sidebar-primary, 173 100% 39%))' 
                            : 'inherit'
                        }}
                      >
                        <item.icon className="h-5 w-5" />
                        <span className="text-sm">{item.label}</span>
                      </div>
                    ))}
                  </nav>
                </div>
                
                {/* Content preview */}
                <div className="flex-1 p-6 bg-background">
                  <p className="text-muted-foreground text-sm">
                    Área de conteúdo principal com fundo off-white e sidebar Navy elegante.
                  </p>
                </div>
              </div>
            </Card>
          </section>
        </div>
      </div>
    </Layout>
  );
}
