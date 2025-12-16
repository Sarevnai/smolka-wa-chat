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

    // Build filter object for Vista API
    const filter: Record<string, any> = {};
    
    if (params.tipo) {
      // Map common types to Vista categories
      const tipoMap: Record<string, string> = {
        'apartamento': 'Apartamento',
        'casa': 'Casa',
        'terreno': 'Terreno',
        'comercial': 'Comercial',
        'sala': 'Sala Comercial',
        'cobertura': 'Cobertura',
        'kitnet': 'Kitnet',
        'sobrado': 'Sobrado',
      };
      filter['Categoria'] = tipoMap[params.tipo.toLowerCase()] || params.tipo;
    }
    
    if (params.bairro) {
      filter['Bairro'] = params.bairro;
    }
    
    if (params.cidade) {
      filter['Cidade'] = params.cidade;
    }
    
    if (params.preco_min || params.preco_max) {
      const precoField = params.finalidade === 'locacao' ? 'ValorLocacao' : 'ValorVenda';
      if (params.preco_min && params.preco_max) {
        filter[precoField] = [params.preco_min, params.preco_max];
      } else if (params.preco_min) {
        filter[precoField] = { '>=': params.preco_min };
      } else if (params.preco_max) {
        filter[precoField] = { '<=': params.preco_max };
      }
    }
    
    if (params.quartos) {
      filter['Dormitorios'] = { '>=': params.quartos };
    }
    
    if (params.finalidade) {
      filter['Finalidade'] = params.finalidade === 'locacao' ? 'Locação' : 'Venda';
    }

    // Build request payload for Vista API
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
        'AreaUtil',
        'AreaTotal',
        'Descricao',
        'DescricaoWeb',
        'FotoDestaque',
        'FotoDestaqueEmpreendimento',
        'Status',
        'Finalidade',
        { Foto: ['Foto', 'Destaque', 'Descricao'] }
      ],
      filter,
      paginacao: {
        pagina: 1,
        quantidade: params.limit || 3
      },
      order: { ValorVenda: 'asc' }
    };

    console.log('📤 Vista API request:', JSON.stringify(pesquisa, null, 2));

    // Call Vista CRM API
    const apiUrl = `${VISTA_API_URL}/imoveis/listar?key=${VISTA_API_KEY}`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(pesquisa),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Vista API error:', response.status, errorText);
      throw new Error(`Vista API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('📥 Vista API response:', JSON.stringify(data).substring(0, 500));

    // Transform Vista response to our standard format
    const properties: PropertyResult[] = [];
    
    // Vista returns object with property codes as keys
    if (data && typeof data === 'object') {
      const entries = Object.entries(data);
      
      for (const [codigo, imovel] of entries) {
        if (!imovel || typeof imovel !== 'object') continue;
        
        const prop = imovel as Record<string, any>;
        
        // Skip if it's pagination info
        if (codigo === 'paginas' || codigo === 'pagina' || codigo === 'total') continue;
        
        // Determine price based on finalidade
        const preco = params.finalidade === 'locacao' 
          ? parseFloat(prop.ValorLocacao || '0')
          : parseFloat(prop.ValorVenda || '0');
        
        // Format price
        const precoFormatado = preco.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        });
        
        // Extract photos
        const fotos: string[] = [];
        if (prop.FotoDestaque) {
          fotos.push(prop.FotoDestaque);
        }
        if (prop.Foto && Array.isArray(prop.Foto)) {
          for (const foto of prop.Foto) {
            if (foto.Foto && !fotos.includes(foto.Foto)) {
              fotos.push(foto.Foto);
            }
          }
        }
        
        // Build property link
        const link = `https://smolkaimoveis.com.br/imovel/${codigo}`;
        
        // Extract characteristics
        const caracteristicas: string[] = [];
        if (prop.Dormitorios) caracteristicas.push(`${prop.Dormitorios} dormitório(s)`);
        if (prop.Suites) caracteristicas.push(`${prop.Suites} suíte(s)`);
        if (prop.Vagas) caracteristicas.push(`${prop.Vagas} vaga(s)`);
        if (prop.AreaUtil) caracteristicas.push(`${prop.AreaUtil}m² úteis`);
        
        properties.push({
          codigo: codigo,
          tipo: prop.Categoria || 'Imóvel',
          bairro: prop.Bairro || '',
          cidade: prop.Cidade || 'Florianópolis',
          endereco: prop.Endereco || '',
          preco,
          preco_formatado: precoFormatado,
          quartos: parseInt(prop.Dormitorios || '0'),
          suites: parseInt(prop.Suites || '0'),
          vagas: parseInt(prop.Vagas || '0'),
          area_util: parseFloat(prop.AreaUtil || '0'),
          descricao: prop.DescricaoWeb || prop.Descricao || '',
          foto_destaque: fotos[0] || '',
          fotos,
          link,
          caracteristicas,
        });
      }
    }

    console.log(`✅ Found ${properties.length} properties`);

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
