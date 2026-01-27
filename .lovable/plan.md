

# Reset Completo do Lead 554888182882 (Ian Veras)

## Dados a Serem Excluídos

| Tabela | ID | Quantidade |
|--------|-----|------------|
| messages | - | 104 registros |
| conversation_states | `0559b43a-9b49-487c-888e-84a08ca32568` | 1 registro |
| conversations | `693dbb88-74a9-4bb9-ac2e-faa2002ce4bf` | 1 registro |
| contacts | `13629b38-2dd8-4095-83f5-c77829a17ed5` | 1 registro |

## Ordem de Exclusão

A exclusão deve seguir esta ordem para respeitar as dependências:

```text
1. messages          ─┐
2. conversation_states │──▶ Dependem de conversations/contacts
3. conversations     ─┘
4. contacts          ──▶ Registro principal (sem dependências após limpeza)
```

## Comandos SQL

Os seguintes comandos serão executados no Supabase:

```sql
-- 1. Excluir mensagens (104 registros)
DELETE FROM messages 
WHERE wa_from = '554888182882' OR wa_to = '554888182882';

-- 2. Excluir estado da conversa
DELETE FROM conversation_states 
WHERE phone_number = '554888182882';

-- 3. Excluir conversa
DELETE FROM conversations 
WHERE phone_number = '554888182882';

-- 4. Excluir contato
DELETE FROM contacts 
WHERE phone = '554888182882';
```

## Implementação

Para executar essa limpeza, utilizarei a ferramenta de inserção/atualização do Supabase que permite executar comandos DELETE. Cada comando será executado na sequência correta.

## Resultado Esperado

Após a execução:
- ✅ Lead completamente removido do sistema
- ✅ Histórico de mensagens apagado
- ✅ Estado de conversa com IA resetado
- ✅ Contato pode ser recriado do zero se entrar em contato novamente

## Nota Importante

Esta ação é **irreversível**. Todos os dados do lead serão permanentemente excluídos.

