import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface ShortcutConfig {
  key: string;
  action: () => void;
  description: string;
  ctrlOrCmd?: boolean;
  shift?: boolean;
  alt?: boolean;
}

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const shortcuts: ShortcutConfig[] = [
    {
      key: 'h',
      action: () => navigate('/'),
      description: 'Ir para Dashboard',
      ctrlOrCmd: true
    },
    {
      key: 'i',
      action: () => navigate('/inbox'),
      description: 'Abrir Inbox',
      ctrlOrCmd: true
    },
    {
      key: 'c',
      action: () => navigate('/chat'),
      description: 'Abrir Conversas',
      ctrlOrCmd: true
    },
    {
      key: 's',
      action: () => navigate('/send'),
      description: 'Nova Campanha',
      ctrlOrCmd: true
    },
    {
      key: 'u',
      action: () => navigate('/contacts'),
      description: 'Ver Contatos',
      ctrlOrCmd: true
    },
    {
      key: 'r',
      action: () => navigate('/reports'),
      description: 'Ver Relatórios',
      ctrlOrCmd: true
    },
    {
      key: 'p',
      action: () => navigate('/profile'),
      description: 'Abrir Perfil',
      ctrlOrCmd: true
    },
    {
      key: 'g',
      action: () => navigate('/integrations'),
      description: 'Ver Integrações',
      ctrlOrCmd: true
    },
    {
      key: '/',
      action: () => {
        toast({
          title: "Atalhos de Teclado",
          description: (
            "Atalhos de Teclado:\nCtrl/Cmd + H - Dashboard\nCtrl/Cmd + I - Inbox\nCtrl/Cmd + C - Conversas\nCtrl/Cmd + S - Nova Campanha\nCtrl/Cmd + U - Contatos\nCtrl/Cmd + R - Relatórios\nCtrl/Cmd + P - Perfil\nCtrl/Cmd + G - Integrações\n? - Ver atalhos"
          ),
        });
      },
      description: 'Mostrar atalhos'
    }
  ];

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    if (event.target instanceof HTMLInputElement || 
        event.target instanceof HTMLTextAreaElement || 
        event.target instanceof HTMLSelectElement ||
        (event.target as HTMLElement).contentEditable === 'true') {
      return;
    }

    const isCtrlOrCmd = event.ctrlKey || event.metaKey;

    for (const shortcut of shortcuts) {
      const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatches = shortcut.ctrlOrCmd ? isCtrlOrCmd : !isCtrlOrCmd;
      const shiftMatches = shortcut.shift ? event.shiftKey : !event.shiftKey;
      const altMatches = shortcut.alt ? event.altKey : !event.altKey;

      if (keyMatches && ctrlMatches && shiftMatches && altMatches) {
        event.preventDefault();
        shortcut.action();
        break;
      }
    }
  }, [navigate, toast]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return { shortcuts };
}