# 🤖 Implementação da Lógica do Workflow N8N - VAI SaaS

## 📋 Visão Geral

Este documento descreve como a lógica do workflow n8n fornecido foi adaptada para o sistema VAI, melhorando significativamente a geração de listas B2B com dados reais.

---

## 🔄 Workflow Original (n8n)

O workflow n8n utilizava a seguinte sequência:

1. **Agenda Gatilho** → Executa periodicamente
2. **Credenciais** → Define API keys (ScapeIt, Supabase)
3. **Definir Nicho e Cidades** → Escolhe aleatoriamente:
   - 27 capitais do Brasil
   - 33 nichos de agências/marketing
4. **AI Agent (OpenAI)** → Gera JSON com combinações de bairros e nichos
5. **Extrai dados limpos** → Processa JSON da IA
6. **Extrai Dados do Google Maps** → Usa `https://api.hasdata.com/scrape/google-maps/search`
7. **Limpa dados** → Mapeia `localResults` para estrutura padronizada
8. **Refina Dados** → Limpa telefones e emails
9. **Supabase** → Salva no banco de dados

---

## ✅ Adaptação para o Sistema VAI

### 1. **API HasData Direct**

**Original (n8n)**:
```javascript
// API direta do HasData
url: "https://api.hasdata.com/scrape/google-maps/search?q={query}"
headers: {
  "x-api-key": "189c0740-8074-4839-a407-5af5e4a4a13c"
}
```

**Implementado no VAI**:
```typescript
// TRY 0: HasData Direct API (primeira tentativa)
const hasdataDirectUrl = `https://api.hasdata.com/scrape/google-maps/search?q=${encodedQuery}`
const headers = new Headers()
headers.set('x-api-key', apiKey)
headers.set('Content-Type', 'application/json')

const response = await fetch(hasdataDirectUrl, {
  method: 'GET',
  headers: headers
})
```

**Benefícios**:
- ✅ API direta (não via proxy RapidAPI)
- ✅ Mais rápida e confiável
- ✅ Menos intermediários
- ✅ Resposta no mesmo formato do workflow n8n

---

### 2. **Limpeza de Dados**

**Original (n8n)**:
```javascript
return ($json.localResults || []).map(item => ({
  json: {
    Empresa: item.title?.trim() || '',
    Telefone: item.phone?.replace(/[^0-9]+/g, '') || '',
    Endereço: item.address?.trim() || '',
    Website: item.website?.trim() || '',
    Categoria: item.type?.trim() || '',
    Avaliação: item.rating || '',
    "Total Avaliações": item.reviews || ''
  }
}))
```

**Implementado no VAI**:
```typescript
// Mapear conforme o workflow n8n
results = directResults.map(item => ({
  title: item.title?.trim() || '',
  phone: item.phone?.replace(/[^0-9]+/g, '') || '',
  address: item.address?.trim() || '',
  website: item.website?.trim() || '',
  email: item.email?.trim() || '',
  rating: item.rating || '',
  reviews: item.reviews || '',
  type: item.type?.trim() || ''
}))
```

**Melhorias**:
- ✅ Limpeza de telefone (remove caracteres não numéricos)
- ✅ Trim em todos os campos de texto
- ✅ Tratamento de valores nulos/undefined
- ✅ Estrutura padronizada

---

### 3. **Geração de Localizações com OpenAI**

**Original (n8n)**:
```javascript
// Prompt para gerar bairros e nichos
`Gere um JSON com até 2 combinações de bairros e nichos ${nicho} em ${cidade}.
Retorne apenas o JSON puro, sem explicações ou formatação markdown.`
```

**Implementado no VAI** (`generateLocationCombinations`):
```typescript
let prompt = `Você é um especialista em prospecção de empresas no Brasil. 
Gere um JSON com até 6 combinações de bairros e nichos "${nicho}" 
distribuídos entre as cidades: ${cidadesStr}, ${estado}.`

if (bairros && bairros.trim()) {
  prompt += `PRIORIZE os bairros mencionados: ${bairros}.`
} else {
  prompt += `Sugira os MELHORES bairros comerciais para prospecção de ${nicho}.`
}
```

**Vantagens**:
- ✅ Suporta múltiplas cidades (até 5)
- ✅ Prioriza bairros fornecidos pelo usuário
- ✅ Sugere bairros comerciais automaticamente
- ✅ Gera até 6 combinações (vs 2 do original)

---

### 4. **Sistema de Fallback em Cascata**

**Original (n8n)**:
- Apenas 1 API (HasData Direct)
- Sem fallback

**Implementado no VAI**:
```typescript
// TRY 0: HasData Direct API
// TRY 1: Google Maps Search (RapidAPI)
// TRY 2: Google Business Search (RapidAPI)
// TRY 3: Maps Data Scraper (RapidAPI)
```

**Benefícios**:
- ✅ 4 APIs disponíveis
- ✅ Fallback automático se uma falhar
- ✅ Maior confiabilidade
- ✅ Logs detalhados de cada tentativa

---

## 🎯 Fluxo Completo no Sistema VAI

### Passo 1: Usuário Preenche Formulário
```
- Nicho: "Agência de Marketing"
- Estado: "SP"
- Cidades: ["São Paulo", "Campinas"]
- Bairros (opcional): "Centro, Paulista"
- Quantidade: 30
```

### Passo 2: OpenAI Gera Combinações
```json
{
  "locations": [
    { "bairro": "Centro", "nicho": "Agência de Marketing", "cidade": "São Paulo" },
    { "bairro": "Paulista", "nicho": "Agência de Marketing", "cidade": "São Paulo" },
    { "bairro": "Cambuí", "nicho": "Agência de Marketing", "cidade": "Campinas" },
    ...
  ]
}
```

### Passo 3: Sistema Cria Queries
```
Query 1: "Agência de Marketing em Centro, São Paulo SP"
Query 2: "Agência de Marketing em Paulista, São Paulo SP"
Query 3: "Agência de Marketing em Cambuí, Campinas SP"
...
```

### Passo 4: Busca Dados nas APIs
```
TRY 0: HasData Direct → ✅ Sucesso (20 resultados)
```

### Passo 5: Limpa e Padroniza Dados
```javascript
{
  title: "Agência XYZ Marketing Digital",
  phone: "5511987654321", // Limpou formatação
  address: "Av. Paulista, 1000 - Bela Vista",
  website: "https://agenciaxyz.com.br",
  email: "contato@agenciaxyz.com.br",
  rating: "4.8",
  reviews: "156",
  type: "Marketing agency"
}
```

### Passo 6: Salva no Supabase
```typescript
// Salva na lista selecionada
// Deduplica por empresa/CNPJ
// Atualiza contador da lista
```

---

## 📊 Comparação: N8N vs VAI

| Aspecto | N8N Original | VAI Implementado |
|---------|--------------|------------------|
| **APIs** | 1 (HasData) | 4 (HasData + 3 RapidAPI) |
| **Fallback** | ❌ Não | ✅ Sim (automático) |
| **Cidades por busca** | 1 | Múltiplas (até 5) |
| **Combinações OpenAI** | 2 | 6 |
| **Bairros customizados** | ❌ Não | ✅ Sim |
| **Deduplicação** | ❌ Não | ✅ Sim (por empresa/CNPJ) |
| **Interface** | n8n UI | Interface web profissional |
| **Logs** | n8n logs | Console + Supabase logs |
| **Meta de contatos** | ❌ Não | ✅ Sim (geração iterativa) |

---

## 🚀 Melhorias Implementadas

### 1. **Geração Iterativa com Meta**
```typescript
// Continua gerando até atingir a meta
while (totalGenerated < targetContactCount && attempts < maxAttempts) {
  // Gera batch de contatos
  // Deduplica
  // Atualiza progresso
  // Aguarda entre requests
}
```

### 2. **Deduplicação Inteligente**
```typescript
const newContacts = data.contacts.filter(newContact => 
  !allGeneratedContacts.some(existing => 
    (existing.cnpj && newContact.cnpj && existing.cnpj === newContact.cnpj) ||
    (existing.company.toLowerCase() === newContact.company.toLowerCase())
  )
)
```

### 3. **Mensagens Amigáveis**
```typescript
// Nunca mostra detalhes técnicos para usuário final
throw new Error('Erro ao buscar dados. Verifique a configuração no painel admin.')
// Ao invés de mostrar: "HasData Direct: 401" ou "RapidAPI error"
```

### 4. **Logs Detalhados para Admin**
```typescript
console.log(`📡 [${timestamp}] [TRY 0] HasData Direct API URL: ${url}`)
console.log(`📡 [${timestamp}] [TRY 0] Response status: 200`)
console.log(`✅ [${timestamp}] [TRY 0] HasData Direct API success: 20 resultados`)
```

---

## 🔧 Configuração Necessária

### Para Usar HasData Direct (Recomendado)

1. Obtenha chave em: https://hasdata.com
2. Configure em: Supabase → Edge Functions → Environment Variables
3. Variável: `RAPIDAPI_KEY` (mesmo nome, funciona para ambas)
4. Valor: Sua chave HasData

### Alternativa: RapidAPI

1. Inscreva-se em uma das 3 APIs RapidAPI
2. Configure a chave RapidAPI na mesma variável
3. Sistema usa automaticamente as APIs do RapidAPI

---

## ✅ Resultados

Com a implementação baseada no workflow n8n:

- ✅ **Mais confiável**: 4 APIs com fallback automático
- ✅ **Mais rápido**: API direta HasData priorizada
- ✅ **Mais inteligente**: OpenAI gera combinações otimizadas
- ✅ **Mais limpo**: Dados padronizados e validados
- ✅ **Mais robusto**: Tratamento de erros em cada etapa
- ✅ **Mais escalável**: Suporta múltiplas cidades e bairros
- ✅ **Melhor UX**: Mensagens claras, sem detalhes técnicos

---

## 📝 Próximos Passos

Para melhorar ainda mais:

1. **Redis Cache**: Cachear resultados da OpenAI para economizar tokens
2. **Rate Limiting**: Implementar controle de taxa mais sofisticado
3. **Enriquecimento de Dados**: Buscar informações adicionais (CNPJ, redes sociais)
4. **Análise de Qualidade**: Validar qualidade dos leads (email válido, site ativo)
5. **Agendamento**: Permitir agendamento de geração automática (como no n8n)

---

## 🎉 Conclusão

A adaptação do workflow n8n para o sistema VAI foi bem-sucedida, mantendo a essência da lógica original enquanto adiciona:

- Maior confiabilidade com sistema de fallback
- Interface profissional para usuários
- Configuração centralizada para administradores
- Logs detalhados para debugging
- Experiência do usuário otimizada

O sistema está pronto para produção e capaz de gerar listas B2B com dados reais! 🚀
