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

    // Vista CRM API usa PUT para atualizar imóveis no endpoint /imoveis/detalhes
    // Formato: PUT /imoveis/detalhes?key=API_KEY com body: { Codigo: "XXX", campos... }
    const vistaUrl = `${VISTA_API_URL}/imoveis/detalhes?key=${VISTA_API_KEY}`;
    
    // O Vista espera os campos diretamente no body junto com o código
    const vistaPayload = {
      Codigo: codigo,
      ...campos
    };

    console.log(`[Vista Update] Enviando para Vista (PUT):`, vistaPayload);
    console.log(`[Vista Update] URL:`, vistaUrl);

    const vistaResponse = await fetch(vistaUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(vistaPayload),
    });

    const vistaResult = await vistaResponse.text();
    console.log(`[Vista Update] Resposta Vista (${vistaResponse.status}):`, vistaResult);

    let parsedResult;
    try {
      parsedResult = JSON.parse(vistaResult);
    } catch {
      parsedResult = { raw: vistaResult };
    }

    if (!vistaResponse.ok) {
      console.error(`[Vista Update] Erro da API Vista:`, vistaResult);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao atualizar no Vista CRM',
          details: parsedResult,
          codigo,
          campos_enviados: campos
        }),
        { status: vistaResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Vista Update] Imóvel ${codigo} atualizado com sucesso`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Imóvel ${codigo} atualizado com sucesso`,
        campos_atualizados: campos,
        motivo: motivo || 'Atualização via AI Marketing Agent',
        vista_response: parsedResult
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
