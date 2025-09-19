import { useState } from "react";
import { MessageRow } from "@/lib/messages";

interface ChatSettings {
  background: string;
  notifications: boolean;
  soundEnabled: boolean;
}

export function useChatSettings(phoneNumber: string) {
  const [settings, setSettings] = useState<ChatSettings>({
    background: '',
    notifications: true,
    soundEnabled: true
  });

  const updateBackground = (background: string) => {
    setSettings(prev => ({ ...prev, background }));
    // Save to localStorage
    localStorage.setItem(`chat-bg-${phoneNumber}`, background);
  };

  const exportChat = async (messages: MessageRow[]) => {
    try {
      const chatData = messages.map(msg => ({
        timestamp: msg.wa_timestamp || msg.created_at,
        direction: msg.direction,
        from: msg.wa_from,
        to: msg.wa_to,
        body: msg.body,
        mediaType: msg.media_type,
        mediaUrl: msg.media_url
      }));

      const dataStr = JSON.stringify(chatData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `chat-${phoneNumber}-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting chat:', error);
    }
  };

  const archiveChat = async () => {
    // TODO: Implement archive functionality
    console.log('Archive chat:', phoneNumber);
  };

  const deleteChat = async () => {
    // TODO: Implement delete functionality
    console.log('Delete chat:', phoneNumber);
  };

  return {
    settings,
    updateBackground,
    exportChat,
    archiveChat,
    deleteChat
  };
}