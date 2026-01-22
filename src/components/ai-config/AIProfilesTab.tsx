import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  Home, 
  ShoppingBag, 
  Megaphone, 
  Save, 
  Loader2, 
  Plus,
  Sparkles,
  Target,
  Building,
  CheckCircle,
  X
} from "lucide-react";
import { 
  useAIDepartmentConfigs, 
  useUpdateAIDepartmentConfig,
  DEPARTMENT_INFO,
  AIDepartmentConfig
} from "@/hooks/useAIDepartmentConfig";
import { Database } from "@/integrations/supabase/types";

type DepartmentType = Database['public']['Enums']['department_type'];

const TONE_OPTIONS = [
  { value: 'formal', label: 'Formal' },
  { value: 'casual', label: 'Casual' },
  { value: 'friendly', label: 'Amigável' },
  { value: 'professional', label: 'Profissional' },
  { value: 'enthusiastic', label: 'Entusiasmado' },
  { value: 'helpful', label: 'Prestativo' },
];

const DepartmentIcon = ({ department }: { department: DepartmentType }) => {
  const icons: Record<DepartmentType, React.ReactNode> = {
    locacao: <Home className="h-5 w-5" />,
    vendas: <ShoppingBag className="h-5 w-5" />,
    administrativo: <Building className="h-5 w-5" />,
    marketing: <Megaphone className="h-5 w-5" />,
  };
  return icons[department] || null;
};

interface DepartmentConfigEditorProps {
  config: AIDepartmentConfig;
  onUpdate: (updates: Partial<AIDepartmentConfig>) => void;
  isSaving: boolean;
}

function DepartmentConfigEditor({ config, onUpdate, isSaving }: DepartmentConfigEditorProps) {
  const [newService, setNewService] = useState("");
  const [newFocus, setNewFocus] = useState("");

  const addService = () => {
    if (newService.trim()) {
      onUpdate({ services: [...config.services, newService.trim()] });
      setNewService("");
    }
  };

  const removeService = (index: number) => {
    onUpdate({ services: config.services.filter((_, i) => i !== index) });
  };

  const addFocus = () => {
    if (newFocus.trim()) {
      onUpdate({ qualification_focus: [...config.qualification_focus, newFocus.trim()] });
      setNewFocus("");
    }
  };

  const removeFocus = (index: number) => {
    onUpdate({ qualification_focus: config.qualification_focus.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-6">
      {/* Status */}
      <div className="flex items-center justify-between p-4 rounded-lg border">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-full ${config.is_active ? "bg-green-100" : "bg-muted"}`}>
            <DepartmentIcon department={config.department_code} />
          </div>
          <div>
            <h3 className="font-semibold">{DEPARTMENT_INFO[config.department_code].label}</h3>
            <p className="text-sm text-muted-foreground">
              {config.is_active ? "Ativo" : "Desativado"}
            </p>
          </div>
        </div>
        <Switch
          checked={config.is_active}
          onCheckedChange={(is_active) => onUpdate({ is_active })}
        />
      </div>

      <Accordion type="multiple" defaultValue={["identity", "behavior"]} className="space-y-4">
        {/* Identity */}
        <AccordionItem value="identity" className="border rounded-lg px-4">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-pink-500" />
              <span>Identidade e Personalidade</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <div>
              <Label>Nome do Agente</Label>
              <Input
                value={config.agent_name}
                onChange={(e) => onUpdate({ agent_name: e.target.value })}
                placeholder="Ex: Helena Locação"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Tom de Comunicação</Label>
              <Select
                value={config.tone}
                onValueChange={(tone: AIDepartmentConfig['tone']) => onUpdate({ tone })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONE_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Mensagem de Saudação</Label>
              <Textarea
                value={config.greeting_message || ''}
                onChange={(e) => onUpdate({ greeting_message: e.target.value })}
                placeholder="Olá! Sou a Helena, especialista em..."
                className="mt-1"
                rows={3}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Behavior */}
        <AccordionItem value="behavior" className="border rounded-lg px-4">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-500" />
              <span>Comportamento e Instruções</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <div>
              <Label>Instruções Personalizadas</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Instruções específicas para este departamento
              </p>
              <Textarea
                value={config.custom_instructions || ''}
                onChange={(e) => onUpdate({ custom_instructions: e.target.value })}
                placeholder="Foque em entender as necessidades do cliente..."
                className="mt-1"
                rows={4}
              />
            </div>

            <div>
              <Label>Foco de Qualificação</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Informações que a IA deve coletar
              </p>
              <div className="flex flex-wrap gap-2 mb-2">
                {config.qualification_focus.map((item, i) => (
                  <Badge key={i} variant="secondary" className="flex items-center gap-1">
                    {item}
                    <button
                      onClick={() => removeFocus(i)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newFocus}
                  onChange={(e) => setNewFocus(e.target.value)}
                  placeholder="Ex: tipo_imovel, bairro, valor..."
                  onKeyDown={(e) => e.key === "Enter" && addFocus()}
                />
                <Button onClick={addFocus} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label>Serviços Oferecidos</Label>
              <p className="text-sm text-muted-foreground mb-2">
                O que a IA pode oferecer neste departamento
              </p>
              <div className="space-y-2 mb-2">
                {config.services.map((service, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Badge variant="outline" className="flex-1 justify-start">
                      <CheckCircle className="h-3 w-3 mr-2 text-green-500" />
                      {service}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeService(i)}
                      className="text-destructive h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newService}
                  onChange={(e) => setNewService(e.target.value)}
                  placeholder="Novo serviço..."
                  onKeyDown={(e) => e.key === "Enter" && addService()}
                />
                <Button onClick={addService} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

export function AIProfilesTab() {
  const [activeProfile, setActiveProfile] = useState<DepartmentType>("locacao");
  const { data: configs, isLoading } = useAIDepartmentConfigs();
  const updateConfig = useUpdateAIDepartmentConfig();

  const [pendingChanges, setPendingChanges] = useState<Record<DepartmentType, Partial<AIDepartmentConfig>>>({
    locacao: {},
    vendas: {},
    administrativo: {},
    marketing: {},
  });

  const currentConfig = configs?.find(c => c.department_code === activeProfile);
  const mergedConfig = currentConfig ? {
    ...currentConfig,
    ...pendingChanges[activeProfile]
  } : null;

  const handleUpdate = (updates: Partial<AIDepartmentConfig>) => {
    setPendingChanges(prev => ({
      ...prev,
      [activeProfile]: { ...prev[activeProfile], ...updates }
    }));
  };

  const handleSave = async () => {
    const changes = pendingChanges[activeProfile];
    if (Object.keys(changes).length === 0) return;

    await updateConfig.mutateAsync({
      departmentCode: activeProfile,
      updates: changes
    });

    setPendingChanges(prev => ({
      ...prev,
      [activeProfile]: {}
    }));
  };

  const hasChanges = Object.keys(pendingChanges[activeProfile] || {}).length > 0;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Perfis por Setor</CardTitle>
          <CardDescription>
            Configure comportamentos específicos da IA para cada setor. 
            Cada departamento pode ter seu próprio agente com personalidade única.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeProfile} onValueChange={(v) => setActiveProfile(v as DepartmentType)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="locacao" className="gap-2">
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">Locação</span>
              </TabsTrigger>
              <TabsTrigger value="vendas" className="gap-2">
                <ShoppingBag className="h-4 w-4" />
                <span className="hidden sm:inline">Vendas</span>
              </TabsTrigger>
              <TabsTrigger value="administrativo" className="gap-2">
                <Building className="h-4 w-4" />
                <span className="hidden sm:inline">Admin</span>
              </TabsTrigger>
              <TabsTrigger value="marketing" className="gap-2">
                <Megaphone className="h-4 w-4" />
                <span className="hidden sm:inline">Marketing</span>
              </TabsTrigger>
            </TabsList>

            {(['locacao', 'vendas', 'administrativo', 'marketing'] as DepartmentType[]).map(dept => (
              <TabsContent key={dept} value={dept} className="mt-6">
                {mergedConfig && activeProfile === dept ? (
                  <DepartmentConfigEditor
                    config={mergedConfig as AIDepartmentConfig}
                    onUpdate={handleUpdate}
                    isSaving={updateConfig.isPending}
                  />
                ) : (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    <div className="text-center space-y-2">
                      <DepartmentIcon department={dept} />
                      <p>Configuração não encontrada</p>
                    </div>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>

          {hasChanges && (
            <div className="mt-6 flex justify-end">
              <Button 
                onClick={handleSave} 
                disabled={updateConfig.isPending}
                className="gap-2"
              >
                {updateConfig.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Salvar Alterações
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
