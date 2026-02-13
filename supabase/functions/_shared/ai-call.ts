// ========== AI LLM CALL ==========
// Shared OpenAI/Lovable gateway call for edge functions

import { ConversationMessage } from './types.ts';

export async function callLLM(
  systemPrompt: string,
  conversationHistory: ConversationMessage[],
  userMessage: string,
  tools: any[],
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<{ content: string; toolCalls: any[] }> {
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  
  if (!lovableApiKey) {
    throw new Error('Lovable AI API key not configured');
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage }
  ];

  const body: any = {
    model: options.model || 'openai/gpt-5',
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 500,
  };

  if (tools.length > 0) {
    body.tools = tools;
    body.tool_choice = 'auto';
  }

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LLM API error: ${error}`);
  }

  const data = await response.json();
  const choice = data.choices[0];
  
  return {
    content: choice.message.content || '',
    toolCalls: choice.message.tool_calls || []
  };
}
