# Regras de Produção - Sistema VAI

## ✅ APENAS DADOS REAIS - SEM FALLBACK

Este documento define as regras críticas para manter o sistema VAI 100% funcional com dados reais.

## 🚫 PROIBIÇÕES ABSOLUTAS

### 1. Geração de Dados Fictícios
- **NUNCA** gerar leads fictícios
- **NUNCA** criar contatos mock/demo
- **NUNCA** usar fallback para dados falsos
- **NUNCA** simular respostas da API

### 2. Dados de Exemplo
- **NUNCA** pre-popular componentes com dados de exemplo
- **NUNCA** criar listas fictícias ao iniciar
- **NUNCA** adicionar agentes de demonstração
- **NUNCA** criar campanhas ou automações fictícias

## ✅ REGRAS OBRIGATÓRIAS

### 1. Geração de Listas (HasData API)

**Fonte de Dados:**
- Apenas API HasData (https://api.hasdata.com)
- Endpoint: `/scrape/google-maps/search`
- Validação obrigatória de chave de API

**Validação de Dados:**
```javascript
// Apenas aceitar se tiver dados reais
if (result && result.title && result.title.trim() && (result.phone || result.address)) {
  // OK - dados válidos
} else {
  // REJEITAR - dados incompletos
}
```

**Em caso de erro:**
- Retornar erro 404 com mensagem clara
- **NUNCA** usar dados fictícios como fallback
- Sugerir ajuste de parâmetros de busca

**Mensagens de Erro Aceitas:**
```javascript
{
  success: false,
  message: 'Nenhuma empresa real encontrada para os critérios especificados. Tente ajustar os parâmetros de busca.',
  error: 'no_real_data_found'
}
```

### 2. Tratamento de Erros da API

**Erros Específicos:**

**Chave Inválida (401):**
```javascript
{
  error: 'Chave de API HasData inválida ou não configurada. Verifique a configuração no painel administrativo.',
  details: 'invalid_api_key'
}
```

**Rate Limit (429):**
```javascript
{
  error: 'Limite de consultas da API HasData atingido. Aguarde alguns minutos e tente novamente.',
  details: 'rate_limit_exceeded'
}
```

**Timeout (408):**
```javascript
{
  error: 'Timeout na conexão com a API HasData. Tente novamente.',
  details: 'api_timeout'
}
```

### 3. Formato de Contatos Reais

**Campos Obrigatórios:**
```typescript
{
  id: `real_${Date.now()}_${index}`,  // ID único com timestamp
  name: 'Contato não informado',       // Placeholder genérico
  company: contact.title,               // Nome real da empresa
  email: '',                            // Vazio se não disponível
  phone: contact.phone,                 // Telefone real formatado
  website: contact.website || '',       // Website se disponível
  address: contact.address || '',       // Endereço completo
  city: extractedCity,                  // Extraído do endereço
  state: stateProvided,                 // Estado da busca
  segment: businessNiche,               // Nicho de negócio buscado
  source: 'HasData API (Real)',         // Marcador de fonte real
  cnpj: '',                             // Vazio (não fornecido pela API)
  rating: contact.rating || null,       // Avaliação se disponível
  totalRatings: contact.reviews || null,// Número de avaliações
  category: contact.type || businessNiche,
  businessStatus: 'open',
  addedAt: new Date().toISOString()
}
```

### 4. Estados Iniciais dos Componentes

**CRM:**
```typescript
const [leads, setLeads] = useState<Lead[]>([])  // Array vazio
```

**Agents:**
```typescript
const [agents, setAgents] = useState<Agent[]>([])  // Array vazio
```

**Campaigns:**
```typescript
const [campaigns, setCampaigns] = useState<Campaign[]>([])  // Array vazio
const availableLists: { id: string; name: string; contacts: number }[] = []
const availableAgents: { id: string; name: string; style: string }[] = []
```

**Automations:**
```typescript
const [automations, setAutomations] = useState<Automation[]>([])  // Array vazio
const availableAgents: { id: string; name: string; style: string }[] = []
```

### 5. Mensagens ao Usuário

**Mensagens Genéricas (SEM referências técnicas):**
- ✅ "Nenhum contato encontrado. Ajuste os filtros e tente novamente."
- ✅ "Erro ao buscar dados. Verifique sua conexão e tente novamente."
- ✅ "Sistema temporariamente indisponível. Tente novamente em alguns minutos."

**Mensagens Proibidas:**
- ❌ "Erro na API HasData"
- ❌ "OpenAI não configurada"
- ❌ "Fallback para dados fictícios ativado"

**Exceção - Painel Admin:**
- Apenas no painel administrativo é permitido mostrar detalhes técnicos
- Usuários finais nunca devem ver referências a HasData ou OpenAI

### 6. Configuração de APIs (Admin)

**Armazenamento:**
- Chaves salvas no Backend SQLite/PostgreSQL: tabela `kv_store_73685931`
- Keys: `openai_api_key` e `hasdata_api_key`
- Backup em localStorage para modo offline

**Validação:**
- Verificar presença de chaves antes de fazer requisições
- Retornar erro claro se chaves não configuradas
- Mascarar chaves ao exibir (mostrar apenas últimos 4 caracteres)

### 7. Fluxo de Geração de Lista

**Passo a Passo:**
1. Usuário cria lista vazia
2. Usuário define critérios (nicho, estado, cidades)
3. Sistema busca dados REAIS via HasData API
4. Se encontrar dados → adiciona à lista
5. Se não encontrar → retorna erro claro (sem fallback)
6. Lista salva no Backend SQLite/PostgreSQL com contatos reais

**Delays e Rate Limiting:**
- 2 segundos entre requisições de cidades diferentes
- Timeout de 15 segundos por requisição
- Máximo de 15 contatos por cidade por busca

### 8. Integração OpenAI

**Uso Permitido:**
- Geração de estratégias de abordagem
- Sugestões de mensagens
- Análise de segmentos

**Uso Proibido:**
- Gerar dados de contatos fictícios
- Criar CNPJs falsos
- Simular empresas inexistentes

### 9. Modo Offline

**Comportamento:**
- Sistema funciona com dados já salvos
- APIs salvam em localStorage como backup
- Exibe alertas claros de modo offline
- **NUNCA** gera dados fictícios mesmo offline

### 10. Verificação de Qualidade

**Checklist Antes de Adicionar Contato:**
- [ ] Tem nome de empresa (title)?
- [ ] Tem telefone OU endereço?
- [ ] Não é duplicado (verificar por nome)?
- [ ] Veio da API HasData?
- [ ] Tem source = "HasData API (Real)"?

**Se qualquer item falhar → REJEITAR o contato**

## 📊 Estado Atual do Sistema

### Backend (Server)
- ✅ Configurado para usar apenas HasData API
- ✅ Sem fallback para dados fictícios
- ✅ Tratamento robusto de erros
- ✅ Validação de dados antes de salvar

### Frontend (Components)
- ✅ CRMPage: Array vazio inicial
- ✅ Agents: Array vazio inicial
- ✅ CampaignsPage: Arrays vazios
- ✅ Automations: Arrays vazios
- ✅ Mensagens genéricas ao usuário
- ✅ Detalhes técnicos apenas no Admin

## 🔒 Garantias de Produção

1. **Sem Dados Fictícios**: Sistema inicia completamente vazio
2. **Apenas Dados Reais**: Toda informação vem de APIs externas
3. **Erros Claros**: Usuário sabe quando algo falhou e por quê
4. **Graceful Degradation**: Sistema funciona offline com dados salvos
5. **Segurança**: Chaves de API armazenadas de forma segura

## 📝 Manutenção

**Ao adicionar novas funcionalidades:**
1. Iniciar estados sempre vazios
2. Carregar dados de APIs reais
3. Tratar erros sem fallback
4. Testar com APIs indisponíveis
5. Verificar que nenhum dado fictício é gerado

**Ao fazer debugging:**
1. Logs claros no servidor
2. Mensagens genéricas ao usuário
3. Detalhes técnicos apenas no console
4. Admin panel para verificar configurações

---

**Data:** 17 de outubro de 2025
**Status:** ✅ Sistema 100% em Produção com Dados Reais
**Versão:** 5.0.0
