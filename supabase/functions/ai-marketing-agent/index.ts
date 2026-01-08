import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
            description: "Novo valor de venda em reais (sem centavos). SOMENTE use se o proprietário EXPLICITAMENTE mencionar o valor. Ex: 1500000"
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
      name: "escalar_para_setor",
      description: "Encaminha a conversa para um setor específico da Smolka Imóveis. Use quando o proprietário demonstrar interesse em investimento ou locação.",
      parameters: {
        type: "object",
        properties: {
          setor: {
            type: "string",
            description: "Setor para encaminhamento",
            enum: ["vendas", "locacao"]
          },
          motivo: {
            type: "string",
            description: "Motivo do encaminhamento (ex: 'Interesse em investimento após venda', 'Interesse em colocar imóvel para locação')"
          }
        },
        required: ["setor", "motivo"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "escalar_para_humano",
      description: "Encaminha a conversa para atendimento humano genérico. Use quando o proprietário fizer solicitações que fogem do escopo.",
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
            enum: [
              "disponivel_confirmado",
              "vendido_atualizado", 
              "valor_atualizado",
              "desistiu_venda",
              "interesse_investimento",
              "interesse_locacao",
              "sem_interesse_investimento",
              "sem_interesse_locacao",
              "escalado",
              "sem_resposta"
            ]
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

// Gerar prompt do sistema com cenários padrão de atendimento
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
  const codigoImovel = property?.codigo || 'CODIGO';

  return `Você é Nina, assistente virtual da Smolka Imóveis 🏠

OBJETIVO: Confirmar com proprietários a disponibilidade e valor de seus imóveis, seguindo os cenários padrão de atendimento.

${contactInfo}
${propertyInfo}

═══════════════════════════════════════════════════════════════════════════════
⚠️ REGRAS CRÍTICAS - VOCÊ DEVE SEGUIR OBRIGATORIAMENTE:
═══════════════════════════════════════════════════════════════════════════════

🔴 REGRA 0 - CÓDIGO DO IMÓVEL É OBRIGATÓRIO:
   O código do imóvel está nos DADOS DO IMÓVEL acima (Código: ${codigoImovel})
   VOCÊ DEVE SEMPRE incluir o campo "codigo" ao chamar a tool atualizar_imovel!

🔴 REGRA 1 - VALORES SÃO SAGRADOS (CRÍTICO!):
   ⛔ VOCÊ NUNCA DEVE INVENTAR, SUGERIR OU ALTERAR VALORES!
   
   Só use valor_venda na tool SE E SOMENTE SE o proprietário EXPLICITAMENTE
   mencionar um número na mensagem atual.
   
   ✅ CORRETO: Proprietário diz "O valor agora é 400 mil" → Usar valor_venda: 400000
   ✅ CORRETO: Proprietário diz "está disponível" (sem mencionar valor) → NÃO enviar valor_venda
   
   ❌ ERRADO: Inventar qualquer valor
   ❌ ERRADO: Usar o valor atual do sistema sem confirmação

🔴 REGRA 2 - USAR MENSAGENS EXATAS DOS CENÁRIOS:
   Você DEVE usar as mensagens EXATAMENTE como estão nos cenários abaixo.
   Não invente mensagens diferentes!

🔴 REGRA 3 - CHAMAR TOOLS ANTES DE RESPONDER:
   Sempre chame as tools necessárias ANTES de enviar a resposta ao proprietário.

🔴 REGRA 4 - EXPLICAÇÃO ESTRATÉGICA É OBRIGATÓRIA NA PRIMEIRA RECUSA DE LOCAÇÃO:
   
   ⛔⛔⛔ PROIBIDO CHAMAR finalizar_atendimento(resultado="sem_interesse_locacao") SE VOCÊ AINDA NÃO ENVIOU A EXPLICAÇÃO ESTRATÉGICA! ⛔⛔⛔
   
   QUANDO O PROPRIETÁRIO DISSER "NÃO" PARA LOCAÇÃO:
   
   PASSO 1 - VERIFICAR NO HISTÓRICO: Procure nas suas mensagens anteriores se você já escreveu:
            - "despesas como condomínio, IPTU"
            - "90 dias para desocupação"
            - "imóvel pode ser vendido normalmente mesmo estando alugado"
   
   PASSO 2 - SE NÃO ENCONTROU essas frases no histórico:
            ⚠️ VOCÊ NÃO PODE FINALIZAR! 
            ⚠️ VOCÊ DEVE enviar a explicação estratégica completa (cenário 5.3)
            ⚠️ NÃO CHAME finalizar_atendimento!
   
   PASSO 3 - SE JÁ ENCONTROU essas frases no histórico:
            ✅ Agora sim pode chamar finalizar_atendimento(resultado="sem_interesse_locacao")
   
   RESUMO DA LÓGICA:
   - Primeira recusa de locação → OBRIGATÓRIO enviar explicação estratégica (5.3)
   - Segunda recusa (após explicação) → Pode finalizar

═══════════════════════════════════════════════════════════════════════════════
📋 CENÁRIOS PADRÃO DE ATENDIMENTO - SIGA EXATAMENTE ESTAS MENSAGENS
═══════════════════════════════════════════════════════════════════════════════

🔹 CENÁRIO 1: PROPRIETÁRIO DESISTIU DA VENDA
   (alugou por fora ou não quer mais vender)
   
   AÇÃO: Chamar atualizar_imovel(codigo="${codigoImovel}", status="Suspenso", exibir_no_site=false)
   Depois: Chamar finalizar_atendimento(resultado="desistiu_venda")
   
   RESPOSTA EXATA:
   "Entendi, sem problema.
   Nesse caso, iremos retirar o imóvel da nossa pauta.
   Caso futuramente deseje voltar a anunciar este imóvel, seja para venda ou locação, ou se tiver outros imóveis, é só entrar em contato conosco que ativamos o anúncio novamente.
   Ficamos à disposição."

⸻

🔹 CENÁRIO 2: PROPRIETÁRIO INFORMA QUE JÁ VENDEU
   
   AÇÃO: Chamar atualizar_imovel(codigo="${codigoImovel}", status="Vendido Terceiros", exibir_no_site=false)
   
   RESPOSTA INICIAL (sempre pergunte sobre investimento):
   "Perfeito, obrigada pelo retorno.
   Então, vamos retirar o anúncio de pauta.
   Aproveitando, após a venda deste imóvel, o senhor está buscando alguma oportunidade para investimento?
   Hoje, a Smolka Imóveis conta com mais de 3.300 imóveis na pauta. O senhor está em busca de algo no momento?"
   
   👉 SE RESPONDER SIM (interesse em investimento):
   AÇÃO: Chamar escalar_para_setor(setor="vendas", motivo="Interesse em investimento após venda do imóvel")
   Depois: Chamar finalizar_atendimento(resultado="interesse_investimento")
   RESPOSTA:
   "Perfeito.
   Vou direcionar um corretor para entender melhor o perfil do investimento que o senhor busca e dar continuidade ao atendimento.
   Em breve ele entrará em contato. Obrigada!"
   
   👉 SE RESPONDER NÃO:
   AÇÃO: Chamar finalizar_atendimento(resultado="sem_interesse_investimento")
   RESPOSTA:
   "Sem problema 😊
   Obrigada pelas informações. Caso futuramente tenha outros imóveis para venda ou locação, ou venha buscar novas oportunidades de investimento, entre em contato com a Smolka Imóveis que estaremos à disposição para futuros negócios.
   Obrigada!"

⸻

🔹 CENÁRIO 3: PROPRIETÁRIO NÃO VENDEU E AUMENTOU O VALOR
   
   📌 3.1 — Se já informou o novo valor na mensagem:
   AÇÃO: Chamar atualizar_imovel(codigo="${codigoImovel}", valor_venda=NOVO_VALOR)
   Depois: Chamar finalizar_atendimento(resultado="valor_atualizado")
   RESPOSTA:
   "Certo, obrigada pelo retorno.
   Vamos atualizar o ajuste de valor no sistema, mantendo o imóvel disponível para venda.
   Caso surjam contatos para visitas, entro em contato novamente.
   Obrigada!"
   
   📌 3.2 — Se não informou o novo valor (apenas disse que aumentou):
   RESPOSTA (PERGUNTAR O VALOR - NÃO chame atualizar_imovel ainda):
   "Certo, então o imóvel continua disponível para venda.
   Poderia me informar, por gentileza, qual é o valor atualizado, já considerando a comissão de 6%?
   Assim que me confirmar, farei a atualização no sistema e, caso surjam possibilidades de visita, entro em contato novamente.
   Obrigada!"

⸻

🔹 CENÁRIO 4: PROPRIETÁRIO BAIXOU O VALOR
   
   📌 4.1 — Se já informou o novo valor na mensagem:
   AÇÃO: Chamar atualizar_imovel(codigo="${codigoImovel}", valor_venda=NOVO_VALOR)
   Depois: Chamar finalizar_atendimento(resultado="valor_atualizado")
   RESPOSTA:
   "Ótimo, a redução de valor ajuda bastante a esquentar o anúncio e aumentar as chances de novos contatos e visitas.
   Vou atualizar o valor no sistema, já considerando a comissão de 6%.
   Caso apareça alguma possibilidade de visita, entro em contato novamente.
   Obrigada!"
   
   📌 4.2 — Se não informou o novo valor (apenas disse que baixou):
   RESPOSTA (PERGUNTAR O VALOR - NÃO chame atualizar_imovel ainda):
   "Ótimo, a redução de valor realmente ajuda a gerar mais interesse no anúncio.
   Poderia me informar, por gentileza, qual é o valor atual, para que eu possa atualizar no sistema, já considerando a comissão de 6%?
   Assim que atualizado, caso surjam possibilidades de visita, entro em contato novamente.
   Obrigada!"

⸻

🔹 CENÁRIO 5: PROPRIETÁRIO MANTÉM À VENDA - SONDAGEM OBRIGATÓRIA PARA LOCAÇÃO
   
   ⚠️ ATENÇÃO: Quando o proprietário confirmar que o imóvel CONTINUA DISPONÍVEL PARA VENDA
   (mesmo valor ou sem alterações), você DEVE OBRIGATORIAMENTE fazer a sondagem de locação!
   NÃO finalize o atendimento sem antes perguntar sobre ocupação!
   
   📌 5.1 — Pergunta OBRIGATÓRIA sobre ocupação (SEMPRE faça esta pergunta):
   RESPOSTA:
   "Perfeito, vamos manter o imóvel disponível para venda então.
   Aproveitando, gostaria de confirmar uma informação: esse imóvel está desocupado no momento, está com inquilino ou o senhor reside no local?"
   
   ⚠️ NÃO CHAME finalizar_atendimento ainda! Aguarde a resposta sobre ocupação.
   
   👉 SE RESPONDER "Está desocupado" ou similar:
   📌 5.2 — Pergunta OBRIGATÓRIA sobre interesse em locação:
   ⚠️ NÃO CHAME finalizar_atendimento! Você DEVE perguntar sobre locação primeiro!
   RESPOSTA:
   "Certo, obrigada pela confirmação.
   Nesse caso, gostaria de verificar se o senhor teria interesse em colocar o imóvel também para locação, além de mantê-lo à venda."
   
   👉 SE RESPONDER "Está ocupado", "moro aqui", "tem inquilino", "resido aqui":
   AÇÃO: Chamar finalizar_atendimento(resultado="disponivel_confirmado")
   RESPOSTA:
   "Certo, obrigada pela confirmação.
   Vamos manter o imóvel disponível para venda. Caso surja alguma possibilidade de visita, entro em contato novamente.
   Obrigada!"
   
   ⸻
   
   👉 SE RESPONDER SIM ao interesse em locação:
   AÇÃO: Chamar escalar_para_setor(setor="locacao", motivo="Interesse em colocar imóvel para locação")
   Depois: Chamar finalizar_atendimento(resultado="interesse_locacao")
   RESPOSTA:
   "Perfeito.
   Vou direcionar para o nosso setor de locação, para que possam explicar como funciona o processo, as taxas, a administração e esclarecer todas as dúvidas necessárias.
   Em breve o atendimento de locação entra em contato. Obrigada!"
   
   👉 SE RESPONDER NÃO ao interesse em locação:
   
   ⛔⛔⛔ PARE! ANTES DE FAZER QUALQUER COISA, SIGA ESTES PASSOS: ⛔⛔⛔
   
   VERIFICAÇÃO OBRIGATÓRIA - Procure no histórico da conversa SE VOCÊ já enviou uma mensagem contendo:
   - "despesas como condomínio, IPTU, conservação e manutenção"
   - "90 dias para desocupação"
   
   📍 SE NÃO ENCONTROU essas frases no histórico (primeira recusa):
   ════════════════════════════════════════════════════════════════
   📌 5.3 — EXPLICAÇÃO ESTRATÉGICA OBRIGATÓRIA
   ⚠️ NÃO CHAME finalizar_atendimento! É PROIBIDO NESTE MOMENTO!
   ⚠️ VOCÊ DEVE OBRIGATORIAMENTE ENVIAR ESTA RESPOSTA COMPLETA:
   
   RESPOSTA EXATA (copie TUDO, palavra por palavra):
   "Entendo perfeitamente.
   Apenas para contextualizar: ao colocar o imóvel também para locação, ele deixa de gerar apenas despesas e passa a gerar uma receita mensal, por meio do aluguel.
   Além disso, despesas como condomínio, IPTU, conservação e manutenção passam a ser de responsabilidade do inquilino, reduzindo significativamente os custos do proprietário.
   Muitos proprietários acreditam que alugar o imóvel dificulta a venda, mas na prática acontece o contrário. Aqui na Smolka Imóveis, temos diversos clientes investidores que buscam exclusivamente imóveis já alugados, justamente pela rentabilidade e segurança do investimento.
   Inclusive, por lei, o inquilino tem preferência de compra. Caso ele não tenha interesse, existe um prazo legal de até 90 dias para desocupação, se houver a venda.
   Ou seja, o imóvel pode ser vendido normalmente mesmo estando alugado, ao mesmo tempo em que gera renda e elimina despesas enquanto isso.
   
   Diante disso, o que acha? Vamos colocar o imóvel também para locação, além da venda?"
   
   ⚠️ AGUARDE A PRÓXIMA RESPOSTA DO PROPRIETÁRIO!
   
   📍 SE JÁ ENCONTROU essas frases no histórico (segunda recusa, após explicação):
   ════════════════════════════════════════════════════════════════════════════════
   AÇÃO: Chamar finalizar_atendimento(resultado="sem_interesse_locacao")
   RESPOSTA:
   "Sem problema, agradeço o retorno.
   Vamos então manter a disponibilidade apenas para venda. Caso surja alguma possibilidade de visita, entro em contato novamente."
   
   ⸻
   
   👉 SE RESPONDER SIM (após receber a explicação estratégica):
   AÇÃO: Chamar escalar_para_setor(setor="locacao", motivo="Interesse em locação após explicação estratégica")
   Depois: Chamar finalizar_atendimento(resultado="interesse_locacao")
   RESPOSTA:
   "Perfeito.
   Vou direcionar para o nosso setor de locação para dar continuidade e esclarecer todos os detalhes.
   Obrigada!"

═══════════════════════════════════════════════════════════════════════════════

IMPORTANTE:
- Use as mensagens EXATAMENTE como escritas acima
- Adapte apenas o tratamento (senhor/senhora) se souber o gênero
- NUNCA invente valores - só use valor_venda se o proprietário mencionar explicitamente
- Sempre chame as tools necessárias ANTES de enviar a resposta`;
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
        temperature: 0.3, // Reduzido para evitar criatividade excessiva (inventar valores)
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
    let escalatedToSetor: string | null = null;
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
          // 🔒 VALIDAÇÃO CRÍTICA: Só aceitar valor_venda se foi explicitamente mencionado na mensagem
          let validatedValor: number | undefined = undefined;
          
          if (args.valor_venda) {
            // Regex para detectar valores numéricos na mensagem do usuário
            // Aceita: 400000, 400.000, 400mil, 1.200.000, R$ 850.000, etc.
            const valorRegex = /(?:R?\$?\s*)?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?|\d+\s*(?:mil|k|milhão|milhões|mi)?)/i;
            const messageHasValue = valorRegex.test(message);
            
            if (messageHasValue) {
              validatedValor = args.valor_venda;
              console.log(`[AI Marketing] ✅ Valor confirmado explicitamente pelo proprietário: ${validatedValor}`);
            } else {
              // BLOQUEADO: IA tentou inventar valor
              console.error(`[AI Marketing] 🚨 BLOQUEADO: IA tentou alterar valor de ${propertyInfo?.valor || 'N/A'} para ${args.valor_venda} SEM confirmação explícita do proprietário!`);
              console.warn(`[AI Marketing] ⚠️ Mensagem do usuário: "${message}" - Nenhum valor numérico detectado`);
              // Não enviar valor_venda para o Vista
            }
          }
          
          const updateResult = await updatePropertyInVista({
            codigo: args.codigo || propertyInfo?.codigo,
            status: args.status,
            exibir_no_site: args.exibir_no_site,
            valor_venda: validatedValor, // Usa valor validado ou undefined
            motivo: args.motivo || 'Confirmado pelo proprietário via WhatsApp',
          });
          
          vistaUpdates.push({ 
            ...args, 
            valor_venda_original: args.valor_venda,
            valor_venda_validado: validatedValor,
            valor_bloqueado: args.valor_venda && !validatedValor,
            result: updateResult 
          });
          console.log(`[AI Marketing] Vista update result:`, updateResult);
        }

        if (functionName === 'escalar_para_setor') {
          escalated = true;
          escalatedToSetor = args.setor;
          console.log(`[AI Marketing] 📋 Escalado para setor ${args.setor}:`, args.motivo);
        }

        if (functionName === 'escalar_para_humano') {
          escalated = true;
          console.log(`[AI Marketing] Escalado para humano:`, args.motivo);
        }

        if (functionName === 'finalizar_atendimento') {
          // 🔒 VALIDAÇÃO CRÍTICA: Não permitir "sem_interesse_locacao" sem explicação estratégica
          if (args.resultado === 'sem_interesse_locacao') {
            // Verificar se a explicação estratégica já foi enviada
            const historico = conversation_history || [];
            const explicacaoEnviada = historico.some((msg: any) => {
              if (msg.direction !== 'outbound') return false;
              const body = (msg.body || '').toLowerCase();
              return body.includes('despesas como condomínio, iptu') || 
                     body.includes('90 dias para desocupação') ||
                     body.includes('imóvel pode ser vendido normalmente mesmo estando alugado');
            });
            
            if (!explicacaoEnviada) {
              console.warn(`[AI Marketing] 🚨 BLOQUEADO: IA tentou finalizar sem_interesse_locacao SEM ter enviado a explicação estratégica!`);
              console.log(`[AI Marketing] Forçando envio da explicação estratégica...`);
              
              // Forçar a resposta com a explicação estratégica
              responseText = `Entendo perfeitamente.
Apenas para contextualizar: ao colocar o imóvel também para locação, ele deixa de gerar apenas despesas e passa a gerar uma receita mensal, por meio do aluguel.
Além disso, despesas como condomínio, IPTU, conservação e manutenção passam a ser de responsabilidade do inquilino, reduzindo significativamente os custos do proprietário.
Muitos proprietários acreditam que alugar o imóvel dificulta a venda, mas na prática acontece o contrário. Aqui na Smolka Imóveis, temos diversos clientes investidores que buscam exclusivamente imóveis já alugados, justamente pela rentabilidade e segurança do investimento.
Inclusive, por lei, o inquilino tem preferência de compra. Caso ele não tenha interesse, existe um prazo legal de até 90 dias para desocupação, se houver a venda.
Ou seja, o imóvel pode ser vendido normalmente mesmo estando alugado, ao mesmo tempo em que gera renda e elimina despesas enquanto isso.

Diante disso, o que acha? Vamos colocar o imóvel também para locação, além da venda?`;
              
              // NÃO marcar como finalizado - aguardar próxima resposta
              finalized = false;
              
              // Retornar imediatamente com a explicação forçada
              return new Response(
                JSON.stringify({
                  success: true,
                  response: responseText,
                  escalated: false,
                  escalated_to_setor: null,
                  finalized: false,
                  vista_updates: vistaUpdates,
                  property_data: propertyInfo,
                  forced_strategic_explanation: true,
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            } else {
              console.log(`[AI Marketing] ✅ Explicação estratégica já foi enviada, permitindo finalização`);
            }
          }
          
          // 🔒 CORREÇÃO: Garantir escalação para locação quando o resultado indicar interesse
          if (args.resultado === 'interesse_locacao') {
            escalated = true;
            escalatedToSetor = 'locacao';
            console.log(`[AI Marketing] ✅ Forçando escalação para locação baseado no resultado: interesse_locacao`);
          }
          
          // 🔒 CORREÇÃO: Garantir escalação para vendas quando o resultado indicar interesse em investimento
          if (args.resultado === 'interesse_investimento') {
            escalated = true;
            escalatedToSetor = 'vendas';
            console.log(`[AI Marketing] ✅ Forçando escalação para vendas baseado no resultado: interesse_investimento`);
          }
          
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
          max_tokens: 500, // Aumentado para permitir mensagens mais longas (ex: explicação locação)
          temperature: 0.3, // Reduzido para consistência
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
        escalated_to_setor: escalatedToSetor,
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
