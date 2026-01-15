import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PropertySearchParams {
  tipo?: string;        // apartamento, casa, terreno, comercial
  bairro?: string;      // neighborhood name
  cidade?: string;      // city name
  preco_min?: number;   // minimum price
  preco_max?: number;   // maximum price
  quartos?: number;     // number of bedrooms
  finalidade?: string;  // venda, locacao
  limit?: number;       // max results (default 3)
}

interface PropertyResult {
  codigo: string;
  tipo: string;
  bairro: string;
  cidade: string;
  endereco: string;
  preco: number;
  preco_formatado: string;
  quartos: number;
  suites: number;
  vagas: number;
  area_util: number;
  descricao: string;
  foto_destaque: string;
  fotos: string[];
  link: string;
  caracteristicas: string[];
  valor_condominio: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const params: PropertySearchParams = await req.json();
    
    const VISTA_API_KEY = Deno.env.get('VISTA_CRM_API_KEY');
    const VISTA_API_URL = Deno.env.get('VISTA_CRM_URL') || 'http://lkaimobi-rest.vistahost.com.br';
    
    if (!VISTA_API_KEY) {
      throw new Error('VISTA_CRM_API_KEY not configured');
    }

    console.log('🏠 Vista CRM search params:', params);

    // Store tipo for client-side filtering (Vista API categoria filter is unreliable)
    const tipoFilter = params.tipo?.toLowerCase();
    
    // Build filter object for Vista API - only use reliable filters
    const filter: Record<string, any> = {};
    
    // Location filters work well
    if (params.bairro) {
      filter['Bairro'] = params.bairro;
    }
    
    if (params.cidade) {
      filter['Cidade'] = params.cidade;
    }
    
    // Vista API requires array with 2 values for range filters
    if (params.preco_min || params.preco_max) {
      const precoField = params.finalidade === 'locacao' ? 'ValorLocacao' : 'ValorVenda';
      const minPrice = params.preco_min || 0;
      const maxPrice = params.preco_max || 99999999;
      filter[precoField] = [minPrice, maxPrice];
    }
    
    if (params.quartos) {
      // Use exact match for bedrooms [min, max] with same value
      filter['Dormitorios'] = [params.quartos, params.quartos];
    }

    // Build request payload for Vista API - fetch more to filter client-side
    const fetchLimit = (params.limit || 3) * 3; // Fetch 3x to have room for filtering
    
    const pesquisa = {
      fields: [
        'Codigo',
        'Categoria',
        'Bairro',
        'Cidade',
        'Endereco',
        'ValorVenda',
        'ValorLocacao',
        'ValorCondominio',
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
      filter,
      paginacao: {
        pagina: 1,
        quantidade: fetchLimit
      },
      order: { ValorVenda: 'asc' }
    };

    console.log('📤 Vista API request:', JSON.stringify(pesquisa, null, 2));

    // Call Vista CRM API using GET with encoded JSON in query string
    const pesquisaEncoded = encodeURIComponent(JSON.stringify(pesquisa));
    const apiUrl = `${VISTA_API_URL}/imoveis/listar?key=${VISTA_API_KEY}&pesquisa=${pesquisaEncoded}`;
    
    console.log('🔗 Calling Vista API (GET)');
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    const responseText = await response.text();
    console.log('📥 Vista API response status:', response.status);
    console.log('📥 Vista API response (first 500 chars):', responseText.substring(0, 500));

    if (!response.ok) {
      console.error('❌ Vista API error:', response.status, responseText);
      throw new Error(`Vista API error: ${response.status} - ${responseText.substring(0, 200)}`);
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('❌ Failed to parse Vista response as JSON');
      throw new Error('Vista API returned invalid JSON');
    }

    // Transform Vista response to our standard format
    const properties: PropertyResult[] = [];
    
    // Vista returns object with property codes as keys
    if (data && typeof data === 'object') {
      const entries = Object.entries(data);
      console.log(`📋 Processing ${entries.length} entries from Vista`);
      
      for (const [codigo, imovel] of entries) {
        if (!imovel || typeof imovel !== 'object') continue;
        
        const prop = imovel as Record<string, any>;
        
        // Skip if it's pagination info or metadata
        if (codigo === 'paginas' || codigo === 'pagina' || codigo === 'total' || codigo === 'qtd') continue;
        if (codigo === 'status' || codigo === 'message') continue;
        
        // Client-side category filtering since Vista API filter is unreliable
        const categoria = (prop.Categoria || '').toLowerCase();
        if (tipoFilter) {
          const tipoMatches = 
            categoria.includes(tipoFilter) || 
            (tipoFilter === 'apartamento' && (categoria.includes('apto') || categoria.includes('apart'))) ||
            (tipoFilter === 'casa' && (categoria.includes('casa') || categoria.includes('sobrado'))) ||
            (tipoFilter === 'terreno' && categoria.includes('terreno')) ||
            (tipoFilter === 'comercial' && (categoria.includes('comercial') || categoria.includes('sala') || categoria.includes('loja')));
          
          if (!tipoMatches) continue;
        }
        
        // Determine price - use whichever is available, prefer based on finalidade
        const valorVenda = parseFloat(prop.ValorVenda || '0');
        const valorLocacao = parseFloat(prop.ValorLocacao || '0');
        
        let preco: number;
        let modalidade: string;
        
        if (params.finalidade === 'locacao') {
          if (valorLocacao === 0) continue; // Skip if no rental price
          preco = valorLocacao;
          modalidade = 'aluguel';
        } else if (params.finalidade === 'venda') {
          if (valorVenda === 0) continue; // Skip if no sale price
          preco = valorVenda;
          modalidade = 'venda';
        } else {
          // No finalidade specified - use whichever is available
          if (valorVenda > 0) {
            preco = valorVenda;
            modalidade = 'venda';
          } else if (valorLocacao > 0) {
            preco = valorLocacao;
            modalidade = 'aluguel';
          } else {
            continue; // No price available
          }
        }
        
        // Format price with modality
        const precoFormatado = preco.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }) + (modalidade === 'aluguel' ? '/mês' : '');
        
        // Get photo - FotoDestaque is the main photo URL
        let fotoDestaque = '';
        if (prop.FotoDestaque) {
          fotoDestaque = prop.FotoDestaque.startsWith('http') 
            ? prop.FotoDestaque 
            : `https://lkaimobi-portais.vistahost.com.br${prop.FotoDestaque}`;
        }
        
        // Build property link
        const link = `https://smolkaimoveis.com.br/imovel/${codigo}`;
        
        // Extract characteristics
        const caracteristicas: string[] = [];
        const dormitorios = parseInt(prop.Dormitorios || '0');
        const suites = parseInt(prop.Suites || '0');
        const vagas = parseInt(prop.Vagas || '0');
        const areaUtil = parseFloat(prop.AreaPrivativa || prop.AreaTotal || '0');
        
        // Client-side bedroom filtering for exact match
        if (params.quartos && dormitorios !== params.quartos) {
          console.log(`⏩ Skipping ${codigo}: has ${dormitorios} quartos, wanted ${params.quartos}`);
          continue;
        }
        
        if (dormitorios > 0) {
          const suiteText = suites > 0 ? ` (${suites} suíte${suites > 1 ? 's' : ''})` : '';
          caracteristicas.push(`${dormitorios} dormitório${dormitorios > 1 ? 's' : ''}${suiteText}`);
        }
        if (vagas > 0) {
          caracteristicas.push(`${vagas} vaga${vagas > 1 ? 's' : ''}`);
        }
        if (areaUtil > 0) {
          caracteristicas.push(`${areaUtil}m²`);
        }
        
        properties.push({
          codigo: codigo,
          tipo: prop.Categoria || 'Imóvel',
          bairro: prop.Bairro || '',
          cidade: prop.Cidade || 'Florianópolis',
          endereco: prop.Endereco || '',
          preco,
          preco_formatado: precoFormatado,
          quartos: dormitorios,
          suites,
          vagas,
          area_util: areaUtil,
          descricao: prop.Descricao || '',
          foto_destaque: fotoDestaque,
          fotos: fotoDestaque ? [fotoDestaque] : [],
          link,
          caracteristicas,
          valor_condominio: parseFloat(prop.ValorCondominio || '0'),
        });
        // Respect the user's limit
        if (properties.length >= (params.limit || 3)) break;
      }
    }

    console.log(`✅ Found ${properties.length} properties matching criteria`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        properties,
        total: properties.length,
        params_used: params
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Vista search error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage, properties: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
