# 🔍 Guia de Diagnóstico - Erro de Extração Instagram

## ❌ Problema Atual

```
Error: Perfil não encontrado ou inacessível
https://www.instagram.com/instagram/
```

Até o perfil oficial @instagram está falhando, o que indica um problema com a API HasData.

## 🧪 Como Diagnosticar

### **Passo 1: Testar a Conexão com a API HasData**

1. Acesse **Painel Admin**
2. Role até a seção **Configuração de APIs**
3. Clique no botão **"Testar Conexão HasData"**
4. Aguarde o resultado do teste

O teste vai:
- ✅ Verificar se a chave da API está configurada
- ✅ Fazer uma requisição real para a API HasData
- ✅ Testar com o perfil @instagram (sempre público)
- ✅ Mostrar o status HTTP e resposta da API

### **Passo 2: Interpretar os Resultados**

| Status | Significado | Solução |
|--------|-------------|---------|
| **200 OK** | API funcionando | Tudo certo! |
| **401 Unauthorized** | Chave inválida | Verificar chave no RapidAPI |
| **403 Forbidden** | Sem permissão | Verificar assinatura do plano |
| **404 Not Found** | Endpoint incorreto | Problema na URL da API |
| **429 Too Many Requests** | Limite excedido | Aguardar ou aumentar plano |
| **500/502/503** | Servidor offline | API HasData está fora do ar |

### **Passo 3: Verificar Configuração da Chave**

#### **No RapidAPI:**
1. Acesse https://rapidapi.com/hasdata/api/hasdata
2. Faça login na sua conta
3. Verifique:
   - ✅ Você está inscrito no plano HasData?
   - ✅ Tem créditos/requisições disponíveis?
   - ✅ A chave X-RapidAPI-Key está ativa?

#### **No Painel Admin:**
1. Copie a chave do RapidAPI
2. Cole no campo "Chave da API HasData"
3. Clique em **Salvar Chaves**
4. Teste novamente com o botão de teste

## 🔧 Possíveis Causas e Soluções

### **Causa 1: Chave da API Não Configurada**
```
❌ RAPIDAPI_KEY not configured
```

**Solução:**
1. Obtenha a chave em https://rapidapi.com
2. Configure no Painel Admin
3. Salve e teste

### **Causa 2: Chave Inválida ou Expirada**
```
❌ Status: 401 Unauthorized
```

**Solução:**
1. Verifique se a chave está correta
2. Confirme que não tem espaços extras
3. Gere uma nova chave se necessário
4. Atualize no Painel Admin

### **Causa 3: Sem Créditos no Plano**
```
❌ Status: 403 Forbidden
```

**Solução:**
1. Acesse sua conta no RapidAPI
2. Verifique o uso de créditos
3. Atualize o plano se necessário
4. Ou aguarde a renovação mensal

### **Causa 4: Limite de Requisições Excedido**
```
❌ Status: 429 Too Many Requests
```

**Solução:**
1. Aguarde alguns minutos (15-30 min)
2. Reduza a quantidade de requisições
3. Considere atualizar o plano
4. Use cache quando possível

### **Causa 5: API HasData Offline**
```
❌ Status: 500/502/503
```

**Solução:**
1. Aguarde a API voltar ao ar
2. Verifique status em https://rapidapi.com
3. Tente novamente em 30 minutos
4. Considere APIs alternativas (temporário)

### **Causa 6: Endpoint ou URL Incorreto**
```
❌ Status: 404 Not Found
```

**Solução:**
- Verifique se o código usa a URL correta:
  ```
  https://hasdata.p.rapidapi.com/scrape/instagram/profile?handle=USERNAME
  ```
- Confirme que o header X-RapidAPI-Host está correto:
  ```
  X-RapidAPI-Host: hasdata.p.rapidapi.com
  ```

## 📊 Exemplo de Teste Bem-Sucedido

```json
{
  "test": "HasData API Connection Test",
  "profile": "instagram",
  "hasApiKey": true,
  "response": {
    "status": 200,
    "data": {
      "handle": "instagram",
      "full_name": "Instagram",
      "follower_count": 600000000,
      "is_private": false
    }
  }
}
```

## 📊 Exemplo de Teste com Erro

```json
{
  "test": "HasData API Connection Test",
  "profile": "instagram",
  "hasApiKey": true,
  "response": {
    "status": 401,
    "data": {
      "message": "Invalid API key"
    }
  }
}
```

## 🚨 Logs Importantes a Verificar

Abra o Console do Navegador (F12) e procure por:

### **Logs de Sucesso:**
```
🔑 Using HasData API key from admin panel configuration
🔑 API Key loaded (length: 50, first 10 chars: abc123xyz...)
📡 URL: https://hasdata.p.rapidapi.com/scrape/instagram/profile?handle=instagram
📊 Response status: 200 OK
✅ Profile found: @instagram (600000000 followers)
```

### **Logs de Erro:**
```
🔑 Using HasData API key from environment variable
📡 URL: https://hasdata.p.rapidapi.com/scrape/instagram/profile?handle=instagram
📊 Response status: 401 Unauthorized
⚠️ Profile API error response body: {"message":"Invalid API key"}
❌ Error extracting Instagram followers from @instagram
```

## 🎯 Checklist de Diagnóstico Completo

- [ ] **Botão de teste** executado no Painel Admin
- [ ] **Status HTTP** verificado (deve ser 200)
- [ ] **Chave da API** configurada no Painel Admin
- [ ] **Chave da API** verificada no RapidAPI
- [ ] **Plano ativo** no RapidAPI com créditos
- [ ] **Logs do console** verificados (F12)
- [ ] **Perfil de teste** tentado (@instagram)
- [ ] **Aguardado** após erro 429 (rate limit)

## 📝 Próximos Passos

1. **Execute o teste** no Painel Admin
2. **Copie o resultado** do teste
3. **Verifique os logs** no console (F12)
4. **Compare com os exemplos** acima
5. **Identifique a causa** usando a tabela
6. **Aplique a solução** correspondente

## 🔗 Links Úteis

- **RapidAPI HasData:** https://rapidapi.com/hasdata/api/hasdata
- **Documentação HasData:** https://rapidapi.com/hasdata/api/hasdata/details
- **Preços e Planos:** https://rapidapi.com/hasdata/api/hasdata/pricing
- **Suporte RapidAPI:** https://rapidapi.com/support

---

**💡 Dica:** Se todos os passos falharem, o problema pode ser:
- A API HasData mudou de endpoint
- A API está permanentemente offline
- Precisa atualizar para nova versão da API

Nesse caso, considere APIs alternativas ou entre em contato com o suporte da RapidAPI.
