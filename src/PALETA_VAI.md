# 🎨 Paleta de Cores VAI - Implementação Completa

## Sistema de Design Aplicado

A paleta de cores do VAI foi completamente implementada seguindo a identidade visual baseada no logo (azul tecnológico + verde acento), criando uma experiência B2B/IA/SaaS profissional e elegante.

---

## 🔵 Cores Primárias (Identidade)

### Azul VAI – Principal
**Hex:** `#1F5FBF`  
**CSS Variable:** `--vai-blue-primary`  
**Tailwind:** `bg-primary`, `text-primary`, `border-primary`

**Uso:**
- Botões primários (CTA)
- Links e elementos interativos
- Ícones de destaque
- Logo e branding
- Headers e elementos de navegação

### Azul Profundo (Tech / Fundo)
**Hex:** `#0B1E3A`  
**CSS Variable:** `--vai-blue-deep`  
**Tailwind:** `bg-sidebar`

**Uso:**
- Sidebar principal
- Headers fixos
- Dark mode backgrounds
- Fundos institucionais
- Elementos de contraste forte

---

## 🟢 Cor de Acento (IA / Automação / Conversão)

### Verde IA (Acento)
**Hex:** `#16C784`  
**CSS Variable:** `--vai-green-ai`  
**Tailwind:** `bg-accent`, `text-accent`

**Uso:**
- CTA principal (Call-to-Action estratégico)
- Status "ativo" / "online"
- Indicadores de sucesso
- Highlights de IA/Automação
- "Cor do dinheiro" - usar com parcimônia

**Regra de Ouro:** Reservar para ações críticas de conversão e elementos de IA.

---

## ⚪⚫ Neutros (UI / Legibilidade)

### Branco Real
**Hex:** `#FFFFFF`  
**CSS Variable:** `--vai-white`  
**Uso:** Fundos de cards, modais, áreas principais de conteúdo

### Cinza UI Claro
**Hex:** `#F4F6F8`  
**CSS Variable:** `--vai-gray-ui`  
**Tailwind:** `bg-background`, `bg-secondary`, `bg-muted`

**Uso:**
- Background principal do sistema
- Cards e seções secundárias
- Superfícies de baixo contraste
- Áreas de tabela alternadas

### Cinza Texto Primário
**Hex:** `#1F2937`  
**CSS Variable:** `--vai-gray-text-primary`  
**Tailwind:** `text-foreground`, `text-card-foreground`

**Uso:**
- Títulos e headings
- Labels e textos principais
- Conteúdo de alta prioridade

### Cinza Texto Secundário
**Hex:** `#6B7280`  
**CSS Variable:** `--vai-gray-text-secondary`  
**Tailwind:** `text-muted-foreground`

**Uso:**
- Subtítulos e descrições
- Placeholders em inputs
- Textos auxiliares
- Metadata e timestamps

---

## 🔴🟡 Estados do Sistema (Feedback)

### Erro / Alerta Crítico
**Hex:** `#EF4444`  
**CSS Variable:** `--vai-error`  
**Tailwind:** `bg-destructive`, `text-destructive`

**Uso:**
- Mensagens de erro
- Validações negativas
- Ações destrutivas (deletar, cancelar)
- Alertas críticos

### Aviso
**Hex:** `#F59E0B`  
**CSS Variable:** `--vai-warning`  
**Tailwind:** Custom class necessária

**Uso:**
- Avisos importantes
- Status pendente
- Limites próximos ao máximo
- Atenção moderada

### Sucesso
**Hex:** `#22C55E` (Alternativa: usar Verde IA `#16C784`)  
**CSS Variable:** `--vai-success`  
**Tailwind:** Custom class ou usar `bg-accent`

**Uso:**
- Confirmações de sucesso
- Status completado
- Validações positivas
- Checkmarks e aprovações

---

## 📊 Cores de Gráficos (Charts)

```css
--chart-1: #1F5FBF  /* Azul VAI */
--chart-2: #16C784  /* Verde IA */
--chart-3: #F59E0B  /* Aviso */
--chart-4: #EF4444  /* Erro */
--chart-5: #0B1E3A  /* Azul Profundo */
```

---

## 🧩 Combinações Prontas (UI Patterns)

### Layout Principal
```css
Sidebar: #0B1E3A (Azul Profundo)
Header: #1F5FBF (Azul VAI)
Fundo: #F4F6F8 (Cinza UI)
Texto: #1F2937 (Cinza Texto Primário)
```

### Botões

**Primário (Ação Principal):**
- Background: `#1F5FBF`
- Texto: `#FFFFFF`

**Acento (CTA Crítico):**
- Background: `#16C784`
- Texto: `#FFFFFF`

**Secundário:**
- Background: `#F4F6F8`
- Texto: `#1F2937`

**Destrutivo:**
- Background: `#EF4444`
- Texto: `#FFFFFF`

### Cards e Superfícies
- Card principal: `#FFFFFF` com sombra suave
- Card secundário: `#F4F6F8`
- Border padrão: `rgba(31, 95, 191, 0.1)` (Azul VAI transparente)

---

## 🌙 Dark Mode

O sistema suporta dark mode com a mesma paleta adaptada:

- Background: `#0B1E3A` (Azul Profundo)
- Cards: `#1F2937` (Cinza escuro)
- Texto: `#FFFFFF`
- Acento: Mantém `#16C784` (Verde IA)
- Primary: Mantém `#1F5FBF` (Azul VAI)

---

## ✅ Checklist de Implementação

- [x] CSS Variables definidas em `/styles/globals.css`
- [x] Tokens Tailwind configurados
- [x] Background gradientes atualizados
- [x] Sidebar com Azul Profundo
- [x] Botões primários com Azul VAI
- [x] Acento Verde IA para CTAs
- [x] Estados de erro/aviso/sucesso
- [x] Charts com paleta VAI
- [x] Dark mode implementado
- [x] Documentação completa

---

## 🎯 Filosofia da Paleta

### Autoridade Técnica
Os azuis profundos comunicam confiabilidade, tecnologia e profissionalismo B2B.

### IA e Inovação
O verde acento representa inteligência artificial, automação e crescimento - a essência do VAI.

### Escalabilidade
A paleta foi desenhada para:
- Dashboards densos com muita informação
- SaaS multi-módulos complexos
- Landing pages de alta conversão
- Manter identidade em dark mode

---

## 📝 Como Usar

### No código Tailwind:
```tsx
// Azul VAI Principal
<Button className="bg-primary text-primary-foreground">
  Ação Principal
</Button>

// Verde IA (Acento)
<Button className="bg-accent text-accent-foreground">
  Conversão / IA
</Button>

// Sidebar
<div className="bg-sidebar text-sidebar-foreground">
  Menu
</div>
```

### Com CSS Variables:
```css
.meu-elemento {
  background: var(--vai-blue-primary);
  color: var(--vai-white);
  border: 1px solid var(--vai-green-ai);
}
```

### Inline (para gradientes):
```tsx
<div style={{ 
  background: 'linear-gradient(to right, #1F5FBF, #16C784)' 
}}>
  Gradiente VAI
</div>
```

---

**Última atualização:** Dezembro 2024  
**Versão da paleta:** 1.0  
**Status:** ✅ Implementada e em produção
