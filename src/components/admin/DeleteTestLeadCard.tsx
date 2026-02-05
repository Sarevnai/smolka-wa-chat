import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Trash2, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function DeleteTestLeadCard() {
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [deletionResult, setDeletionResult] = useState<{
    success: boolean;
    deleted: Record<string, number>;
  } | null>(null);

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    return digits;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value));
    setDeletionResult(null);
  };

  const handleDelete = async () => {
    if (!phone || phone.length < 10) {
      toast.error("Informe um número de telefone válido");
      return;
    }

    setIsLoading(true);
    setShowConfirmDialog(false);

    try {
      const { data, error } = await supabase.functions.invoke("delete-lead", {
        body: { phone_number: phone },
      });

      if (error) throw error;

      if (data.success) {
        const deletedCounts: Record<string, number> =
          (data.deleted_counts as Record<string, number> | undefined) ??
          (data.deleted as Record<string, number> | undefined) ??
          {};

        setDeletionResult({
          success: true,
          deleted: deletedCounts,
        });

        const totalDeleted = Object.values(deletedCounts).reduce(
          (sum: number, count) => sum + (Number(count) || 0),
          0
        );

        if (totalDeleted > 0) {
          toast.success(`Lead excluído! ${totalDeleted} registros removidos.`);
        } else {
          toast.info("Nenhum registro encontrado para este número.");
        }

        setPhone("");
      } else {
        throw new Error(data.error || "Erro ao excluir lead");
      }
    } catch (error: any) {
      console.error("Error deleting lead:", error);
      toast.error(error.message || "Erro ao excluir lead");
      setDeletionResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Excluir Lead de Teste
          </CardTitle>
          <CardDescription>
            Remove completamente um lead e todos os dados relacionados (mensagens, conversas, qualificações, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Número de Telefone</Label>
            <Input
              id="phone"
              placeholder="5548999999999"
              value={phone}
              onChange={handlePhoneChange}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Formato: código do país + DDD + número (apenas números)
            </p>
          </div>

          <Button
            variant="destructive"
            onClick={() => setShowConfirmDialog(true)}
            disabled={isLoading || !phone || phone.length < 10}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Excluindo...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir Lead
              </>
            )}
          </Button>

          {deletionResult && deletionResult.success && (
            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <div className="flex items-center gap-2 text-primary">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Exclusão concluída</span>
              </div>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {Object.entries(deletionResult.deleted).map(([table, count]) => (
                  <li key={table}>
                    • {table}: {count} registro(s)
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirmar Exclusão
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a excluir <strong>permanentemente</strong> todos os dados do lead com o número{" "}
              <code className="rounded bg-muted px-1 py-0.5">{phone}</code>.
              <br /><br />
              Isso inclui: contato, conversas, mensagens, qualificações, tickets e todos os registros relacionados.
              <br /><br />
              <strong>Esta ação não pode ser desfeita.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sim, excluir permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
