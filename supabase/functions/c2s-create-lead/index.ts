import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LeadData {
  name: string;
  phone: string;
  email?: string;
  type_negotiation?: string;
  description?: string;
  conversation_history?: string;
  contact_id?: string;
  conversation_id?: string;
  property_type?: string;
  neighborhood?: string;
  price_range?: string;
  bedrooms?: number;
  development_id?: string;
  development_name?: string;
  interesse?: string;
  motivacao?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const C2S_API_TOKEN = Deno.env.get("C2S_API_TOKEN");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!C2S_API_TOKEN) {
      throw new Error("C2S_API_TOKEN não configurado");
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Variáveis Supabase não configuradas");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const leadData: LeadData = await req.json();
    console.log("📤 [C2S] Enviando lead:", JSON.stringify(leadData, null, 2));

    // Validate required fields
    if (!leadData.name || !leadData.phone) {
      throw new Error("Nome e telefone são obrigatórios");
    }

    // Format phone number (remove all non-digits)
    const formattedPhone = leadData.phone.replace(/\D/g, "");

    // Build description with property criteria and development info
    let description = "";
    const criteria: string[] = [];
    
    // Add development name first if available
    if (leadData.development_name) {
      criteria.push(`Empreendimento: ${leadData.development_name}`);
    }
    
    if (leadData.property_type) criteria.push(`Tipo: ${leadData.property_type}`);
    // Só incluir bairro se NÃO for lead de empreendimento específico
    if (leadData.neighborhood && !leadData.development_name) {
      criteria.push(`Bairro: ${leadData.neighborhood}`);
    }
    if (leadData.price_range) criteria.push(`Faixa de preço: ${leadData.price_range}`);
    if (leadData.bedrooms) criteria.push(`Quartos: ${leadData.bedrooms}`);
    if (leadData.interesse) criteria.push(`Interesse: ${leadData.interesse}`);
    if (leadData.motivacao) criteria.push(`Motivação: ${leadData.motivacao}`);
    
    description = criteria.join(" | ");
    if (leadData.description) {
      description += description ? ` - ${leadData.description}` : leadData.description;
    }

    // Determine source based on development
    const source = leadData.development_name 
      ? `Smolka AI - ${leadData.development_name}` 
      : "Smolka AI - Nina";

    // Build C2S payload according to API spec
    const c2sPayload = {
      data: {
        type: "lead",
        attributes: {
          name: leadData.name,
          phone: formattedPhone,
          email: leadData.email || null,
          type_negotiation: leadData.type_negotiation || "Compra",
          description: description || "Lead qualificado via WhatsApp",
          body: leadData.conversation_history || "",
          source: source,
        },
      },
    };

    console.log("📦 [C2S] Payload:", JSON.stringify(c2sPayload, null, 2));

    // Send to C2S API
    const c2sResponse = await fetch("https://api.contact2sale.com/integration/leads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${C2S_API_TOKEN}`,
      },
      body: JSON.stringify(c2sPayload),
    });

    const c2sResult = await c2sResponse.json();
    console.log("📥 [C2S] Response:", JSON.stringify(c2sResult, null, 2));

    if (!c2sResponse.ok) {
      console.error("❌ [C2S] Erro na API:", c2sResult);
      
      // Save failed record
      await supabase.from("c2s_integration").insert({
        contact_id: leadData.contact_id || null,
        conversation_id: leadData.conversation_id || null,
        sync_status: "error",
        lead_data: leadData,
        error_message: c2sResult.message || JSON.stringify(c2sResult),
      });

      throw new Error(c2sResult.message || "Erro ao enviar lead para C2S");
    }

    // Extract lead ID from response
    const c2sLeadId = c2sResult.data?.id || c2sResult.id || null;

    // Save successful record
    const { error: insertError } = await supabase.from("c2s_integration").insert({
      contact_id: leadData.contact_id || null,
      conversation_id: leadData.conversation_id || null,
      c2s_lead_id: c2sLeadId,
      sync_status: "synced",
      lead_data: leadData,
      synced_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error("⚠️ [C2S] Erro ao salvar registro:", insertError);
    }

    console.log("✅ [C2S] Lead enviado com sucesso! ID:", c2sLeadId);

    return new Response(
      JSON.stringify({
        success: true,
        c2s_lead_id: c2sLeadId,
        message: "Lead enviado para C2S com sucesso",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ [C2S] Erro:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Erro interno",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
