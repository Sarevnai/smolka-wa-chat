import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Megaphone } from "lucide-react";

interface StepNameProps {
  name: string;
  description: string;
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
}

export default function StepName({ 
  name, 
  description, 
  onNameChange, 
  onDescriptionChange 
}: StepNameProps) {
  return (
    <div className="max-w-xl mx-auto">
      <Card>
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Megaphone className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Nome da Campanha</CardTitle>
          <CardDescription>
            Defina um nome claro e descritivo para identificar sua campanha
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          <div className="space-y-2">
            <Label htmlFor="campaign-name" className="text-base font-medium">
              Nome da Campanha *
            </Label>
            <Input
              id="campaign-name"
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Ex: Promoção de Janeiro 2025"
              className="h-12 text-base"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              O nome será usado para identificar a campanha nos relatórios
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="campaign-description" className="text-base font-medium">
              Descrição (opcional)
            </Label>
            <Textarea
              id="campaign-description"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="Descreva brevemente o objetivo da campanha..."
              className="min-h-[100px] resize-none"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
