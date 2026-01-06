import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FileText, Image, Video, File } from "lucide-react";
import { useWhatsAppTemplateById } from "@/hooks/useWhatsAppTemplates";

interface TemplateBubbleProps {
  templateName: string;
  templateId?: string;
  isOutbound: boolean;
}

export function TemplateBubble({ templateName, templateId, isOutbound }: TemplateBubbleProps) {
  const { data: template, isLoading } = useWhatsAppTemplateById(templateId);

  // Parse template components to extract content
  const getTemplateContent = () => {
    if (!template?.components) return null;

    const components = template.components as Array<{
      type: string;
      format?: string;
      text?: string;
      buttons?: Array<{ type: string; text: string }>;
    }>;

    const header = components.find(c => c.type === 'HEADER');
    const body = components.find(c => c.type === 'BODY');
    const footer = components.find(c => c.type === 'FOOTER');
    const buttons = components.find(c => c.type === 'BUTTONS');

    return { header, body, footer, buttons };
  };

  const content = getTemplateContent();

  const getHeaderIcon = (format?: string) => {
    switch (format?.toUpperCase()) {
      case 'IMAGE': return <Image className="w-4 h-4" />;
      case 'VIDEO': return <Video className="w-4 h-4" />;
      case 'DOCUMENT': return <File className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="px-3 pt-3">
        <Badge variant="secondary" className="text-xs gap-1.5">
          <FileText className="w-3 h-3" />
          Template: {templateName}
        </Badge>
        <div className="mt-2 animate-pulse">
          <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  // If template not found or no content, show simple badge
  if (!content || !content.body?.text) {
    return (
      <div className="px-3 pt-3">
        <Badge variant="secondary" className="text-xs gap-1.5">
          <FileText className="w-3 h-3" />
          Template: {templateName}
        </Badge>
      </div>
    );
  }

  return (
    <div className="px-3 pt-3 space-y-2">
      {/* Template Badge */}
      <Badge variant="secondary" className="text-xs gap-1.5">
        <FileText className="w-3 h-3" />
        Template: {templateName}
      </Badge>

      {/* Header (if exists) */}
      {content.header && (
        <div className={cn(
          "flex items-center gap-2 p-2 rounded-lg",
          isOutbound ? "bg-white/20" : "bg-primary/5"
        )}>
          {getHeaderIcon(content.header.format)}
          {content.header.text && (
            <span className="text-sm font-medium">{content.header.text}</span>
          )}
          {content.header.format && !content.header.text && (
            <span className="text-xs text-muted-foreground">
              {content.header.format === 'IMAGE' && 'Imagem do header'}
              {content.header.format === 'VIDEO' && 'Vídeo do header'}
              {content.header.format === 'DOCUMENT' && 'Documento do header'}
            </span>
          )}
        </div>
      )}

      {/* Body */}
      <div className="text-sm leading-relaxed whitespace-pre-wrap">
        {content.body.text}
      </div>

      {/* Footer (if exists) */}
      {content.footer?.text && (
        <p className="text-xs text-muted-foreground italic">
          {content.footer.text}
        </p>
      )}

      {/* Buttons (if exists) */}
      {content.buttons?.buttons && content.buttons.buttons.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {content.buttons.buttons.map((btn, idx) => (
            <Button
              key={idx}
              variant="outline"
              size="sm"
              disabled
              className={cn(
                "text-xs h-8 cursor-default opacity-80",
                isOutbound 
                  ? "bg-white/30 border-white/50 text-gray-800" 
                  : "bg-primary/10 border-primary/30 text-primary"
              )}
            >
              {btn.text}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
