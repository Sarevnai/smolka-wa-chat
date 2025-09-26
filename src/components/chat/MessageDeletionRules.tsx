import { MessageRow } from "@/lib/messages";
import { differenceInMinutes, parseISO } from "date-fns";

export interface MessageDeletionPermissions {
  canDeleteForMe: boolean;
  canDeleteForEveryone: boolean;
  reasonForEveryone?: string;
}

export function getMessageDeletionPermissions(
  message: MessageRow, 
  currentUserId?: string
): MessageDeletionPermissions {
  const isOutbound = message.direction === "outbound";
  
  // Can always delete for yourself
  const canDeleteForMe = true;
  
  // Can only delete for everyone if:
  // 1. It's an outbound message (sent by you)
  // 2. Within time limit (7 days for WhatsApp-like behavior)
  let canDeleteForEveryone = false;
  let reasonForEveryone: string | undefined;
  
  if (!isOutbound) {
    reasonForEveryone = "Você só pode excluir para todos mensagens que você enviou";
  } else {
    // Check time limit (7 days)
    const messageTime = parseISO(message.wa_timestamp || message.created_at || "");
    const minutesSinceSent = differenceInMinutes(new Date(), messageTime);
    const daysSinceSent = minutesSinceSent / (24 * 60);
    
    if (daysSinceSent > 7) {
      reasonForEveryone = "Você só pode excluir para todos mensagens enviadas nos últimos 7 dias";
    } else {
      canDeleteForEveryone = true;
    }
  }
  
  return {
    canDeleteForMe,
    canDeleteForEveryone,
    reasonForEveryone
  };
}

// Helper function to format time remaining
export function getTimeRemainingForDeletion(message: MessageRow): string | null {
  if (message.direction !== "outbound") return null;
  
  const messageTime = parseISO(message.wa_timestamp || message.created_at || "");
  const sevenDaysAfter = new Date(messageTime.getTime() + 7 * 24 * 60 * 60 * 1000);
  const now = new Date();
  
  if (now >= sevenDaysAfter) return null;
  
  const msRemaining = sevenDaysAfter.getTime() - now.getTime();
  const daysRemaining = Math.floor(msRemaining / (24 * 60 * 60 * 1000));
  const hoursRemaining = Math.floor((msRemaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  
  if (daysRemaining > 0) {
    return `${daysRemaining} dia${daysRemaining > 1 ? 's' : ''}`;
  } else if (hoursRemaining > 0) {
    return `${hoursRemaining} hora${hoursRemaining > 1 ? 's' : ''}`;
  } else {
    const minutesRemaining = Math.floor((msRemaining % (60 * 60 * 1000)) / (60 * 1000));
    return `${minutesRemaining} minuto${minutesRemaining > 1 ? 's' : ''}`;
  }
}