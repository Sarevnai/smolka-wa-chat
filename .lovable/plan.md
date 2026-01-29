# Plano: Correções Anti-Loop e Busca Flexível

## ✅ Status: IMPLEMENTADO (29/01/2026)

---

## Correções Aplicadas

### 1. ✅ Busca com Fallback (`searchPropertiesWithFallback`)
- **Problema**: Busca exata retornava 0 resultados e sistema repetia mensagem idêntica
- **Solução**: Busca em 3 níveis (exata → sem quartos → sem bairro)
- **Implementação**: Substituído `searchProperties` por `searchPropertiesWithFallback` em TODOS os pontos de busca

### 2. ✅ Detecção de Flexibilização Melhorada
- **Problema**: Sistema não detectava respostas simples como "Campeche", "2", "15 mil"
- **Solução**: Adicionados padrões para:
  - Respostas diretas de bairro/região
  - Números simples de quartos ("2", "3")
  - Valores em formato brasileiro ("3.000.000", "15.000")
  - Tipos de imóvel simples ("casa", "apto")

### 3. ✅ Correção do Parsing de Orçamento
- **Problema**: "3.000.000" era parseado como "3000" 
- **Solução**: Regex atualizado para identificar pontos como separadores de milhares (formato BR)
- **Range**: Agora suporta até R$ 100.000.000 (para vendas)

### 4. ✅ Anti-Repetição Ativa
- **Problema**: `isSameMessage()` existia mas não era usada no fluxo principal
- **Solução**: Implementado check antes de enviar resposta
- **Fallback**: Se mensagem duplicada, tenta nova busca com fallback ou pergunta específica

### 5. ✅ Mensagens Contextuais por Tipo de Busca
- **`exact`**: "Encontrei uma opção que combina!"
- **`sem_quartos`**: "Não encontrei com 3 quartos, mas tenho de 4..."
- **`sem_bairro`**: "Não encontrei no Campeche, mas olha essa em..."
- **`no_results`**: "O que prefere ajustar: preço, região ou quartos?"

---

## Arquivo Modificado
- `supabase/functions/make-webhook/index.ts`

---

## Fluxo Corrigido (Exemplo Eduardo)

```
Eduardo: "casa, 3 quartos, Campeche, até 7000"
    ↓
Sistema busca exata: Casa, Campeche, 3q, R$7000
    ↓ 0 resultados
Fallback 1: Casa, Campeche, SEM quartos, R$7000
    ↓ 0 resultados
Fallback 2: Casa, SEM bairro, SEM quartos, R$7000
    ↓ 0 resultados

Helena: "Não encontrei imóveis com esses critérios 😔
        O que prefere ajustar: preço, região ou quartos?"

Eduardo: "pode ser até 15 mil"
    ↓
✅ Flexibilização detectada: budget → R$ 15000
✅ Atualiza lead_qualification
✅ Nova busca com fallback

Helena: "Não encontrei com 3 quartos, mas tenho uma 
        de 4 quartos que pode te interessar 🏠"
[Envia imóvel]
```

---

## Próximos Passos (Opcional)
1. Monitorar logs para confirmar que flexibilizações estão sendo detectadas
2. Ajustar limite de quartos na API Vista (aceitar >=N ao invés de ==N)
3. Considerar adicionar sugestão proativa quando preço está muito abaixo do mercado
