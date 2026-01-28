# Make Webhook - Correções Aplicadas ✅

## Status: IMPLEMENTADO

As 4 correções foram aplicadas ao `make-webhook`:

### 1. ✅ Villa Maggiore Bloqueado no Make
- Leads de Villa Maggiore agora retornam `200 OK` com `skipped: true`
- Mensagem: "Este empreendimento é atendido pelo número da API direta"
- Roteamento: Make (48 91631011) → skip | API Direta (48 23980016) → atende

### 2. ✅ Áudio Apenas para Voice Messages (Rapport)
- Áudio TTS gerado apenas quando `message_type === 'audio' || 'voice'`
- Logs: "Generating audio response to match user voice message (rapport strategy)"
- Texto normal não gera áudio

### 3. ✅ Contexto do Cliente Preservado
- `buildQuickTransferPrompt` agora recebe `history` como parâmetro
- Seção "CONTEXTO IMPORTANTE" adicionada ao prompt quando há histórico
- Nome do contato buscado do banco antes de chamar a IA
- Instruções explícitas para NÃO repetir perguntas já respondidas

### 4. ✅ Triagem com Debug Logging
- Logs já existentes para triage stage
- Nome buscado do banco com `getContactName` antes de processar

## Fluxo Atual

```
Make Webhook (48 91631011)
         │
         ▼
    É desenvolvimento?
    ┌────┴────┐
    │         │
    ▼         ▼
Villa     Outro dev
Maggiore  ou nenhum
    │         │
    ▼         ▼
 SKIP     Processar
(200 OK)  com Helena
            │
            ▼
      Cliente enviou áudio?
      ┌────┴────┐
      │         │
     SIM       NÃO
      │         │
      ▼         ▼
   Gerar     Só texto
   TTS
```
