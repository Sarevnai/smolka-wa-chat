import Layout from "@/components/Layout";
import { ClickUpSettings } from "@/components/ClickUpSettings";

export default function ClickUpConfig() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Integração ClickUp</h1>
          <p className="text-muted-foreground">
            Configure a integração com ClickUp para sincronizar seus tickets automaticamente
          </p>
        </div>
        
        <ClickUpSettings />
      </div>
    </Layout>
  );
}