# 🚀 Tela Completa de Detalhe do Lead - Guia Rápido

## ✨ O Que Mudou

Antes: Modal simples para edição rápida
Depois: **Tela completa** com todo o arsenal de ferramentas de comunicação

## 🎯 Acessar a Nova Tela

### Passo 1: Ir para CRM
Clique em **"CRM"** no menu lateral

### Passo 2: Encontrar o Lead
- View **Kanban**: Procure nas colunas de status
- View **Lista**: Procure na tabela

### Passo 3: Clicar em "Ver Detalhes"
Clique no ícone **👁️** (olho) ao lado do lead

→ Abre a tela completa!

## 📋 O Que Você Pode Fazer

### 1️⃣ **Editar Informações Básicas**
```
Email               ✏️ Editar
Telefone            ✏️ Editar
Cidade              ✏️ Editar
Estado              ✏️ Editar
Segmento            ✏️ Editar
Status              🔽 Selector
Score               ⏱️ Barra visual
Valor Estimado      💰 Em Reais
```

Depois de editar: **[Salvar]** para persistir mudanças

### 2️⃣ **Gerenciar Tarefas**

#### Criar Nova Tarefa
1. Clique em **[+ Nova Tarefa]**
2. Preencha:
   - **Título**: "Enviar proposta" (obrigatório)
   - **Descrição**: "Proposta de desenvolvimento" (opcional)
   - **Data**: Escolha a data (obrigatório)
   - **Prioridade**: Alta / Média / Baixa
3. Clique **[Criar Tarefa]**

#### Gerenciar
- ☐ Clicar no círculo = marcar como concluída (fica com risco)
- 🗑️ Clicar no botão de lixeira = deletar a tarefa

**Exemplo de Pipeline:**
```
Nova Lead
└─ Tarefa: "Contato inicial" (Alta Prioridade)
   └─ Tarefa: "Qualificação" (Média)
      └─ Tarefa: "Preparar proposta" (Alta)
         └─ Tarefa: "Acompanhamento" (Média)
```

### 3️⃣ **Agendar Compromissos**

#### Criar Agendamento
1. Clique em **[+ Novo Agendamento]**
2. Preencha:
   - **Título**: "Reunião com diretora" (obrigatório)
   - **Descrição**: "Apresentar solução" (opcional)
   - **Data e Hora**: Quando acontece (obrigatório)
   - **Tipo**: Escolha um dos 4:
     - 📞 **Telefonema** - Ligação
     - 👥 **Reunião** - Presencial ou vídeo
     - 📧 **Email** - Envio de mensagem
     - 📋 **Acompanhamento** - Follow-up
3. Clique **[Agendar]**

#### Gerenciar
- ✓ Clicar no ícone = marcar como concluído
- 🗑️ Clicar no botão de lixeira = deletar

**Exemplo:**
```
Dia 15/12 - 14:00
└─ 📞 Telefonema com cliente
   Resultado: Muito interessado, aguardando aprovação

Dia 18/12 - 10:00
└─ 👥 Reunião presencial
   Local: Escritório em São Paulo
   
Dia 22/12 - 09:00
└─ 📧 Envio de contrato
```

### 4️⃣ **Adicionar Observações**

#### Criar Nota
1. Na coluna direita, escreva no **TextArea**
   ```
   "Cliente interagiu positivamente com a apresentação.
   Próximo passo: aguardar retorno com orçamento do diretor.
   ETA: 48h"
   ```
2. Clique **[Adicionar Observação]**

#### Gerenciar
- Histórico aparece na coluna direita
- Notas mais recentes aparecem no topo
- Cada nota tem timestamp (data/hora)
- 🗑️ Clicar X para deletar uma nota

**Por que usar:**
- Manter histórico do que foi conversado
- Documentar decisões do cliente
- Lembrar de detalhes importantes
- Onboarding para colegas que pegarem o lead

## 💡 Fluxo Recomendado de Uso

### Cenário 1: Lead Novo Chegou
```
1. Abrir detalhe
2. Editar Score: 20 (ainda não qualificado)
3. Status: "novo"
4. Criar Tarefa: "Contato inicial" (Alta, hoje)
5. Agendar: "Telefonema" (amanhã 10:00)
6. [Salvar]
```

### Cenário 2: Após Primeira Conversa
```
1. Abrir detalhe
2. Adicionar Observação: "Empresa está em crescimento, interessada em solução"
3. Editar Score: 55 (qualificando)
4. Status: "contatado"
5. Marcar Tarefa "Contato inicial" como ✓ concluída
6. Criar Tarefa: "Agendamento de reunião" (Média, próximas 24h)
7. [Salvar]
```

### Cenário 3: Proposta Enviada
```
1. Abrir detalhe
2. Editar Score: 75 (pronto para venda)
3. Status: "proposta"
4. Adicionar Observação: "Proposta enviada via email"
5. Agendar: "Acompanhamento em 5 dias"
6. Criar Tarefa: "Acompanhamento proposta" (Alta, em 5 dias)
7. [Salvar]
```

### Cenário 4: Ganhou o Negócio!
```
1. Abrir detalhe
2. Editar Score: 100
3. Editar Valor: 50000 (valor real do contrato)
4. Status: "ganho"
5. Adicionar Observação: "Contrato assinado em 18/12/2025!"
6. Marcar Tarefas anteriores como ✓ concluídas
7. Criar Tarefa: "Enviar fatura/boleto"
8. [Salvar]
```

## 🎨 Entendendo as Cores e Status

### Status (Qual etapa do pipeline)
```
🔘 NOVO          → Acabou de entrar
🔵 CONTATADO     → Primeiro contato feito
🟣 QUALIFICADO   → Potencial verificado
🟠 PROPOSTA      → Proposta foi enviada
🟢 GANHO         → Venda fechada!
🔴 PERDIDO       → Não converteu
```

### Prioridade de Tarefas
```
🔴 ALTA    → Urgente, não pode perder prazos
🟡 MÉDIA   → Normal, importante mas flexível
🔵 BAIXA   → Pode deixar para depois
```

## 🔔 Dicas Importantes

### Para Não Esquecer Ninguém
- **Sempre** agende um follow-up ao fim de uma conversa
- Defina a data/hora do agendamento pensando no cliente
- Use descrição para lembrar do que foi conversado

### Para Aumentar Probabilidade de Venda
- Mantenha **Score atualizado** (aumenta conforme avança)
- Use **tarefas** para quebrar o processo em passos menores
- Adicione **observações** de cada contato (muito importante!)
- Valide o **Valor Estimado** conforme negocia

### Para Comunicação Eficaz
- Deixe a **Descrição da Tarefa** com detalhes
- Use **Observações** para contexto
- **Agendamentos** são lembretes automáticos
- Se esqueceu algo? Volte e crie uma tarefa agora mesmo!

## ❓ Dúvidas Frequentes

**P: Meus dados de tarefa/agendamento foram perdidos?**
R: Nesta versão, tarefas, agendamentos e notas são locais (frontend). Próxima versão sincroniza com backend.

**P: Como voltar para a lista?**
R: Clique no botão **[Fechar]** ou na **seta** ← no topo.

**P: Preciso criar o lead primeiro?**
R: Sim, você vê a tela de detalhe apenas para leads que já existem.

**P: Posso criar múltiplas tarefas com mesma data?**
R: Sim! Sem limite. Use prioridades para organizar.

**P: Os agendamentos geram notificações?**
R: Atualmente não. Mas você verá a data/hora quando abrir o detalhe.

**P: Posso editando email/telefone direto?**
R: Sim! Edite e clique [Salvar] para persistir no backend.

**P: Como saber se salvou?**
R: Quando você clica [Salvar], aparece mensagem de sucesso ("Lead atualizado com sucesso").

## 🎯 Checklist de Uso

Para cada lead, certifique-se de:

- [ ] Email validado e correto
- [ ] Telefone preenchido (para WhatsApp)
- [ ] Status está correto
- [ ] Score reflete realidade (0-100)
- [ ] Pelo menos uma tarefa criada
- [ ] Próximo agendamento marcado
- [ ] Última observação de contato registrada
- [ ] Clicou [Salvar]

## 🚀 Próximas Features em Desenvolvimento

- 💾 Tarefas e agendamentos salvos no banco
- 🔔 Notificações de agendamentos próximos
- 📅 Sincronização com Google Calendar
- 📱 Integração com WhatsApp (histórico de mensagens)
- 📊 Gráficos de progresso do lead
- ⏱️ Tempo médio em cada stage
- 🎯 Taxa de conversão por fonte/segmento

---

**Pronto para usar!** 🎉

Qualquer dúvida, volte neste guia ou entre em contato com o time de desenvolvimento.
