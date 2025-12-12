# Guia de Solução de Problemas - Sistema VAI

## Problemas Comuns e Soluções

### ❌ Erro: "Failed to fetch" ou "TypeError: Failed to fetch"

Este erro indica problema de conectividade com os serviços do Supabase.

**Causas Comuns:**
- Sem conexão com a internet
- Firewall bloqueando requisições
- Serviço do Supabase temporariamente indisponível
- Problema de CORS (menos comum)

**Soluções:**

1. **Verificar conexão com internet**
   - Teste acessando outros sites
   - Verifique sua conexão WiFi ou cabo de rede

2. **Recarregar a página**
   - Pressione F5 ou Ctrl+R (Cmd+R no Mac)
   - Tente com Ctrl+Shift+R para forçar limpeza de cache

3. **Limpar cache do navegador**
   - Chrome: Ctrl+Shift+Delete → Limpar cache e cookies
   - Firefox: Ctrl+Shift+Delete → Limpar cache
   - Edge: Ctrl+Shift+Delete → Limpar dados de navegação

4. **Verificar firewall e antivírus**
   - Desative temporariamente bloqueadores de anúncios
   - Verifique se o firewall está bloqueando `*.supabase.co`
   - Adicione exceção para `kywyfamhpztusteuxscp.supabase.co`

5. **Aguardar e tentar novamente**
   - Edge Functions podem ter "cold start" (5-10 segundos)
   - Aguarde 1-2 minutos e tente novamente

### ❌ Erro: "AuthRetryableFetchError"

Este erro é específico de problemas de autenticação do Supabase.

**Soluções:**

1. **Fazer logout e login novamente**
   - Clique em logout no menu
   - Faça login com suas credenciais

2. **Limpar sessão do navegador**
   - Abra Console (F12) → Application → Storage → Clear site data
   - Feche e reabra o navegador

3. **Usar credenciais admin**
   - Email: admin@vai.com.br
   - Senha: Admin@VAI2025
   - Clique no botão "Credenciais Admin" na tela de login

### ⚠️ Edge Function Não Encontrada (404)

A Edge Function não está acessível.

**Soluções:**

1. **Aguardar cold start**
   - Primeira requisição pode demorar 10-30 segundos
   - Aguarde e tente novamente

2. **Verificar deployment**
   - A Edge Function pode não estar deployada
   - Contate o administrador do sistema

3. **Verificar status do Supabase**
   - Acesse: https://status.supabase.com
   - Verifique se há incidentes reportados

### 🔐 Erro de Autenticação (401)

Token de acesso inválido ou expirado.

**Soluções:**

1. **Fazer logout/login**
   - Clique em logout
   - Faça login novamente

2. **Verificar credenciais**
   - Email: admin@vai.com.br
   - Senha: Admin@VAI2025

3. **Aguardar rate limit**
   - Se houve muitas tentativas falhas
   - Aguarde 5-10 minutos

## Diagnóstico Avançado

### Verificar Console do Navegador

1. Pressione F12 para abrir DevTools
2. Vá para a aba "Console"
3. Procure por mensagens de erro em vermelho
4. Mensagens úteis começam com:
   - ❌ (erros)
   - ⚠️ (avisos)
   - 🌐 (requisições de rede)

### Verificar Network

1. Abra DevTools (F12)
2. Vá para aba "Network"
3. Tente fazer login novamente
4. Procure por requisições com status:
   - 200-299: Sucesso ✅
   - 400-499: Erro do cliente ⚠️
   - 500-599: Erro do servidor ❌

### Testar Conectividade Manual

Abra uma nova aba e teste estas URLs:

1. **API Supabase:**
   ```
   https://kywyfamhpztusteuxscp.supabase.co/rest/v1/
   ```
   Deve retornar 404 ou resposta JSON

2. **Edge Function Ping:**
   ```
   https://kywyfamhpztusteuxscp.supabase.co/functions/v1/make-server-73685931/ping
   ```
   Deve retornar JSON com status "online"

3. **Admin User Creation:**
   ```
   https://kywyfamhpztusteuxscp.supabase.co/functions/v1/make-server-73685931/create-admin
   ```
   Deve retornar JSON confirmando criação

## Ferramentas de Diagnóstico no Sistema

### 1. Diagnóstico de Conexão (Tela de Login)

- Na tela de login, clique em "Diagnóstico de Conexão"
- Mostra status de:
  - API Supabase
  - Edge Function
  - Usuário Admin

### 2. Status de Conexão (Painel Admin)

- No painel administrativo
- Seção "Informações do Sistema"
- Mostra status detalhado de conectividade

### 3. Botão "Como Resolver?"

- Aparece quando há erros de conexão
- Mostra guia interativo de soluções

## Configuração do Ambiente

### Variáveis de Ambiente Necessárias

O sistema usa estas variáveis (já configuradas automaticamente):

- `SUPABASE_URL`: https://kywyfamhpztusteuxscp.supabase.co
- `SUPABASE_ANON_KEY`: eyJhbGciOiJI... (chave pública)
- `SUPABASE_SERVICE_ROLE_KEY`: (apenas no servidor)

### Chaves de API Necessárias

Configure no Painel Admin:

1. **OpenAI API Key**
   - Para geração de listas inteligentes
   - Formato: sk-...

2. **HasData API Key**
   - Para dados reais de empresas brasileiras
   - Formato: hd_...

## Ainda com Problemas?

### Contato e Suporte

Se nenhuma solução funcionou:

1. **Capture informações:**
   - Screenshot da tela de erro
   - Console do navegador (F12)
   - Mensagem de erro completa

2. **Verifique:**
   - Navegador e versão
   - Sistema operacional
   - Conexão com internet (velocidade)

3. **Informações úteis para debug:**
   - Project ID: kywyfamhpztusteuxscp
   - URL Base: https://kywyfamhpztusteuxscp.supabase.co
   - Edge Function: /functions/v1/make-server-73685931

### Comandos de Debug Rápido

Cole no Console do navegador (F12):

```javascript
// Testar conectividade
fetch('https://kywyfamhpztusteuxscp.supabase.co/functions/v1/make-server-73685931/ping')
  .then(r => r.json())
  .then(d => console.log('✅ Ping OK:', d))
  .catch(e => console.error('❌ Ping Error:', e))

// Verificar localStorage
console.log('Local Storage:', {
  openai: localStorage.getItem('vai_openai_key') ? 'Configurada' : 'Não configurada',
  hasdata: localStorage.getItem('vai_hasdata_key') ? 'Configurada' : 'Não configurada'
})

// Limpar tudo e resetar
// localStorage.clear()
// sessionStorage.clear()
// location.reload()
```

## Changelog de Correções

### v4.0 - Melhorias de Conectividade
- ✅ Adicionado timeout de 15s em requisições Supabase
- ✅ Melhorado tratamento de erros de conexão
- ✅ Adicionado componente de diagnóstico de autenticação
- ✅ Implementado ConnectionStatus no painel admin
- ✅ Adicionado guia interativo de troubleshooting
- ✅ Melhoradas mensagens de erro para usuário final
- ✅ Implementado retry logic com delays
- ✅ Adicionado header `apikey` em todas requisições
- ✅ Criação automática do usuário admin no servidor
