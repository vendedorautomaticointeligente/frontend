# Nova Tela de Detalhe de Lead

## 🎯 Visão Geral

Uma tela completa de gerenciamento de leads com interface intuitiva para comunicação e acompanhamento eficaz.

## 🎨 Layout

A tela de detalhe está dividida em 3 colunas:

### Coluna Esquerda (2/3 da tela)
- **Informações do Lead**: Email, telefone, cidade, estado, segmento
- **Status**: Seletor de status (Novo → Contatado → Qualificado → Proposta → Ganho/Perdido)
- **Pontuação e Valor**: Score (0-100) e valor estimado do lead
- **Tarefas**: Criar e gerenciar tarefas com prioridades e datas
- **Agendamentos**: Criar e gerenciar agendamentos (Telefonema, Reunião, Email, Acompanhamento)

### Coluna Direita (1/3 da tela)
- **Observações**: Histórico de notas sobre o lead
- Interface "sticky" para fácil acesso enquanto navega

## 🚀 Como Usar

### 1. **Acessar Detalhe do Lead**
- Clicar no ícone de "olho" (👁️) na view Kanban ou Lista
- A tela de detalhe abre com todas as informações do lead

### 2. **Editar Informações Básicas**
- Email, telefone, cidade, estado, segmento
- Atualizar score (com barra de progresso visual)
- Definir valor estimado do lead
- Mudar o status com o selector

### 3. **Gerenciar Tarefas**
```
+ Nova Tarefa
├── Título (obrigatório)
├── Descrição (opcional)
├── Data de Vencimento (obrigatório)
└── Prioridade (Alta/Média/Baixa)
```

Ações:
- ✓ Marcar como concluída (risca o texto)
- 🗑️ Deletar tarefa
- Prioridades com cores visuais

### 4. **Agendar Compromissos**
```
+ Novo Agendamento
├── Título (obrigatório)
├── Descrição (opcional)
├── Data e Hora (obrigatório)
└── Tipo (Telefonema, Reunião, Email, Acompanhamento)
```

Ações:
- ✓ Marcar como concluído
- 🗑️ Deletar agendamento
- Ícones visuais por tipo de agendamento

### 5. **Adicionar Observações**
- Textarea para adicionar notas rapidamente
- Histórico completo com timestamp
- Possibilidade de deletar cada nota
- As notas mais recentes aparecem no topo

## 💾 Salvar Alterações

- Clicar no botão **"Salvar"** no topo direito
- Todas as mudanças nas informações básicas são persistidas
- Tarefas, agendamentos e notas são salvos automaticamente quando criados

## 🎯 Status do Lead

Fluxo típico recomendado:
1. **Novo** - Lead acabou de entrar no sistema
2. **Contatado** - Primeiro contato realizado
3. **Qualificado** - Potencial verificado
4. **Proposta** - Proposta enviada
5. **Ganho** - Fechou a venda
6. **Perdido** - Não converteu (oportunidade perdida)

## 📊 Campos Inteligentes

### Score
- Barra de progresso visual (0-100)
- Ajuda a qualificar o lead automaticamente
- Recomendação: usar score > 70 para leads prontos para proposta

### Valor Estimado
- Em Reais (R$)
- Ajuda no cálculo do pipeline de vendas
- Atualizar conforme o lead avança

### Informações de Contato
- Email: Válido por padrão
- Telefone: Inclui integração com WhatsApp (ao clicar na lista, abre WhatsApp)

## 🔄 Fluxo de Comunicação

Processo recomendado:
1. **Criar uma Tarefa**: "Enviar proposta ao cliente"
2. **Agendar Reunião**: Data e hora do follow-up
3. **Adicionar Observação**: Resultado do contato
4. **Atualizar Status**: Avançar o lead no pipeline
5. **Salvar**: Confirmar todas as mudanças

## 🎨 Design & UX

- **Cards informativos**: Agrupamento visual das seções
- **Badges coloridas**: Status, prioridades, tipos de agendamento
- **Ícones lucide-react**: Indicadores visuais claros
- **Modo dark/light**: Suporta tema da aplicação
- **Responsivo**: Adapta-se a diferentes tamanhos de tela

## 🔐 Isolamento de Dados

- Cada usuário vê apenas seus próprios leads
- Dados salvos no backend com autenticação Sanctum
- Tasks, schedules e notes são locais (frontend) - possibilidade de sincronização futura

## 🚀 Próximas Melhorias (Roadmap)

1. **Sincronização com Backend**
   - Salvar tarefas, agendamentos e notas no banco de dados
   - Histórico completo de modificações

2. **Integração de Comunicação**
   - Timeline de mensagens WhatsApp
   - Histórico de emails
   - Integração com calendário (Google Calendar, Outlook)

3. **Automações**
   - Criar tarefa automaticamente ao agendar reunião
   - Lembretes de follow-up
   - Notificações de próximos agendamentos

4. **Analytics**
   - Gráficos de progresso do lead
   - Tempo médio em cada stage
   - Taxa de conversão por fonte

5. **Templates**
   - Modelos de email para follow-up
   - Templates de tarefas por segmento
   - Agendamentos recorrentes

## 📱 Atalhos

- **Ctrl+S** ou **Cmd+S**: Salvar (em desenvolvimento)
- **ESC**: Voltar à lista (em desenvolvimento)
- **Ctrl+T**: Nova tarefa (em desenvolvimento)
- **Ctrl+A**: Novo agendamento (em desenvolvimento)

## ❓ FAQ

**P: Os dados de tarefas são salvos?**
R: Atualmente são salvos no estado local (frontend). Próxima versão salvará no banco de dados.

**P: Posso criar múltiplas tarefas com a mesma data?**
R: Sim! Não há limite de tarefas por data.

**P: Os agendamentos geram notificações?**
R: Atualmente não. Será adicionado em breve com integração de notifications do navegador.

**P: Como deletar um lead?**
R: Use o botão de lixeira (🗑️) na view anterior (Lista/Kanban).

## 🐛 Troubleshooting

**Problema: Lead não carrega**
- Verifique a autenticação (token válido)
- Verifique se o lead existe ainda

**Problema: Não consegue salvar**
- Verifique conexão com internet
- Verifique se o backend está rodando
- Verifique se o token expirou

**Problema: Tarefas desaparecem ao recarregar**
- Tarefas são salvas localmente (frontend)
- Não são sincronizadas com backend atualmente
