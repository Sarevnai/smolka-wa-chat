

# Correção: Triagem não funciona - Cliques dos Botões não são Processados

## Diagnóstico Completo

### Problema 1: JSON do Make Incompleto

O Make.com recebe os cliques dos botões do template, mas o JSON enviado para o `make-webhook` **não inclui os dados dos botões**:

**JSON Atual:**
```json
{
  "phone": "{{1.messages[].from}}",
  "message": "{{1.messages[].text.body}}",
  "message_type": "{{1.messages[].type}}",
  "media_url": "{{1.messages[].audio.url}}",
  "media_mime": "{{1.messages[].audio.mime_type}}",
  "media_caption": "{{1.messages[].image.caption}}"
}
```

Quando o cliente clica em "Alugar":
- `message_type` = `"button"`
- `text.body` = **vazio** (botões não têm text.body!)
- `button.text` = `"Alugar"` (não enviado!)
- `button.payload` = `"Setor de locação"` (não enviado!)

**JSON Corrigido (precisa incluir os campos de botão):**
```json
{
  "phone": "{{1.messages[].from}}",
  "message": "{{1.messages[].text.body}}",
  "message_type": "{{1.messages[].type}}",
  "media_url": "{{1.messages[].audio.url}}",
  "media_mime": "{{1.messages[].audio.mime_type}}",
  "media_caption": "{{1.messages[].image.caption}}",
  "button_text": "{{1.messages[].button.text}}",
  "button_payload": "{{1.messages[].button.payload}}"
}
```

### Problema 2: Webhook não processa mensagens do tipo "button"

O `make-webhook` não tem lógica para processar mensagens quando `message_type = "button"`. Quando recebe clique de botão:
1. `message` está vazio
2. Webhook retorna erro ou entra em fluxo errado
3. Como `message_type = "button"` mas não há handler, o código não encontra departamento

### Problema 3: Rota de Template sem Filtro

A rota de template no Make (ID 18) **não tem filtro** que verifique `send_template`. Isso significa que:
- O template pode ser enviado em situações incorretas
- Ou não ser enviado quando deveria

---

## Solução Completa

### Parte 1: Atualizar JSON no Make.com

Você precisará atualizar o módulo HTTP Request (ID 14) no Make para incluir os campos de botão:

```json
{
  "phone": "{{1.messages[].from}}",
  "message": "{{1.messages[].text.body}}",
  "message_type": "{{1.messages[].type}}",
  "media_url": "{{1.messages[].audio.url}}",
  "media_mime": "{{1.messages[].audio.mime_type}}",
  "media_caption": "{{1.messages[].image.caption}}",
  "button_text": "{{1.messages[].button.text}}",
  "button_payload": "{{1.messages[].button.payload}}"
}
```

### Parte 2: Atualizar make-webhook para Processar Botões

O webhook precisa:

1. **Aceitar novos campos** `button_text` e `button_payload`
2. **Detectar mensagens do tipo "button"**
3. **Mapear os botões para departamentos**
4. **Continuar o fluxo de pré-atendimento** após atribuição

```typescript
// Novos campos no request
interface MakeWebhookRequest {
  phone: string;
  message: string;
  message_type?: string;
  // ... campos existentes ...
  button_text?: string;     // 🆕 Texto do botão clicado
  button_payload?: string;  // 🆕 Payload do botão clicado
}

// Mapeamento de botões do template triagem
const TRIAGE_BUTTON_MAP: Record<string, 'locacao' | 'vendas' | 'administrativo'> = {
  'alugar': 'locacao',
  'comprar': 'vendas',
  'já sou cliente': 'administrativo',
  // Payloads configurados no Make
  'setor de locação': 'locacao',
  'setor de vendas': 'vendas',
  'setor administrativo': 'administrativo'
};
```

### Parte 3: Adicionar Filtro na Rota de Template no Make

Na rota de template (ID 18), adicionar filtro:

```
Condição: {{14.data.send_template.name}} existe E não está vazio
```

### Parte 4: Criar Prompts de Pré-Atendimento por Departamento

Após o cliente escolher o departamento, a IA precisa fazer o pré-atendimento adequado:

**Locação:**
- Perguntar: região de interesse, tipo de imóvel (apto/casa), quartos, faixa de valor
- Fazer busca no Vista
- Apresentar opções
- Transferir para C2S

**Vendas:**
- Perguntar: morar ou investir, região, tipo de imóvel, orçamento
- Fazer busca no Vista
- Apresentar opções
- Transferir para C2S

**Administrativo:**
- Perguntar: qual a demanda (boleto, contrato, manutenção, etc.)
- Classificar com tags
- Notificar setor interno
- Manter no pipeline administrativo

---

## Alterações no Código

### 1. supabase/functions/make-webhook/index.ts

| Linha | Alteração |
|-------|-----------|
| ~10-23 | Adicionar `button_text` e `button_payload` à interface |
| ~885-891 | Extrair novos campos do body |
| ~330-345 (nova) | Criar mapeamento de botões `TRIAGE_BUTTON_MAP` |
| ~906-975 | Tratar `message_type === 'button'` para extrair departamento |
| ~1133-1153 | Usar `button_text`/`button_payload` para detectar departamento |
| ~1144-1149 | Após atribuir departamento, iniciar pré-atendimento da IA |

### 2. Nova Função: Prompts de Pré-Atendimento

Criar funções para cada departamento:
- `buildPreAttendanceLocacaoPrompt()`
- `buildPreAttendanceVendasPrompt()`
- `buildPreAttendanceAdminPrompt()`

---

## Diagrama do Fluxo Corrigido

```text
┌─────────────────────────────────────────────────────────────────┐
│                    FLUXO COMPLETO DE TRIAGEM                    │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │  Cliente envia "Olá"    │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │  Já tem nome no banco?  │
                    └────────────┬────────────┘
                          ┌──────┴──────┐
                          │             │
                          ▼             ▼
                       SIM            NÃO
                          │             │
                          │             ▼
                          │   ┌─────────────────────┐
                          │   │  Perguntar o nome   │
                          │   │  "Como posso te     │
                          │   │   chamar?"          │
                          │   └──────────┬──────────┘
                          │              │
                          │              ▼
                          │   ┌─────────────────────┐
                          │   │  Recebe: "João"     │
                          │   │  Salva nome         │
                          │   └──────────┬──────────┘
                          │              │
                          └──────┬───────┘
                                 │
                                 ▼
                    ┌──────────────────────────────┐
                    │  Enviar saudação + template  │
                    │  "Prazer, João! 😊"          │
                    │  + botões [Comprar][Alugar]  │
                    │           [Já sou cliente]   │
                    └────────────┬─────────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────────┐
                    │  Cliente clica no botão     │
                    │  (message_type = "button")  │
                    │  button_text = "Alugar"     │
                    └────────────┬────────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────────┐
                    │  Webhook recebe e mapeia    │
                    │  "Alugar" → locacao         │
                    └────────────┬────────────────┘
                                 │
                     ┌───────────┼───────────┐
                     │           │           │
                     ▼           ▼           ▼
               ┌──────────┐ ┌──────────┐ ┌──────────────┐
               │ LOCAÇÃO  │ │ VENDAS   │ │ADMINISTRATIVO│
               └────┬─────┘ └────┬─────┘ └──────┬───────┘
                    │            │              │
                    ▼            ▼              ▼
            Pré-atendimento Pré-atendimento  Identificar
            com busca Vista com busca Vista   demanda
                    │            │              │
                    ▼            ▼              ▼
            Apresenta        Apresenta      Classificar
            imóveis          imóveis        com tags
                    │            │              │
                    ▼            ▼              ▼
            Encaminhar      Encaminhar      Notificar
            para C2S        para C2S        setor interno
```

---

## Resumo de Alterações

| Componente | Alteração |
|------------|-----------|
| **Make.com - HTTP Request** | Adicionar campos `button_text` e `button_payload` no JSON |
| **Make.com - Rota Template** | Adicionar filtro `send_template.name` existe |
| **make-webhook** | Adicionar interface para novos campos de botão |
| **make-webhook** | Criar mapeamento `TRIAGE_BUTTON_MAP` |
| **make-webhook** | Processar `message_type === 'button'` |
| **make-webhook** | Criar prompts de pré-atendimento por departamento |

---

## Fluxo de Pré-Atendimento por Departamento

### Locação (após clicar "Alugar")
```
IA: "Perfeito, João! 🏠 Vou te ajudar a encontrar o imóvel ideal para alugar.
     Qual região de Florianópolis você tem interesse?"
→ Cliente responde região
→ IA busca no Vista
→ IA apresenta opções
→ IA qualifica (quartos, valor, data de mudança)
→ IA transfere para C2S
```

### Vendas (após clicar "Comprar")
```
IA: "Excelente, João! 🏡 Vou te ajudar a encontrar o imóvel dos seus sonhos.
     Você está buscando para morar ou para investir?"
→ Cliente responde
→ IA pergunta região e tipo
→ IA busca no Vista
→ IA apresenta opções
→ IA transfere para C2S
```

### Administrativo (após clicar "Já sou cliente")
```
IA: "Certo, João! 😊 Como posso te ajudar hoje?
     Boleto, contrato, manutenção ou outra questão?"
→ Cliente explica demanda
→ IA classifica e adiciona tags
→ IA notifica setor interno
→ Conversa fica no pipeline administrativo
```

