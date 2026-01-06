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
    const VISTA_HOST = 'lkaimobi-rest.vistahost.com.br';

    const body: UpdatePropertyRequest = await req.json();
    const { codigo, status, exibir_no_site, valor_venda, motivo } = body;

    if (!codigo) {
      return new Response(
        JSON.stringify({ success: false, error: 'Código do imóvel é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Vista Update] Atualizando imóvel ${codigo}:`, { status, exibir_no_site, valor_venda, motivo });

    // Montar campos a atualizar
    const fields: Record<string, any> = {};

    if (status) {
      fields.Status = STATUS_MAP[status] || status;
    }

    if (exibir_no_site !== undefined) {
      fields.ExibirNoSite = exibir_no_site ? 'Sim' : 'Nao';
    }

    if (valor_venda !== undefined) {
      fields.ValorVenda = valor_venda;
    }

    // Se não há campos para atualizar
    if (Object.keys(fields).length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Nenhum campo para atualizar' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fazer requisição para Vista CRM
    const vistaUrl = `http://${VISTA_HOST}/imoveis/alterar?key=${VISTA_API_KEY}`;
    
    const vistaPayload = {
      imovel: codigo,
      fields: fields
    };

    console.log(`[Vista Update] Enviando para Vista:`, vistaPayload);

    const vistaResponse = await fetch(vistaUrl, {
      method: 'POST',
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
          campos_enviados: fields
        }),
        { status: vistaResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Vista Update] Imóvel ${codigo} atualizado com sucesso`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Imóvel ${codigo} atualizado com sucesso`,
        campos_atualizados: fields,
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
