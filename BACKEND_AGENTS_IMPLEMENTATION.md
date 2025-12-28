# Instruções de Implementação - Geração de Prompts Dinâmicos para Agentes

## 📋 Resumo

Quando um agente é criado ou atualizado no frontend, o backend deve:
1. Receber os dados estruturados em 5 blocos
2. Validar os dados obrigatórios
3. Gerar um prompt dinâmico usando o template base
4. Armazenar o agente com dados + prompt
5. Permitir que a IA use esse prompt ao atender

## 🔄 Fluxo de Dados

```
Frontend (POST /api/agents)
    ↓
    ├─ name: string
    └─ data: AgentFormData {
        ├─ 5 Blocos com subcampos
        ├─ Validação de obrigatórios
        └─ Geração de prompt
    ↓
Backend (armazenar + gerar prompt)
    ↓
Database (agents table)
    ├─ id, name, user_id, status
    ├─ data (JSON blob com 5 blocos)
    ├─ generated_prompt (texto completo)
    ├─ created_at, updated_at
    └─ usage_count
    ↓
API (quando agente é usado)
    ↓
IA (recebe prompt + contexto)
```

## 📊 Estrutura de Dados Esperada (POST /api/agents)

```typescript
interface Plan {
  name: string           // "Básico", "Professional", etc
  includes: string       // "Até 100 contatos, Suporte via email"
  limits: string         // "1000 msgs/mês"
  price: string          // "R$ 99/mês"
  extras?: string        // Opcional: "Suporte priorizado"
}

interface AgentFormData {
  // BLOCO 1: QUEM ATENDE
  agente_nome: string           // Obrigatório: "Murilo"
  agente_funcao: string         // "Suporte", "Consultor", "Vendas"
  agente_jeito_falar: string    // "Bem direto e claro"
  agente_nao_fazer: string      // "Não marcar reuniões, Não prometer..."

  // BLOCO 2: SOBRE A EMPRESA
  empresa_nome: string          // Obrigatório: "VAI"
  empresa_o_que_faz: string     // "Automação comercial"
  empresa_diferenciais: string  // "5 anos no mercado"
  empresa_nao_faz: string       // "Não oferece consultoria"

  // BLOCO 3: PRODUTO/SERVIÇO
  produto_o_que_e: string       // Obrigatório: "Sistema de automação"
  produto_funcionalidades: string // Separado por \n: "Emissão fiscal\nControle de estoque"
  produto_beneficios: string     // Separado por \n: "Reduz tempo\nMelhora vendas"
  produto_publico: string        // "E-commerces, Mercados"

  // BLOCO 4: PLANOS E PREÇOS
  planos: Plan[]                // Array com pelo menos 1 plano
  planos_teste_gratis: string   // "7 dias", "Sem teste"
  planos_pagamento: string      // "Pix, Cartão"
  planos_reembolso: string      // "Não há reembolso"
  planos_links: string          // URLs separadas por quebras de linha

  // BLOCO 5: COMO FUNCIONA
  atendimento_objetivo: string  // Obrigatório: "Fechar vendas"
  atendimento_conducao: string  // "Ser claro e direto"
  atendimento_frases_sugeridas: string // "Quer que eu te envie...?"
  atendimento_evitar: string    // "Política, saúde"
  atendimento_resposta_padrao_fora_escopo: string // "Entendi, mas..."
}

interface CreateAgentRequest {
  name: string          // Nome do agente
  data: AgentFormData   // Dados em 5 blocos
  status: 'draft' | 'active' | 'paused'
}
```

## ✅ Validações Obrigatórias

No backend, validar que estes campos estão preenchidos:

```php
// Campos obrigatórios
- data.agente_nome (não vazio)
- data.empresa_nome (não vazio)
- data.produto_o_que_e (não vazio)
- data.atendimento_objetivo (não vazio)
- data.planos (array com pelo menos 1 item)
```

## 🎯 Função de Geração de Prompt

Pseudocódigo para a função que gera o prompt:

```php
function generateAgentPrompt($agentData) {
    // Processar planos para formato legível
    $planosList = "";
    foreach ($agentData['planos'] as $index => $plan) {
        $planosList .= "Plano " . ($index + 1) . ": " . $plan['name'] . "\n";
        $planosList .= "- O que inclui: " . $plan['includes'] . "\n";
        $planosList .= "- Limites: " . $plan['limits'] . "\n";
        $planosList .= "- Preço: " . $plan['price'] . "\n";
        if (!empty($plan['extras'])) {
            $planosList .= "- Benefícios extras: " . $plan['extras'] . "\n";
        }
        $planosList .= "\n";
    }

    // Template base (veja abaixo)
    $template = file_get_contents(base_path('resources/prompts/agent-template.txt'));

    // Substituir placeholders
    $prompt = str_replace([
        // QUEM ATENDE
        '{{ agente_nome }}' => $agentData['agente_nome'],
        '{{ agente_funcao }}' => $agentData['agente_funcao'],
        '{{ agente_jeito_falar }}' => $agentData['agente_jeito_falar'],
        '{{ agente_nao_fazer }}' => $agentData['agente_nao_fazer'],

        // SOBRE EMPRESA
        '{{ empresa_nome }}' => $agentData['empresa_nome'],
        '{{ empresa_o_que_faz }}' => $agentData['empresa_o_que_faz'],
        '{{ empresa_diferenciais }}' => $agentData['empresa_diferenciais'],
        '{{ empresa_nao_faz }}' => $agentData['empresa_nao_faz'],

        // PRODUTO
        '{{ produto_o_que_e }}' => $agentData['produto_o_que_e'],
        '{{ produto_funcionalidades }}' => $agentData['produto_funcionalidades'],
        '{{ produto_beneficios }}' => $agentData['produto_beneficios'],
        '{{ produto_publico }}' => $agentData['produto_publico'],

        // PLANOS
        '{{ planos_lista }}' => $planosList,
        '{{ planos_teste_gratis }}' => $agentData['planos_teste_gratis'],
        '{{ planos_pagamento }}' => $agentData['planos_pagamento'],
        '{{ planos_reembolso }}' => $agentData['planos_reembolso'],
        '{{ planos_links }}' => $agentData['planos_links'],

        // COMO FUNCIONA
        '{{ atendimento_objetivo }}' => $agentData['atendimento_objetivo'],
        '{{ atendimento_conducao }}' => $agentData['atendimento_conducao'],
        '{{ atendimento_frases_sugeridas }}' => $agentData['atendimento_frases_sugeridas'],
        '{{ atendimento_evitar }}' => $agentData['atendimento_evitar'],
        '{{ atendimento_resposta_padrao_fora_escopo }}' => $agentData['atendimento_resposta_padrao_fora_escopo'],
    ], $template);

    return $prompt;
}
```

## 📄 Arquivo de Template

Criar arquivo: `resources/prompts/agent-template.txt`

```
# PROMPT BASE VAI (DINÂMICO E COMPLETO)

Atenção: tudo entre {{ }} são variáveis que seu sistema preenche automaticamente.

---

**IDENTIDADE DO ATENDENTE**
Você é {{ agente_nome }}, que trabalha com {{ agente_funcao }} na empresa {{ empresa_nome }}.
Fale exatamente do jeito descrito em "jeito de falar": {{ agente_jeito_falar }}.
Evite sempre as ações listadas em "coisas que não deve fazer": {{ agente_nao_fazer }}.

Seu objetivo é conversar de forma natural, simples e clara, como atendimento real de WhatsApp.
Frases curtas. Nada de listas grandes, nada de markdown, nada de texto longo demais.
Se não souber algo, diga: "Ótima pergunta. Vou verificar isso e te aviso, tudo bem?"

---

**SOBRE A EMPRESA**
A empresa se chama {{ empresa_nome }}.
O que ela faz: {{ empresa_o_que_faz }}.
Seus diferenciais: {{ empresa_diferenciais }}.
A empresa não trabalha com: {{ empresa_nao_faz }}.

Nunca ofereça nada fora dessas informações.
Nunca crie soluções customizadas se isso estiver listado como algo que a empresa não faz.

---

**SOBRE O PRODUTO/SERVIÇO**
Explique sempre que necessário, de forma curta e clara, o que é o produto: {{ produto_o_que_e }}.
Principais funcionalidades: {{ produto_funcionalidades }}.
Principais benefícios: {{ produto_beneficios }}.
Público indicado: {{ produto_publico }}.

Quando o cliente demonstrar interesse, apresente o produto de forma natural, sem parecer vendedor demais.

---

**PLANOS E PREÇOS**
A empresa trabalha com os seguintes planos:
{{ planos_lista }}
(Obs.: o sistema injeta automaticamente nome, limites, preço e benefícios de cada plano.)

Teste grátis (se houver): {{ planos_teste_gratis }}.
Formas de pagamento: {{ planos_pagamento }}.
Política de reembolso: {{ planos_reembolso }}.
Links oficiais: {{ planos_links }}.

Quando fizer sentido, você pode dizer naturalmente frases como:
"Se quiser, vejo qual plano fica mais vantajoso para o seu volume."
"Quer que eu te envie o link do plano ideal pra você?"

---

**COMO O ATENDIMENTO DEVE FUNCIONAR**
O objetivo deste atendimento é: {{ atendimento_objetivo }}.
Condução desejada: {{ atendimento_conducao }}.
Frases sugeridas (opcional): {{ atendimento_frases_sugeridas }}.
Assuntos a evitar: {{ atendimento_evitar }}.

Pedidos fora do escopo devem ser respondidos assim:
{{ atendimento_resposta_padrao_fora_escopo }}.

---

**REGRAS GERAIS DE ATENDIMENTO**

1. Sempre responder de forma leve, direta e natural, como conversa de WhatsApp.
2. Nunca usar listas grandes, markdown, tópicos ou textos longos.
3. Sempre priorizar clareza e simplicidade.
4. Não inventar funcionalidades ou prometer entregas fora dos planos.
5. Jamais oferecer reuniões se isso estiver proibido nos campos.
6. Use o primeiro nome do contato sempre que possível: {{ usuario_primeiro_nome }}.

---

**OBJETIVO FINAL DO AGENTE**
Entender o contexto da pessoa, apresentar a solução no ponto certo, esclarecer dúvidas e conduzir (sem pressão) para o plano mais adequado ao perfil dela.

---

# FIM DO PROMPT
```

## 🗄️ Schema de Banco de Dados (Migration)

```php
Schema::create('agents', function (Blueprint $table) {
    $table->id();
    $table->unsignedBigInteger('user_id');
    $table->string('name'); // Nome do agente (ex: "Murilo VAI")
    $table->json('data');   // Dados em 5 blocos (AgentFormData)
    $table->longText('generated_prompt'); // Prompt gerado dinamicamente
    $table->enum('status', ['draft', 'active', 'paused'])->default('draft');
    $table->integer('usage_count')->default(0);
    $table->timestamps();

    $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
    $table->index(['user_id', 'status']);
});
```

## 🔗 Controller - AgentController.php

```php
namespace App\Http\Controllers;

use App\Models\Agent;
use Illuminate\Http\Request;

class AgentController extends Controller
{
    public function store(Request $request)
    {
        // Validação
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'data' => 'required|array',
            'data.agente_nome' => 'required|string',
            'data.empresa_nome' => 'required|string',
            'data.produto_o_que_e' => 'required|string',
            'data.atendimento_objetivo' => 'required|string',
            'data.planos' => 'required|array|min:1',
            'status' => 'in:draft,active,paused',
        ]);

        // Gerar prompt dinâmico
        $prompt = $this->generateAgentPrompt($validated['data']);

        // Criar agente
        $agent = Agent::create([
            'user_id' => auth()->id(),
            'name' => $validated['name'],
            'data' => $validated['data'],
            'generated_prompt' => $prompt,
            'status' => $validated['status'] ?? 'draft',
        ]);

        return response()->json($agent, 201);
    }

    public function update(Request $request, Agent $agent)
    {
        $this->authorize('update', $agent);

        $validated = $request->validate([
            'name' => 'string|max:255',
            'data' => 'array',
            'status' => 'in:draft,active,paused',
        ]);

        if (isset($validated['data'])) {
            // Regenerar prompt se dados mudarem
            $prompt = $this->generateAgentPrompt($validated['data']);
            $validated['generated_prompt'] = $prompt;
        }

        $agent->update($validated);

        return response()->json($agent);
    }

    private function generateAgentPrompt($agentData)
    {
        // Processar planos
        $planosList = "";
        foreach ($agentData['planos'] as $index => $plan) {
            $planosList .= "Plano " . ($index + 1) . ": " . $plan['name'] . "\n";
            $planosList .= "- O que inclui: " . $plan['includes'] . "\n";
            $planosList .= "- Limites: " . $plan['limits'] . "\n";
            $planosList .= "- Preço: " . $plan['price'] . "\n";
            if (!empty($plan['extras'])) {
                $planosList .= "- Benefícios extras: " . $plan['extras'] . "\n";
            }
            $planosList .= "\n";
        }

        // Carregar template
        $template = file_get_contents(base_path('resources/prompts/agent-template.txt'));

        // Substituir placeholders
        $replacements = [
            '{{ agente_nome }}' => $agentData['agente_nome'] ?? '',
            '{{ agente_funcao }}' => $agentData['agente_funcao'] ?? '',
            '{{ agente_jeito_falar }}' => $agentData['agente_jeito_falar'] ?? '',
            '{{ agente_nao_fazer }}' => $agentData['agente_nao_fazer'] ?? '',
            '{{ empresa_nome }}' => $agentData['empresa_nome'] ?? '',
            '{{ empresa_o_que_faz }}' => $agentData['empresa_o_que_faz'] ?? '',
            '{{ empresa_diferenciais }}' => $agentData['empresa_diferenciais'] ?? '',
            '{{ empresa_nao_faz }}' => $agentData['empresa_nao_faz'] ?? '',
            '{{ produto_o_que_e }}' => $agentData['produto_o_que_e'] ?? '',
            '{{ produto_funcionalidades }}' => $agentData['produto_funcionalidades'] ?? '',
            '{{ produto_beneficios }}' => $agentData['produto_beneficios'] ?? '',
            '{{ produto_publico }}' => $agentData['produto_publico'] ?? '',
            '{{ planos_lista }}' => $planosList,
            '{{ planos_teste_gratis }}' => $agentData['planos_teste_gratis'] ?? '',
            '{{ planos_pagamento }}' => $agentData['planos_pagamento'] ?? '',
            '{{ planos_reembolso }}' => $agentData['planos_reembolso'] ?? '',
            '{{ planos_links }}' => $agentData['planos_links'] ?? '',
            '{{ atendimento_objetivo }}' => $agentData['atendimento_objetivo'] ?? '',
            '{{ atendimento_conducao }}' => $agentData['atendimento_conducao'] ?? '',
            '{{ atendimento_frases_sugeridas }}' => $agentData['atendimento_frases_sugeridas'] ?? '',
            '{{ atendimento_evitar }}' => $agentData['atendimento_evitar'] ?? '',
            '{{ atendimento_resposta_padrao_fora_escopo }}' => $agentData['atendimento_resposta_padrao_fora_escopo'] ?? '',
        ];

        return str_replace(array_keys($replacements), array_values($replacements), $template);
    }
}
```

## 📱 Uso do Prompt na IA

Quando a IA vai responder um usuário:

```php
// Buscar agente
$agent = Agent::find($agentId);

// Construir contexto completo
$systemPrompt = $agent->generated_prompt;

// Adicionar contexto do usuário
$systemPrompt .= "\n\n---\n\n**CONTEXTO DO CONTATO**\n";
$systemPrompt .= "Nome: {{ usuario_primeiro_nome }}\n";
$systemPrompt .= "Empresa: {{ usuario_empresa }}\n";
$systemPrompt .= "Telefone: {{ usuario_telefone }}\n";

// Enviar para IA
$response = openai()->chat()->create([
    'model' => 'gpt-4',
    'messages' => [
        [
            'role' => 'system',
            'content' => $systemPrompt
        ],
        [
            'role' => 'user',
            'content' => $userMessage
        ]
    ]
]);

// Retornar resposta
return $response['choices'][0]['message']['content'];
```

## ✨ Benefícios

✅ Agente 100% personalizável por usuário
✅ Prompt gerado automaticamente, sem erros
✅ Fácil de auditar (prompt está armazenado)
✅ Suporta A/B testing (criar variações)
✅ Histórico de versões (guardar dados anteriores)
✅ Duplication com um clique (copiar agente existente)

## 🚀 Próximos Passos

1. Implementar migration de agentes
2. Criar AgentController com lógica acima
3. Adicionar arquivo template.txt
4. Testar criação/edição de agentes
5. Integrar com IA para usar prompt gerado
6. Adicionar endpoint de logs/histórico
