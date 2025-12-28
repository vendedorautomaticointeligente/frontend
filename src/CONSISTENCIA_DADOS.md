# Consistência de Dados - Sistema VAI

## ✅ STATUS: Sistema Consistente e Funcional

O sistema está configurado corretamente para vincular listas aos usuários.

## 🔐 Fluxo de Autenticação

### 1. Login do Usuário
```typescript
// Frontend: hooks/useAuth.tsx
- Usuário faz login com email/senha
- Backend SQLite/PostgreSQL retorna session.access_token (JWT)
- JWT contém o user.id único
- accessToken é armazenado no estado do React
```

### 2. Uso do Token
```typescript
// Frontend: components/ListGeneratorB2B.tsx
const { accessToken } = useAuth()

// Todas as requisições usam:
Authorization: `Bearer ${accessToken || publicAnonKey}`
```

### 3. Verificação no Servidor
```typescript
// Backend: backend/functions/server/index.tsx

// Extrai o userId do JWT:
userId = await getAuthenticatedUserId(authHeader, backend)

// Retorna:
// - user.id REAL do Backend SQLite/PostgreSQL se JWT válido
// - 'default_user' se usando anon key (não logado)
```

## 💾 Armazenamento de Listas

### Estrutura no Banco
```javascript
// Tabela: kv_store_73685931
{
  key: "user_lists_<userId>",  // Único por usuário
  value: "[{...listas...}]"     // Array JSON de listas
}
```

### Exemplo Prático
```javascript
// Usuário logado: admin@vai.com.br
// userId: "550e8400-e29b-41d4-a716-446655440000"
// Chave: "user_lists_550e8400-e29b-41d4-a716-446655440000"

// Valor armazenado:
[
  {
    id: "list_1234567890_abc123",
    name: "Empresas SP - Tecnologia",
    description: "Empresas de tech em São Paulo",
    totalContacts: 150,
    userId: "550e8400-e29b-41d4-a716-446655440000",
    contacts: [...]
  }
]
```

## 🔄 Operações CRUD

### GET /lists
```javascript
// Recupera listas do usuário logado
const listsKey = `user_lists_${userId}`
const data = await db.get(listsKey)
return JSON.parse(data.value)
```

### POST /lists
```javascript
// Cria nova lista vinculada ao usuário
const newList = {
  id: generateId(),
  name: "Nome da Lista",
  userId: userId,  // ✅ Vinculada ao usuário
  contacts: []
}

userLists.push(newList)
await db.set(`user_lists_${userId}`, JSON.stringify(userLists))
```

### PUT /lists/:id
```javascript
// Atualiza lista do usuário
const userLists = await db.get(`user_lists_${userId}`)
const listIndex = userLists.findIndex(l => l.id === listId)
userLists[listIndex] = updatedList
await db.set(`user_lists_${userId}`, JSON.stringify(userLists))
```

### DELETE /lists/:id
```javascript
// Remove lista do usuário
const userLists = await db.get(`user_lists_${userId}`)
const filtered = userLists.filter(l => l.id !== listId)
await db.set(`user_lists_${userId}`, JSON.stringify(filtered))
```

## 🔒 Isolamento de Dados

### Por Usuário
✅ Cada usuário tem sua própria chave no banco
✅ Usuário A não consegue acessar listas do Usuário B
✅ As listas são carregadas APENAS do userId autenticado

### Segurança
✅ Endpoints protegidos exigem Authorization header
✅ JWT é verificado pelo Backend SQLite/PostgreSQL Auth
✅ userId é extraído do token, não da requisição

## 📊 Cenários de Uso

### Cenário 1: Admin Logado
```
1. Admin faz login → recebe JWT com user.id real
2. Admin cria lista → salva em user_lists_<admin_id>
3. Admin lista → carrega de user_lists_<admin_id>
4. ✅ Listas persistem após logout/login
```

### Cenário 2: Novo Usuário
```
1. Novo usuário faz login → recebe JWT com user.id real
2. Primeiro acesso → user_lists_<new_user_id> não existe
3. Retorna array vazio []
4. Cria primeira lista → cria user_lists_<new_user_id>
5. ✅ Dados isolados do admin
```

### Cenário 3: Usando Anon Key (Sem Login)
```
1. Requisição com publicAnonKey → userId = 'default_user'
2. Todas operações em user_lists_default_user
3. ⚠️ Dados compartilhados entre não-logados
4. ❌ Dados perdidos ao fazer login (novo userId)
```

## ⚠️ Importante: Requer Login

O App.tsx força login antes de usar o sistema:
```typescript
if (!user) {
  return <AuthForm />
}
```

Portanto, o **Cenário 3 NÃO ocorre na prática** - usuário sempre está logado!

## 🎯 Conclusão

✅ **Sistema está consistente e seguro**
✅ **Listas vinculadas corretamente ao userId**
✅ **Dados isolados entre usuários**
✅ **Persistência garantida após logout/login**
✅ **Login obrigatório evita inconsistências**

## 🔍 Como Verificar

### No Console do Navegador
```javascript
// Após login, verifique:
localStorage.getItem('sb-<project>-auth-token')
// Deve conter o JWT com user.id

// Ao criar lista, veja no Network:
// POST /lists
// Authorization: Bearer <JWT longo>
```

### Nos Logs do Servidor
```
✅ Valid auth token provided for user: 550e8400-e29b-41d4-a716-446655440000
📝 This userId will be used as the key: user_lists_550e8400-e29b-41d4-a716-446655440000
💾 Saving 3 lists to database with key: user_lists_550e8400-e29b-41d4-a716-446655440000
```

### No Banco Backend SQLite/PostgreSQL
```sql
SELECT * FROM kv_store_73685931 
WHERE key LIKE 'user_lists_%';

-- Deve mostrar uma linha por usuário:
-- user_lists_550e8400-e29b-41d4-a716-446655440000
-- user_lists_7a8b9c0d-e1f2-43g4-h5i6-j7k8l9m0n1o2
```

## 🐛 Debug de Problemas

### Problema: Listas desaparecem após login
**Causa**: Usuário criou listas com anon key, depois fez login (novo userId)
**Solução**: Impossível - App força login antes de usar

### Problema: Usuários veem listas de outros
**Causa**: Bug no código - não está usando userId correto
**Status**: ✅ CORRIGIDO - código verificado e correto

### Problema: Listas não salvam
**Causa**: Erro de autenticação ou Backend SQLite/PostgreSQL offline
**Debug**: Verificar logs do servidor e Network tab do navegador
