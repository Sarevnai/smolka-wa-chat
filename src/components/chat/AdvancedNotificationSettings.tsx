import { Bell, Volume2, Clock, Zap } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAdvancedNotifications, NotificationSettings } from "@/hooks/useAdvancedNotifications";
import { Badge } from "@/components/ui/badge";

interface AdvancedNotificationSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdvancedNotificationSettings({ isOpen, onClose }: AdvancedNotificationSettingsProps) {
  const { settings, updateSettings, isInSilentMode, isInPeakHours } = useAdvancedNotifications();

  const handleTestSound = () => {
    const audio = new Audio(`/sounds/notification${settings.soundType === 'default' ? '' : `-${settings.soundType}`}.${settings.soundType === 'default' ? 'wav' : 'mp3'}`);
    audio.volume = settings.volume;
    audio.play().catch(console.error);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Configurações Avançadas de Notificações
            <div className="flex gap-2 ml-auto">
              {isInSilentMode && <Badge variant="secondary">Modo Silencioso</Badge>}
              {isInPeakHours && <Badge variant="default">Horário de Pico</Badge>}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Tipos de Notificação */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Tipos de Notificação
            </h3>
            
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label className="font-medium">Novos chats</Label>
                  <p className="text-sm text-muted-foreground">Notificar quando uma nova conversa for iniciada</p>
                </div>
                <Switch
                  checked={settings.newChats}
                  onCheckedChange={(checked) => updateSettings({ newChats: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label className="font-medium">Chats prioritários</Label>
                  <p className="text-sm text-muted-foreground">Notificar para contatos importantes</p>
                </div>
                <Switch
                  checked={settings.priorityChats}
                  onCheckedChange={(checked) => updateSettings({ priorityChats: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label className="font-medium">Menções</Label>
                  <p className="text-sm text-muted-foreground">Quando você for mencionado</p>
                </div>
                <Switch
                  checked={settings.mentions}
                  onCheckedChange={(checked) => updateSettings({ mentions: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label className="font-medium">Mensagens com mídia</Label>
                  <p className="text-sm text-muted-foreground">Fotos, vídeos e arquivos</p>
                </div>
                <Switch
                  checked={settings.mediaMessages}
                  onCheckedChange={(checked) => updateSettings({ mediaMessages: checked })}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Som das Notificações */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              Som das Notificações
            </h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de som</Label>
                <Select
                  value={settings.soundType}
                  onValueChange={(value: 'default' | 'subtle' | 'urgent') => 
                    updateSettings({ soundType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Padrão</SelectItem>
                    <SelectItem value="subtle">Sutil</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Volume</Label>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(settings.volume * 100)}%
                  </span>
                </div>
                <Slider
                  value={[settings.volume * 100]}
                  onValueChange={([value]) => updateSettings({ volume: value / 100 })}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>

              <Button variant="outline" onClick={handleTestSound} className="w-full">
                Testar Som
              </Button>
            </div>
          </div>

          <Separator />

          {/* Regras de Horário */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Regras de Horário
            </h3>

            <div className="space-y-4">
              {/* Modo Silencioso */}
              <div className="p-3 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Modo silencioso</Label>
                    <p className="text-sm text-muted-foreground">
                      Desabilitar notificações em horários específicos
                    </p>
                  </div>
                  <Switch
                    checked={settings.silentModeEnabled}
                    onCheckedChange={(checked) => updateSettings({ silentModeEnabled: checked })}
                  />
                </div>

                {settings.silentModeEnabled && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-sm">Início</Label>
                      <Input
                        type="time"
                        value={settings.silentStart}
                        onChange={(e) => updateSettings({ silentStart: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Fim</Label>
                      <Input
                        type="time"
                        value={settings.silentEnd}
                        onChange={(e) => updateSettings({ silentEnd: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Horário de Pico */}
              <div className="p-3 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Horário de pico</Label>
                    <p className="text-sm text-muted-foreground">
                      Aumentar volume durante horários de trabalho
                    </p>
                  </div>
                  <Switch
                    checked={settings.peakHoursEnabled}
                    onCheckedChange={(checked) => updateSettings({ peakHoursEnabled: checked })}
                  />
                </div>

                {settings.peakHoursEnabled && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-sm">Início</Label>
                      <Input
                        type="time"
                        value={settings.peakStart}
                        onChange={(e) => updateSettings({ peakStart: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Fim</Label>
                      <Input
                        type="time"
                        value={settings.peakEnd}
                        onChange={(e) => updateSettings({ peakEnd: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={onClose}>
              Salvar Configurações
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}