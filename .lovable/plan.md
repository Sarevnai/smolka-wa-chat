

# Plano de Aplicação do Tema tweakcn (OKLCH)

## Resumo

Este plano irá aplicar o novo tema visual usando cores OKLCH do tweakcn, atualizando as fontes para **Bricolage Grotesque**, **Castoro** e **Sometype Mono**, e implementando o sistema de sombras customizado.

---

## Análise do Estado Atual

| Item | Valor Atual | Novo Valor |
|------|-------------|------------|
| **Formato de cor** | HSL | OKLCH |
| **Cor primária** | Verde WhatsApp (144 79% 33%) | Roxo/Índigo (oklch 0.2704 0.0998 274) |
| **Fonte principal** | Inter | Bricolage Grotesque |
| **Fonte mono** | Fira Code | Sometype Mono |
| **Radius** | 0.5rem | 1.25rem |
| **Tailwind** | v3.4.17 | v3.4.17 (mantido) |

---

## Pontos de Atenção

### Compatibilidade OKLCH com Tailwind v3

O projeto usa **Tailwind CSS v3.4.17**. O formato OKLCH é suportado nativamente nos navegadores modernos, mas:

1. **Tailwind v3 usa `hsl(var(--color))`** - precisa alterar para usar valores OKLCH diretamente
2. **Não há necessidade de upgrade para v4** - OKLCH funciona como valores CSS normais
3. **Componentes existentes** - continuarão funcionando após a atualização

### Variáveis Customizadas a Preservar

O projeto possui variáveis específicas que precisam ser adaptadas ao novo tema:

| Variável | Uso | Ação |
|----------|-----|------|
| `--message-outbound` | Bolhas de mensagem enviada | Adaptar para novo tema |
| `--message-inbound` | Bolhas de mensagem recebida | Adaptar para novo tema |
| `--chat-background` | Fundo da área de chat | Adaptar para novo tema |
| `--chat-pattern` | Padrão SVG do fundo | Manter |
| `--gold-*` | Tema Gold SaaS legado | **Remover** (não mais usado) |
| `--neutral-*` | Escala de cinzas | Substituir pelo tema |
| `--surface-*` | Superfícies | Substituir pelo tema |

---

## Arquivos a Modificar

### 1. `index.html` - Adicionar Google Fonts

```html
<!-- Adicionar novas fontes -->
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;500;600;700&family=Castoro&family=Sometype+Mono&display=swap" rel="stylesheet">
```

### 2. `src/index.css` - Substituir Variáveis CSS

Substituir completamente as variáveis `:root` e `.dark` com os valores OKLCH fornecidos.

**Principais mudanças:**
- Todas as cores migradas para OKLCH
- Novas variáveis de fonte (--font-sans, --font-serif, --font-mono)
- Sistema de sombras expandido (shadow-2xs até shadow-2xl)
- Radius aumentado de 0.5rem para 1.25rem
- Cores de mensagem adaptadas ao novo tema

### 3. `tailwind.config.ts` - Atualizar Configuração

**Mudanças necessárias:**
- Alterar função wrapper de `hsl(var(...))` para `oklch(var(...))`
- Atualizar fontFamily para usar as novas fontes
- Adicionar novas variáveis de shadow
- Adicionar suporte a chart-1 até chart-5
- Remover cores "gold" legadas (opcional - manter para retrocompatibilidade)

---

## Implementação Detalhada

### Fase 1: Atualizar Fontes (index.html)

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700&family=Castoro&family=Sometype+Mono&display=swap" rel="stylesheet">
```

### Fase 2: Substituir CSS Variables (src/index.css)

O arquivo será reescrito para usar o novo tema OKLCH. Pontos críticos:

1. **Manter variáveis de mensagem** - Adaptar cores para combinar com o tema
2. **Manter chat-pattern** - SVG de fundo continua funcionando
3. **Adicionar novas variáveis** - chart-1 até chart-5, shadows, tracking

**Cores de mensagem adaptadas ao novo tema:**
```css
/* Light mode - tons que combinam com o tema roxo */
--message-outbound: oklch(0.85 0.08 277);  /* Lilás suave */
--message-inbound: oklch(0.97 0.01 106);   /* Branco quente */

/* Dark mode */
--message-outbound: oklch(0.35 0.10 277);  /* Roxo escuro */
--message-inbound: oklch(0.28 0.008 59);   /* Cinza quente */
```

### Fase 3: Atualizar Tailwind Config (tailwind.config.ts)

**Alteração do wrapper de cores:**
```typescript
// ANTES
background: "hsl(var(--background))",

// DEPOIS  
background: "var(--background)",
```

**Nota importante:** Como OKLCH já inclui a função `oklch()` no valor da variável, o Tailwind não precisa mais de wrapper. Exemplo:
- CSS: `--background: oklch(0.9232 0.0026 48.7171);`
- Tailwind: `background: "var(--background)"` → compila para `background: oklch(0.9232 0.0026 48.7171);`

**Novas propriedades a adicionar:**
- fontFamily: serif (Castoro)
- borderRadius: xl (calc(var(--radius) + 4px))
- colors: chart-1 até chart-5
- boxShadow: shadows do tema

---

## Mapeamento de Cores do Novo Tema

### Light Mode

| Variável | Valor OKLCH | Descrição Visual |
|----------|-------------|------------------|
| background | oklch(0.9232 0.0026 48.71) | Cinza rosado claro |
| foreground | oklch(0.2795 0.0368 260) | Azul escuro |
| primary | oklch(0.2704 0.0998 274) | Índigo profundo |
| secondary | oklch(0.8687 0.0043 56.37) | Bege claro |
| accent | oklch(0.6670 0.0528 321.8) | Magenta suave |
| destructive | oklch(0.6368 0.2078 25.33) | Vermelho |

### Dark Mode

| Variável | Valor OKLCH | Descrição Visual |
|----------|-------------|------------------|
| background | oklch(0.2244 0.0074 67.44) | Marrom escuro |
| foreground | oklch(0.9288 0.0126 255.5) | Azul muito claro |
| primary | oklch(0.6801 0.1583 276.93) | Roxo médio |
| secondary | oklch(0.3359 0.0077 59.42) | Marrom médio |
| accent | oklch(0.3896 0.0074 59.47) | Marrom acinzentado |

---

## Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Cores OKLCH não suportadas em browsers antigos | Baixa | Médio | Navegadores modernos suportam (Chrome 111+, Firefox 113+, Safari 15.4+) |
| Contraste insuficiente em algumas áreas | Média | Baixo | Testar visualmente após aplicação |
| Componentes com cores hardcoded | Baixa | Baixo | Já usam variáveis CSS |
| Fontes não carregando | Baixa | Médio | Fallback fonts definidos |

---

## Resumo de Arquivos

| Arquivo | Ação | Complexidade |
|---------|------|--------------|
| `index.html` | Adicionar fonts | Baixa |
| `src/index.css` | Reescrever variáveis | Alta |
| `tailwind.config.ts` | Atualizar config | Média |

**Total de arquivos:** 3
**Estimativa de linhas alteradas:** ~350

---

## Checklist Pós-Implementação

- [ ] Verificar tema claro no chat
- [ ] Verificar tema escuro no chat
- [ ] Testar toggle de tema
- [ ] Verificar contraste de botões
- [ ] Verificar legibilidade de textos
- [ ] Testar em mobile
- [ ] Verificar fontes carregando corretamente

