import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Upload, CheckCircle, XCircle, Info, FileSpreadsheet, 
  ArrowRight, ChevronLeft, ChevronRight, AlertCircle
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useContactTags } from "@/hooks/useContactTags";

interface ImportResult {
  success: boolean;
  totalProcessed: number;
  inserted: number;
  updated: number;
  errors: string[];
  summary: string;
}

interface ParsedContact {
  name?: string;
  phone: string;
  email?: string;
  contact_type?: string;
  notes?: string;
  selected: boolean;
}

interface ColumnMapping {
  phone: string;
  name: string;
  email: string;
  notes: string;
}

type ContactType = "lead" | "prospect" | "engajado" | "campanha";

interface ImportMarketingContactsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: () => void;
}

const REQUIRED_FIELDS = ["phone"] as const;
const OPTIONAL_FIELDS = ["name", "email", "notes"] as const;

export function ImportMarketingContactsModal({ 
  open, 
  onOpenChange, 
  onImportComplete 
}: ImportMarketingContactsModalProps) {
  const [step, setStep] = useState<"upload" | "mapping" | "preview" | "importing" | "result">("upload");
  const [csvText, setCsvText] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    phone: "",
    name: "",
    email: "",
    notes: "",
  });
  const [parsedContacts, setParsedContacts] = useState<ParsedContact[]>([]);
  const [defaultContactType, setDefaultContactType] = useState<ContactType>("lead");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: availableTags = [] } = useContactTags("marketing");

  const resetState = () => {
    setStep("upload");
    setCsvText("");
    setFileName("");
    setHeaders([]);
    setRows([]);
    setColumnMapping({ phone: "", name: "", email: "", notes: "" });
    setParsedContacts([]);
    setDefaultContactType("lead");
    setSelectedTagIds([]);
    setIsImporting(false);
    setImportProgress(0);
    setImportResult(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setFileName(file.name);
    
    try {
      const text = await file.text();
      setCsvText(text);
      parseCSV(text);
    } catch (err) {
      console.error("Erro ao ler o arquivo CSV:", err);
      toast({
        title: "Erro ao ler arquivo",
        description: "Não foi possível ler o conteúdo do CSV.",
        variant: "destructive",
      });
    }
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if ((char === "," || char === ";") && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  };

  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) {
      toast({
        title: "Arquivo inválido",
        description: "O CSV deve ter pelo menos um cabeçalho e uma linha de dados.",
        variant: "destructive",
      });
      return;
    }

    const headerRow = parseCSVLine(lines[0]);
    setHeaders(headerRow);

    const dataRows = lines.slice(1).map(line => parseCSVLine(line));
    setRows(dataRows);

    // Auto-detect column mapping
    const autoMapping: ColumnMapping = { phone: "", name: "", email: "", notes: "" };
    
    headerRow.forEach((header, index) => {
      const h = header.toLowerCase().trim();
      if (h.includes("phone") || h.includes("telefone") || h.includes("celular") || h.includes("mobile") || h.includes("whatsapp")) {
        if (!autoMapping.phone) autoMapping.phone = index.toString();
      }
      if (h.includes("name") || h.includes("nome") || h === "display name" || h === "display_name") {
        if (!autoMapping.name) autoMapping.name = index.toString();
      }
      if (h.includes("email") || h.includes("e-mail")) {
        if (!autoMapping.email) autoMapping.email = index.toString();
      }
      if (h.includes("note") || h.includes("notes") || h.includes("observ") || h.includes("obs")) {
        if (!autoMapping.notes) autoMapping.notes = index.toString();
      }
    });

    setColumnMapping(autoMapping);
    setStep("mapping");
  };

  const formatPhoneNumber = (phone: string): string => {
    if (!phone) return "";
    
    const cleanPhone = phone.replace(/\D/g, "");
    
    if (cleanPhone.startsWith("55") && cleanPhone.length === 13) {
      return cleanPhone;
    }
    
    if (cleanPhone.length === 11) {
      return "55" + cleanPhone;
    }
    
    if (cleanPhone.length === 10) {
      const areaCode = cleanPhone.slice(0, 2);
      const number = cleanPhone.slice(2);
      return "55" + areaCode + "9" + number;
    }
    
    return cleanPhone;
  };

  const applyMapping = () => {
    if (!columnMapping.phone) {
      toast({
        title: "Mapeamento incompleto",
        description: "A coluna de telefone é obrigatória.",
        variant: "destructive",
      });
      return;
    }

    const contacts: ParsedContact[] = [];
    const phoneIndex = parseInt(columnMapping.phone);
    const nameIndex = columnMapping.name ? parseInt(columnMapping.name) : -1;
    const emailIndex = columnMapping.email ? parseInt(columnMapping.email) : -1;
    const notesIndex = columnMapping.notes ? parseInt(columnMapping.notes) : -1;

    rows.forEach((row) => {
      const rawPhone = row[phoneIndex];
      if (!rawPhone) return;

      const phone = formatPhoneNumber(rawPhone);
      if (phone.length < 10) return;

      contacts.push({
        phone,
        name: nameIndex >= 0 ? row[nameIndex] : undefined,
        email: emailIndex >= 0 ? row[emailIndex] : undefined,
        notes: notesIndex >= 0 ? row[notesIndex] : undefined,
        contact_type: defaultContactType,
        selected: true,
      });
    });

    setParsedContacts(contacts);
    setStep("preview");
  };

  const selectedContacts = useMemo(
    () => parsedContacts.filter(c => c.selected),
    [parsedContacts]
  );

  const toggleContact = (index: number) => {
    setParsedContacts(prev => 
      prev.map((c, i) => i === index ? { ...c, selected: !c.selected } : c)
    );
  };

  const toggleAll = (selected: boolean) => {
    setParsedContacts(prev => prev.map(c => ({ ...c, selected })));
  };

  const handleImport = async () => {
    if (selectedContacts.length === 0) {
      toast({
        title: "Nenhum contato selecionado",
        description: "Selecione ao menos um contato para importar.",
        variant: "destructive",
      });
      return;
    }

    setStep("importing");
    setIsImporting(true);
    setImportProgress(0);

    let inserted = 0;
    let updated = 0;
    const errors: string[] = [];
    const total = selectedContacts.length;

    for (let i = 0; i < selectedContacts.length; i++) {
      const contact = selectedContacts[i];
      
      try {
        // Check if contact exists
        const { data: existing } = await supabase
          .from("contacts")
          .select("id")
          .eq("phone", contact.phone)
          .maybeSingle();

        if (existing) {
          // Update existing
          const { error } = await supabase
            .from("contacts")
            .update({
              name: contact.name || undefined,
              email: contact.email || undefined,
              notes: contact.notes || undefined,
              department_code: "marketing",
              contact_type: defaultContactType,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);

          if (error) throw error;

          // Assign tags
          if (selectedTagIds.length > 0) {
            for (const tagId of selectedTagIds) {
              await supabase
                .from("contact_tag_assignments")
                .upsert({ contact_id: existing.id, tag_id: tagId }, { onConflict: "contact_id,tag_id" });
            }
          }

          updated++;
        } else {
          // Insert new
          const { data: newContact, error } = await supabase
            .from("contacts")
            .insert({
              phone: contact.phone,
              name: contact.name || null,
              email: contact.email || null,
              notes: contact.notes || null,
              department_code: "marketing",
              contact_type: defaultContactType,
              status: "ativo",
            })
            .select("id")
            .single();

          if (error) throw error;

          // Assign tags
          if (selectedTagIds.length > 0 && newContact) {
            for (const tagId of selectedTagIds) {
              await supabase
                .from("contact_tag_assignments")
                .insert({ contact_id: newContact.id, tag_id: tagId });
            }
          }

          inserted++;
        }
      } catch (err: any) {
        errors.push(`${contact.phone}: ${err.message}`);
      }

      setImportProgress(Math.round(((i + 1) / total) * 100));
    }

    const result: ImportResult = {
      success: errors.length === 0,
      totalProcessed: total,
      inserted,
      updated,
      errors,
      summary: `${inserted} novos contatos criados, ${updated} atualizados.`,
    };

    setImportResult(result);
    setIsImporting(false);
    setStep("result");

    // Refresh queries
    queryClient.invalidateQueries({ queryKey: ["marketing-contacts"] });
    queryClient.invalidateQueries({ queryKey: ["marketing-metrics"] });

    if (result.success) {
      toast({
        title: "Importação concluída",
        description: result.summary,
      });
      onImportComplete?.();
    }
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-pink-500" />
            Importar Contatos para Marketing
          </DialogTitle>
          <DialogDescription>
            {step === "upload" && "Faça upload de um arquivo CSV com os contatos"}
            {step === "mapping" && "Mapeie as colunas do CSV para os campos do contato"}
            {step === "preview" && "Revise os contatos antes de importar"}
            {step === "importing" && "Importando contatos..."}
            {step === "result" && "Resultado da importação"}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 py-2">
          {["upload", "mapping", "preview", "result"].map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === s || (step === "importing" && s === "preview")
                    ? "bg-pink-500 text-white"
                    : ["upload", "mapping", "preview", "importing", "result"].indexOf(step) > i
                    ? "bg-pink-200 text-pink-700"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </div>
              {i < 3 && <ArrowRight className="h-4 w-4 mx-2 text-muted-foreground" />}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-hidden">
          {/* Step 1: Upload */}
          {step === "upload" && (
            <div className="space-y-4 p-4">
              <div className="rounded-lg border p-4 bg-muted/50">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div className="space-y-2">
                    <h3 className="font-medium">Formato do CSV</h3>
                    <p className="text-sm text-muted-foreground">
                      O arquivo deve conter pelo menos uma coluna com números de telefone.
                      Colunas opcionais: nome, email, observações.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Separadores aceitos: vírgula (,) ou ponto e vírgula (;)
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Arquivo CSV</Label>
                <Input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  className="cursor-pointer"
                />
                {fileName && (
                  <p className="text-xs text-muted-foreground">
                    Selecionado: {fileName} ({(csvText.length / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Column Mapping */}
          {step === "mapping" && (
            <div className="space-y-4 p-4">
              <div className="rounded-lg border p-3 bg-muted/50">
                <p className="text-sm">
                  <strong>{rows.length}</strong> linhas encontradas no arquivo.
                  Mapeie as colunas abaixo:
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    Telefone <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={columnMapping.phone}
                    onValueChange={(v) => setColumnMapping(prev => ({ ...prev, phone: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a coluna" />
                    </SelectTrigger>
                    <SelectContent>
                      {headers.map((header, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          {header || `Coluna ${i + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Select
                    value={columnMapping.name}
                    onValueChange={(v) => setColumnMapping(prev => ({ ...prev, name: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a coluna" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhum</SelectItem>
                      {headers.map((header, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          {header || `Coluna ${i + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <Select
                    value={columnMapping.email}
                    onValueChange={(v) => setColumnMapping(prev => ({ ...prev, email: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a coluna" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhum</SelectItem>
                      {headers.map((header, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          {header || `Coluna ${i + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Select
                    value={columnMapping.notes}
                    onValueChange={(v) => setColumnMapping(prev => ({ ...prev, notes: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a coluna" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhum</SelectItem>
                      {headers.map((header, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          {header || `Coluna ${i + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border-t pt-4 space-y-4">
                <div className="space-y-2">
                  <Label>Tipo de contato padrão</Label>
                  <Select
                    value={defaultContactType}
                    onValueChange={(v) => setDefaultContactType(v as ContactType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lead">Lead</SelectItem>
                      <SelectItem value="prospect">Prospect</SelectItem>
                      <SelectItem value="engajado">Engajado</SelectItem>
                      <SelectItem value="campanha">Campanha</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {availableTags.length > 0 && (
                  <div className="space-y-2">
                    <Label>Atribuir tags aos contatos importados</Label>
                    <div className="flex flex-wrap gap-2">
                      {availableTags.map((tag) => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => {
                            setSelectedTagIds(prev =>
                              prev.includes(tag.id)
                                ? prev.filter(id => id !== tag.id)
                                : [...prev, tag.id]
                            );
                          }}
                          className={`px-3 py-1 rounded-full text-sm transition-all border ${
                            selectedTagIds.includes(tag.id)
                              ? "ring-2 ring-offset-1 ring-primary"
                              : "opacity-70 hover:opacity-100"
                          }`}
                          style={{
                            backgroundColor: tag.color + "20",
                            color: tag.color,
                            borderColor: tag.color,
                          }}
                        >
                          {tag.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Preview of first rows */}
              {rows.length > 0 && (
                <div className="space-y-2">
                  <Label>Prévia das primeiras linhas:</Label>
                  <ScrollArea className="h-32 border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {headers.map((h, i) => (
                            <TableHead key={i} className="text-xs whitespace-nowrap">
                              {h || `Col ${i + 1}`}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.slice(0, 3).map((row, i) => (
                          <TableRow key={i}>
                            {row.map((cell, j) => (
                              <TableCell key={j} className="text-xs py-1">
                                {cell?.slice(0, 30) || "-"}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Preview */}
          {step === "preview" && (
            <div className="space-y-4 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="selectAll"
                    checked={selectedContacts.length === parsedContacts.length}
                    onCheckedChange={(checked) => toggleAll(!!checked)}
                  />
                  <Label htmlFor="selectAll" className="text-sm">
                    Selecionar todos ({selectedContacts.length}/{parsedContacts.length})
                  </Label>
                </div>
                <Badge variant="outline" className="bg-pink-50 text-pink-700 border-pink-200">
                  {defaultContactType}
                </Badge>
              </div>

              <ScrollArea className="h-[350px] border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Observações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedContacts.map((contact, i) => (
                      <TableRow 
                        key={i}
                        className={!contact.selected ? "opacity-50" : ""}
                      >
                        <TableCell>
                          <Checkbox
                            checked={contact.selected}
                            onCheckedChange={() => toggleContact(i)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {contact.phone}
                        </TableCell>
                        <TableCell>{contact.name || "-"}</TableCell>
                        <TableCell className="text-sm">{contact.email || "-"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {contact.notes || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>

              {selectedTagIds.length > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Tags a atribuir:</span>
                  {availableTags
                    .filter(t => selectedTagIds.includes(t.id))
                    .map(tag => (
                      <Badge
                        key={tag.id}
                        style={{ backgroundColor: tag.color + "20", color: tag.color }}
                      >
                        {tag.name}
                      </Badge>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Step: Importing */}
          {step === "importing" && (
            <div className="space-y-4 p-8 text-center">
              <div className="flex justify-center">
                <Upload className="h-12 w-12 text-pink-500 animate-pulse" />
              </div>
              <h3 className="text-lg font-medium">Importando contatos...</h3>
              <Progress value={importProgress} className="h-3" />
              <p className="text-sm text-muted-foreground">
                {importProgress}% concluído
              </p>
            </div>
          )}

          {/* Step 4: Result */}
          {step === "result" && importResult && (
            <div className="space-y-4 p-4">
              <div
                className={`rounded-lg border p-4 ${
                  importResult.errors.length === 0
                    ? "bg-green-50 border-green-200"
                    : "bg-amber-50 border-amber-200"
                }`}
              >
                <div className="flex items-start gap-3">
                  {importResult.errors.length === 0 ? (
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <h3 className="font-medium">
                      {importResult.errors.length === 0
                        ? "Importação Concluída"
                        : "Importação Concluída com Avisos"}
                    </h3>
                    <p className="text-sm">{importResult.summary}</p>
                  </div>
                </div>
              </div>

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
                  <div className="text-2xl font-bold text-foreground">
                    {importResult.totalProcessed}
                  </div>
                  <div className="text-sm text-muted-foreground">Total</div>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-destructive mb-2">
                    Erros ({importResult.errors.length})
                  </h4>
                  <ScrollArea className="h-32 border rounded-md bg-destructive/5 p-3">
                    {importResult.errors.map((error, i) => (
                      <div key={i} className="text-xs text-destructive">
                        {error}
                      </div>
                    ))}
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between border-t pt-4">
          <div>
            {step === "mapping" && (
              <Button variant="outline" onClick={() => setStep("upload")}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
            )}
            {step === "preview" && (
              <Button variant="outline" onClick={() => setStep("mapping")}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              {step === "result" ? "Fechar" : "Cancelar"}
            </Button>

            {step === "mapping" && (
              <Button
                onClick={applyMapping}
                disabled={!columnMapping.phone}
                className="bg-pink-500 hover:bg-pink-600"
              >
                Continuar
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}

            {step === "preview" && (
              <Button
                onClick={handleImport}
                disabled={selectedContacts.length === 0 || isImporting}
                className="bg-pink-500 hover:bg-pink-600"
              >
                <Upload className="h-4 w-4 mr-2" />
                Importar {selectedContacts.length} contatos
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
