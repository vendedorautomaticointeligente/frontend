# 🔧 Configuração de APIs - VAI SaaS

## ⚠️ IMPORTANTE: Configuração Exclusiva para Administradores

O VAI SaaS utiliza APIs externas para buscar dados reais de empresas via Google Maps. 

**IMPORTANTE**: Apenas o administrador do sistema precisa configurar as APIs. Os usuários finais NÃO precisam se preocupar com isso - eles apenas usam o sistema normalmente.

---

## 📋 APIs Suportadas (Apenas para Administradores)

O sistema tenta automaticamente 4 APIs diferentes na seguinte ordem:

### 1. **HasData Direct API** (NOVA - Recomendada)
- **Endpoint**: https://api.hasdata.com/scrape/google-maps/search
- **Tipo**: API direta (não via RapidAPI)
- **Header**: `x-api-key`
- **Planos**: Verificar em https://hasdata.com

### 2. **Google Maps Search** (via RapidAPI)
- **Link**: https://rapidapi.com/google-maps-search
- **Plano Gratuito**: 100 requisições/mês
- **Plano Pro**: A partir de $9.99/mês

### 3. **Google Business Search** (via RapidAPI)
- **Link**: https://rapidapi.com/google-business-search  
- **Plano Gratuito**: 100 requisições/mês
- **Plano Básico**: A partir de $9.99/mês

### 4. **Maps Data Scraper** (via RapidAPI)
- **Link**: https://rapidapi.com/maps-data-scraper
- **Plano Gratuito**: 100 requisições/mês
- **Plano Pro**: A partir de $14.99/mês

---

## 🚀 Como Configurar (Apenas Administradores)

### Opção A: HasData Direct API (Recomendada)

#### Passo 1: Obter Chave HasData
1. Acesse https://hasdata.com
2. Crie uma conta
3. Obtenha sua API key

#### Passo 2: Configurar no Ambiente
**IMPORTANTE**: Esta configuração deve ser feita diretamente nas variáveis de ambiente do Supabase.

1. Acesse o painel do Supabase: https://supabase.com/dashboard
2. Vá em **Settings** > **Edge Functions** > **Environment Variables**
3. Adicione/edite a variável: `RAPIDAPI_KEY` (sim, use este nome mesmo para HasData)
4. Cole o valor da sua chave HasData
5. Salve as configurações

### Opção B: RapidAPI (Alternativa)

#### Passo 1: Criar Conta no RapidAPI
1. Acesse https://rapidapi.com
2. Crie uma conta gratuita
3. Confirme seu email

#### Passo 2: Inscrever-se em uma API
1. Escolha uma das APIs listadas acima
2. Clique em **"Subscribe to Test"**
3. Escolha o plano (recomendado começar com gratuito)
4. Clique em **"Subscribe"**

#### Passo 3: Copiar sua Chave de API
1. Após se inscrever, você verá sua chave na página da API
2. Copie o valor do campo **"X-RapidAPI-Key"**
3. Ela será algo como: `abc123xyz456def789...`

#### Passo 4: Configurar no Ambiente
1. Acesse o painel do Supabase: https://supabase.com/dashboard
2. Vá em **Settings** > **Edge Functions** > **Environment Variables**
3. Adicione/edite a variável: `RAPIDAPI_KEY`
4. Cole o valor da sua chave RapidAPI
5. Salve as configurações

---

## ✅ Testando a Configuração

Após configurar a chave nas environment variables:

1. Faça login no VAI como qualquer usuário (não precisa ser admin)
2. Vá para a página **"Listas B2B"**
3. Preencha o formulário:
   - Nome da lista: Teste
   - Segmento: Restaurantes
   - Estado: SP
   - Cidades: São Paulo
   - Quantidade: 10
4. Clique em **"Gerar Lista"**
5. Se tudo estiver correto, você verá empresas reais sendo carregadas!

---

## 🔍 Verificando Logs

Os logs do sistema mostrarão qual API está sendo usada:

```
📡 [TRY 0] HasData Direct API URL: https://api.hasdata.com/...
📡 [TRY 0] Response status: 200
✅ [TRY 0] HasData Direct API success: 20 resultados
```

Se a primeira API falhar, o sistema tentará automaticamente as próximas:

```
❌ [TRY 0] HasData Direct failed: 403
🔄 [TRY 1] Trying Google Maps Search API...
✅ [TRY 1] Google Maps Search success: 15 resultados
```

---

## 💡 Dicas para Administradores

### Para Economizar Requisições:
- Instrua usuários a usar menos cidades por busca
- Recomendar reduzir a quantidade de contatos por consulta
- Usar segmentos menos específicos (ex: "Restaurantes" em vez de "Restaurantes Veganos")

### Se Atingir o Limite:
- Espere até o próximo mês (planos gratuitos resetam mensalmente)
- Faça upgrade para um plano pago
- Use outra conta RapidAPI temporariamente

### Troubleshooting:
- **Erro 401/403**: Chave de API inválida ou você não se inscreveu na API
- **Erro 429**: Limite de requisições atingido
- **Erro 404**: API não encontrada (verifique se você se inscreveu corretamente)

---

## 📞 Suporte para Administradores

Se você tiver problemas:

1. Verifique se copiou a chave corretamente (sem espaços extras)
2. Confirme que você se inscreveu na API (não apenas criou conta no RapidAPI)
3. Verifique se a chave foi adicionada nas environment variables do Supabase (não no painel admin)
4. Verifique o console do navegador e logs do Supabase para mensagens detalhadas
5. Tente fazer uma requisição de teste direto no site da API

---

## 🎯 Status Atual

O sistema VAI está configurado com fallback automático em 4 APIs:
- ✅ **1ª opção**: HasData Direct API (mais rápida e confiável)
- ✅ **2ª opção**: Google Maps Search (via RapidAPI)
- ✅ **3ª opção**: Google Business Search (via RapidAPI)
- ✅ **4ª opção**: Maps Data Scraper (via RapidAPI)
- ✅ **Mensagens de erro claras**: Informa exatamente o que está acontecendo
- ✅ **Configuração centralizada**: Apenas admin configura, usuários apenas usam

Após configurar a chave API nas environment variables do Supabase, o sistema funcionará automaticamente para todos os usuários! 🚀

---

## 🔐 Segurança

**IMPORTANTE**: As chaves de API são armazenadas de forma segura nas environment variables do Supabase e NUNCA são expostas ao frontend ou aos usuários finais. Apenas o servidor backend tem acesso a elas.