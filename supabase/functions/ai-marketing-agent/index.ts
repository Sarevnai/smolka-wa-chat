import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface PropertyData {
  codigo: string;
  endereco: string;
  bairro?: string;
  cidade?: string;
  valor: number;
  status?: string;
}

interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Extrair dados do imóvel do campo notes do contato
function parsePropertyFromNotes(notes: string): PropertyData | null {
  if (!notes) return null;

  try {
    // Formato esperado: "Imóvel: 3757 | Frei Caneca, 564 | Agronômica - Florianópolis | CEP: 88025-000 | Status: Ativo | Valor: R$ 1.490.000"
    const codigoMatch = notes.match(/Imóvel:\s*(\d+)/i);
    const enderecoMatch = notes.match(/Imóvel:\s*\d+\s*\|\s*([^|]+)/i);
    const bairroMatch = notes.match(/\|\s*([^|-]+)\s*-\s*([^|]+)\s*\|/i);
    const valorMatch = notes.match(/Valor:\s*R?\$?\s*([\d.,]+)/i);
    const statusMatch = notes.match(/Status:\s*([^|]+)/i);

    if (!codigoMatch) return null;

    let valor = 0;
    if (valorMatch) {
      valor = parseFloat(valorMatch[1].replace(/\./g, '').replace(',', '.'));
    }

    return {
      codigo: codigoMatch[1],
      endereco: enderecoMatch ? enderecoMatch[1].trim() : '',
      bairro: bairroMatch ? bairroMatch[1].trim() : undefined,
      cidade: bairroMatch ? bairroMatch[2].trim() : 'Florianópolis',
      valor: valor,
      status: statusMatch ? statusMatch[1].trim() : undefined,
    };
  } catch (error) {
    console.error('[AI Marketing] Erro ao parsear notes:', error);
    return null;
  }
}

// Formatar valor em reais
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// Tool para atualizar imóvel no Vista CRM
async function updatePropertyInVista(params: {
  codigo: string;
  status?: string;
  exibir_no_site?: boolean;
  valor_venda?: number;
  motivo?: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/vista-update-property`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify(params),
    });

    const result = await response.json();
    return {
      success: result.success,
      message: result.message || result.error || 'Atualização processada',
    };
  } catch (error) {
    console.error('[AI Marketing] Erro ao chamar vista-update-property:', error);
    return {
      success: false,
      message: `Erro ao atualizar: ${error.message}`,
    };
  }
}

// Definição de tools para OpenAI
const tools = [
  {
    type: "function",
    function: {
      name: "atualizar_imovel",
      description: "Atualiza informações de um imóvel no Vista CRM. Use quando o proprietário confirmar que o imóvel foi vendido, não está mais disponível, ou quando o valor precisa ser alterado.",
      parameters: {
        type: "object",
        properties: {
          codigo: {
            type: "string",
            description: "Código do imóvel no Vista CRM (ex: 3757)"
          },
          status: {
            type: "string",
            description: "Novo status do imóvel no Vista CRM",
            enum: [
              "Venda",
              "Aluguel",
              "Venda e Aluguel",
              "Aluguel Temporada",
              "Vendido Imobiliária",
              "Vendido Terceiros",
              "Alugado Terceiros",
              "Pendente",
              "Suspenso"
            ]
          },
          exibir_no_site: {
            type: "boolean",
            description: "Se o imóvel deve aparecer no site. Use false quando vendido/alugado."
          },
          valor_venda: {
            type: "number",
            description: "Novo valor de venda em reais (sem centavos). Ex: 1500000"
          },
          motivo: {
            type: "string",
            description: "Motivo da atualização para registro (ex: 'Confirmado pelo proprietário via WhatsApp')"
          }
        },
        required: ["codigo"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "escalar_para_humano",
      description: "Encaminha a conversa para atendimento humano. Use quando o proprietário fizer solicitações que fogem do escopo de confirmação de imóveis.",
      parameters: {
        type: "object",
        properties: {
          motivo: {
            type: "string",
            description: "Motivo da escalação"
          }
        },
        required: ["motivo"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "finalizar_atendimento",
      description: "Marca o atendimento como finalizado após confirmar informações ou atualizar o imóvel.",
      parameters: {
        type: "object",
        properties: {
          resultado: {
            type: "string",
            description: "Resultado do atendimento",
            enum: ["disponivel_confirmado", "vendido_atualizado", "valor_atualizado", "escalado", "sem_resposta"]
          },
          observacao: {
            type: "string",
            description: "Observação adicional sobre o atendimento"
          }
        },
        required: ["resultado"]
      }
    }
  }
];

// Gerar prompt do sistema
function generateSystemPrompt(property: PropertyData | null, contactName: string | null): string {
  const propertyInfo = property
    ? `
DADOS DO IMÓVEL DO PROPRIETÁRIO:
- Código: ${property.codigo}
- Endereço: ${property.endereco}
- Bairro: ${property.bairro || 'Não informado'}
- Cidade: ${property.cidade || 'Florianópolis'}
- Valor atual: ${formatCurrency(property.valor)}
- Status atual: ${property.status || 'Ativo'}
`
    : '\n⚠️ DADOS DO IMÓVEL NÃO DISPONÍVEIS - Pergunte ao proprietário o código ou endereço do imóvel.\n';

  const contactInfo = contactName ? `Nome do proprietário: ${contactName}` : '';

  return `Você é Nina, assistente virtual da Smolka Imóveis 🏠

OBJETIVO: Confirmar com proprietários a disponibilidade e valor de seus imóveis.

${contactInfo}
${propertyInfo}

FLUXO DE ATENDIMENTO:

1️⃣ SAUDAÇÃO INICIAL (já feita na campanha):
   - A mensagem de campanha já foi enviada perguntando sobre o imóvel

2️⃣ SE IMÓVEL ESTÁ DISPONÍVEL:
   - Confirme o valor: "Ótimo! O valor de venda continua ${property ? formatCurrency(property.valor) : '[VALOR]'}?"
   - Se valor correto: Agradeça e finalize
   - Se valor incorreto: Pergunte o novo valor e use a tool atualizar_imovel

3️⃣ SE IMÓVEL NÃO ESTÁ DISPONÍVEL:
   - Pergunte se foi vendido/alugado pela Smolka ou por terceiros
   - VENDEU = Vendido (por terceiros ou imobiliária)
   - ALUGOU = Alugado (por terceiros ou imobiliária) 
   - Use a tool IMEDIATAMENTE após saber a resposta

4️⃣ OUTRAS SOLICITAÇÕES:
   - Use escalar_para_humano e avise que um atendente entrará em contato

═══════════════════════════════════════════════════════════════════════════════
⚠️ REGRAS CRÍTICAS - VOCÊ DEVE SEGUIR OBRIGATORIAMENTE:
═══════════════════════════════════════════════════════════════════════════════

🔴 REGRA 0 - CÓDIGO DO IMÓVEL É OBRIGATÓRIO:
   O código do imóvel está nos DADOS DO IMÓVEL acima (ex: Código: ${property?.codigo || 'XXXX'})
   VOCÊ DEVE SEMPRE incluir o campo "codigo" ao chamar a tool atualizar_imovel!
   Exemplo: atualizar_imovel(codigo="${property?.codigo || 'XXXX'}", status="Alugado Terceiros", exibir_no_site=false)

🔴 REGRA 1 - USAR TOOLS IMEDIATAMENTE:
   Quando o proprietário disser QUALQUER uma dessas palavras/frases, você DEVE chamar
   a tool atualizar_imovel ANTES de escrever sua resposta:
   
   GATILHOS DE VENDA:
   - "vendeu", "vendi", "vendido", "foi vendido", "consegui vender"
   → Use: codigo="${property?.codigo || 'CODIGO'}", status="Vendido Terceiros", exibir_no_site=false
   
   GATILHOS DE ALUGUEL:
   - "alugou", "aluguei", "alugado", "foi alugado", "consegui alugar", "aluguel", "coloquei pra alugar e alugou"
   → Use: codigo="${property?.codigo || 'CODIGO'}", status="Alugado Terceiros", exibir_no_site=false
   
   GATILHOS DE INDISPONIBILIDADE:
   - "não está mais disponível", "tirei do mercado", "não quero mais vender"
   → Use: codigo="${property?.codigo || 'CODIGO'}", status="Suspenso", exibir_no_site=false

🔴 REGRA 2 - INTERPRETAÇÃO CORRETA:
   - "aluguel" ou "alugou" = ALUGADO (NÃO é vendido!)
   - "vendeu" = VENDIDO
   - "pela Smolka" = Vendido Imobiliária ou Alugado Imobiliária
   - "por fora" ou "diretamente" = Vendido Terceiros ou Alugado Terceiros

🔴 REGRA 3 - NÃO APENAS FALAR:
   ERRADO: "Vou atualizar o sistema" (sem chamar a tool)
   CERTO: Chamar a tool atualizar_imovel COM O CÓDIGO E DEPOIS responder confirmando

🔴 REGRA 4 - FINALIZAR APÓS ATUALIZAÇÃO:
   Após chamar atualizar_imovel com sucesso, chame também finalizar_atendimento

═══════════════════════════════════════════════════════════════════════════════

REGRAS GERAIS:
- Seja breve e objetiva
- Use emojis com moderação (🏠 ✅ 📞)
- Valores devem ser números inteiros (sem centavos)

EXEMPLOS DE RESPOSTAS:
- "Ótimo! 🏠 O valor de venda continua R$ 1.490.000?"
- "Entendi! Vou atualizar nosso sistema. Qual foi o valor final da venda?"
- "Perfeito, vou atualizar o valor para R$ 1.600.000. Obrigada pela informação! ✅"
- "Entendo! Vou encaminhar sua solicitação para nosso atendimento. Em breve entrarão em contato. 📞"`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY não configurada');
    }

    const { phone_number, message, contact_name, contact_notes, conversation_history, property_data } = await req.json();

    if (!phone_number || !message) {
      return new Response(
        JSON.stringify({ error: 'phone_number e message são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[AI Marketing] Processando mensagem de ${phone_number}: ${message}`);

    // Usar property_data direto se passado, ou parsear do contact_notes
    let propertyInfo: PropertyData | null = null;
    
    if (property_data && typeof property_data === 'object' && property_data.codigo) {
      // Formato direto passado pelo chamador
      propertyInfo = {
        codigo: String(property_data.codigo),
        endereco: property_data.endereco || '',
        bairro: property_data.bairro,
        cidade: property_data.cidade || 'Florianópolis',
        valor: typeof property_data.valor === 'number' ? property_data.valor : parseFloat(String(property_data.valor).replace(/[^\d]/g, '')) || 0,
        status: property_data.status || 'Ativo',
      };
      console.log(`[AI Marketing] Dados do imóvel (property_data):`, propertyInfo);
    } else if (contact_notes) {
      // Parsear dados do imóvel do notes do contato
      propertyInfo = parsePropertyFromNotes(contact_notes);
      console.log(`[AI Marketing] Dados do imóvel (contact_notes):`, propertyInfo);
    } else {
      console.log(`[AI Marketing] Nenhum dado de imóvel disponível`);
    }

    // Montar histórico de conversa
    const systemPrompt = generateSystemPrompt(propertyInfo, contact_name);
    const messages: ConversationMessage[] = [
      { role: 'system', content: systemPrompt }
    ];

    // Adicionar histórico se existir
    if (conversation_history && Array.isArray(conversation_history)) {
      for (const msg of conversation_history.slice(-10)) {
        messages.push({
          role: msg.direction === 'inbound' ? 'user' : 'assistant',
          content: msg.body || '',
        });
      }
    }

    // Adicionar mensagem atual
    messages.push({ role: 'user', content: message });

    // Chamar OpenAI
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        tools,
        tool_choice: 'auto',
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('[AI Marketing] Erro OpenAI:', errorText);
      throw new Error(`OpenAI error: ${openAIResponse.status}`);
    }

    const completion = await openAIResponse.json();
    const choice = completion.choices[0];

    let responseText = '';
    let toolCalls: any[] = [];
    let escalated = false;
    let finalized = false;
    let vistaUpdates: any[] = [];

    // Processar tool calls se existirem
    if (choice.message.tool_calls) {
      toolCalls = choice.message.tool_calls;

      for (const toolCall of toolCalls) {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);

        console.log(`[AI Marketing] Tool call: ${functionName}`, args);

        if (functionName === 'atualizar_imovel') {
          const updateResult = await updatePropertyInVista({
            codigo: args.codigo || propertyInfo?.codigo,
            status: args.status,
            exibir_no_site: args.exibir_no_site,
            valor_venda: args.valor_venda,
            motivo: args.motivo || 'Confirmado pelo proprietário via WhatsApp',
          });
          vistaUpdates.push({ ...args, result: updateResult });
          console.log(`[AI Marketing] Vista update result:`, updateResult);
        }

        if (functionName === 'escalar_para_humano') {
          escalated = true;
          console.log(`[AI Marketing] Escalado para humano:`, args.motivo);
        }

        if (functionName === 'finalizar_atendimento') {
          finalized = true;
          console.log(`[AI Marketing] Atendimento finalizado:`, args);
        }
      }

      // Se teve tool calls, fazer segunda chamada para obter resposta final
      messages.push(choice.message);
      
      for (const toolCall of toolCalls) {
        messages.push({
          role: 'tool' as any,
          tool_call_id: toolCall.id,
          content: 'Ação executada com sucesso.',
        } as any);
      }

      const followUpResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages,
          max_tokens: 200,
          temperature: 0.7,
        }),
      });

      if (followUpResponse.ok) {
        const followUp = await followUpResponse.json();
        responseText = followUp.choices[0]?.message?.content || '';
      }
    } else {
      responseText = choice.message.content || '';
    }

    console.log(`[AI Marketing] Resposta gerada:`, responseText);

    return new Response(
      JSON.stringify({
        success: true,
        response: responseText,
        escalated,
        finalized,
        vista_updates: vistaUpdates,
        property_data: propertyInfo,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[AI Marketing] Erro:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        response: 'Desculpe, ocorreu um erro. Um atendente entrará em contato em breve.' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
