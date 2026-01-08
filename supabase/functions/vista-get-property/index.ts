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

    // Usar endpoint /imoveis/detalhes conforme documentação oficial
    const pesquisa = {
      fields: [
        'Codigo',
        'Categoria',
        'Status',
        'Finalidade',
        'Endereco',
        'Numero',
        'Complemento',
        'Bairro',
        'Cidade',
        'UF',
        'CEP',
        'ValorVenda',
        'ValorLocacao',
        'ValorCondominio',
        'Dormitorios',
        'Suites',
        'Vagas',
        'AreaPrivativa',
        'AreaTotal',
        'ExibirNoSite',
        'DataCadastro',
        'DataAtualizacao',
        'FotoDestaque',
        'Descricao'
      ]
    };

    const pesquisaEncoded = encodeURIComponent(JSON.stringify(pesquisa));
    const url = `${VISTA_API_URL}/imoveis/detalhes?key=${VISTA_API_KEY}&pesquisa=${pesquisaEncoded}&imovel=${codigo}`;
    
    console.log(`[Vista Get Property] URL: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Vista Get Property] Erro HTTP: ${response.status}`, errorText);
      return new Response(
        JSON.stringify({ success: false, error: `Erro ao buscar imóvel: HTTP ${response.status}`, details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const responseText = await response.text();
    console.log(`[Vista Get Property] Resposta bruta:`, responseText.substring(0, 500));
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error(`[Vista Get Property] JSON inválido:`, responseText);
      return new Response(
        JSON.stringify({ success: false, error: 'Resposta inválida da API Vista', raw: responseText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Vista Get Property] Dados recebidos:`, JSON.stringify(data).substring(0, 500));

    // Verificar se há erro na resposta
    if (data.status === 'error' || data.message) {
      return new Response(
        JSON.stringify({ success: false, error: data.message || 'Erro da API Vista', raw_response: data }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // A resposta pode vir diretamente como objeto ou dentro de uma chave
    const prop = data[codigo] || data;

    if (!prop || Object.keys(prop).length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: `Imóvel ${codigo} não encontrado`, raw_response: data }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Vista Get Property] Campos disponíveis:`, Object.keys(prop));

    // Transformar resposta em formato padronizado
    const property = {
      codigo: prop.Codigo || codigo,
      categoria: prop.Categoria || '',
      status: prop.Status || '',
      finalidade: prop.Finalidade || '',
      endereco: prop.Endereco || '',
      numero: prop.Numero || '',
      complemento: prop.Complemento || '',
      bairro: prop.Bairro || '',
      cidade: prop.Cidade || '',
      uf: prop.UF || '',
      cep: prop.CEP || '',
      // Valores
      valor_venda: parseFloat(prop.ValorVenda || '0'),
      valor_locacao: parseFloat(prop.ValorLocacao || '0'),
      valor_condominio: parseFloat(prop.ValorCondominio || '0'),
      // Características
      dormitorios: parseInt(prop.Dormitorios || '0'),
      suites: parseInt(prop.Suites || '0'),
      vagas: parseInt(prop.Vagas || '0'),
      area_util: parseFloat(prop.AreaPrivativa || '0'),
      area_total: parseFloat(prop.AreaTotal || '0'),
      // Controle
      exibir_no_site: prop.ExibirNoSite === 'Sim',
      data_cadastro: prop.DataCadastro || '',
      data_atualizacao: prop.DataAtualizacao || '',
      // Mídia
      foto_destaque: prop.FotoDestaque || '',
      // Descrição
      descricao: prop.Descricao || '',
      // Raw data completo para diagnóstico avançado
      raw_data: prop
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
