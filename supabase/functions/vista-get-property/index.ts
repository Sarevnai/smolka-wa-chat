import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { codigo } = await req.json();

    if (!codigo) {
      return new Response(
        JSON.stringify({ success: false, error: "Código do imóvel é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const VISTA_API_KEY = Deno.env.get("VISTA_CRM_API_KEY");
    const VISTA_API_URL = Deno.env.get("VISTA_CRM_URL") || "http://lkaimobi-rest.vistahost.com.br";

    if (!VISTA_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "VISTA_CRM_API_KEY não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Vista Get Property] Buscando imóvel código: ${codigo}`);

    const detalhesFields = [
      "Codigo",
      "Categoria",
      "Status",
      "Finalidade",
      "Endereco",
      "Numero",
      "Complemento",
      "Bairro",
      "Cidade",
      "UF",
      "CEP",
      "ValorVenda",
      "ValorLocacao",
      "ValorCondominio",
      "Dormitorios",
      "Suites",
      "Vagas",
      "AreaPrivativa",
      "AreaTotal",
      "ExibirNoSite",
      "DataCadastro",
      "DataAtualizacao",
      "FotoDestaque",
      "Descricao",
    ];

    // ========== Attempt 1: /imoveis/detalhes (direct by code) ==========
    const pesquisaDetalhes = { fields: detalhesFields };
    const pesquisaDetalhesEncoded = encodeURIComponent(JSON.stringify(pesquisaDetalhes));
    // Add showSuspended and showInternal to see all properties (like Make.com blueprint)
    const urlDetalhes = `${VISTA_API_URL}/imoveis/detalhes?key=${VISTA_API_KEY}&imovel=${codigo}&pesquisa=${pesquisaDetalhesEncoded}&showSuspended=1&showInternal=1`;

    console.log(`[Vista Get Property] Tentando /imoveis/detalhes com imovel=${codigo} (showSuspended=1, showInternal=1)`);

    let response = await fetch(urlDetalhes, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    let responseText = await response.text();
    console.log(`[Vista Get Property] Resposta /detalhes (${response.status}):`, responseText.substring(0, 500));

    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Resposta inválida da API Vista" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if response is empty or contains error message
    const isEmptyOrError =
      !data ||
      (Array.isArray(data) && data.length === 0) ||
      (data?.message && typeof data.message === "string" && data.message.toLowerCase().includes("não retornou"));

    // ========== Check if /detalhes returned the property directly ==========
    // Vista /imoveis/detalhes returns: { "Codigo": "17346", "Categoria": "...", ... }
    let prop: any = null;
    
    if (!isEmptyOrError && data && typeof data === "object" && data.Codigo) {
      // Direct property object from /detalhes
      console.log(`[Vista Get Property] Imóvel encontrado via /detalhes (formato direto)`);
      prop = data;
    }

    // ========== Attempt 2: /imoveis/listar (fallback) ==========
    if (!prop && isEmptyOrError) {
      console.log(`[Vista Get Property] /detalhes sem resultado, tentando /imoveis/listar (fallback)...`);

      // Vista API hard limit per docs/logs: quantidade <= 50
      const pesquisaListar = {
        fields: detalhesFields,
        filter: {},
        paginacao: {
          pagina: 1,
          quantidade: 50,
        },
      };

      const pesquisaListarEncoded = encodeURIComponent(JSON.stringify(pesquisaListar));
      const urlListar = `${VISTA_API_URL}/imoveis/listar?key=${VISTA_API_KEY}&pesquisa=${pesquisaListarEncoded}`;

      response = await fetch(urlListar, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      responseText = await response.text();
      console.log(`[Vista Get Property] Resposta /listar (${response.status}):`, responseText.substring(0, 500));

      try {
        data = JSON.parse(responseText);
      } catch {
        return new Response(
          JSON.stringify({ success: false, error: "Resposta inválida da API Vista" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ========== Find property in response (only if not already found) ==========
    if (!prop) {
      if (data?.[codigo] && typeof data[codigo] === "object") {
        prop = data[codigo];
      } else if (data?.[codigo.toString()] && typeof data[codigo.toString()] === "object") {
        prop = data[codigo.toString()];
      } else if (data && typeof data === "object") {
        for (const [key, value] of Object.entries(data)) {
          if (["paginas", "pagina", "total", "qtd", "status", "message"].includes(key)) continue;
          if (!value || typeof value !== "object") continue;

          const entry = value as Record<string, any>;
          const entryCodigo = (entry.Codigo ?? key)?.toString();
          if (entryCodigo === codigo.toString()) {
            prop = entry;
            break;
          }
        }
      }
    }

    // IMPORTANT: return 200 even when not found to avoid Supabase client treating it as a runtime error
    if (!prop || Object.keys(prop).length === 0) {
      console.log(`[Vista Get Property] Imóvel ${codigo} não encontrado`);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Imóvel ${codigo} não encontrado no Vista CRM`,
          hint: "Provável mismatch: o código do portal (listing_id) não é o mesmo 'Codigo' do Vista. Confirme qual campo do payload corresponde ao Codigo do Vista.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize photo URL
    let fotoDestaque = "";
    if (prop.FotoDestaque) {
      fotoDestaque = prop.FotoDestaque.startsWith("http")
        ? prop.FotoDestaque
        : `https://lkaimobi-portais.vistahost.com.br${prop.FotoDestaque}`;
    }

    const property = {
      codigo: prop.Codigo || codigo,
      categoria: prop.Categoria || "",
      status: prop.Status || "",
      finalidade: prop.Finalidade || "",
      endereco: prop.Endereco || "",
      numero: prop.Numero || "",
      complemento: prop.Complemento || "",
      bairro: prop.Bairro || "",
      cidade: prop.Cidade || "",
      uf: prop.UF || "",
      cep: prop.CEP || "",
      valor_venda: parseFloat(prop.ValorVenda || "0"),
      valor_locacao: parseFloat(prop.ValorLocacao || "0"),
      valor_condominio: parseFloat(prop.ValorCondominio || "0"),
      dormitorios: parseInt(prop.Dormitorios || "0"),
      suites: parseInt(prop.Suites || "0"),
      vagas: parseInt(prop.Vagas || "0"),
      area_util: parseFloat(prop.AreaPrivativa || "0"),
      area_total: parseFloat(prop.AreaTotal || "0"),
      exibir_no_site: prop.ExibirNoSite === "Sim",
      data_cadastro: prop.DataCadastro || "",
      data_atualizacao: prop.DataAtualizacao || "",
      foto_destaque: fotoDestaque,
      descricao: prop.Descricao || "",
      link: `https://smolkaimoveis.com.br/imovel/${prop.Codigo || codigo}`,
    };

    return new Response(JSON.stringify({ success: true, property }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`[Vista Get Property] Erro:`, error);
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
