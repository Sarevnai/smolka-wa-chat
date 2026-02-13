

# Correcao: Propriedade especifica nao e enviada ao C2S

## Problema Identificado

O fluxo atual tem uma falha estrutural no handoff para o C2S:

1. A IA busca imoveis via `buscar_imoveis` e apresenta o imovel 19219 (Apartamento, Centro, 2 quartos, R$ 618.000)
2. O cliente diz "Legal, gostei dessa opcao"
3. A IA chama `enviar_lead_c2s` mas essa funcao **nao tem parametro para indicar qual imovel especifico o cliente gostou**
4. O payload enviado ao C2S contem apenas dados genericos: "Interesse em Apartamentos - Centro - Florianopolis"
5. O corretor recebe o lead **sem saber qual imovel foi apresentado e aprovado pelo cliente**

O problema nao e que "mandou outro imovel" - e que **nao mandou nenhum imovel especifico**. O C2S recebe apenas criterios genericos (bairro, tipo, faixa de preco) sem o codigo/link do imovel que o cliente viu e gostou.

## Causa Raiz

A tool `enviar_lead_c2s` nao possui campos para:
- Codigo do imovel Vista (`property_code`)
- URL do imovel (`property_url`)
- Detalhes do imovel apresentado

Alem disso, o `conversation_states` salva os `last_search_params` (parametros de busca) mas nao salva **quais imoveis foram efetivamente mostrados ao cliente**.

## Plano de Correcao

### 1. Adicionar campo `property_code` na tool `enviar_lead_c2s`

Incluir um novo parametro na definicao da tool:

```text
property_code: string - "Codigo do imovel Vista que o cliente demonstrou interesse (ex: 19219)"
property_url: string - "Link do imovel no site"
```

Isso permite que o LLM informe qual imovel especifico o cliente gostou quando chamar a funcao.

### 2. Salvar imoveis apresentados no `conversation_states`

Quando o sistema envia um imovel para o cliente (apos `buscar_imoveis`), salvar os dados do imovel no `conversation_states.last_search_params` ou em um novo campo, para que em interacoes futuras a IA saiba o que ja foi mostrado.

### 3. Propagar dados do imovel no payload do C2S

Na funcao `sendLeadToC2S`, incluir os campos `property_code` e `property_url` no body enviado para `c2s-create-lead`:

```text
property_code: params.property_code
property_url: params.property_url
```

E incluir na descricao do lead: "Cliente gostou do imovel codigo 19219 - https://smolkaimoveis.com.br/imovel/19219"

### 4. Atualizar prompt para instruir a IA

Adicionar instrucao no system prompt para que, ao chamar `enviar_lead_c2s`, a IA inclua o codigo e link do imovel que o cliente aprovou:

```text
Ao usar enviar_lead_c2s apos o cliente aprovar um imovel:
- SEMPRE inclua property_code com o codigo do imovel mostrado
- SEMPRE inclua property_url com o link do imovel
- Inclua no campo interesse os detalhes especificos do imovel aprovado
```

---

## Detalhes Tecnicos

### Arquivo: `supabase/functions/ai-virtual-agent/index.ts`

**Alteracao 1 - Tool definition (~linha 629)**

Adicionar `property_code` e `property_url` aos parametros de `enviar_lead_c2s`:

```typescript
properties: {
  // ... campos existentes ...
  property_code: {
    type: "string",
    description: "Codigo do imovel Vista que o cliente demonstrou interesse (ex: 19219)"
  },
  property_url: {
    type: "string", 
    description: "URL do imovel no site (ex: https://smolkaimoveis.com.br/imovel/19219)"
  }
}
```

**Alteracao 2 - Funcao `sendLeadToC2S` (~linha 1473)**

Incluir property_code e property_url no body e na description:

```typescript
body: {
  // ... campos existentes ...
  property_code: params.property_code || null,
  property_url: params.property_url || null,
  description: params.interesse + 
    (params.property_code ? ` | Imovel aprovado: codigo ${params.property_code}` : '') +
    (params.property_url ? ` | ${params.property_url}` : ''),
}
```

**Alteracao 3 - Salvar imoveis apresentados (~linha 4060)**

Apos enviar o imovel ao cliente, salvar no `conversation_states`:

```typescript
await supabase
  .from('conversation_states')
  .upsert({
    phone_number: phoneNumber,
    last_property_shown: {
      code: property.Codigo,
      url: property.link,
      type: property.Tipo,
      neighborhood: property.Bairro,
      price: property.ValorVenda || property.ValorAluguel
    },
    updated_at: new Date().toISOString()
  }, { onConflict: 'phone_number' });
```

**Alteracao 4 - Instrucao no prompt (~linha 928)**

Atualizar a secao de encaminhamento C2S:

```text
ENCAMINHAMENTO PARA C2S (USE enviar_lead_c2s):
- SEMPRE inclua property_code e property_url do imovel que o cliente aprovou
- Se o cliente gostou de um imovel especifico, passe o codigo e link dele
- Nao envie dados genericos quando o cliente escolheu um imovel especifico
```

### Arquivo: `supabase/functions/c2s-create-lead/index.ts`

Verificar se aceita `property_code` e `property_url` no payload. Se nao, adicionar esses campos ao registro em `c2s_integration.lead_data`.

### Migracao de banco (se necessario)

Se `conversation_states` nao tiver campo para imovel apresentado, pode ser necessario adicionar coluna `last_property_shown` do tipo JSONB.

---

## Arquivos Modificados

| Arquivo | Alteracao |
|---------|-----------|
| `supabase/functions/ai-virtual-agent/index.ts` | Tool definition + sendLeadToC2S + salvar imovel mostrado + prompt |
| `supabase/functions/c2s-create-lead/index.ts` | Aceitar property_code/url no payload (se necessario) |
| Migracao SQL | Coluna `last_property_shown` em `conversation_states` (se necessario) |

