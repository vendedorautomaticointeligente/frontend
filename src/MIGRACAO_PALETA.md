# 🎨 Guia de Migração da Paleta VAI

**De:** Paleta Original (Azul Profundo)  
**Para:** Paleta Refinada (Minimal Tech)

---

## 📊 Tabela de Mapeamento de Cores

### Cores Primárias

| Uso | Antiga | Nova | Variável |
|-----|--------|------|----------|
| **Azul Principal** | `#1F5FBF` | `#2563EB` | `--vai-blue-tech` |
| **Azul Hover** | - | `#1D4ED8` | `--vai-blue-hover` |
| **Azul Escuro** | `#0B1E3A` | Removido | - |
| **Verde IA** | `#16C784` | `#16C784` | `--vai-green-ai` (mantido) |
| **Verde Hover** | - | `#12B76A` | `--vai-green-hover` |

### Fundos

| Uso | Antiga | Nova | Variável |
|-----|--------|------|----------|
| **Background Principal** | `#F4F6F8` | `#FFFFFF` | `--background` |
| **Background Secundário** | `#F4F6F8` | `#F8FAFC` | `--card` |
| **Sidebar** | `#0B1E3A` | `#FFFFFF` | `--sidebar` |

### Textos

| Uso | Antiga | Nova | Variável |
|-----|--------|------|----------|
| **Texto Principal** | `#1F2937` | `#0F172A` | `--foreground` |
| **Texto Secundário** | `#6B7280` | `#475569` | `--vai-text-secondary` |
| **Texto Muted** | `#6B7280` | `#94A3B8` | `--muted-foreground` |

### Bordas

| Uso | Antiga | Nova | Variável |
|-----|--------|------|----------|
| **Bordas** | `rgba(31, 95, 191, 0.1)` | `#E5E7EB` | `--border` |
| **Dividers** | - | `#E5E7EB` | `--vai-divider` |

### Estados

| Uso | Antiga | Nova | Variável |
|-----|--------|------|----------|
| **Erro** | `#EF4444` | `#DC2626` | `--destructive` |
| **Aviso** | `#F59E0B` | `#F59E0B` | `--vai-warning` (mantido) |
| **Sucesso** | `#22C55E` | `#16C784` | Use verde IA |

---

## 🔄 Substituições em Código

### Classes Tailwind

#### Fundos

```tsx
// ❌ Antiga
className="bg-[#F4F6F8]"
style={{ background: 'linear-gradient(to bottom right, #F4F6F8, #E8EDF3)' }}

// ✅ Nova
className="bg-white"
className="bg-card" // para cards/seções
```

#### Cores Primárias

```tsx
// ❌ Antiga
className="text-[#1F5FBF]"
className="bg-[#1F5FBF]"

// ✅ Nova
className="text-vai-blue-tech"
className="bg-vai-blue-tech"
className="text-primary"
className="bg-primary"
```

#### Sidebar

```tsx
// ❌ Antiga
className="bg-[#0B1E3A]"
className="text-white"

// ✅ Nova
className="bg-sidebar"
className="text-sidebar-foreground"
// Ou simplesmente use os valores padrão
```

#### Gradientes

```tsx
// ❌ Antiga
className="bg-gradient-to-br from-primary to-primary/80"
style={{ background: 'linear-gradient(to bottom right, #F4F6F8, #E8EDF3)' }}

// ✅ Nova
className="bg-gradient-to-br from-vai-blue-tech to-vai-blue-hover"
// Para fundos, prefira cores sólidas
```

#### Bordas

```tsx
// ❌ Antiga
style={{ borderColor: 'rgba(31, 95, 191, 0.1)' }}
className="border-primary/10"

// ✅ Nova
className="border-vai-divider"
className="border" // usa --border automaticamente
```

---

## 📋 Checklist de Migração

### Componentes Principais

- [x] `/styles/globals.css` - Paleta base atualizada
- [x] `/components/AuthForm.tsx` - Login modernizado
- [x] `/App.tsx` - Loading state atualizado
- [ ] `/components/Agents.tsx` - Aguardando migração
- [ ] `/components/CampaignsPage.tsx` - Aguardando migração
- [ ] `/components/Automations.tsx` - Aguardando migração
- [x] `/components/CRMPage.tsx` - Já migrado
- [ ] `/components/ListGeneratorB2B.tsx` - Revisar
- [ ] `/components/ListGeneratorB2C.tsx` - Revisar

### Componentes UI

- [ ] `/components/ui/button.tsx` - Revisar
- [ ] `/components/ui/card.tsx` - Revisar
- [ ] Outros componentes UI (verificar se herdam corretamente)

---

## 🎨 Padrões de Uso por Componente

### Botões

```tsx
// Ação Principal (Conversão)
<Button className="bg-vai-green-ai hover:bg-vai-green-hover">
  Criar Lista
</Button>

// Ação Secundária (Navegação)
<Button variant="outline" className="text-vai-blue-tech border-vai-divider">
  Ver Detalhes
</Button>

// Ação Neutra
<Button variant="ghost">
  Cancelar
</Button>
```

### Cards

```tsx
// Card padrão
<Card className="bg-card border-vai-divider">
  <CardHeader>...</CardHeader>
</Card>

// Card com destaque
<Card className="bg-white border-vai-blue-tech/20">
  <CardHeader>...</CardHeader>
</Card>
```

### Ícones

```tsx
// Ícones de ação
<Icon className="text-vai-blue-tech" />

// Ícones de sucesso
<Icon className="text-vai-green-ai" />

// Ícones neutros
<Icon className="text-vai-text-secondary" />

// Ícones suaves
<Icon className="text-vai-text-muted" />
```

### Textos

```tsx
// Títulos principais
<h1 className="text-vai-text-primary">Título</h1>

// Subtítulos e descrições
<p className="text-vai-text-secondary">Descrição</p>

// Help text e placeholders
<span className="text-vai-text-muted">Ajuda</span>
```

### Badges

```tsx
// Status ativo
<Badge className="bg-vai-green-ai/10 text-vai-green-ai">
  Ativo
</Badge>

// Status neutro
<Badge className="bg-vai-blue-tech/10 text-vai-blue-tech">
  Em andamento
</Badge>

// Status de erro
<Badge variant="destructive">
  Erro
</Badge>
```

---

## ⚠️ Cuidados Especiais

### 1. Gradientes

**Antes:**
```tsx
style={{ background: 'linear-gradient(to bottom right, #F4F6F8, #E8EDF3)' }}
```

**Depois:**
```tsx
// Prefira cores sólidas
className="bg-white"

// Ou gradientes muito sutis
className="bg-gradient-to-b from-white to-card"
```

**Regra:** Minimize gradientes. Use apenas para elementos específicos como botões CTA.

### 2. Sidebar

A sidebar agora tem fundo branco em vez de azul escuro.

**Antes:**
```tsx
<Sidebar className="bg-[#0B1E3A] text-white">
```

**Depois:**
```tsx
<Sidebar className="bg-sidebar text-sidebar-foreground border-r border-vai-divider">
```

### 3. Estados de Hover

**Antes:**
```tsx
className="hover:bg-primary/10"
```

**Depois:**
```tsx
className="hover:bg-vai-blue-tech/5" // Mais sutil
className="hover:bg-card" // Para navegação
```

### 4. Foco Visual

Com fundo branco, é crucial manter hierarquia clara:

```tsx
// ❌ Evite
<div className="bg-white">
  <div className="bg-white">...</div>
</div>

// ✅ Use
<div className="bg-white">
  <div className="bg-card">...</div>
</div>
```

---

## 🧪 Testes Visuais

Após migrar um componente, verifique:

- [ ] Contraste adequado entre texto e fundo (WCAG AA)
- [ ] Hierarquia visual clara (títulos vs corpo)
- [ ] Bordas visíveis mas sutis
- [ ] Botões CTA se destacam (verde)
- [ ] Ações secundárias são claras (azul)
- [ ] Estados hover são perceptíveis
- [ ] Ícones têm cores semânticas corretas

---

## 📱 Responsividade

A nova paleta deve manter consistência em todos os breakpoints:

```tsx
// Mobile
<div className="bg-white sm:bg-card">

// Sempre mantenha a mesma paleta
// Não mude cores por breakpoint
```

---

## 🌙 Dark Mode

O dark mode já está configurado. As cores se adaptam automaticamente:

- Fundos: `#0F172A` (escuro) e `#1E293B` (cards)
- Textos: `#F8FAFC`, `#CBD5E1`, `#64748B`
- Azul e Verde: Mantêm os mesmos valores
- Bordas: `#334155`

**Não é necessário alterar código** - as variáveis CSS fazem a adaptação.

---

## 🔍 Ferramentas de Auditoria

### Buscar cores antigas no código:

```bash
# Buscar hexadecimais antigos
grep -r "#1F5FBF" .
grep -r "#0B1E3A" .
grep -r "#F4F6F8" .

# Buscar gradientes
grep -r "linear-gradient" .
```

### Buscar estilos inline:

```bash
grep -r "style={{" . | grep -i "background\|color"
```

---

## ✅ Validação Final

Após completar a migração:

1. **Visual:**
   - [ ] Todas as páginas têm fundo branco limpo
   - [ ] Cards usam `#F8FAFC`
   - [ ] Textos seguem hierarquia (3 níveis de cinza)
   - [ ] Bordas são sutis (`#E5E7EB`)

2. **Funcional:**
   - [ ] Botões CTA usam verde (`#16C784`)
   - [ ] Ações secundárias usam azul (`#2563EB`)
   - [ ] Estados de erro/aviso estão corretos
   - [ ] Hover states são perceptíveis

3. **Consistência:**
   - [ ] Nenhuma cor antiga no código
   - [ ] Sem gradientes desnecessários
   - [ ] Variáveis CSS usadas corretamente
   - [ ] Dark mode funciona

---

## 📚 Recursos

- **Paleta Completa:** `/PALETA_REFINADA.md`
- **Estilos Base:** `/styles/globals.css`
- **Componentes Exemplo:** `/components/CRMPage.tsx`

---

**Status:** 🟡 Em Progresso (30% completo)  
**Próxima Etapa:** Migrar Agents, Campaigns e Automations

---

**Atualizado:** Dezembro 2024
