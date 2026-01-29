
## Diagnóstico (por que não busca no Vista e por que entrou em loop)

### 1) A integração com o Vista está funcionando, mas não está sendo acionada
- O `make-webhook` só chama o Vista quando existe um *tool call* do OpenAI com `buscar_imoveis`:
  - `callOpenAI(..., toolsWithVista)` → retorna `tool_calls`
  - Só então o código entra em `if (toolCall.function.name === 'buscar_imoveis')` e chama `searchProperties()` → `supabase.functions.invoke('vista-search-properties')`.
- Nos logs recentes do `make-webhook`, **não existe “Tool call: buscar_imoveis”** nem “Searching properties”, então **nunca chega a chamar o Vista**.
- Eu testei o `vista-search-properties` diretamente com os critérios atuais desse lead e ele retornou imóveis, então o problema não é a API Vista; é o gatilho.

### 2) O “anti-loop” está criando um falso “vou buscar”, mas sem buscar de verdade
- Quando a IA gera uma resposta que parece repetir uma pergunta já respondida, `isLoopingQuestion()` dispara e substitui por:
  - Próxima pergunta (se ainda falta algo), ou
  - Se não falta nada: `Perfeito! Com essas informações, vou buscar as melhores opções pra você 😊`
- Só que **essa frase é apenas texto**. Ela **não dispara** a busca no Vista.
- Aí quando o cliente diz “fico no aguardo”, o sistema volta a cair no mesmo caminho e repete a mesma frase, gerando o loop.

### 3) Fluxo de qualificação ainda depende demais do OpenAI
- Mesmo com `lead_qualification` preenchido, o OpenAI ainda pode perguntar fora de ordem ou repetir; o sistema só corrige “depois” (com regex), e hoje quando corrige, cai no “vou buscar…” sem executar a busca.

---

## Objetivo das correções
1) **Buscar no Vista de forma determinística** (sem depender do OpenAI chamar tool).
2) **Quebrar o atendimento em perguntas de 1 passo por vez**, mais humano e previsível.
3) **Eliminar repetição** (“fico no aguardo” não pode gerar o mesmo texto de novo; deve buscar e enviar imóvel, ou pedir um ajuste).

---

## Plano de implementação (mudanças no `supabase/functions/make-webhook/index.ts`)

### A) Criar gatilho determinístico de busca (“auto-search”) após qualificação suficiente
1. **Adicionar helper** `buildSearchParamsFromQualification(currentDepartment, qualData)`:
   - Mapeia `lead_qualification` para params do Vista:
     - `finalidade`: `locacao` ou `venda`
     - `bairro`: `qualData.detected_neighborhood`
     - `tipo`: converter “Apartamento” → `apartamento`, “Casa” → `casa` etc
     - `quartos`: `qualData.detected_bedrooms`
     - `preco_max`: `qualData.detected_budget_max`
     - `cidade`: “Florianópolis”
     - `limit`: 3 (ou 5 se você quiser manter mais opções no `pending_properties`)
2. **Adicionar helper** `hasMinimumCriteriaToSearch(dept, qualProgress)`:
   - Sugestão prática para evitar buscas “largas demais”:
     - Locação: exigir `has_region && has_budget && (has_type || has_bedrooms)`
     - Vendas: exigir `has_purpose && has_region && has_budget && (has_type || has_bedrooms)`
3. **No fluxo “triage completed”**, antes de chamar `callOpenAI`:
   - Se `hasMinimumCriteriaToSearch(...)` for `true` e **não** estiver `awaiting_property_feedback`, então:
     - Executar `searchProperties(supabase, paramsDerivadosDoBanco)` diretamente
     - Se retornar imóveis:
       - Salvar consultative state:
         - `pending_properties = properties.slice(0, 5)`
         - `current_property_index = 0`
         - `awaiting_property_feedback = true`
       - `propertiesToSend = [pending_properties[0]]`
       - `aiResponse` vira uma mensagem humana curta + pergunta (“esse faz sentido?”)
     - Se retornar 0 imóveis:
       - `aiResponse = "Não encontrei com esses critérios… o que você prefere ajustar: preço, região ou quartos?"`
       - (sem repetir “vou buscar”)

Resultado esperado: quando o lead já está qualificado (como nesse caso: Centro, Apartamento, 2, 8000), **o sistema busca no Vista imediatamente e manda 1 imóvel**.

---

### B) Tratar “fico no aguardo / pode procurar / ok” como confirmação para executar a busca (sem loop)
1. Criar helper `isWaitingSignal(messageContent)` com regex do tipo:
   - “fico no aguardo”, “aguardando”, “pode buscar”, “pode procurar”, “pode mandar”, “ok”, “beleza”, “show”
2. Se `isWaitingSignal(...)` e `hasMinimumCriteriaToSearch(...)`:
   - Forçar a busca (mesmo que o OpenAI não peça)
3. Além disso, adicionar proteção simples de repetição:
   - Antes de salvar outbound, buscar a última mensagem outbound e, se `aiResponse` for idêntica e recente, substituir por:
     - Ou busca (se tiver critérios)
     - Ou pergunta objetiva (“Quer ajustar o valor máximo ou a região?”)
   
Resultado esperado: “fico no aguardo” nunca mais vira “vou buscar…” repetido; vira busca e imóvel, ou pergunta de ajuste.

---

### C) Aplicar “pode ser mais caro” também no fluxo normal (não só no feedback do imóvel)
Hoje `detectPriceFlexibility()` só roda no ramo `feedback === 'negative'` quando já existe `pending_properties`.
1. Mover/duplicar o check de `detectPriceFlexibility(messageContent)` para o fluxo normal (triage completed), antes de:
   - Perguntar próxima etapa
   - Buscar imóveis
   - Chamar OpenAI
2. Se detectar `increase` sem valor:
   - Responder imediatamente: “Até quanto você considera pagar…”
   - Não buscar ainda (aguardar valor)

Resultado esperado: se não achar imóveis e o cliente disser “pode ser mais caro”, a Helena pergunta “até quanto” em vez de voltar para perguntas antigas.

---

### D) Permitir atualização de orçamento quando o cliente der um novo valor
O `updateQualificationData()` atualmente não sobrescreve `detected_budget_max` se já existir, o que quebra “pode ser mais caro” + novo número.
1. Ajustar regra do `updateQualificationData()`:
   - Para `detected_budget_max`: atualizar sempre que extrair um número novo válido e ele for diferente do anterior
   - (Opcional) manter log “Budget updated from X to Y”
2. (Opcional mas recomendado) sempre atualizar `last_interaction_at`, mesmo que não tenha campo novo além do timestamp, para manter rastreio correto.

Resultado esperado: se o cliente subir o orçamento, a busca realmente muda.

---

### E) Tornar a qualificação mais “humana” e de 1 pergunta por vez (sem depender do OpenAI)
Para evitar repetição e inconsistência:
1. Se `getNextQualificationQuestion(qualProgress, dept)` retornar uma pergunta:
   - Retornar essa pergunta diretamente (com uma frase curta humanizada e nome, se houver)
   - Não chamar OpenAI nessa etapa
2. Só chamar OpenAI quando:
   - For apresentar imóvel (pode ser fixo também) ou
   - For casos “administrativo” / dúvidas abertas

Resultado esperado: ordem consistente (região → tipo → quartos → orçamento) e sem “rajadas” de perguntas.

---

## Como vamos validar (checklist prático)
1. Com um lead qualificado (ex.: Centro, apartamento, 2 quartos, até 8000):
   - Enviar “ok” ou “fico no aguardo”
   - Confirmar nos logs do `make-webhook` que aparece:
     - “🏠 Searching properties: …”
     - “✅ Vista returned X properties”
     - “Consultative flow: saved … sending 1”
   - Confirmar que o Make recebe `properties[0]` e envia imagem/caption.
2. Cenário “pode ser mais caro”:
   - Após “não encontrei…”, cliente: “pode ser mais caro”
   - Resposta esperada: “Até quanto você considera pagar?”
   - Cliente: “até 10 mil”
   - Confirmar que `lead_qualification.detected_budget_max` mudou e que a busca roda.
3. Anti-loop:
   - Cliente: “fico no aguardo” repetidas vezes
   - Resposta não pode repetir “vou buscar…”; deve:
     - Ou enviar imóvel
     - Ou pedir ajuste específico (se 0 resultados)

---

## Arquivos envolvidos
- `supabase/functions/make-webhook/index.ts` (principal)
- Sem migração nova necessária (vamos reutilizar `conversation_states.pending_properties/current_property_index/awaiting_property_feedback` e `lead_qualification`)

