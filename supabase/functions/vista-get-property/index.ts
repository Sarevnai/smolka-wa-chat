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

    // Usar /imoveis/listar paginando para encontrar o imóvel
    // Vista tem limite de 50 por página
    let found = false;
    let prop: Record<string, any> | null = null;
    let page = 1;
    const maxPages = 100; // Buscar até 5000 imóveis

    while (!found && page <= maxPages) {
      const pesquisa = {
        fields: [
          'Codigo',
          'Categoria',
          'Bairro',
          'Cidade',
          'Endereco',
          'ValorVenda',
          'ValorLocacao',
          'Dormitorios',
          'Suites',
          'Vagas',
          'AreaPrivativa',
          'AreaTotal',
          'Descricao',
          'FotoDestaque',
          'Status',
          'Finalidade'
        ],
        filter: {},
        paginacao: {
          pagina: page,
          quantidade: 50
        },
        order: { Codigo: 'asc' }
      };

      const pesquisaEncoded = encodeURIComponent(JSON.stringify(pesquisa));
      const listarUrl = `${VISTA_API_URL}/imoveis/listar?key=${VISTA_API_KEY}&pesquisa=${pesquisaEncoded}`;
      
      if (page === 1) {
        console.log(`[Vista Get Property] Buscando na lista de imóveis...`);
      }
      
      const response = await fetch(listarUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        console.error(`[Vista Get Property] Erro HTTP: ${response.status}`);
        return new Response(
          JSON.stringify({ success: false, error: `Erro ao buscar imóvel: HTTP ${response.status}` }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error(`[Vista Get Property] JSON inválido`);
        return new Response(
          JSON.stringify({ success: false, error: 'Resposta inválida da API Vista' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verificar se o código existe como chave
      if (data[codigo]) {
        prop = data[codigo];
        found = true;
        console.log(`[Vista Get Property] Imóvel ${codigo} encontrado na página ${page}`);
        break;
      }

      // Verificar se ainda há mais páginas
      const entries = Object.entries(data).filter(([key]) => 
        !['paginas', 'pagina', 'total', 'qtd', 'status', 'message'].includes(key)
      );
      
      if (entries.length < 50) {
        // Última página, não encontrado
        console.log(`[Vista Get Property] Última página (${page}), imóvel não encontrado`);
        break;
      }

      page++;
    }

    if (!prop) {
      return new Response(
        JSON.stringify({ success: false, error: `Imóvel ${codigo} não encontrado` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Vista Get Property] Campos disponíveis:`, Object.keys(prop));

    // Transformar resposta em formato padronizado
    const property = {
      codigo,
      categoria: prop.Categoria || '',
      status: prop.Status || '',
      finalidade: prop.Finalidade || '',
      endereco: prop.Endereco || '',
      bairro: prop.Bairro || '',
      cidade: prop.Cidade || '',
      // Valores
      valor_venda: parseFloat(prop.ValorVenda || '0'),
      valor_locacao: parseFloat(prop.ValorLocacao || '0'),
      valor_condominio: parseFloat(prop.ValorCondominio || '0'),
      valor_iptu: parseFloat(prop.ValorIPTU || '0'),
      // Características
      dormitorios: parseInt(prop.Dormitorios || '0'),
      suites: parseInt(prop.Suites || '0'),
      vagas: parseInt(prop.Vagas || '0'),
      area_util: parseFloat(prop.AreaPrivativa || '0'),
      area_total: parseFloat(prop.AreaTotal || '0'),
      // Controle
      exibir_no_site: prop.ExibirNoSite === 'Sim',
      destaque: prop.Destaque === 'Sim',
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
