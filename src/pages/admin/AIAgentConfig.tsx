import Layout from '@/components/Layout';
import { AIAgentSettings } from '@/components/admin/AIAgentSettings';
import { Bot } from 'lucide-react';

export default function AIAgentConfig() {
  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Bot className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Configuração do Agente IA</h1>
            <p className="text-muted-foreground">
              Configure o comportamento, personalidade e provedor de IA do seu assistente virtual
            </p>
          </div>
        </div>

        <AIAgentSettings />
      </div>
    </Layout>
  );
}
