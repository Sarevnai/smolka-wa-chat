# Plano: Visualização e Edição Completa do Prompt da IA

## ✅ IMPLEMENTADO

### Funcionalidades Entregues

1. **Nova aba "Prompt"** na página de configuração da IA (`AIUnifiedConfig`)
   - 8ª aba adicionada com ícone `FileText`
   - Disponível em: Minha IA > Configuração > aba Prompt

2. **Preview em tempo real** do prompt completo por departamento
   - Seletor de departamento (Locação, Vendas, Admin, Empreendimentos, Geral)
   - Visualização do prompt exato enviado para a OpenAI
   - Contador de tokens aproximado com indicador de status (Bom/Médio/Alto)
   - Botão "Copiar" para área de transferência

3. **Campo custom_instructions** destacado
   - Textarea para adicionar instruções extras
   - Explicação de onde aparece no prompt ("INSTRUÇÕES ESPECIAIS:")
   - Afeta todos os departamentos

4. **Modo Override Completo** (avançado)
   - Switch para ativar/desativar por departamento
   - Textarea grande para prompt customizado completo
   - Alerta de segurança ao ativar
   - Substitui 100% do prompt gerado

5. **Backend atualizado**
   - Interface `AIAgentConfig` com campo `prompt_overrides`
   - Função `getPromptForDepartment()` que verifica overrides antes de usar builders
   - Suporte a placeholders `{nome}` e `{nome do contato}`

---

## Arquivos Criados/Modificados

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/components/ai-config/AIPromptTab.tsx` | ✅ Criado | Novo componente da aba de prompt |
| `src/lib/promptBuilder.ts` | ✅ Criado | Funções para gerar preview do prompt no frontend |
| `src/pages/admin/AIUnifiedConfig.tsx` | ✅ Modificado | Adicionada 8ª aba "Prompt" |
| `src/hooks/useAIUnifiedConfig.ts` | ✅ Modificado | Adicionado campo `prompt_overrides` na interface |
| `src/components/ai-config/index.ts` | ✅ Modificado | Export do AIPromptTab |
| `supabase/functions/make-webhook/index.ts` | ✅ Modificado | Suporte a `prompt_overrides` |

---

## Como Usar

### Visualizar o Prompt
1. Acesse **Minha IA > Configuração**
2. Clique na aba **Prompt**
3. Selecione o departamento desejado
4. O preview mostra exatamente o que a IA recebe

### Adicionar Instruções Extras
1. Na seção "Instruções Personalizadas"
2. Digite suas instruções adicionais
3. Clique em "Salvar Configurações"
4. As instruções aparecem como "INSTRUÇÕES ESPECIAIS:" no final do prompt

### Substituir o Prompt Completo
1. Ative o switch "Override Completo"
2. O prompt gerado é copiado para edição
3. Modifique conforme necessário
4. Clique em "Salvar Configurações"

⚠️ **Atenção**: O override substitui 100% do prompt. Certifique-se de incluir todas as regras necessárias.

---

## Validações

- Mínimo 100 caracteres para override
- Máximo 32.000 caracteres (limite da OpenAI)
- Alerta visual se prompt muito grande (> 4.000 tokens)
- Indicador visual de departamentos com override ativo (bolinha laranja)
