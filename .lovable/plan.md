
# Plano: Configurar Cron Job para Release Stale Handovers

## Diagnóstico Crítico

### Situação Atual
| Item | Status |
|------|--------|
| Edge Function `release-stale-handovers` | ✅ Existe e está deployada |
| Cron Job para executá-la | ❌ **NÃO CONFIGURADO** |
| Logs de execução | ❌ Nenhum (nunca rodou) |
| Usuários em zona morta AGORA | ⚠️ **3 conversas há 22+ horas** |

### Conversas Presas Atualmente

| Telefone | Aguardando desde | Tempo em zona morta |
|----------|------------------|---------------------|
| 554888520872 | 02/02 17:43 | **22h 49min** |
| 554896426215 | 02/02 17:47 | **22h 45min** |
| 554888182882 | 02/02 17:51 | **22h 42min** |

Estes usuários estão esperando resposta humana que nunca veio, e a IA não está respondendo porque `is_ai_active = false`.

---

## Solução

### Ação 1: Criar Cron Job no Banco de Dados

Executar SQL para agendar a função para rodar a cada 5 minutos:

```sql
SELECT cron.schedule(
  'release-stale-handovers',
  '*/5 * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://wpjxsgxxhogzkkuznyke.supabase.co/functions/v1/release-stale-handovers',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer <ANON_KEY>"}'::jsonb,
        body:='{"timeout_minutes": 30}'::jsonb
    ) as request_id;
  $$
);
```

**Por que 5 minutos?**
- Timeout de handover é 30 minutos
- Check a cada 5 min garante que ninguém fica preso mais que 35 min no pior caso
- Balanceamento entre responsividade e custo de execução

### Ação 2: Liberar Conversas Presas Imediatamente

Executar correção imediata para as 3 conversas em zona morta:

```sql
UPDATE conversation_states
SET 
  is_ai_active = true,
  operator_takeover_at = NULL,
  operator_id = NULL,
  updated_at = NOW()
WHERE is_ai_active = false 
  AND operator_takeover_at IS NOT NULL
  AND operator_takeover_at < NOW() - INTERVAL '30 minutes';
```

---

## Verificações Pós-Implementação

1. **Confirmar cron job criado:**
```sql
SELECT * FROM cron.job WHERE jobname = 'release-stale-handovers';
```

2. **Monitorar execuções:**
```sql
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'release-stale-handovers')
ORDER BY start_time DESC LIMIT 10;
```

3. **Verificar logs da edge function** após primeira execução

---

## Arquivos/Recursos Modificados

| Recurso | Ação |
|---------|------|
| `cron.job` (tabela Supabase) | Inserir novo cron job |
| `conversation_states` (tabela) | Update imediato para liberar presos |
| `release-stale-handovers` (edge function) | Sem alteração - já funcional |

---

## Impacto Esperado

- **Imediato:** 3 conversas liberadas de volta para IA
- **Contínuo:** Nenhum usuário ficará mais de ~35 minutos em zona morta
- **Preventivo:** Sistema auto-recupera de operadores que esquecem de responder

---

## Considerações de Segurança

O cron job precisa do `ANON_KEY` no header de autorização. A função já está configurada com `verify_jwt = false` no `config.toml`, então aceita chamadas do cron.

