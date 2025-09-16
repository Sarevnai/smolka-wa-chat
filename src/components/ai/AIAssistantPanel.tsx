import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Brain, 
  MessageSquare, 
  AlertTriangle, 
  CheckCircle, 
  Copy,
  Zap,
  Target,
  FileText 
} from 'lucide-react';
import { useAIAssistant } from '@/hooks/useAIAssistant';
import { useToast } from '@/hooks/use-toast';

interface AIAssistantPanelProps {
  contactPhone?: string;
  messageId?: number;
  messageText?: string;
  messageDirection?: 'inbound' | 'outbound';
  onSuggestionApply?: (suggestion: any) => void;
  className?: string;
}

const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({
  contactPhone,
  messageId,
  messageText,
  messageDirection,
  onSuggestionApply,
  className = ''
}) => {
  const {
    suggestions,
    isLoading,
    generateSuggestions,
    useSuggestion,
    getResponseSuggestions,
    getClassificationSuggestions,
    getActionSuggestions,
    getUrgencySuggestions,
    getDataExtractionSuggestions
  } = useAIAssistant(contactPhone, messageId);

  const { toast } = useToast();

  const handleGenerateSuggestions = async () => {
    if (!messageId || !contactPhone || !messageText || !messageDirection) return;
    
    await generateSuggestions(messageId, contactPhone, messageText, messageDirection);
  };

  const handleApplySuggestion = async (suggestion: any) => {
    await useSuggestion(suggestion.id);
    onSuggestionApply?.(suggestion);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado",
      description: "Texto copiado para a área de transferência",
    });
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-700';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'response': return <MessageSquare className="h-4 w-4" />;
      case 'classification': return <Target className="h-4 w-4" />;
      case 'urgency': return <AlertTriangle className="h-4 w-4" />;
      case 'action': return <Zap className="h-4 w-4" />;
      case 'data_extraction': return <FileText className="h-4 w-4" />;
      default: return <Brain className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'response': return 'Resposta Sugerida';
      case 'classification': return 'Classificação';
      case 'urgency': return 'Urgência';
      case 'action': return 'Ações Recomendadas';
      case 'data_extraction': return 'Dados Extraídos';
      default: return type;
    }
  };

  const responseSuggestions = getResponseSuggestions();
  const classificationSuggestions = getClassificationSuggestions();
  const actionSuggestions = getActionSuggestions();
  const urgencySuggestions = getUrgencySuggestions();
  const dataExtractionSuggestions = getDataExtractionSuggestions();

  return (
    <Card className={`w-full max-w-md ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-lg">Assistente de IA</CardTitle>
            <CardDescription>Sugestões inteligentes para atendimento</CardDescription>
          </div>
        </div>
        
        {messageText && messageDirection && (
          <Button 
            onClick={handleGenerateSuggestions}
            disabled={isLoading}
            size="sm"
            className="w-full mt-2"
          >
            {isLoading ? 'Analisando...' : 'Analisar Mensagem'}
          </Button>
        )}
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-96">
          {suggestions.length === 0 && !isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              <Brain className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma sugestão disponível</p>
              <p className="text-sm">Clique em "Analisar Mensagem" para gerar sugestões</p>
            </div>
          )}

          {/* Response Suggestions */}
          {responseSuggestions.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Respostas Sugeridas
              </h4>
              {responseSuggestions.map((suggestion) => (
                <Card key={suggestion.id} className="mb-2">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <Badge className={getConfidenceColor(suggestion.confidence_score)}>
                        {Math.round(suggestion.confidence_score * 100)}%
                      </Badge>
                      {suggestion.is_used && (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                    <p className="text-sm mb-3">{suggestion.suggestion_content.text}</p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(suggestion.suggestion_content.text)}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copiar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleApplySuggestion(suggestion)}
                        disabled={suggestion.is_used}
                      >
                        Usar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Separator className="my-4" />
            </div>
          )}

          {/* Classification Suggestions */}
          {classificationSuggestions.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Classificação
              </h4>
              {classificationSuggestions.map((suggestion) => (
                <Card key={suggestion.id} className="mb-2">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={getConfidenceColor(suggestion.confidence_score)}>
                        {Math.round(suggestion.confidence_score * 100)}%
                      </Badge>
                    </div>
                    <p className="text-sm font-medium">{suggestion.suggestion_content.categoria}</p>
                    {suggestion.suggestion_content.subcategoria && (
                      <p className="text-xs text-muted-foreground">{suggestion.suggestion_content.subcategoria}</p>
                    )}
                    <Button
                      size="sm"
                      className="mt-2"
                      onClick={() => handleApplySuggestion(suggestion)}
                      disabled={suggestion.is_used}
                    >
                      Aplicar Classificação
                    </Button>
                  </CardContent>
                </Card>
              ))}
              <Separator className="my-4" />
            </div>
          )}

          {/* Urgency Suggestions */}
          {urgencySuggestions.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Análise de Urgência
              </h4>
              {urgencySuggestions.map((suggestion) => (
                <Card key={suggestion.id} className="mb-2">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={getConfidenceColor(suggestion.confidence_score)}>
                        {Math.round(suggestion.confidence_score * 100)}%
                      </Badge>
                    </div>
                    <p className="text-sm">
                      <strong>Prioridade:</strong> {suggestion.suggestion_content.nivel}
                    </p>
                    {suggestion.suggestion_content.motivo && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {suggestion.suggestion_content.motivo}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
              <Separator className="my-4" />
            </div>
          )}

          {/* Action Suggestions */}
          {actionSuggestions.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Próximas Ações
              </h4>
              {actionSuggestions.map((suggestion) => (
                <Card key={suggestion.id} className="mb-2">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={getConfidenceColor(suggestion.confidence_score)}>
                        {Math.round(suggestion.confidence_score * 100)}%
                      </Badge>
                    </div>
                    {Array.isArray(suggestion.suggestion_content) ? (
                      <ul className="text-sm space-y-1">
                        {suggestion.suggestion_content.map((action: string, index: number) => (
                          <li key={index} className="flex items-center gap-2">
                            <div className="h-1.5 w-1.5 bg-primary rounded-full" />
                            {action}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm">{suggestion.suggestion_content}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
              <Separator className="my-4" />
            </div>
          )}

          {/* Data Extraction */}
          {dataExtractionSuggestions.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Dados Identificados
              </h4>
              {dataExtractionSuggestions.map((suggestion) => (
                <Card key={suggestion.id} className="mb-2">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={getConfidenceColor(suggestion.confidence_score)}>
                        {Math.round(suggestion.confidence_score * 100)}%
                      </Badge>
                    </div>
                    <div className="space-y-2 text-sm">
                      {Object.entries(suggestion.suggestion_content).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="font-medium capitalize">{key.replace('_', ' ')}:</span>
                          <span>{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default AIAssistantPanel;