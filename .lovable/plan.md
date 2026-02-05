
# Remoção da Confirmação de Dados no Fluxo C2S

## Contexto do Problema

Atualmente, quando o cliente demonstra interesse em um imóvel, o sistema verifica se já possui o nome dele (`hasCompleteData`). Se não tiver, entra em um fluxo adicional de confirmação de dados:

```
"Que ótimo que gostou! 😊 Para registrar seu interesse, pode me confirmar seu nome completo?"
```

**Porém**: O sistema já captura nome e telefone durante a triagem, então essa etapa de confirmação é **desnecessária** e atrasa o encaminhamento do lead.

---

## Arquivos a Modificar

| Arquivo | Local | Mudança |
|---------|-------|---------|
| `supabase/functions/_shared/prompts.ts` | Linhas 231-237, 310-317 | Simplificar fluxo C2S |
| `src/lib/promptBuilder.ts` | Linhas 105-111, 182-188 | Atualizar preview do prompt |
| `supabase/functions/make-webhook/index.ts` | Linhas 967-999 | Remover verificação de `hasCompleteData` |
| `src/components/portal/PortalLeadSimulator.tsx` | Linhas 474-481 | Atualizar simulador |

---

## Mudanças Detalhadas

### 1. Backend: `supabase/functions/_shared/prompts.ts`

**Antes:**
```
📤 FLUXO DE ENCAMINHAMENTO C2S:
Quando cliente demonstrar interesse ("gostei", "quero visitar", "pode marcar"):
1. Confirmar: "Perfeito! Posso te conectar com um consultor para organizar a visita?"
2. Se concordar: coletar/confirmar nome, telefone, código do imóvel
3. Usar enviar_lead_c2s com todos os dados
4. Mensagem final: "Pronto! Um consultor vai entrar em contato..."
```

**Depois:**
```
📤 FLUXO DE ENCAMINHAMENTO C2S:
Quando cliente demonstrar interesse ("gostei", "quero visitar", "pode marcar"):
1. Usar enviar_lead_c2s imediatamente (nome e telefone já foram coletados na triagem)
2. Mensagem final: "Pronto! Um consultor vai entrar em contato para tirar dúvidas e agendar a visita."
3. NÃO oferecer mais imóveis após transferência (a menos que cliente peça)

⚡ IMPORTANTE: O sistema já possui o nome e telefone do cliente. NÃO peça confirmação de dados.
```

### 2. Frontend: `src/lib/promptBuilder.ts`

Mesma mudança aplicada às funções `buildLocacaoPromptPreview` e `buildVendasPromptPreview` para que o preview reflita a nova diretriz.

### 3. Lógica Determinística: `supabase/functions/make-webhook/index.ts`

**Antes (linha 967-999):**
```typescript
if (feedback === 'positive') {
  const currentProperty = pendingProperties[currentIndex];
  const hasCompleteData = !!existingName && existingName.toLowerCase() !== 'lead sem nome';
  
  if (hasCompleteData) {
    // Envia para C2S
  } else {
    // Pede confirmação de nome ← REMOVER ISSO
    await updateConsultativeState(supabase, phoneNumber, {
      awaiting_c2s_confirmation: true,
      ...
    });
    aiResponse = `Que ótimo que gostou! 😊 Para registrar seu interesse, pode me confirmar seu nome completo?`;
  }
}
```

**Depois:**
```typescript
if (feedback === 'positive') {
  const currentProperty = pendingProperties[currentIndex];
  const clientName = existingName || 'Cliente';
  
  // SEMPRE envia direto para C2S (dados já coletados na triagem)
  const historyText = history.map(m => `${m.role}: ${m.content}`).join('\n');
  const c2sResult = await sendLeadToC2S(supabase, {
    nome: clientName,
    interesse: `Interesse em ${currentProperty?.tipo || 'imóvel'} - ${currentProperty?.bairro || ''}`,
    tipo_imovel: currentProperty?.tipo,
    bairro: currentProperty?.bairro,
    resumo: `Imóvel código ${currentProperty?.codigo || 'N/A'}`
  }, phoneNumber, historyText, clientName);
  
  await updateConsultativeState(supabase, phoneNumber, {
    awaiting_property_feedback: false,
    pending_properties: []
  });
  
  if (c2sResult.success) {
    c2sTransferred = true;
    const nameGreet = existingName ? `, ${existingName}` : '';
    aiResponse = `Que ótimo${nameGreet}! 🎉 Seu interesse foi registrado. Um consultor vai entrar em contato em breve para organizar a visita.`;
  }
}
```

### 4. Simulador: `src/components/portal/PortalLeadSimulator.tsx`

Remover o fluxo que pede confirmação de dados após horário:

**Antes (linha 474-481):**
```typescript
} else if (lowerMessage.includes('sábado') || ...) {
  addMessage('bot', `Perfeito! Sábado de manhã está ótimo! 📅\n\nSó preciso confirmar alguns dados:\n• Nome completo\n• Telefone para contato\n\nPode me passar?`, ...);
  addMessage('system', '✅ Horário detectado → Coletando dados para confirmação', ...);
```

**Depois:**
```typescript
} else if (lowerMessage.includes('sábado') || ...) {
  addMessage('bot', `Perfeito, ${leadConfig.name}! 🎉\n\nVou te conectar com um consultor para agendar a visita. Ele vai entrar em contato pelo WhatsApp em breve! 😊`, ...);
  addMessage('system', '🚀 HANDOFF: Lead enviado para C2S automaticamente', ...);
```

---

## Fluxo Simplificado (Após Mudança)

```text
┌─────────────────────────────────────────────────────────────────┐
│  CLIENTE DIZ: "Gostei!" / "Quero visitar" / "Pode marcar"       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  SISTEMA: Envia lead diretamente para C2S                       │
│  (usando nome e telefone já coletados na triagem)               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  HELENA DIZ: "Seu interesse foi registrado! Um consultor        │
│  vai entrar em contato em breve para organizar a visita."       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Benefícios

1. **Menos atrito**: Cliente não precisa confirmar dados que já foram coletados
2. **Fluxo mais rápido**: Lead vai para o C2S imediatamente após interesse
3. **Menos abandono**: Cada pergunta adicional aumenta chance de desistência
4. **Código mais simples**: Remove estado `awaiting_c2s_confirmation` do fluxo principal

---

## Seção Técnica

### Estados que serão simplificados

O estado `awaiting_c2s_confirmation` ainda existirá no banco para casos de edge (conversas antigas), mas o fluxo principal não entrará mais nele. A lógica será:

```typescript
// ANTES: Verifica se tem dados completos
const hasCompleteData = !!existingName && existingName !== 'lead sem nome';
if (hasCompleteData) { sendToC2S(); } else { askForConfirmation(); }

// DEPOIS: Sempre envia (fallback para 'Cliente' se não tiver nome)
const clientName = existingName || 'Cliente';
sendToC2S({ nome: clientName, ... });
```

### Arquivos e linhas específicas

- `supabase/functions/_shared/prompts.ts`: linhas 231-237 (Locação), 310-317 (Vendas)
- `src/lib/promptBuilder.ts`: linhas 105-111, 182-188
- `supabase/functions/make-webhook/index.ts`: linhas 967-999
- `src/components/portal/PortalLeadSimulator.tsx`: linhas 474-481
