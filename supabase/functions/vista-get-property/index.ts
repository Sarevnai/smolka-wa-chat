import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { codigo } = await req.json();
    
    if (!codigo) {
      return new Response(
        JSON.stringify({ success: false, error: 'Código do imóvel é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const VISTA_API_KEY = Deno.env.get('VISTA_CRM_API_KEY');
    const VISTA_API_URL = Deno.env.get('VISTA_CRM_URL') || 'http://lkaimobi-rest.vistahost.com.br';

    if (!VISTA_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'VISTA_CRM_API_KEY não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Vista Get Property] Buscando imóvel código: ${codigo}`);

    // Buscar detalhes completos do imóvel
    const url = `${VISTA_API_URL}/imoveis/detalhes?key=${VISTA_API_KEY}&imovel=${codigo}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      console.error(`[Vista Get Property] Erro HTTP: ${response.status}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Erro ao buscar imóvel: HTTP ${response.status}` 
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();

    // Verificar se o imóvel foi encontrado
    if (!data || Object.keys(data).length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Imóvel ${codigo} não encontrado` 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Vista Get Property] Imóvel encontrado:`, Object.keys(data));

    // Transformar resposta em formato padronizado
    const property = {
      codigo,
      categoria: data.Categoria || '',
      status: data.Status || '',
      finalidade: data.Finalidade || '',
      // Campos de endereço (para diagnóstico de duplicidade)
      endereco: data.Endereco || '',
      endereco_numero: data.EnderecoNumero || data['Endereco Numero'] || '',
      endereco_complemento: data.EnderecoComplemento || data['Endereco Complemento'] || '',
      bairro: data.Bairro || '',
      cidade: data.Cidade || '',
      estado: data.Estado || data.UF || '',
      cep: data.CEP || '',
      bloco: data.Bloco || '',
      agencia: data.Agencia || '',
      // Valores
      valor_venda: parseFloat(data.ValorVenda || '0'),
      valor_locacao: parseFloat(data.ValorLocacao || '0'),
      valor_condominio: parseFloat(data.ValorCondominio || '0'),
      valor_iptu: parseFloat(data.ValorIPTU || '0'),
      // Características
      dormitorios: parseInt(data.Dormitorios || '0'),
      suites: parseInt(data.Suites || '0'),
      vagas: parseInt(data.Vagas || '0'),
      area_util: parseFloat(data.AreaPrivativa || data.AreaUtil || '0'),
      area_total: parseFloat(data.AreaTotal || '0'),
      // Controle
      exibir_no_site: data.ExibirNoSite === 'Sim',
      destaque: data.Destaque === 'Sim',
      // Datas
      data_cadastro: data.DataCadastro || '',
      data_atualizacao: data.DataAtualizacao || '',
      // Proprietário
      proprietario: data.Proprietario || data.NomeProprietario || '',
      telefone_proprietario: data.TelefoneProprietario || '',
      // Mídia
      foto_destaque: data.FotoDestaque || '',
      total_fotos: parseInt(data.TotalFotos || '0'),
      // Raw data completo para diagnóstico avançado
      raw_data: data
    };

    return new Response(
      JSON.stringify({ success: true, property }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`[Vista Get Property] Erro:`, error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
