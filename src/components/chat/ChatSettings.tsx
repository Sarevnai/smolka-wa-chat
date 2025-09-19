import { useState } from "react";
import { Settings, Bell, Shield, Download, Trash2, Archive, Moon, Sun } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useTheme } from "@/components/ui/theme-provider";

interface ChatSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  phoneNumber: string;
  onExportChat: () => void;
  onArchiveChat: () => void;
  onDeleteChat: () => void;
}

export function ChatSettings({ 
  isOpen, 
  onClose, 
  phoneNumber, 
  onExportChat, 
  onArchiveChat, 
  onDeleteChat 
}: ChatSettingsProps) {
  const [notifications, setNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);
  const [mediaAutoDownload, setMediaAutoDownload] = useState(false);
  const { theme, setTheme } = useTheme();

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configurações do chat
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Contact info */}
          <div>
            <h3 className="font-medium mb-2">Contato</h3>
            <p className="text-sm text-muted-foreground">{phoneNumber}</p>
          </div>

          <Separator />

          {/* Notifications */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notificações
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="notifications" className="text-sm">
                  Ativar notificações
                </Label>
                <Switch
                  id="notifications"
                  checked={notifications}
                  onCheckedChange={setNotifications}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="sound" className="text-sm">
                  Som das notificações
                </Label>
                <Switch
                  id="sound"
                  checked={soundEnabled}
                  onCheckedChange={setSoundEnabled}
                  disabled={!notifications}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Privacy */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Privacidade
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="read-receipts" className="text-sm">
                  Confirmações de leitura
                </Label>
                <Switch
                  id="read-receipts"
                  checked={readReceipts}
                  onCheckedChange={setReadReceipts}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-download" className="text-sm">
                  Download automático de mídia
                </Label>
                <Switch
                  id="auto-download"
                  checked={mediaAutoDownload}
                  onCheckedChange={setMediaAutoDownload}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Theme */}
          <div className="space-y-4">
            <h3 className="font-medium">Tema</h3>
            
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={theme === "light" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("light")}
                className="flex items-center gap-2"
              >
                <Sun className="h-3 w-3" />
                Claro
              </Button>
              
              <Button
                variant={theme === "dark" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("dark")}
                className="flex items-center gap-2"
              >
                <Moon className="h-3 w-3" />
                Escuro
              </Button>
              
              <Button
                variant={theme === "system" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("system")}
                className="text-xs"
              >
                Sistema
              </Button>
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="space-y-3">
            <h3 className="font-medium">Ações</h3>
            
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={onExportChat}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar conversa
              </Button>
              
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={onArchiveChat}
              >
                <Archive className="h-4 w-4 mr-2" />
                Arquivar conversa
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir conversa
                  </Button>
                </AlertDialogTrigger>
                
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir conversa</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja excluir esta conversa? Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={onDeleteChat}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}