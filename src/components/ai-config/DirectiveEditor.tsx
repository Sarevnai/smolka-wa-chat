import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { 
  Save, 
  Loader2, 
  FileText, 
  History, 
  Eye, 
  Edit3,
  Home,
  Building2,
  Settings,
  Megaphone,
  Building
} from "lucide-react";
import { useDirectives, type Directive } from "@/hooks/useDirectives";

const DEPT_META: Record<string, { label: string; icon: typeof Home; color: string }> = {
  locacao: { label: 'Locação', icon: Home, color: 'text-blue-600' },
  vendas: { label: 'Vendas', icon: Building2, color: 'text-emerald-600' },
  administrativo: { label: 'Administrativo', icon: Settings, color: 'text-amber-600' },
  marketing: { label: 'Marketing', icon: Megaphone, color: 'text-purple-600' },
};

const CONTEXT_LABELS: Record<string, string> = {
  atendimento_completo: 'Atendimento Completo',
  empreendimentos: 'Empreendimentos (Quick Transfer)',
};

function DirectiveCard({ directive, onSave, isSaving }: { 
  directive: Directive; 
  onSave: (id: string, content: string) => Promise<void>;
  isSaving: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(directive.directive_content);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<Directive[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const meta = DEPT_META[directive.department] || { label: directive.department, icon: FileText, color: 'text-muted-foreground' };
  const Icon = meta.icon;
  const contextLabel = CONTEXT_LABELS[directive.context] || directive.context;
  const hasChanges = editContent !== directive.directive_content;

  const handleSave = async () => {
    await onSave(directive.id, editContent);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditContent(directive.directive_content);
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${meta.color}`} />
            <div>
              <CardTitle className="text-base">{meta.label} — {contextLabel}</CardTitle>
              <CardDescription className="text-xs">
                v{directive.version} · Atualizado em {new Date(directive.updated_at).toLocaleDateString('pt-BR')}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {directive.directive_content.length} chars
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? <Eye className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isEditing ? (
          <>
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[300px] font-mono text-sm"
            />
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                Cancelar
              </Button>
              <Button 
                size="sm" 
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className="gap-2"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar (v{directive.version + 1})
              </Button>
            </div>
          </>
        ) : (
          <ScrollArea className="h-[200px] rounded-md border bg-muted/30 p-3">
            <pre className="text-sm whitespace-pre-wrap font-mono text-foreground/80">
              {directive.directive_content}
            </pre>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

export function DirectiveEditor() {
  const { directives, isLoading, isSaving, updateDirective } = useDirectives();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (directives.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-3 opacity-50" />
          <p>Nenhuma directive encontrada.</p>
          <p className="text-sm">Execute a migration de seed para popular as directives iniciais.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <FileText className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Directives (SOPs editáveis)</h3>
        <Badge variant="secondary">{directives.length} ativas</Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        Edite as instruções de cada departamento. Cada edição cria uma nova versão, permitindo rollback.
        Hierarquia: <strong>Override Manual</strong> → <strong>Directive</strong> → <strong>Prompt Hardcoded</strong>
      </p>
      {directives.map((d) => (
        <DirectiveCard 
          key={d.id} 
          directive={d} 
          onSave={updateDirective}
          isSaving={isSaving}
        />
      ))}
    </div>
  );
}
