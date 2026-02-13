

# Plano de Evolucao Sistematica - Smolka CRM

## Resumo do Entendimento

O sistema e um CRM interno para a imobiliaria Smolka Imoveis (Florianopolis), com atendimento via WhatsApp integrado por dois canais isolados (API Oficial para marketing/vendas e Make.com para locacao/vendas/administrativo). Opera com 4 departamentos, RBAC granular, IA de pre-atendimento (Helena/Aimee) com qualificacao automatica de leads, e pipeline Kanban por setor. Equipe pequena (1-5 usuarios). Produto interno, sem acesso publico.

---

## Fase 1: Polimento UX/UI e Correcoes Rapidas

### 1.1 Remover aba de cadastro publico
- **Objetivo**: Eliminar a aba "Cadastrar" em `/auth`, mantendo apenas login
- **Arquivos**: `src/pages/Auth.tsx`
- **Risco**: Baixo
- **Teste**: Verificar que login funciona normalmente, signup nao esta acessivel

### 1.2 Remover console.logs de producao
- **Objetivo**: Limpar logs de debug do AuthProvider e Index
- **Arquivos**: `src/hooks/useAuth.tsx` (linhas 29, 36, 147), `src/pages/Index.tsx` (linha 56)
- **Risco**: Nenhum
- **Teste**: Verificar que nao ha logs poluindo o console do navegador

### 1.3 Corrigir trends hardcoded nos dashboards
- **Objetivo**: Remover valores fake de tendencia (`trend: { value: 12, isPositive: true }`) que passam informacao falsa ou substituir por dados reais
- **Arquivos**: `src/components/dashboard/AdminDashboardContent.tsx`, `src/components/dashboard/DepartmentDashboardContent.tsx`
- **Risco**: Baixo
- **Teste**: Dashboard nao mostra tendencias falsas

### 1.4 Corrigir padding duplicado
- **Objetivo**: Layout.tsx ja aplica `p-6` em tudo exceto `/chat`. Remover `p-6` interno de paginas que o duplicam
- **Arquivos**: `src/pages/Pipeline.tsx` (linha 54), `src/pages/Triage.tsx` (linha 76), `src/pages/admin/ManagementDashboard.tsx` (linha 95)
- **Risco**: Baixo, visual
- **Teste**: Verificar espacamento consistente em todas as paginas

### 1.5 Renomear "Inbox" para "Demandas" na UI
- **Objetivo**: A pagina `/inbox` e um Kanban de tickets, nao uma caixa de entrada. Renomear titulo e breadcrumbs para "Gestao de Demandas"
- **Arquivos**: `src/pages/Inbox.tsx` (titulo), breadcrumbs se aplicavel
- **Risco**: Baixo
- **Teste**: Nome correto exibido na pagina e navegacao

### 1.6 Sidebar: auto-abrir secao da rota ativa
- **Objetivo**: Quando o usuario esta em `/admin/users`, a secao "Administracao" deve abrir automaticamente. Idem para "Minha Aimee" com rotas `/admin/ia-*`
- **Arquivos**: `src/components/AppSidebar.tsx`
- **Risco**: Baixo
- **Teste**: Navegar para sub-rotas e verificar que a secao colapsavel correspondente esta aberta

### 1.7 Limpar array vazio de integrationItems
- **Objetivo**: A sidebar declara `integrationItems` como array vazio (linha 48), gerando uma secao "Integracoes" sem sub-itens alem do link geral
- **Arquivos**: `src/components/AppSidebar.tsx`
- **Risco**: Nenhum
- **Teste**: Secao de integracoes sem sub-itens orfaos

---

## Fase 2: Consistencia Visual e Arquitetura de Componentes

### 2.1 Centralizar configuracao de departamentos
- **Objetivo**: `DEPARTMENT_CONFIG` esta duplicado em pelo menos 4 arquivos com cores e icones diferentes. Criar um unico `src/lib/departmentConfig.ts` centralizado (ja existe parcialmente) e eliminar duplicatas
- **Arquivos afetados**: `src/lib/sidebarConfig.ts`, `src/pages/Pipeline.tsx`, `src/pages/Triage.tsx`, `src/components/dashboard/DepartmentDashboardContent.tsx`
- **Risco**: Medio - precisa garantir que todas as referencias sao atualizadas
- **Teste**: Verificar cores e icones consistentes em sidebar, pipeline, triagem e dashboard

### 2.2 Padronizar tokens de design
- **Objetivo**: Documentar e aplicar consistentemente os tokens ja definidos em `index.css` (OKLCH). Verificar uso de cores hardcoded vs variaveis CSS
- **Arquivos**: Auditoria em componentes que usam cores diretas (`bg-blue-500`, `text-emerald-600`) em vez de variaveis do tema
- **Risco**: Baixo
- **Teste**: Verificar que dark mode funciona corretamente em todas as paginas

### 2.3 Adicionar empty states consistentes
- **Objetivo**: Paginas como Dashboard, Contatos, Pipeline e Reports nao tem empty states quando nao ha dados. Criar componente reutilizavel `EmptyState`
- **Arquivos**: Novo `src/components/ui/empty-state.tsx`, aplicar em paginas existentes
- **Risco**: Baixo
- **Teste**: Verificar cada pagina sem dados mostra ilustracao e CTA apropriados

---

## Fase 3: Banco de Dados e Performance

### 3.1 Observacoes sobre o schema atual

O banco tem 44 tabelas com dominio claro:
- **Core CRM**: contacts, conversations, messages, contact_departments
- **IA/Qualificacao**: lead_qualification, conversation_states, ai_behavior_config
- **Pipeline**: conversation_stages, tickets, ticket_stages
- **Marketing**: campaigns, campaign_results, contact_groups, contact_tags
- **Admin/RBAC**: profiles, user_functions, function_permissions, user_permissions
- **Integracoes**: c2s_integration, clickup_config, portal_leads_log

**Pontos de atencao identificados:**
1. `campaigns.department_code` e tipo `text` em vez de `department_type` enum - inconsistencia com o resto do schema
2. `tickets.stage` e `text` referenciando `ticket_stages.name` por nome em vez de FK por id - fragil
3. `contacts` tem campos de IA (`ai_handling`, `ai_takeover_at`, `operator_takeover_*`) que poderiam ser movidos para `conversation_states` para melhor separacao de responsabilidades
4. Sem indice explicito em `messages.conversation_id` ou `messages.wa_from` (pode impactar performance com volume crescente)
5. `lead_qualification` nao tem FK para `conversations` apesar de ter `conversation_id`

### 3.2 Ajustes prioritarios de banco (alto impacto, baixo risco)

- Criar indices em `messages(conversation_id)` e `messages(wa_from)` para otimizar queries de chat
- Corrigir tipo de `campaigns.department_code` de `text` para enum `department_type`
- Adicionar FK em `lead_qualification.conversation_id -> conversations.id`

### 3.3 Paginacao de contatos
- **Objetivo**: A lista de contatos carrega todos de uma vez. Implementar paginacao ou virtualizacao
- **Arquivos**: `src/hooks/useContacts.ts`, `src/pages/Contacts.tsx`
- **Risco**: Medio
- **Teste**: Verificar scroll e carregamento com muitos contatos

---

## Fase 4: Funcionalidades Complementares

### 4.1 Mapa de funcionalidades por modulo

| Modulo | Funcionalidades Existentes |
|---|---|
| **Chat** | Lista de conversas, mensagens em tempo real, midia, templates, handover IA, flags, reacoes, forward, busca, agendamento |
| **Contatos** | CRUD, filtros, import CSV, ratings, tags, departamentos, contratos, bulk message |
| **Pipeline** | Kanban por departamento, drag-and-drop, stages configuraveis |
| **Triagem** | Listagem de conversas sem setor, atribuicao rapida, exclusao |
| **Tickets/Inbox** | Kanban de tickets, prioridade, categorias, drag-and-drop |
| **Marketing** | Campanhas, templates WhatsApp, listas de contatos, relatorios, IA config |
| **Admin** | Usuarios, permissoes, logs, AI config, C2S dashboard, gestao, empreendimentos |
| **IA** | Dashboard metricas, configuracao unificada, notificacoes, qualificacao, perfil WhatsApp |

### 4.2 Funcionalidades sugeridas para evolucao

**Curto prazo (junto com Fase 1-2):**
- Botao "Criar ticket" na pagina Inbox/Demandas
- "Esqueci minha senha" na pagina de login
- Indicador de forca de senha ao criar usuario

**Medio prazo (Fase 3+):**
- Historico de alteracoes em contatos (audit trail visual)
- Notificacoes push/sonoras configuraveis por usuario
- Filtros salvos na lista de contatos

---

## Checklist de Implementacao (ordem sugerida)

| # | Item | Fase | Risco |
|---|---|---|---|
| 1 | Remover aba cadastro publico | F1 | Baixo |
| 2 | Remover console.logs | F1 | Nenhum |
| 3 | Corrigir trends hardcoded | F1 | Baixo |
| 4 | Corrigir padding duplicado | F1 | Baixo |
| 5 | Renomear Inbox para Demandas | F1 | Baixo |
| 6 | Auto-abrir secao ativa na sidebar | F1 | Baixo |
| 7 | Limpar integrationItems vazio | F1 | Nenhum |
| 8 | Centralizar DEPARTMENT_CONFIG | F2 | Medio |
| 9 | Empty states consistentes | F2 | Baixo |
| 10 | Indices em messages | F3 | Baixo |
| 11 | Paginacao de contatos | F3 | Medio |
| 12 | Botao criar ticket no Inbox | F4 | Baixo |

Para iniciar, recomendo aprovar este plano e pedir a implementacao de um bloco de itens por vez (ex: "Implemente os itens 1 a 7 da Fase 1").

