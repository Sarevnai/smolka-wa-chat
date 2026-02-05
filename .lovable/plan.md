
## Diagnóstico (passo a passo)

1) **Identifiquei que existem registros no banco para esse contato**, mas eles estão salvos com um formato de telefone diferente do que você está tentando excluir.  
   - Você informou: `48 9 88182882` (com o “9”).  
   - No banco (Test), os registros estão em: **`554888182882`** (sem o “9” após o DDD).

2) **O Edge Function `delete-lead` hoje só apaga por igualdade exata** (`eq('phone_number', normalizedPhone)` etc.).  
   Resultado: quando você chama a função com `5548988182882`, ela procura exatamente isso — e **não encontra** `554888182882`, então retorna `deleted_counts` tudo `0`.

3) **Isso explica o comportamento do agente “repetindo a mesma frase” e “sem triagem”**:  
   - Ainda existe `conversation_states.awaiting_property_feedback = true` e `pending_properties` para `554888182882`.  
   - Quando você continua conversando, o fluxo fica preso pedindo feedback do imóvel (“O que você achou desse imóvel...”), parecendo loop.

---

## Evidência concreta (o que está sobrando no banco)

Para o telefone **`554888182882`** eu encontrei:
- `contacts.phone = 554888182882`
- `conversations.phone_number = 554888182882`
- `conversation_states.phone_number = 554888182882` (com `awaiting_property_feedback=true` e `pending_properties`)
- `lead_qualification.phone_number = 554888182882`

Ou seja: **tem registro sim**, mas no formato “sem o 9”.

---

## Correção imediata (workaround sem mudar código)

Enquanto a correção definitiva não entra:
1) Vá no card **Excluir Lead de Teste**
2) Em vez de `5548988182882`, use **`554888182882`** (sem o 9 após o DDD)
3) Execute a exclusão

Isso deve remover de fato `lead_qualification`, `conversation_states`, `messages`, `conversations` e `contacts` para o registro que está sobrando.

---

## Correção definitiva (mudança de código)

### Objetivo
Fazer o `delete-lead` apagar **todas as variações prováveis** do telefone:
- com e sem `55`
- com e sem o “9” após o DDD (12 vs 13 dígitos)
- (opcional) outras normalizações simples

### Mudanças propostas

#### 1) `supabase/functions/delete-lead/index.ts` — deletar por variações, não por igualdade exata
- Importar e reutilizar utilitários compartilhados (para manter padrão do projeto):
  - `normalizePhoneNumber` e `getPhoneVariations` de `supabase/functions/_shared/utils.ts`
- Criar uma função interna tipo `buildDeletionPhoneVariations(inputPhone: string): string[]` que:
  - remove não-dígitos
  - se não começar com `55` e tiver 10/11 dígitos, adiciona `55`
  - aplica `getPhoneVariations()` para gerar com/sem “9”
  - retorna uma lista única (Set) com todas as variações

- Trocar todos os `.eq('phone', normalizedPhone)` / `.eq('phone_number', normalizedPhone)` por `.in(...variations)`:
  - `contacts`: buscar **todos** os `id` onde `phone in variations`
  - `conversations`: buscar **todos** os `id` onde `phone_number in variations`
  - `messages`:
    - deletar por `conversation_id in conversationIds`
    - e também por `wa_from in variations` e `wa_to in variations`
  - `lead_qualification`: deletar por `phone_number in variations`
  - `conversation_states`: deletar por `phone_number in variations`
  - `ai_suggestions`: deletar por `contact_phone in variations`

- Robustez adicional (importante):
  - substituir `.single()` por `.maybeSingle()` quando fizer sentido, ou preferir `.select()` retornando arrays
  - suportar múltiplos contatos/conversas (hoje `.single()` pode falhar silenciosamente ou não retornar o esperado)

- Melhorar retorno da função para debug:
  - retornar também `checked_phone_variations: string[]`
  - retornar `matched: { contacts: number; conversations: number; qualifications: number; states: number; }`
  - isso evita o “apagou mas não apagou” sem visibilidade

#### 2) (Opcional, mas recomendado) Expandir a limpeza para tabelas que podem manter referência indireta
Se vocês consideram “apagar tudo” literalmente, adicionar também:
- `portal_leads_log` (por `contact_phone in variations` e/ou por `contact_id in contactIds`)
- `campaign_results` (se tiver coluna `phone`, e/ou por `contact_id`)
Essas tabelas aparecem no schema e podem manter rastros do lead dependendo do fluxo de entrada.

#### 3) `src/components/admin/DeleteTestLeadCard.tsx` — deixar claro que o sistema aceita variações
- Atualizar o texto de ajuda:
  - hoje sugere “sempre com 55 + DDD + número”
  - mudar para algo como: “Aceita com/sem 55 e com/sem o 9 após o DDD; a exclusão tentará todas as variações automaticamente”
- (Opcional) Exibir na UI as `checked_phone_variations` retornadas para transparência.

#### 4) (Opcional) Auto-heal do fluxo de triagem para evitar “estado preso”
Mesmo com a exclusão resolvida, pode acontecer de:
- conversa estar `pending` (sem department_code) + `triage_stage = completed` (stale)
Isso faz o agente “não triagem” e cair em outro fluxo.

Correção defensiva:
- Em `supabase/functions/ai-virtual-agent/index.ts`, dentro do bloco `if (isPendingTriage)`:
  - se `triage_stage === 'completed'` mas `currentDepartment` é `null`, tratar como inconsistente e:
    - setar `triage_stage` para `'awaiting_triage'` (ou `'greeting'`)
    - reenviar botões de triagem ou tentar inferir dept pelo texto
Isso impede loops quando sobra estado antigo.

---

## Como vamos validar (checklist)

1) **Antes**: rodar exclusão com número “com 9” e confirmar que hoje dá `deleted_counts=0` (reproduz o problema).  
2) Aplicar a correção do `delete-lead`.  
3) Rodar a exclusão de novo com `5548988182882` e confirmar que:
   - a resposta inclui `checked_phone_variations` contendo também `554888182882`
   - `deleted_counts.lead_qualification > 0` e `deleted_counts.conversation_states > 0` (pelo menos)
4) Confirmar via SQL (ou logs) que **não existem mais** registros com `...8182882` nessas tabelas.
5) Teste end-to-end:
   - mandar mensagem novamente para esse contato
   - verificar que o fluxo não repete a pergunta do imóvel e que a triagem volta ao comportamento esperado (ou o fluxo correto de início).

---

## Resultado esperado

- Você poderá digitar o número no formato que tiver (com ou sem “9”), e o sistema vai apagar tudo que estiver associado a **qualquer variação**.
- O agente deixa de “repetir frase” porque o `conversation_states`/`lead_qualification` presos são removidos.
- Menos risco de “dados fantasmas” por inconsistência de formatação de telefone.
