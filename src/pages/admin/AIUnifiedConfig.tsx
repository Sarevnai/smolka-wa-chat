import { useState } from "react";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bot, 
  Sparkles, 
  Settings, 
  Loader2,
  FileText,
  Wrench
} from "lucide-react";

// Tab Components
import { AIIdentityTab } from "@/components/ai-config/AIIdentityTab";
import { AIBehaviorTab } from "@/components/ai-config/AIBehaviorTab";
import { AITechnicalTab } from "@/components/ai-config/AITechnicalTab";
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

        {/* Tabs - Simplified to 4 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="identity" className="gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Identidade</span>
            </TabsTrigger>
            <TabsTrigger value="behavior" className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Comportamento</span>
            </TabsTrigger>
            <TabsTrigger value="technical" className="gap-2">
              <Wrench className="h-4 w-4" />
              <span className="hidden sm:inline">Técnico</span>
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

          {/* Technical Tab (combines Provider + Audio) */}
          <TabsContent value="technical">
            <AITechnicalTab 
              config={config} 
              updateConfig={updateConfig}
              saveConfig={saveConfig}
              isSaving={isSaving}
            />
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
