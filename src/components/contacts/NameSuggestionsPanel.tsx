import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ContactNameSuggestion } from "./ContactNameSuggestion";
import { useNameSuggestions } from "@/hooks/useNameSuggestions";
import { SparklesIcon, XIcon } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export function NameSuggestionsPanel() {
  const { data: suggestions = [], isLoading, refetch } = useNameSuggestions();
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());
  const [isOpen, setIsOpen] = useState(true);

  const activeSuggestions = suggestions.filter(
    suggestion => !dismissedSuggestions.has(suggestion.contactId)
  );

  const handleDismiss = (contactId: string) => {
    setDismissedSuggestions(prev => new Set([...prev, contactId]));
  };

  const handleAccept = () => {
    refetch(); // Refresh suggestions after accepting
  };

  if (isLoading || activeSuggestions.length === 0) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-primary/5 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SparklesIcon className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm">Sugestões de Nome</CardTitle>
                <Badge variant="secondary" className="h-5">
                  {activeSuggestions.length}
                </Badge>
              </div>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <XIcon className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            <ScrollArea className="max-h-96">
              <div className="space-y-3">
                {activeSuggestions.map((suggestion) => (
                  <ContactNameSuggestion
                    key={suggestion.contactId}
                    contact={{
                      id: suggestion.contactId,
                      name: suggestion.currentName,
                      phone: suggestion.phone
                    }}
                    suggestedName={suggestion.suggestedName}
                    onDismiss={() => handleDismiss(suggestion.contactId)}
                    onAccept={handleAccept}
                  />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}