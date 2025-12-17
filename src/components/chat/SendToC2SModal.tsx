import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, Loader2, Building2, User, Phone, Mail, MapPin, Home } from "lucide-react";

interface SendToC2SModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phoneNumber: string;
  contactName?: string;
  contactEmail?: string;
  conversationHistory?: string;
  contactId?: string;
  conversationId?: string;
}

export function SendToC2SModal({
  open,
  onOpenChange,
  phoneNumber,
  contactName,
  contactEmail,
  conversationHistory,
  contactId,
  conversationId,
}: SendToC2SModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: contactName || "",
    email: contactEmail || "",
    property_type: "",
    neighborhood: "",
    price_range: "",
    bedrooms: "",
    description: "",
  });

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setFormData({
        name: contactName || "",
        email: contactEmail || "",
        property_type: "",
        neighborhood: "",
        price_range: "",
        bedrooms: "",
        description: "",
      });
    }
  }, [open, contactName, contactEmail]);

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("c2s-create-lead", {
        body: {
          name: formData.name,
          phone: phoneNumber,
          email: formData.email || undefined,
          type_negotiation: "Compra",
          property_type: formData.property_type || undefined,
          neighborhood: formData.neighborhood || undefined,
          price_range: formData.price_range || undefined,
          bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : undefined,
          description: formData.description || undefined,
          conversation_history: conversationHistory,
          contact_id: contactId,
          conversation_id: conversationId,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success("Lead enviado para C2S!", {
          description: `ID do lead: ${data.c2s_lead_id || "N/A"}`,
        });
        onOpenChange(false);
      } else {
        throw new Error(data?.error || "Erro ao enviar lead");
      }
    } catch (error) {
      console.error("Error sending to C2S:", error);
      toast.error("Erro ao enviar para C2S", {
        description: error instanceof Error ? error.message : "Tente novamente",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Enviar Lead para C2S
          </DialogTitle>
          <DialogDescription>
            Envie este lead qualificado para o sistema C2S dos corretores de vendas
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-1">
                <User className="h-3 w-3" />
                Nome *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome do cliente"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                Telefone
              </Label>
              <Input id="phone" value={phoneNumber} disabled className="bg-muted" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-1">
              <Mail className="h-3 w-3" />
              E-mail
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="email@exemplo.com"
            />
          </div>

          {/* Property Criteria */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-3 flex items-center gap-2">
              <Home className="h-4 w-4" />
              Critérios do Imóvel
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="property_type">Tipo</Label>
                <Input
                  id="property_type"
                  value={formData.property_type}
                  onChange={(e) => setFormData({ ...formData, property_type: e.target.value })}
                  placeholder="Apartamento, Casa..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="neighborhood" className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Bairro
                </Label>
                <Input
                  id="neighborhood"
                  value={formData.neighborhood}
                  onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                  placeholder="Centro, Agronômica..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price_range">Faixa de Preço</Label>
                <Input
                  id="price_range"
                  value={formData.price_range}
                  onChange={(e) => setFormData({ ...formData, price_range: e.target.value })}
                  placeholder="R$ 500k - R$ 800k"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bedrooms">Quartos</Label>
                <Input
                  id="bedrooms"
                  type="number"
                  value={formData.bedrooms}
                  onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                  placeholder="3"
                />
              </div>
            </div>
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="description">Observações</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Informações adicionais sobre o interesse do cliente..."
              rows={3}
            />
          </div>

          {/* Info Badge */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <Badge variant="outline" className="shrink-0">
              C2S
            </Badge>
            <span>
              O histórico da conversa será incluído automaticamente no corpo do lead
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="gap-2">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Enviar para C2S
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
