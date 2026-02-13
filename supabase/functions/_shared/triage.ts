// ========== TRIAGE LOGIC ==========
// Department triage from button clicks (interactive or template quick_reply)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export type DepartmentType = 'locacao' | 'administrativo' | 'vendas' | 'marketing' | null;

// Interactive button IDs
const TRIAGE_BUTTON_IDS: Record<string, DepartmentType> = {
  'btn_locacao': 'locacao',
  'btn_vendas': 'vendas',
  'btn_admin': 'administrativo'
};

// Template quick_reply button text
const TRIAGE_BUTTON_TEXTS: Record<string, DepartmentType> = {
  'alugar': 'locacao',
  'comprar': 'vendas',
  'já sou cliente': 'administrativo'
};

export const DEPARTMENT_WELCOMES: Record<string, string> = {
  locacao: 'Perfeito! Vou te ajudar a encontrar o imóvel ideal para alugar 🏠\n\nQual tipo de imóvel você procura? Apartamento, casa...?',
  vendas: 'Ótimo! Vou te ajudar a encontrar o imóvel perfeito para comprar 🏡\n\nQue tipo de imóvel você tem interesse?',
  administrativo: 'Certo! Estou aqui para te ajudar 📋\n\nPosso auxiliar com boletos, contratos, manutenção ou outras questões. O que você precisa?'
};

/**
 * Extract triage button info from interactive button_reply OR template quick_reply
 */
export function extractTriageButtonId(message: any): { buttonId: string; department: DepartmentType } | null {
  // 1. Interactive button_reply
  const buttonReply = message.interactive?.button_reply;
  if (buttonReply?.id && TRIAGE_BUTTON_IDS[buttonReply.id]) {
    return { buttonId: buttonReply.id, department: TRIAGE_BUTTON_IDS[buttonReply.id] };
  }
  
  // 2. Template quick_reply text
  const buttonText = message.button?.text?.toLowerCase()?.trim();
  if (buttonText && TRIAGE_BUTTON_TEXTS[buttonText]) {
    return { buttonId: buttonText, department: TRIAGE_BUTTON_TEXTS[buttonText] };
  }
  
  // 3. Template quick_reply payload
  const buttonPayload = message.button?.payload?.toLowerCase()?.trim();
  if (buttonPayload && TRIAGE_BUTTON_TEXTS[buttonPayload]) {
    return { buttonId: buttonPayload, department: TRIAGE_BUTTON_TEXTS[buttonPayload] };
  }
  
  return null;
}

/**
 * Update triage stage in conversation_states
 */
export async function updateTriageStage(supabase: any, phoneNumber: string, stage: string) {
  const { error } = await supabase
    .from('conversation_states')
    .upsert({
      phone_number: phoneNumber,
      triage_stage: stage,
      is_ai_active: true,
      updated_at: new Date().toISOString()
    }, { onConflict: 'phone_number' });
    
  if (error) {
    console.error('❌ Error updating triage stage:', error);
  }
}

/**
 * Assign department to conversation + sync to contact
 */
export async function assignDepartmentToConversation(
  supabase: any,
  conversationId: string,
  department: DepartmentType,
  qualificationData?: any
) {
  if (!department) return;

  // Get first pipeline stage for department
  const { data: firstStage } = await supabase
    .from('conversation_stages')
    .select('id')
    .eq('department_code', department)
    .order('order_index', { ascending: true })
    .limit(1)
    .maybeSingle();

  const updateData: any = { department_code: department };
  if (firstStage) updateData.stage_id = firstStage.id;
  if (qualificationData) updateData.qualification_data = qualificationData;

  const { data: updatedConv, error } = await supabase
    .from('conversations')
    .update(updateData)
    .eq('id', conversationId)
    .select('phone_number, contact_id')
    .single();

  if (error) {
    console.error('❌ Error assigning department:', error);
    return;
  }

  console.log(`✅ Department ${department} assigned to conversation ${conversationId}`);

  // Sync to contact for RLS filtering
  if (updatedConv?.phone_number) {
    await supabase
      .from('contacts')
      .update({ department_code: department })
      .eq('phone', updatedConv.phone_number);
  }
}
