
Objetivo
- Fazer o Make.com parar de chamar o Supabase em “status callbacks” (que retornam `{ skipped: true, reason: "status_callback" }`) e garantir que o HTTP Request (Módulo 14) só rode quando existe uma mensagem real, para aí sim o retorno conter `data.properties`.

Diagnóstico (com base no seu blueprint)
- No seu cenário atual, o filtro do Módulo 14 está assim:
  - Nome: “Apenas mensagens reais”
  - Condição única: `{{1.messages}} exists`
- Em eventos de status (delivered/read/sent), o Make/connector costuma manter o campo `messages` “existindo” (como array vazio), então `exists` passa mesmo sem mensagem.
- Resultado: o Módulo 14 continua sendo executado em callbacks de status e o Supabase devolve exatamente o que você está vendo: `skipped: true, reason: "status_callback"`.

O que vamos mudar (Make.com)
1) Corrigir o filtro “Apenas mensagens reais” (Módulo 14)
- No cenário: clique no link/ícone do filtro do Módulo 14 (HTTP Request) “Apenas mensagens reais”.
- Troque o filtro para garantir “mensagens não vazias”.

Opção A (recomendada, mais simples e funciona bem)
- Regra 1: `{{1.messages}}` → Operator: Exists
- Regra 2: `{{length(1.messages)}}` → Numeric operators: Greater than → `0`
- As duas regras precisam estar no mesmo bloco (AND).

Opção B (a mais robusta quando “messages” pode existir vazio)
- Regra 1: `{{1.messages[1].id}}` → Operator: Exists
  - (Em status callback não existe `messages[1]`, então não passa.)

Opção C (alternativa por “statuses”)
- Regra 1: `{{1.statuses}}` → Operator: Does not exist
  - ou `{{length(1.statuses)}}` → Equals `0` (se o Make sempre criar `statuses` como array)
- Combine com Opção A ou B se quiser redundância.

2) Salvar e testar com um único disparo controlado
- Salve o cenário no Make.com.
- Rode “Run once”.
- Envie uma mensagem real para o WhatsApp (texto simples): “Quero alugar apartamento no centro, 2 quartos”.
- Resultado esperado no History:
  - Deve aparecer a execução do evento de mensagem (messages preenchido).
  - As execuções de status (delivered/read) devem parar de chegar no Módulo 14 (ou nem executar o Módulo 14).

3) Validar onde olhar o `data.properties`
- No History da execução que passou pelo filtro, abra o “Output” do Módulo 14 (HTTP Request).
- Procure por:
  - `data.success = true`
  - `data.result` (texto)
  - `data.properties` (array)
- Observação importante: você só verá `data.properties` na execução do evento de mensagem real. Em status callback, o Supabase corretamente retorna `skipped`.

4) (Recomendado) Ajustar o body do Módulo 14 para evitar campos vazios por causa de array mapping
No seu blueprint, o body do Módulo 14 usa `{{1.messages[].from}}` etc. Isso pode funcionar, mas é mais seguro mapear sempre o primeiro item:
- phone: `{{1.messages[1].from}}` (ou `{{1.contacts[1].wa_id}}`)
- message_type: `{{1.messages[1].type}}`
- message: `{{1.messages[1].text.body}}`
- button_text: `{{1.messages[1].button.text}}`
- button_payload: `{{1.messages[1].button.payload}}`

Nota sobre áudio no seu blueprint:
- Você está usando `{{1.messages[].audio.url}}`, mas no schema do módulo 1 (watchEvents2) “audio” tem `id` e não `url`.
- Isso não impede `properties`, mas para áudio funcionar depois, você precisará enviar `audio.id` e deixar o Supabase baixar o arquivo via Graph API (ou o Make buscar a URL antes).

5) Depois que `data.properties` aparecer: configurar o envio de imóveis (Iterator + Send Image)
- Router (após o Módulo 14) com rota “Tem imóveis”:
  - Condição: `{{14.data.properties}} exists` AND `{{length(14.data.properties)}} > 0`
- Adicionar Iterator:
  - Array: `{{14.data.properties}}`
- Dentro do Iterator, usar WhatsApp “Send an Image”:
  - Image URL: `{{iterator.foto_destaque}}`
  - Caption: montar com `tipo`, `bairro`, `quartos`, `preco_formatado`, `link`
- Rota alternativa “Sem imóveis”:
  - Enviar apenas `{{14.data.result}}`

Critérios de sucesso (o que deve acontecer)
- O Módulo 14 não executa mais nos eventos de status (logo você para de ver `skipped: status_callback` ali).
- Em mensagens reais, o Módulo 14 mostra `data.properties` no Output.
- A partir daí, o Router/Iterator consegue consumir `data.properties` e enviar as imagens.

Se após corrigir o filtro você ainda ver `skipped: status_callback` no Módulo 14
- Isso quase sempre significa que o filtro ainda está “Exists” apenas, ou que as regras estão em blocos diferentes (virando OR sem querer).
- Use a Opção B (`{{1.messages[1].id}} exists`) que é a mais difícil de “falsos positivos”.

Referência direta do problema no seu blueprint (para você comparar)
- Hoje está:
  - Módulo 14 → filter → conditions: `{{1.messages}} exist`
- Precisa virar:
  - Módulo 14 → filter → conditions: `{{1.messages}} exist` AND `length(1.messages) > 0` (ou `messages[1].id exist`)
