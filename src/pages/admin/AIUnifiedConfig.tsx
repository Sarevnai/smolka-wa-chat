import { useState } from "react";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bot, 
  Sparkles, 
  Settings, 
  Cpu, 
  Volume2, 
  Users,
  Loader2,
  TrendingUp,
  HelpCircle,
  FileText
} from "lucide-react";

// Tab Components
import { AIIdentityTab } from "@/components/ai-config/AIIdentityTab";
import { AIBehaviorTab } from "@/components/ai-config/AIBehaviorTab";
import { AIProviderTab } from "@/components/ai-config/AIProviderTab";
import { AIAudioTab } from "@/components/ai-config/AIAudioTab";
import { AIProfilesTab } from "@/components/ai-config/AIProfilesTab";
import { AISalesTab } from "@/components/ai-config/AISalesTab";
import { AIQualificationTab } from "@/components/ai-config/AIQualificationTab";
import { AIPromptTab } from "@/components/ai-config/AIPromptTab";
import { useAIUnifiedConfig } from "@/hooks/useAIUnifiedConfig";

export default function AIUnifiedConfig() {
  const [activeTab, setActiveTab] = useState("identity");
  const { config, behaviorConfig, isLoading, updateConfig, saveConfig, isSaving } = useAIUnifiedConfig();

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Minha Aimee</span>
                <span className="text-muted-foreground">/</span>
                <h1 className="text-2xl font-bold tracking-tight">Configuração</h1>
              </div>
              <p className="text-muted-foreground">
                Central unificada de configuração do seu agente de IA
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-8 lg:w-auto lg:inline-grid">
            <TabsTrigger value="identity" className="gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Identidade</span>
            </TabsTrigger>
            <TabsTrigger value="behavior" className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Comportamento</span>
            </TabsTrigger>
            <TabsTrigger value="sales" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Vendas</span>
            </TabsTrigger>
            <TabsTrigger value="qualification" className="gap-2">
              <HelpCircle className="h-4 w-4" />
              <span className="hidden sm:inline">SPIN</span>
            </TabsTrigger>
            <TabsTrigger value="provider" className="gap-2">
              <Cpu className="h-4 w-4" />
              <span className="hidden sm:inline">Provedor</span>
            </TabsTrigger>
            <TabsTrigger value="audio" className="gap-2">
              <Volume2 className="h-4 w-4" />
              <span className="hidden sm:inline">Áudio</span>
            </TabsTrigger>
            <TabsTrigger value="profiles" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Perfis</span>
            </TabsTrigger>
            <TabsTrigger value="prompt" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Prompt</span>
            </TabsTrigger>
          </TabsList>

          {/* Identity Tab */}
          <TabsContent value="identity">
            <AIIdentityTab 
              config={config} 
              updateConfig={updateConfig}
              saveConfig={saveConfig}
              isSaving={isSaving}
            />
          </TabsContent>

          {/* Behavior Tab */}
          <TabsContent value="behavior">
            <AIBehaviorTab behaviorConfig={behaviorConfig} />
          </TabsContent>

          {/* Sales Tab */}
          <TabsContent value="sales">
            <AISalesTab 
              config={config} 
              updateConfig={updateConfig}
              saveConfig={saveConfig}
              isSaving={isSaving}
            />
          </TabsContent>

          {/* Qualification Tab */}
          <TabsContent value="qualification">
            <AIQualificationTab 
              config={config} 
              updateConfig={updateConfig}
              saveConfig={saveConfig}
              isSaving={isSaving}
            />
          </TabsContent>

          {/* Provider Tab */}
          <TabsContent value="provider">
            <AIProviderTab 
              config={config} 
              updateConfig={updateConfig}
              saveConfig={saveConfig}
              isSaving={isSaving}
            />
          </TabsContent>

          {/* Audio Tab */}
          <TabsContent value="audio">
            <AIAudioTab 
              config={config} 
              updateConfig={updateConfig}
              saveConfig={saveConfig}
              isSaving={isSaving}
            />
          </TabsContent>

          {/* Profiles Tab */}
          <TabsContent value="profiles">
            <AIProfilesTab />
          </TabsContent>

          {/* Prompt Tab */}
          <TabsContent value="prompt">
            <AIPromptTab 
              config={config} 
              updateConfig={updateConfig}
              saveConfig={saveConfig}
              isSaving={isSaving}
            />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
