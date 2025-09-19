import { format, isToday, isYesterday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DateSeparatorProps {
  date: string;
}

export function DateSeparator({ date }: DateSeparatorProps) {
  const formatDateLabel = (dateString: string) => {
    try {
      const messageDate = parseISO(dateString);
      
      if (isToday(messageDate)) {
        return "Hoje";
      } else if (isYesterday(messageDate)) {
        return "Ontem";
      } else {
        return format(messageDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
      }
    } catch {
      return "";
    }
  };

  return (
    <div className="flex justify-center my-4">
      <div className="bg-muted/80 backdrop-blur-sm px-3 py-1 rounded-lg">
        <span className="text-xs text-muted-foreground font-medium">
          {formatDateLabel(date)}
        </span>
      </div>
    </div>
  );
}