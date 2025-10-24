# Sistema de Rating Automático de Contatos

## Visão Geral

O sistema de rating automático classifica contatos de 1 a 5 estrelas com base em métricas de engajamento. Se um contato não tiver um rating manual definido, o sistema calcula automaticamente baseado em três fatores principais.

## Cálculo do Rating (0-5 pontos)

### 1. Frequência de Mensagens (0-2 pontos)
- **0 mensagens**: 0 pontos
- **1-4 mensagens**: 0.5 pontos  
- **5-9 mensagens**: 1 ponto
- **10-19 mensagens**: 1.5 pontos
- **20+ mensagens**: 2 pontos

### 2. Atividade Recente (0-2 pontos)
- **Última semana**: 2 pontos
- **Último mês**: 1.5 pontos
- **Últimos 3 meses**: 1 ponto
- **Últimos 6 meses**: 0.5 pontos
- **Mais de 6 meses**: 0 pontos

### 3. Contratos Ativos (0-1 ponto)
- **3+ contratos ativos**: 1 ponto
- **2 contratos ativos**: 0.75 pontos
- **1 contrato ativo**: 0.5 pontos
- **Nenhum contrato**: 0 pontos

## Conversão de Score para Rating

O score total (0-5) é convertido para um rating de 1 a 5 estrelas:
- **0 pontos** → 1 estrela (mínimo)
- **0.5-1.5 pontos** → 2 estrelas
- **2-2.5 pontos** → 3 estrelas
- **3-3.5 pontos** → 4 estrelas
- **4+ pontos** → 5 estrelas

## Interpretação dos Ratings

| Rating | Descrição | Perfil |
|--------|-----------|--------|
| ⭐⭐⭐⭐⭐ | Contato VIP | Alta engajamento, atividade recente, múltiplos contratos |
| ⭐⭐⭐⭐ | Contato ativo | Boa interação, atividade regular |
| ⭐⭐⭐ | Contato regular | Interação moderada |
| ⭐⭐ | Pouca atividade | Poucas mensagens ou inativo |
| ⭐ | Inativo ou novo | Sem histórico ou muito antigo |

## Uso no Sistema

### Frontend
O rating é exibido automaticamente nos cards de contatos e pode ser visualizado com um tooltip explicativo ao passar o mouse sobre as estrelas.

### Backend
O cálculo é feito em tempo real no hook `useContacts` e `useContactByPhone`, mesclando dados de:
- Tabela `contacts` (rating manual)
- Tabela `messages` (frequência e recência)
- Tabela `contact_contracts` (contratos ativos)

## Vantagens

1. **Priorização automática**: Identifica contatos VIP automaticamente
2. **Visibilidade**: Mostra quais contatos merecem mais atenção
3. **Consistência**: Rating baseado em métricas objetivas
4. **Flexibilidade**: Rating manual sobrescreve o automático quando necessário

## Manutenção

O sistema é mantido em:
- `src/lib/contactRating.ts` - Lógica de cálculo
- `src/hooks/useContacts.ts` - Aplicação do rating
- `src/pages/Contacts.tsx` - Visualização com tooltip

## Exemplos

### Contato VIP (5 estrelas)
- 30 mensagens trocadas
- Última mensagem há 3 dias
- 2 contratos ativos
- **Score**: 2 + 2 + 0.75 = 4.75 → ⭐⭐⭐⭐⭐

### Contato Regular (3 estrelas)
- 8 mensagens trocadas
- Última mensagem há 45 dias
- 1 contrato ativo
- **Score**: 1 + 1 + 0.5 = 2.5 → ⭐⭐⭐

### Contato Inativo (1 estrela)
- 2 mensagens trocadas
- Última mensagem há 8 meses
- Nenhum contrato ativo
- **Score**: 0.5 + 0 + 0 = 0.5 → ⭐
