import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface InteractiveMessageProps {
  interactive: any;
  isOutbound: boolean;
  className?: string;
}

export function InteractiveMessage({ interactive, isOutbound, className }: InteractiveMessageProps) {
  if (!interactive) return null;

  const renderInteractiveContent = () => {
    switch (interactive.type) {
      case 'list':
        return (
          <div className="space-y-3">
            {interactive.header && (
              <div className="font-semibold text-sm">
                {interactive.header.text}
              </div>
            )}
            {interactive.body && (
              <div className="text-sm opacity-90">
                {interactive.body.text}
              </div>
            )}
            {interactive.action && (
              <div className="space-y-2">
                <div className="text-xs opacity-70 uppercase tracking-wider">
                  {interactive.action.button || 'Ver opções'}
                </div>
                {interactive.action.sections?.map((section: any, idx: number) => (
                  <div key={idx} className="border rounded-lg p-3 bg-muted/20">
                    {section.title && (
                      <div className="font-medium text-sm mb-2">{section.title}</div>
                    )}
                    <div className="space-y-1">
                      {section.rows?.map((row: any, rowIdx: number) => (
                        <div key={rowIdx} className="text-sm p-2 rounded border-l-2 border-primary/30">
                          <div className="font-medium">{row.title}</div>
                          {row.description && (
                            <div className="text-xs opacity-70 mt-1">{row.description}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'button':
        return (
          <div className="space-y-3">
            {interactive.header && (
              <div className="font-semibold text-sm">
                {interactive.header.text}
              </div>
            )}
            {interactive.body && (
              <div className="text-sm opacity-90">
                {interactive.body.text}
              </div>
            )}
            {interactive.action?.buttons && (
              <div className="flex flex-col gap-2">
                {interactive.action.buttons.map((button: any, idx: number) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    className="justify-start h-auto p-3 text-left"
                    disabled
                  >
                    <div>
                      <div className="font-medium text-sm">{button.reply?.title}</div>
                      {button.reply?.id && (
                        <div className="text-xs opacity-60">ID: {button.reply.id}</div>
                      )}
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="text-sm opacity-70">
            Mensagem interativa não suportada: {interactive.type}
          </div>
        );
    }
  };

  return (
    <div className={cn(
      "rounded-lg border p-4 bg-card",
      isOutbound ? "border-primary/20 bg-primary/5" : "border-border",
      className
    )}>
      {renderInteractiveContent()}
    </div>
  );
}