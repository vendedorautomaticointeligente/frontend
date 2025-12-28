# 🎨 PALETA VAI REFINADA - Minimal • Tech • SaaS

**Status:** ✅ Implementada
**Data:** Dezembro 2024
**Versão:** 2.0 (Refinada)

---

## 📋 Índice

1. [Fundamentos](#fundamentos)
2. [Paleta de Cores](#paleta-de-cores)
3. [Tipografia](#tipografia)
4. [Guia de Uso](#guia-de-uso)
5. [Classes Tailwind Disponíveis](#classes-tailwind-disponíveis)

---

## 🎯 Fundamentos

### Filosofia de Design

O VAI adota uma estética **minimalista** e **tech/SaaS moderna**, com foco em:

- **Fundo extremamente clean** - Branco puro sem ruído visual
- **Cores apenas para ação e semântica** - Nunca decorativas
- **Alta legibilidade** - Hierarquia tipográfica forte
- **Sensação premium** - Interface que "respira"

### Inspiração

Seguimos a linha de design de produtos globais:
- Notion
- Linear
- Vercel
- Stripe Dashboards

---

## 🎨 Paleta de Cores

### ⚪ Fundos (Base do Sistema)

Sem ruído visual. Altíssima legibilidade. Sensação premium.

| Elemento | Cor | Variável CSS | Uso |
|----------|-----|--------------|-----|
| Background Principal | `#FFFFFF` | `--vai-bg-primary` | Páginas, App |
| Background Secundário | `#F8FAFC` | `--vai-bg-secondary` | Cards, Tables, Sections |
| Divider / Bordas | `#E5E7EB` | `--vai-divider` | Separadores sutis |

---

### ⚫ Tipografia (Semântica Forte)

Texto é o protagonismo, não a cor.

| Elemento | Cor | Variável CSS | Uso |
|----------|-----|--------------|-----|
| Texto Principal | `#0F172A` | `--vai-text-primary` | Títulos e corpo |
| Texto Secundário | `#475569` | `--vai-text-secondary` | Descrições, labels |
| Texto Muted | `#94A3B8` | `--vai-text-muted` | Placeholders, help text |

---

### 🔵 Azul Tech (Ação Neutra / Navegação)

Usado **somente** em ícones ativos, links e botões secundários.

| Elemento | Cor | Variável CSS | Uso |
|----------|-----|--------------|-----|
| Azul VAI | `#2563EB` | `--vai-blue-tech` | Primary tech accent |
| Hover Azul | `#1D4ED8` | `--vai-blue-hover` | Estado hover |

**Uso Recomendado:**
- ✅ Ícones ativos
- ✅ Links clicáveis
- ✅ Toggle ON neutro
- ✅ Botões secundários (outline ou ghost)

---

### 🟢 Verde IA (Conversão / Ação Forte)

Cor emocional. Use apenas onde gera resultado.

| Elemento | Cor | Variável CSS | Uso |
|----------|-----|--------------|-----|
| Verde IA | `#16C784` | `--vai-green-ai` | Primary CTA |
| Hover Verde | `#12B76A` | `--vai-green-hover` | Estado hover |

**Uso Recomendado:**
- ✅ Botão principal de conversão
- ✅ Status "ativo / funcionando"
- ✅ Indicadores de sucesso

**⚠️ Regra de Ouro:** Se tudo for verde, nada é verde.

---

### 🔴🟡 Estados do Sistema (Pontuais)

Nunca dominantes. Usados apenas para feedback do sistema.

| Elemento | Cor | Variável CSS | Uso |
|----------|-----|--------------|-----|
| Erro | `#DC2626` | `--vai-error` | Mensagens de erro |
| Aviso | `#F59E0B` | `--vai-warning` | Alertas |
| Info | `#3B82F6` | `--vai-info` | Informações (discreto) |

---

## 🔤 Tipografia

### Fonte Principal: Inter

**Por que Inter?**
- Moderna e altamente legível
- Nativa de SaaS
- Excelente em números e tabelas
- Ampla disponibilidade

### Pesos Utilizados

| Peso | Variável | Uso |
|------|----------|-----|
| 400 | `--font-weight-normal` | Corpo de texto |
| 500 | `--font-weight-medium` | Labels e elementos de UI |
| 600 | - | Títulos (opcional) |
| 700 | - | Headings importantes (opcional) |

### Hierarquia Tipográfica

Definida automaticamente pelos elementos HTML:

- `<h1>` - Títulos principais
- `<h2>` - Subtítulos de seção
- `<h3>` - Títulos de card/componente
- `<h4>` - Labels importantes
- `<p>` - Corpo de texto
- `<label>` - Labels de formulário
- `<button>` - Textos de botão
- `<input>` - Textos de input

---

## 📐 Guia de Uso

### Do's ✅

1. **Fundo branco** para páginas principais
2. **Fundo secundário (#F8FAFC)** para cards e seções
3. **Azul tech** para ações secundárias e navegação
4. **Verde IA** APENAS para CTAs principais e sucesso
5. **Bordas sutis** com #E5E7EB
6. **Hierarquia de texto** usando os três níveis de cinza

### Don'ts ❌

1. ❌ NÃO use verde para tudo
2. ❌ NÃO misture muitas cores simultaneamente
3. ❌ NÃO use cores para decoração
4. ❌ NÃO crie fundos coloridos sem propósito
5. ❌ NÃO ignore a hierarquia tipográfica
6. ❌ NÃO use bordas muito escuras

---

## 🎨 Classes Tailwind Disponíveis

### Backgrounds

```tsx
// Fundos
bg-vai-bg-primary     // #FFFFFF
bg-vai-bg-secondary   // #F8FAFC
```

### Textos

```tsx
// Tipografia
text-vai-text-primary    // #0F172A - Títulos e corpo
text-vai-text-secondary  // #475569 - Descrições
text-vai-text-muted      // #94A3B8 - Placeholders
```

### Cores de Ação

```tsx
// Azul Tech
bg-vai-blue-tech        // #2563EB
hover:bg-vai-blue-hover // #1D4ED8
text-vai-blue-tech      // Para textos/ícones

// Verde IA
bg-vai-green-ai         // #16C784
hover:bg-vai-green-hover // #12B76A
text-vai-green-ai       // Para textos/ícones
```

### Bordas

```tsx
border-vai-divider      // #E5E7EB
```

### Estados

```tsx
text-vai-error    // #DC2626
text-vai-warning  // #F59E0B
text-vai-info     // #3B82F6

bg-vai-error      // Fundos de erro
bg-vai-warning    // Fundos de aviso
bg-vai-info       // Fundos de info
```

---

## 🌙 Dark Mode

O dark mode está pré-configurado com:

- Background: `#0F172A`
- Cards: `#1E293B`
- Bordas: `#334155`
- Textos: `#F8FAFC`, `#CBD5E1`, `#64748B`

Mantém as mesmas cores de ação (azul e verde) para consistência.

---

## 📊 Tokens do Sistema

### Componentes UI

```css
--primary: #2563EB         /* Azul Tech */
--accent: #16C784          /* Verde IA */
--destructive: #DC2626     /* Vermelho Erro */
--muted: #F8FAFC          /* Cinza suave */
--border: #E5E7EB         /* Bordas */
```

### Charts

```css
--chart-1: #2563EB  /* Azul Tech */
--chart-2: #16C784  /* Verde IA */
--chart-3: #F59E0B  /* Amarelo Aviso */
--chart-4: #DC2626  /* Vermelho Erro */
--chart-5: #475569  /* Cinza Secundário */
```

---

## 🎯 Resultado Visual Esperado

✨ **Interface que "respira"**
- Espaçamento generoso
- Elementos bem definidos
- Zero poluição visual

🌍 **SaaS com cara de produto global**
- Profissional e moderno
- Confiável e limpo
- Tech-forward

🎨 **Foco total em:**
- Conteúdo
- Dados  
- Ação

---

## 📝 Changelog

### Versão 2.0 (Refinada) - Dezembro 2024

**Mudanças principais:**

1. **Paleta simplificada**
   - Removido azul profundo (#0B1E3A)
   - Novo azul tech mais vibrante (#2563EB)
   - Verde IA mantido (#16C784)

2. **Fundos minimalistas**
   - Branco puro (#FFFFFF) para páginas
   - Cinza muito suave (#F8FAFC) para cards
   - Bordas ultra-sutis (#E5E7EB)

3. **Tipografia semântica**
   - 3 níveis de cinza bem definidos
   - Fonte Inter como padrão
   - Hierarquia clara e consistente

4. **Sidebar clean**
   - Fundo branco em vez de azul escuro
   - Alinhado com estética minimalista
   - Melhor integração visual

---

## 📚 Recursos

- **Figma Make Styles:** `/styles/globals.css`
- **Documentação Original:** `/PALETA_VAI.md`
- **Componentes UI:** `/components/ui/`

---

**Feito com 💙 pelo time VAI**
