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

    // Método 1: Usar endpoint /imoveis/detalhes que busca diretamente pelo código
    const detalhesFields = [
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
    ];

    const pesquisa = {
      fields: detalhesFields
    };

    const pesquisaEncoded = encodeURIComponent(JSON.stringify(pesquisa));
    
    // Usar endpoint /imoveis/detalhes/{codigo} - busca direta
    const urlDetalhes = `${VISTA_API_URL}/imoveis/detalhes?key=${VISTA_API_KEY}&imovel=${codigo}&pesquisa=${pesquisaEncoded}`;
    
    console.log(`[Vista Get Property] Tentando /imoveis/detalhes com imovel=${codigo}`);

    let response = await fetch(urlDetalhes, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    let responseText = await response.text();
    console.log(`[Vista Get Property] Resposta /detalhes (${response.status}):`, responseText.substring(0, 500));
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error(`[Vista Get Property] JSON inválido:`, responseText);
      return new Response(
        JSON.stringify({ success: false, error: 'Resposta inválida da API Vista', raw: responseText.substring(0, 200) }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se há erro na resposta ou se não retornou dados
    const hasError = data.status === 'error' || 
                     (data.message && data.message.includes('não retornou')) ||
                     (typeof data.status === 'number' && data.status >= 400);
                     
    // Se /detalhes falhou, tentar método alternativo com /listar
    if (hasError || !data || Object.keys(data).length === 0) {
      console.log(`[Vista Get Property] /detalhes falhou, tentando /listar...`);
      
      const pesquisaListar = {
        fields: detalhesFields,
        filter: {},
        paginacao: {
          pagina: 1,
          quantidade: 100
        }
      };
      
      const pesquisaListarEncoded = encodeURIComponent(JSON.stringify(pesquisaListar));
      const urlListar = `${VISTA_API_URL}/imoveis/listar?key=${VISTA_API_KEY}&pesquisa=${pesquisaListarEncoded}`;
      
      console.log(`[Vista Get Property] Buscando lista geral e filtrando por código ${codigo}`);
      
      response = await fetch(urlListar, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      
      responseText = await response.text();
      console.log(`[Vista Get Property] Resposta /listar (${response.status}):`, responseText.substring(0, 300));
      
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error(`[Vista Get Property] JSON inválido na listagem`);
        return new Response(
          JSON.stringify({ success: false, error: 'Resposta inválida da API Vista' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Tentar encontrar o imóvel nos dados retornados
    let prop = null;
    
    // Resposta do /detalhes normalmente tem o código como chave direta
    if (data[codigo] && typeof data[codigo] === 'object') {
      prop = data[codigo];
      console.log(`[Vista Get Property] Encontrado diretamente pela chave ${codigo}`);
    } else if (data[codigo.toString()] && typeof data[codigo.toString()] === 'object') {
      prop = data[codigo.toString()];
      console.log(`[Vista Get Property] Encontrado pela chave string ${codigo}`);
    } else {
      // Buscar em todas as entradas (caso seja listagem)
      for (const [key, value] of Object.entries(data)) {
        if (['paginas', 'pagina', 'total', 'qtd', 'status', 'message'].includes(key)) continue;
        if (!value || typeof value !== 'object') continue;
        
        const entry = value as Record<string, any>;
        const entryCodigo = entry.Codigo?.toString() || key;
        
        if (entryCodigo === codigo.toString()) {
          prop = entry;
          console.log(`[Vista Get Property] Encontrado buscando em entries, key=${key}`);
          break;
        }
      }
    }

    if (!prop || Object.keys(prop).length === 0) {
      console.log(`[Vista Get Property] Imóvel ${codigo} não encontrado após todas tentativas`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Imóvel ${codigo} não encontrado no Vista CRM`,
          hint: 'Verifique se o código está correto e se o imóvel existe no sistema Vista'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Vista Get Property] ✅ Imóvel encontrado! Campos:`, Object.keys(prop));

    // Construir URL da foto
    let fotoDestaque = '';
    if (prop.FotoDestaque) {
      fotoDestaque = prop.FotoDestaque.startsWith('http') 
        ? prop.FotoDestaque 
        : `https://lkaimobi-portais.vistahost.com.br${prop.FotoDestaque}`;
    }

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
      foto_destaque: fotoDestaque,
      // Descrição
      descricao: prop.Descricao || '',
      // Link
      link: `https://smolkaimoveis.com.br/imovel/${prop.Codigo || codigo}`
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
