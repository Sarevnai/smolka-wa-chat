

# Correção: Triagem Não Iniciada - Lead Associado ao Villa Maggiore

## Diagnóstico

Os logs confirmam exatamente o problema:

```
🏗️ Development lead found: Villa Maggiore
⛔ Development "Villa Maggiore" is handled by direct WhatsApp API (48 23980016), not Make (48 91631011). Skipping.
```

### Causa Raiz

O telefone **554888182882** possui um registro na tabela `portal_leads_log` criado em 26/01/2026 (há ~44 horas), que ainda está **dentro do período de 72 horas**:

| Campo | Valor |
|-------|-------|
| Telefone | 554888182882 |
| Empreendimento | Villa Maggiore |
| Idade | 1 dia 19:44:11 |
| Dentro das 72h? | **SIM** |

A função `checkDevelopmentLead` encontra esse registro e assume que é um lead do Villa Maggiore. Como implementamos o bloqueio de Villa Maggiore no Make, o sistema faz **skip** e a triagem nunca acontece.

---

## Solução: Limpar também a `portal_leads_log`

Precisamos adicionar a limpeza da `portal_leads_log` ao reset do contato:

```sql
-- Adicionar à limpeza de reset
DELETE FROM portal_leads_log WHERE contact_phone = '554888182882';
```

---

## Plano de Implementação

### 1. Executar limpeza adicional

Criar uma migration para limpar o registro antigo:

```sql
-- Limpar portal_leads_log para permitir teste de triagem
DELETE FROM portal_leads_log WHERE contact_phone = '554888182882';
```

### 2. Atualizar documentação de reset

Para futuros resets, incluir a tabela `portal_leads_log` na lista de tabelas a limpar.

---

## Alterações

| Arquivo | Tipo | Alteração |
|---------|------|-----------|
| Nova migration | SQL | Deletar registros de `portal_leads_log` para o telefone de teste |

---

## Resultado Esperado

Após a limpeza:

1. `checkDevelopmentLead` retornará `null` (sem lead de empreendimento)
2. `detectDevelopmentFromMessage` não encontrará "villa maggiore" na mensagem "Olá"
3. O fluxo entrará na **triagem genérica** da Helena
4. A Helena perguntará: "Olá! Como posso te ajudar? Você quer: 1) Alugar, 2) Comprar, ou 3) Já é cliente?"

