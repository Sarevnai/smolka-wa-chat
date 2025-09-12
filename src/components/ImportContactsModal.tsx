import { useState } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, CheckCircle, XCircle, Info } from "lucide-react";
import { Progress } from "./ui/progress";

interface ImportResult {
  success: boolean;
  totalProcessed: number;
  inserted: number;
  updated: number;
  parseErrors: string[];
  insertErrors: string[];
  summary: string;
}

interface ImportContactsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: () => void;
}

export function ImportContactsModal({ 
  open, 
  onOpenChange, 
  onImportComplete 
}: ImportContactsModalProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const { toast } = useToast();

  const handleImport = async () => {
    try {
      setIsImporting(true);
      setImportResult(null);

      toast({
        title: "Iniciando importação",
        description: "Processando contatos do arquivo CSV...",
      });

      const { data, error } = await supabase.functions.invoke('import-contacts', {
        body: {}
      });

      if (error) {
        throw error;
      }

      setImportResult(data);
      
      if (data.success) {
        toast({
          title: "Importação concluída",
          description: data.summary,
        });
        
        onImportComplete?.();
      } else {
        toast({
          title: "Erro na importação",
          description: data.error || "Erro desconhecido",
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Erro na importação",
        description: "Falha ao importar contatos",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setImportResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Contatos do CSV
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {!importResult && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4 bg-muted/50">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div className="space-y-2">
                    <h3 className="font-medium">Arquivo CSV Detectado</h3>
                    <p className="text-sm text-muted-foreground">
                      O sistema irá importar os contatos do arquivo CSV carregado, 
                      extraindo informações de contratos e classificando automaticamente 
                      proprietários e inquilinos.
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                      <li>• Números de telefone serão normalizados</li>
                      <li>• Contratos serão extraídos dos nomes (inq, pp, ct)</li>
                      <li>• Contatos duplicados serão atualizados</li>
                      <li>• Novos contratos serão criados automaticamente</li>
                    </ul>
                  </div>
                </div>
              </div>

              {isImporting && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Importando contatos...</span>
                  </div>
                  <Progress value={undefined} className="h-2" />
                </div>
              )}
            </div>
          )}

          {importResult && (
            <div className="space-y-4">
              <div className={`rounded-lg border p-4 ${
                importResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-start gap-3">
                  {importResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  )}
                  <div className="space-y-2">
                    <h3 className="font-medium">
                      {importResult.success ? 'Importação Concluída' : 'Erro na Importação'}
                    </h3>
                    <p className="text-sm">{importResult.summary}</p>
                  </div>
                </div>
              </div>

              {importResult.success && (
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-green-600">
                      {importResult.inserted}
                    </div>
                    <div className="text-sm text-muted-foreground">Novos</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-blue-600">
                      {importResult.updated}
                    </div>
                    <div className="text-sm text-muted-foreground">Atualizados</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-gray-600">
                      {importResult.totalProcessed}
                    </div>
                    <div className="text-sm text-muted-foreground">Total</div>
                  </div>
                </div>
              )}

              {(importResult.parseErrors.length > 0 || importResult.insertErrors.length > 0) && (
                <div className="space-y-3">
                  {importResult.parseErrors.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-orange-600 mb-2">
                        Erros de Parsing ({importResult.parseErrors.length})
                      </h4>
                      <div className="text-xs bg-orange-50 p-3 rounded border max-h-32 overflow-y-auto">
                        {importResult.parseErrors.map((error, i) => (
                          <div key={i}>{error}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  {importResult.insertErrors.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-red-600 mb-2">
                        Erros de Inserção ({importResult.insertErrors.length})
                      </h4>
                      <div className="text-xs bg-red-50 p-3 rounded border max-h-32 overflow-y-auto">
                        {importResult.insertErrors.map((error, i) => (
                          <div key={i}>{error}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={handleClose}>
              {importResult ? 'Fechar' : 'Cancelar'}
            </Button>
            
            {!importResult && (
              <Button 
                onClick={handleImport}
                disabled={isImporting}
              >
                {isImporting ? 'Importando...' : 'Iniciar Importação'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}