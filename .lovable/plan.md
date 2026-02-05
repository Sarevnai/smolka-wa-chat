
# Plano: Corrigir Fluxo de Encaminhamento para C2S

## Problema Diagnosticado

Ao analisar os logs e mensagens do lead Ian (554888182882), identifiquei que o C2S **nunca foi chamado** apesar do feedback positivo. A sequência foi:

1. Cliente: "Perfeito quero agendar uma visita"
2. Helena (IA): Pediu confirmação manual com placeholder `{telefone}` não preenchido
3. Cliente: "Perfeito, meu telefone é 48 9 88182882"
4. Helena (IA): **IGNOROU** a resposta e mostrou outro imóvel! ❌

## Causa Raiz

1. **IA não chamou a ferramenta `enviar_lead_c2s`** - Preferiu gerar resposta de confirmação manual
2. **Sem estado de "aguardando confirmação C2S"** - O sistema não sabe que a próxima mensagem é uma confirmação
3. **Placeholder literal `{telefone}`** - A IA gerou texto com variável não substituída
4. **Reset do fluxo** - Na mensagem seguinte, o sistema fez nova busca de imóveis

## Solução Proposta

### 1. Criar Estado `awaiting_c2s_confirmation`

**Arquivo:** `supabase/functions/make-webhook/index.ts`

Adicionar ao `consultative_state`:
- `awaiting_c2s_confirmation: boolean` - Indica que estamos aguardando cliente confirmar dados
- `c2s_pending_property: object` - Imóvel que será enviado ao C2S quando confirmado

### 2. Detectar Resposta de Confirmação

Quando `awaiting_c2s_confirmation = true`:
- Analisar se cliente confirmou ("sim", "correto", "isso", "pode enviar")
- Se confirmou → Chamar `enviar_lead_c2s` **diretamente** (não via IA)
- Se corrigiu dados → Atualizar e chamar C2S
- Se negou → Perguntar o que quer mudar

### 3. Forçar C2S no Feedback Positivo (Alternativa)

Opção mais robusta: Quando feedback é positivo e temos todos os dados qualificados, chamar C2S **diretamente** sem depender da IA chamar a ferramenta:

```typescript
if (feedback === 'positive') {
  // Já temos: nome, telefone, tipo, região, preço
  // Chamar C2S diretamente ao invés de pedir para IA decidir
  
  if (existingName && qualData.complete) {
    const c2sResult = await sendLeadToC2S(supabase, {
      name: existingName,
      interest: `Interesse em ${currentProperty.tipo} - ${currentProperty.bairro}`,
      summary: `Imóvel código ${currentProperty.codigo}`
    }, phoneNumber, historyText);
    
    if (c2sResult.success) {
      c2sTransferred = true;
      aiResponse = `Perfeito, ${existingName}! 🎉 Um consultor vai entrar em contato para organizar a visita e tirar todas as suas dúvidas.`;
    }
  } else {
    // Falta dados - pedir apenas o que falta
    // ...
  }
}
```

---

## Alterações Detalhadas

### Arquivo: `supabase/functions/make-webhook/index.ts`

**1. Atualizar interface de estado consultivo (linha ~280):**
```typescript
interface ConsultativeState {
  // ... campos existentes
  awaiting_c2s_confirmation?: boolean;
  c2s_pending_property?: PropertyResult;
}
```

**2. Adicionar handler para estado de confirmação C2S (antes do bloco de feedback, ~linha 3305):**
```typescript
// Handle C2S confirmation flow
if (consultativeState?.awaiting_c2s_confirmation) {
  const confirmation = detectConfirmation(messageContent);
  
  if (confirmation === 'yes') {
    // Cliente confirmou - enviar para C2S diretamente
    const pendingProp = consultativeState.c2s_pending_property;
    const historyText = history.map(m => `${m.role}: ${m.content}`).join('\n');
    
    const c2sResult = await sendLeadToC2S(supabase, {
      name: existingName || 'Cliente',
      interest: `Interesse em ${pendingProp?.tipo || 'imóvel'} - ${pendingProp?.bairro || ''}`,
      summary: `Código ${pendingProp?.codigo || 'N/A'}`
    }, phoneNumber, historyText);
    
    // Limpar estado
    await updateConsultativeState(supabase, phoneNumber, {
      awaiting_c2s_confirmation: false,
      c2s_pending_property: null
    });
    
    if (c2sResult.success) {
      c2sTransferred = true;
      aiResponse = `Perfeito, ${existingName || ''}! 🎉 Seu interesse foi registrado. Um consultor vai entrar em contato em breve para organizar a visita.`;
    }
  } else if (confirmation === 'correction') {
    // Cliente corrigiu dados - extrair e atualizar
    // ...
  }
}
```

**3. No bloco de feedback positivo (~linha 3310), setar estado ao invés de depender da IA:**
```typescript
if (feedback === 'positive') {
  console.log('✅ Positive feedback - initiating C2S flow');
  const currentProperty = pendingProperties[currentIndex];
  
  // Verificar se temos dados completos
  const hasCompleteData = existingName && qualProgress?.has_region;
  
  if (hasCompleteData) {
    // Chamar C2S diretamente
    const historyText = history.map(m => `${m.role}: ${m.content}`).join('\n');
    const c2sResult = await sendLeadToC2S(supabase, {
      name: existingName,
      interest: `Interesse em ${currentProperty?.tipo} - ${currentProperty?.bairro}`,
      summary: `Imóvel código ${currentProperty?.codigo}`
    }, phoneNumber, historyText);
    
    await updateConsultativeState(supabase, phoneNumber, {
      awaiting_property_feedback: false
    });
    
    if (c2sResult.success) {
      c2sTransferred = true;
      aiResponse = `Perfeito, ${existingName}! 🎉 Um consultor vai entrar em contato para organizar a visita ao imóvel ${currentProperty?.codigo}.`;
    }
  } else {
    // Falta nome - perguntar
    await updateConsultativeState(supabase, phoneNumber, {
      awaiting_property_feedback: false,
      awaiting_c2s_confirmation: true,
      c2s_pending_property: currentProperty
    });
    
    aiResponse = `Ótimo! Vou te conectar com um consultor. 😊 Só preciso confirmar: qual seu nome completo?`;
  }
}
```

**4. Criar função `detectConfirmation`:**
```typescript
function detectConfirmation(message: string): 'yes' | 'correction' | 'no' | 'unclear' {
  const lower = message.toLowerCase().trim();
  
  const yesPatterns = [
    /^sim$/i, /^isso$/i, /^correto$/i, /^perfeito$/i, /^pode/i,
    /tudo certo/i, /está correto/i, /confirmo/i, /isso mesmo/i
  ];
  
  const noPatterns = [
    /^não$/i, /errado/i, /incorreto/i, /cancelar/i
  ];
  
  if (yesPatterns.some(p => p.test(lower))) return 'yes';
  if (noPatterns.some(p => p.test(lower))) return 'no';
  
  // Se menciona dados novos, pode ser correção
  if (/meu (telefone|nome|email)/i.test(lower)) return 'correction';
  
  return 'unclear';
}
```

---

## Resultado Esperado

1. ✅ **Feedback positivo → C2S imediato** (se dados completos)
2. ✅ **Sem placeholder `{telefone}`** - Fluxo determinístico
3. ✅ **Estado de confirmação rastreado** - Próxima mensagem não reinicia fluxo
4. ✅ **Menos dependência da IA** - Lógica crítica é determinística

---

## Resumo das Alterações

| Local | Alteração |
|-------|-----------|
| Interface `ConsultativeState` | Adicionar `awaiting_c2s_confirmation`, `c2s_pending_property` |
| Handler antes do feedback (~3305) | Novo bloco para processar confirmação C2S |
| Bloco feedback positivo (~3310) | Chamar C2S diretamente se dados completos |
| Nova função | `detectConfirmation()` para analisar resposta |
