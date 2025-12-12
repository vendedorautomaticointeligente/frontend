# 🚀 Guia de Início Rápido - Sistema VAI

## Bem-vindo ao VAI - Vendedor Automático Inteligente

Este guia vai te ajudar a configurar e usar o sistema pela primeira vez.

---

## ⚡ Início Rápido (5 minutos)

### Passo 1: Fazer Login
```
1. Acesse o sistema
2. Email: admin@vai.com.br
3. Senha: Admin@VAI2025
4. Clique em "Entrar"
```

### Passo 2: Configurar APIs (OBRIGATÓRIO)
```
1. No menu lateral, clique em "Painel Admin"
2. Na seção "Configuração de APIs":
   • Adicione sua chave da OpenAI (sk-...)
   • Adicione sua chave da HasData (hd_...)
3. Clique em "Salvar Chaves"
4. Aguarde confirmação de sucesso
```

> ⚠️ **IMPORTANTE**: Sem as chaves de API configuradas, o sistema não funcionará!

### Passo 3: Criar Sua Primeira Lista
```
1. No menu lateral, clique em "Listas"
2. Clique no botão "Criar Nova Lista"
3. Preencha:
   • Nome: "Minha Primeira Lista"
   • Descrição: "Teste do sistema"
4. Clique em "Criar Lista"
5. Sua lista vazia foi criada!
```

### Passo 4: Gerar Contatos Reais
```
1. Na lista criada, clique em "Gerar Contatos"
2. Preencha os critérios:
   • Nicho: "Restaurantes"
   • Estado: SP
   • Cidades: São Paulo
3. Clique em "Buscar Empresas"
4. Aguarde... 🔍
5. Contatos REAIS serão adicionados!
```

### Passo 5: Explorar o Sistema
```
✅ Listas - Seus contatos organizados
✅ CRM - Gestão de leads e vendas
✅ Agentes - Crie estilos de mensagem
✅ Campanhas - Dispare em massa
✅ Automações - Fluxos completos
```

---

## 🔑 Como Obter as Chaves de API

### OpenAI (Para IA e estratégias)

1. Acesse: https://platform.openai.com/api-keys
2. Faça login ou crie uma conta
3. Clique em "Create new secret key"
4. Copie a chave (começa com `sk-`)
5. Cole no Painel Admin do VAI
6. **Importante**: Você precisa ter créditos na OpenAI

**Custo aproximado**: $0.002 por uso (muito baixo)

### HasData (Para dados de empresas brasileiras)

1. Acesse: https://hasdata.com
2. Crie uma conta
3. Escolha um plano (há opção gratuita limitada)
4. Acesse o dashboard → API Keys
5. Copie sua chave (começa com `hd_`)
6. Cole no Painel Admin do VAI

**Planos**:
- Free: 100 consultas/mês
- Básico: ~R$97/mês
- Pro: ~R$297/mês

---

## 📋 Funcionalidades Principais

### 1. LISTAS - Gerador de Contatos

**O que faz**: Gera listas de empresas brasileiras reais

**Como usar**:
```
1. Criar lista vazia
2. Clicar em "Gerar Contatos"
3. Definir:
   • Nicho de negócio (ex: "Padarias")
   • Estado (ex: "SP")
   • Cidades (ex: "São Paulo, Campinas")
   • Bairros (opcional)
4. Clicar em "Buscar Empresas"
5. Aguardar resultados REAIS da API
```

**Dados retornados**:
- ✅ Nome da empresa
- ✅ Telefone
- ✅ Endereço completo
- ✅ Website (quando disponível)
- ✅ Avaliação Google Maps
- ✅ Número de avaliações

**Importante**:
- Apenas dados REAIS são retornados
- Se não encontrar, ajuste os critérios
- Sem dados fictícios de demonstração

### 2. CRM - Gestão de Leads

**O que faz**: Gerencia seus leads em um pipeline visual

**Visualizações**:
- **Kanban**: Colunas por status, drag-and-drop
- **Lista**: Tabela com filtros e busca

**Pipeline**:
```
Novo → Contatado → Qualificado → Proposta → Ganho/Perdido
```

**Ações disponíveis**:
- ✅ Adicionar lead manual
- ✅ Importar de listas
- ✅ Editar informações
- ✅ Adicionar notas
- ✅ Mover entre status
- ✅ Excluir lead
- ✅ Exportar CSV

### 3. AGENTES - Estilos de Abordagem

**O que faz**: Cria diferentes personalidades de mensagem

**Tipos disponíveis**:
1. **Comercial**: Direto, persuasivo, foca em venda
2. **Atendimento**: Consultivo, amigável, foca em relacionamento
3. **FAQ**: Informativo, educativo, responde dúvidas
4. **Suporte**: Técnico, solucionador, resolve problemas

**Customização**:
- Nome do agente
- Descrição
- Tom de voz
- Template de mensagem
- Variáveis: {nome}, {empresa}, {segmento}

**Exemplo de Template**:
```
Olá {nome}! 

Vi que a {empresa} atua em {segmento}. 
Temos uma solução que pode ajudar...

Podemos conversar?
```

### 4. CAMPANHAS - Disparos em Massa

**O que faz**: Envia mensagens para múltiplos contatos

**Configuração**:
1. Selecionar lista alvo
2. Escolher agente de abordagem
3. Definir canal (Email, WhatsApp ou Ambos)
4. Agendar data/hora
5. Disparar

**Métricas acompanhadas**:
- Total de contatos
- Enviados
- Entregues
- Abertos
- Respostas

### 5. AUTOMAÇÕES - Fluxos Completos

**O que faz**: Automatiza todo o processo de vendas

**Fluxo automático**:
```
1. Gera lista automaticamente
   ↓
2. Dispara campanha com agente
   ↓
3. Processa respostas
   ↓
4. Follow-up automático (opcional)
```

**Configuração**:
- Nicho de negócio alvo
- Estados para buscar
- Agente de abordagem
- Canal de disparo
- Dias para follow-up

**Benefício**: Configure uma vez, funciona no piloto automático!

---

## 💡 Casos de Uso Práticos

### Caso 1: Prospectar Restaurantes em SP

```
1. LISTAS
   └→ Criar "Restaurantes SP"
   └→ Nicho: "Restaurantes e Bares"
   └→ Estado: SP
   └→ Cidades: São Paulo, Campinas, Santos
   └→ Gerar → 50+ contatos reais

2. AGENTES
   └→ Criar "Agente Restaurantes"
   └→ Tipo: Comercial
   └→ Template: "Olá {nome}! Ajudamos restaurantes 
       a aumentar vendas em 40%..."

3. CAMPANHAS
   └→ Lista: Restaurantes SP
   └→ Agente: Agente Restaurantes
   └→ Canal: WhatsApp
   └→ Disparar!
```

### Caso 2: Varejo Multi-Estado

```
1. AUTOMAÇÕES
   └→ Nome: "Varejo RJ/SP Automático"
   └→ Nicho: "Lojas de Varejo"
   └→ Estados: RJ, SP
   └→ Agente: Consultivo
   └→ Canal: Email + WhatsApp
   └→ Follow-up: 7 dias
   └→ Ativar!

Resultado: Sistema gera listas e dispara automaticamente!
```

### Caso 3: Suporte para E-commerce

```
1. AGENTES
   └→ Criar "FAQ E-commerce"
   └→ Tipo: FAQ
   └→ Template com perguntas frequentes

2. LISTAS
   └→ Importar lista de clientes atuais

3. CAMPANHAS
   └→ Disparo informativo
   └→ Canal: Email
   └→ Conteúdo educativo
```

---

## 🎯 Boas Práticas

### ✅ DO (Faça)

1. **Configure as APIs primeiro**
   - Sem isso, nada funciona!

2. **Teste com critérios específicos**
   - "Padarias em Moema, São Paulo" funciona melhor que "Comércio"

3. **Revise os contatos gerados**
   - Dados reais podem vir incompletos
   - Edite manualmente se necessário

4. **Crie agentes específicos**
   - Um para cada tipo de cliente
   - Personalize a mensagem

5. **Monitore as métricas**
   - Veja o que funciona melhor
   - Ajuste estratégia

### ❌ DON'T (Não Faça)

1. **Não espere dados fictícios**
   - Sistema só trabalha com dados reais
   - Se API falhar, retorna erro

2. **Não use critérios muito amplos**
   - "Empresas no Brasil" → muito genérico
   - "Clínicas Odontológicas em Pinheiros, SP" → específico ✅

3. **Não ignore os erros**
   - Se der erro, leia a mensagem
   - Geralmente é chave de API ou critério errado

4. **Não dispare sem testar**
   - Teste o agente antes
   - Verifique a lista

5. **Não abuse da API**
   - HasData tem limites
   - Seja estratégico nas buscas

---

## 🔧 Solução de Problemas Comuns

### ❌ "Chave de API inválida"

**Solução**:
1. Ir em Painel Admin
2. Verificar se colou a chave completa
3. Verificar se tem créditos na conta
4. Salvar novamente

### ❌ "Nenhuma empresa encontrada"

**Solução**:
1. Usar critérios mais específicos
2. Tentar outras cidades
3. Verificar ortografia do nicho
4. Exemplo: "Pizzarias" em vez de "Pizza"

### ❌ "Limite de consultas atingido"

**Solução**:
1. Aguardar alguns minutos
2. Verificar plano HasData
3. Considerar upgrade se necessário

### ❌ "Timeout na conexão"

**Solução**:
1. Verificar internet
2. Tentar novamente
3. Se persistir, API pode estar offline

### ❌ Sistema não carrega

**Solução**:
1. Limpar cache do navegador
2. Fazer logout e login novamente
3. Verificar console para erros

---

## 📊 Entendendo as Métricas

### CRM Stats
```
Total de Leads: Todos os contatos
Valor Total: Soma de oportunidades
Vendas Ganhas: Valor de leads "Ganho"
Taxa de Conversão: (Ganhos / Total) × 100
```

### Campanhas
```
Enviados: Mensagens que saíram
Entregues: Confirmados no destino
Abertos: Usuário visualizou
Respostas: Interagiu de volta
```

### Automações
```
Execuções: Quantas vezes rodou
Listas Geradas: Novas listas criadas
Campanhas Enviadas: Disparos realizados
Respostas Processadas: Retornos tratados
```

---

## 🎓 Dicas Avançadas

### 1. Segmentação Inteligente

Crie listas específicas por:
- Bairro nobre → Preço premium
- Região comercial → B2B
- Região residencial → B2C

### 2. Multi-canal

Use Email + WhatsApp:
- Email: Conteúdo rico, links
- WhatsApp: Resposta rápida, pessoal

### 3. Follow-up Estratégico

Configure follow-ups:
- Dia 3: Lembrete gentil
- Dia 7: Nova abordagem
- Dia 14: Última tentativa

### 4. A/B Testing

Crie 2 agentes diferentes:
- Teste em metade da lista cada
- Compare resultados
- Use o melhor

### 5. Otimização de Horários

Agende campanhas:
- B2B: 9h-18h dias úteis
- B2C: 19h-21h e fins de semana
- Evite: Madrugada, feriados

---

## 📚 Recursos Adicionais

### Documentação Completa
- `/PRODUCTION_RULES.md` - Regras do sistema
- `/SYSTEM_STATUS.md` - Status e arquitetura
- `/TROUBLESHOOTING.md` - Solução de problemas
- `/PRODUCTION_CHECKLIST.md` - Checklist de produção

### Suporte
1. Verificar documentação acima
2. Checar console do navegador (F12)
3. Ver logs no Painel Admin

---

## ✅ Checklist de Primeiro Uso

```
□ Login realizado (admin@vai.com.br)
□ Chave OpenAI configurada
□ Chave HasData configurada
□ Primeira lista criada
□ Contatos reais gerados
□ Agente criado
□ CRM testado
□ Campanha configurada (mas não disparada ainda)
□ Automação entendida
□ Métricas visualizadas
```

---

## 🎉 Pronto!

Você agora sabe:
- ✅ Como configurar o sistema
- ✅ Como gerar listas reais
- ✅ Como criar agentes
- ✅ Como disparar campanhas
- ✅ Como automatizar tudo

**Próximos Passos**:
1. Explore cada seção
2. Teste com dados reais
3. Ajuste sua estratégia
4. Escale suas vendas! 🚀

---

**Sucesso com o Sistema VAI!**

*Dúvidas? Consulte a documentação ou verifique o Painel Admin.*
