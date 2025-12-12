# 🛠️ Guia de Tratamento de Erros - Extração B2C

## ✅ Melhorias Implementadas

### 1. **Logging Detalhado da API**
- ✅ Logs de status HTTP completos
- ✅ Corpo da resposta de erro da API
- ✅ Informações sobre o perfil buscado
- ✅ Rastreamento de qual chave de API está sendo usada

### 2. **Mensagens de Erro Melhoradas**

#### **Perfil Não Encontrado (404)**
```
❌ Perfil @usuario não encontrado. Verifique se:
• O nome de usuário está correto (sem @)
• O perfil existe e é público
• Não há erros de digitação
```

#### **Perfil Privado**
```
❌ Perfil @usuario é privado. Apenas perfis públicos podem ter seus seguidores extraídos.
```

#### **Erro de Autenticação (401/403)**
```
❌ Erro de autenticação com a API de dados. Por favor:
• Verifique se a chave da API HasData está configurada no Painel Admin
• Confirme que a chave é válida e ativa
```

#### **Limite de Requisições (429)**
```
⏱️ Limite de requisições excedido. Aguarde alguns minutos e tente novamente.
```

#### **Servidor Indisponível (500/502/503)**
```
🔧 Serviço de dados temporariamente indisponível (503). 
Tente novamente em alguns minutos.
```

### 3. **Tratamento de Múltiplos Perfis**
- ✅ Continua tentando outros perfis mesmo se um falhar
- ✅ Coleta todas as mensagens de erro
- ✅ Retorna perfis parciais se alguns tiverem sucesso
- ✅ Mensagens específicas por perfil:
  - `❌ https://instagram.com/usuario: Perfil não encontrado ou inacessível`
  - `🔒 https://instagram.com/usuario: Perfil privado (apenas perfis públicos)`
  - `🔑 https://instagram.com/usuario: Erro de autenticação - verifique a API`
  - `⏱️ https://instagram.com/usuario: Limite de requisições excedido`

## 🔍 Como Diagnosticar Erros

### **Passo 1: Verificar os Logs do Console**
Os logs agora mostram informações detalhadas:
```
📡 Step 1: Fetching profile data for @automatikblog...
⚠️ Profile fetch failed with status 404
⚠️ Profile API error response: {"error":"Profile not found"}
```

### **Passo 2: Identificar o Tipo de Erro**

| Erro | Causa Provável | Solução |
|------|----------------|---------|
| **404** | Perfil não existe | Verificar nome do usuário |
| **401/403** | Chave de API inválida | Configurar no Painel Admin |
| **429** | Muitas requisições | Aguardar alguns minutos |
| **500/502/503** | API HasData offline | Aguardar restabelecimento |
| **Perfil privado** | Conta privada | Usar apenas perfis públicos |

### **Passo 3: Verificar Configuração da API**

1. Acesse **Painel Admin**
2. Vá para **Configuração de APIs**
3. Verifique se a **Chave da API HasData** está preenchida
4. Os logs mostrarão qual chave está sendo usada:
   - `🔑 Using HasData API key from admin panel configuration`
   - `🔑 Using HasData API key from environment variable`

## 📊 Exemplo de Resposta de Erro Detalhada

### **Antes (erro genérico):**
```
❌ Error: Perfil não encontrado ou privado
```

### **Depois (erro detalhado):**
```
❌ Perfil @automatikblog não encontrado. Verifique se:
• O nome de usuário está correto (sem @)
• O perfil existe e é público
• Não há erros de digitação

Logs do servidor:
📡 Step 1: Fetching profile data for @automatikblog...
⚠️ Profile fetch failed with status 404
⚠️ Profile API error response: {"error":"Profile not found"}
```

## 🎯 Casos de Uso Comuns

### **Caso 1: Perfil Existe Mas Dá 404**
**Possíveis Causas:**
- Nome de usuário mudou recentemente
- Perfil foi deletado
- Temporariamente indisponível na API
- Região/país bloqueado

**Solução:**
1. Confirmar que o perfil existe abrindo no navegador
2. Verificar se o nome está exatamente correto
3. Tentar novamente após alguns minutos

### **Caso 2: Erro de Autenticação**
**Possíveis Causas:**
- Chave da API não configurada
- Chave expirada ou inválida
- Sem créditos na conta RapidAPI

**Solução:**
1. Ir em Painel Admin → Configuração de APIs
2. Colar a chave da RapidAPI (HasData)
3. Salvar e tentar novamente

### **Caso 3: Múltiplos Perfis com Erros Mistos**
**Exemplo:**
```
✅ https://instagram.com/perfil1 - 50 contatos extraídos
❌ https://instagram.com/perfil2 - Perfil não encontrado
🔒 https://instagram.com/perfil3 - Perfil privado
✅ https://instagram.com/perfil4 - 45 contatos extraídos

Total: 95 contatos de 4 perfis (2 com sucesso, 2 com erro)
```

O sistema agora:
- Continua processando todos os perfis
- Retorna os contatos dos perfis bem-sucedidos
- Mostra quais perfis falharam e por quê

## 🔧 Configuração da Chave HasData

### **Onde Configurar:**
**Painel Admin** → **Configuração de APIs** → **Chave da API HasData**

### **O Que É:**
A chave RapidAPI que dá acesso à API HasData para extração de perfis do Instagram e LinkedIn.

### **Como Obter:**
1. Cadastre-se em https://rapidapi.com
2. Assine o plano HasData
3. Copie sua chave X-RapidAPI-Key
4. Cole no Painel Admin

### **Prioridade de Uso:**
1. **Primeira opção:** Chave configurada no Painel Admin (Supabase KV)
2. **Fallback:** Variável de ambiente `RAPIDAPI_KEY`

## 📝 Checklist de Troubleshooting

- [ ] Perfil existe e é público?
- [ ] Nome do usuário está correto (sem @)?
- [ ] Link completo do perfil?
- [ ] Chave da API HasData configurada?
- [ ] Chave da API é válida?
- [ ] Tem créditos na conta RapidAPI?
- [ ] Conexão com internet estável?
- [ ] Já esperou alguns minutos se teve erro 429?

## 🚀 Próximos Passos

Se o erro persistir após seguir este guia:

1. **Verificar Logs do Servidor:**
   - Acesse o console do navegador (F12)
   - Procure por mensagens começando com `📡`, `⚠️`, `❌`

2. **Testar com Perfil Conhecido:**
   - Use um perfil grande e público (ex: @instagram)
   - Se funcionar, o problema está no perfil específico
   - Se não funcionar, o problema está na configuração

3. **Verificar Status da API:**
   - Acesse https://rapidapi.com/hasdata/api/hasdata
   - Verifique se a API está operacional
   - Confirme seu plano e créditos disponíveis

---

**Última atualização:** 11/12/2024
**Versão:** 2.0 - Sistema de Erros Detalhados
