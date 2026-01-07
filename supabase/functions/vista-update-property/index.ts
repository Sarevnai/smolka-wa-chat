import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdatePropertyRequest {
  codigo: string;
  status?: string;
  exibir_no_site?: boolean;
  valor_venda?: number;
  motivo?: string;
}

// Mapeamento de status para o Vista CRM
const STATUS_MAP: Record<string, string> = {
  // Status de disponibilidade
  'Venda': 'Venda',
  'Aluguel': 'Aluguel',
  'Venda e Aluguel': 'Venda e Aluguel',
  'Aluguel Temporada': 'Aluguel Temporada',
  // Status de transação concluída
  'Vendido Imobiliária': 'Vendido Imobiliária',
  'Vendido Terceiros': 'Vendido Terceiros',
  'Alugado Terceiros': 'Alugado Terceiros',
  // Status de pausa
  'Pendente': 'Pendente',
  'Suspenso': 'Suspenso',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const VISTA_API_KEY = Deno.env.get('VISTA_CRM_API_KEY') || '528befe6fac66b81ffce206dc0edc756';
    const VISTA_API_URL = Deno.env.get('VISTA_CRM_URL') || 'http://lkaimobi-rest.vistahost.com.br';

    const body: UpdatePropertyRequest = await req.json();
    const { codigo, status, exibir_no_site, valor_venda, motivo } = body;

    if (!codigo) {
      return new Response(
        JSON.stringify({ success: false, error: 'Código do imóvel é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Vista Update] Atualizando imóvel ${codigo}:`, { status, exibir_no_site, valor_venda, motivo });

    // Montar campos a atualizar no formato que o Vista espera
    const campos: Record<string, any> = {};

    if (status) {
      campos.Status = STATUS_MAP[status] || status;
    }

    if (exibir_no_site !== undefined) {
      campos.ExibirNoSite = exibir_no_site ? 'Sim' : 'Nao';
    }

    if (valor_venda !== undefined) {
      campos.ValorVenda = valor_venda;
    }

    // Se não há campos para atualizar
    if (Object.keys(campos).length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Nenhum campo para atualizar' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vista CRM API - usando múltiplas estratégias para bypass de duplicidade
    const vistaUrl = `${VISTA_API_URL}/imoveis/detalhes?key=${VISTA_API_KEY}&imovel=${codigo}&ignorar_duplicidade=1&force=1`;
    
    // O Vista espera: cadastro -> fields -> campos
    // Adiciona flag de bypass no body também (algumas versões do Vista requerem isso)
    const vistaPayload = {
      cadastro: {
        fields: campos,
        ignorar_duplicidade: "1",
        force: true
      }
    };

    console.log(`[Vista Update] Tentando PATCH com bypass de duplicidade...`);
    console.log(`[Vista Update] URL:`, vistaUrl);
    console.log(`[Vista Update] Payload:`, JSON.stringify(vistaPayload));

    const startTime = Date.now();
    
    // Primeiro, tentar PATCH (atualização parcial)
    let vistaResponse = await fetch(vistaUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(vistaPayload),
    });

    let methodUsed = 'PATCH';

    // Fallback para PUT se PATCH não for suportado (405, 404, ou mensagem de Method Not Allowed)
    if (vistaResponse.status === 405 || vistaResponse.status === 404) {
      console.log(`[Vista Update] PATCH não suportado (${vistaResponse.status}), tentando PUT...`);
      vistaResponse = await fetch(vistaUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(vistaPayload),
      });
      methodUsed = 'PUT (fallback)';
    }

    const responseTime = Date.now() - startTime;
    const vistaResult = await vistaResponse.text();
    
    console.log(`[Vista Update] Método usado: ${methodUsed}`);
    console.log(`[Vista Update] Resposta Vista (${vistaResponse.status}) em ${responseTime}ms:`, vistaResult);

    let parsedResult;
    try {
      parsedResult = JSON.parse(vistaResult);
    } catch {
      parsedResult = { raw: vistaResult };
    }

    if (!vistaResponse.ok) {
      console.error(`[Vista Update] Erro da API Vista:`, vistaResult);
      
      // Detectar erro de duplicidade e extrair código do imóvel duplicado
      let duplicateCode = null;
      let errorMessage = 'Erro ao atualizar no Vista CRM';
      
      if (parsedResult?.message && Array.isArray(parsedResult.message)) {
        const duplicityMsg = parsedResult.message.find((m: any) => typeof m === 'string' && m.includes('duplicidade'));
        const codeObj = parsedResult.message.find((m: any) => typeof m === 'object' && m.Codigo);
        
        if (duplicityMsg && codeObj) {
          duplicateCode = codeObj.Codigo;
          errorMessage = `Conflito de duplicidade no Vista CRM: O imóvel ${codigo} tem endereço idêntico ao imóvel ${duplicateCode}. É necessário corrigir o endereço de um dos imóveis diretamente no Vista CRM.`;
          console.error(`[Vista Update] ⚠️ Duplicidade detectada: imóvel ${codigo} conflita com imóvel ${duplicateCode}`);
        }
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorMessage,
          details: parsedResult,
          codigo,
          duplicate_codigo: duplicateCode,
          campos_enviados: campos,
          metodo_usado: methodUsed,
          tempo_resposta_ms: responseTime,
          sugestao: duplicateCode ? `Acesse o Vista CRM e verifique o imóvel ${duplicateCode} para resolver o conflito de endereço.` : null
        }),
        { status: vistaResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Vista Update] ✅ Imóvel ${codigo} atualizado com sucesso via ${methodUsed}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Imóvel ${codigo} atualizado com sucesso`,
        campos_atualizados: campos,
        motivo: motivo || 'Atualização via AI Marketing Agent',
        vista_response: parsedResult,
        metodo_usado: methodUsed,
        tempo_resposta_ms: responseTime
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Vista Update] Erro:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
