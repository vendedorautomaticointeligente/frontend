import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Textarea } from "./ui/textarea"
import { Badge } from "./ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog"
import { Separator } from "./ui/separator"
import { useAuth } from "../hooks/useAuthLaravel"
import { toast } from "sonner@2.0.3"
import { 
  Bot, 
  Plus, 
  Edit, 
  Trash2, 
  Play, 
  Pause,
  Sparkles,
  Copy,
  Loader2,
  X,
  ChevronDown
} from "lucide-react"

interface Plan {
  name: string
  includes: string
  limits: string
  price: string
  extras?: string
}

interface AgentFormData {
  // 0. NOME DO AGENTE (interno)
  nome_agente_pnh: string

  // 1. QUEM ATENDE
  agente_nome: string
  agente_funcao: string
  agente_jeito_falar: string
  agente_nao_fazer: string

  // 2. SOBRE A EMPRESA
  empresa_nome: string
  empresa_o_que_faz: string
  empresa_diferenciais: string
  empresa_nao_faz: string

  // 3. PRODUTO/SERVIÇO
  produto_o_que_e: string
  produto_funcionalidades: string
  produto_beneficios: string
  produto_publico: string

  // 4. PLANOS E PREÇOS
  planos: Plan[]
  planos_teste_gratis: string
  planos_pagamento: string
  planos_reembolso: string
  planos_links: string

  // 5. COMO FUNCIONA
  atendimento_objetivo: string
  atendimento_conducao: string
  atendimento_frases_sugeridas: string
  atendimento_evitar: string
  atendimento_resposta_padrao_fora_escopo: string
}

interface Agent {
  id: string
  name: string
  status: 'active' | 'paused' | 'draft'
  usageCount: number
  createdAt: string
  data: AgentFormData
}

export function Agents() {
  const { accessToken } = useAuth()
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [creatingNewAgent, setCreatingNewAgent] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)

  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8002/api'

  const getHeaders = (includeContentType = false) => ({
    'Authorization': `Bearer ${accessToken}`,
    ...(includeContentType && { 'Content-Type': 'application/json' })
  })

  const emptyFormData: AgentFormData = {
    nome_agente_pnh: "",
    agente_nome: "",
    agente_funcao: "",
    agente_jeito_falar: "",
    agente_nao_fazer: "",
    empresa_nome: "",
    empresa_o_que_faz: "",
    empresa_diferenciais: "",
    empresa_nao_faz: "",
    produto_o_que_e: "",
    produto_funcionalidades: "",
    produto_beneficios: "",
    produto_publico: "",
    planos: [{ name: "", includes: "", limits: "", price: "" }],
    planos_teste_gratis: "",
    planos_pagamento: "",
    planos_reembolso: "",
    planos_links: "",
    atendimento_objetivo: "",
    atendimento_conducao: "",
    atendimento_frases_sugeridas: "",
    atendimento_evitar: "",
    atendimento_resposta_padrao_fora_escopo: ""
  }

  const [formData, setFormData] = useState<AgentFormData>(emptyFormData)
  const [expandedSections, setExpandedSections] = useState({
    nome_agente: true,
    quem_atende: true,
    sobre_empresa: false,
    sobre_produto: false,
    planos_precos: false,
    como_funciona: false
  })

  useEffect(() => {
    loadAgents()
  }, [])

  const loadAgents = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${baseUrl}/agents`, {
        headers: getHeaders()
      })

      if (response.ok) {
        const data = await response.json()
        setAgents(data.agents || [])
      }
    } catch (error) {
      console.error('Error loading agents:', error)
      toast.error('Erro ao carregar agentes')
    } finally {
      setLoading(false)
    }
  }

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const handleFormChange = (field: keyof AgentFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handlePlanChange = (index: number, field: keyof Plan, value: string) => {
    const newPlans = [...formData.planos]
    newPlans[index] = { ...newPlans[index], [field]: value }
    setFormData(prev => ({
      ...prev,
      planos: newPlans
    }))
  }

  const addPlan = () => {
    setFormData(prev => ({
      ...prev,
      planos: [...prev.planos, { name: "", includes: "", limits: "", price: "" }]
    }))
  }

  const removePlan = (index: number) => {
    setFormData(prev => ({
      ...prev,
      planos: prev.planos.filter((_, i) => i !== index)
    }))
  }

  const resetForm = () => {
    setFormData(emptyFormData)
    setExpandedSections({
      nome_agente: true,
      quem_atende: true,
      sobre_empresa: false,
      sobre_produto: false,
      planos_precos: false,
      como_funciona: false
    })
  }

  const validateForm = (): boolean => {
    if (!formData.agente_nome.trim()) {
      toast.error('Nome do atendente é obrigatório')
      return false
    }
    if (!formData.empresa_nome.trim()) {
      toast.error('Nome da empresa é obrigatório')
      return false
    }
    if (!formData.produto_o_que_e.trim()) {
      toast.error('Descrição do produto é obrigatória')
      return false
    }
    if (!formData.atendimento_objetivo.trim()) {
      toast.error('Objetivo do atendimento é obrigatório')
      return false
    }
    return true
  }

  const addAgent = async () => {
    if (!validateForm()) return

    try {
      const response = await fetch(`${baseUrl}/agents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          name: formData.nome_agente_pnh,
          data: formData,
          status: 'draft'
        })
      })

      if (response.ok) {
        await loadAgents()
        setCreatingNewAgent(false)
        resetForm()
        toast.success('Agente criado!')
      } else {
        toast.error('Erro ao criar agente')
      }
    } catch (error) {
      console.error('Error creating agent:', error)
      toast.error('Erro ao criar agente')
    }
  }

  const deleteAgent = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este agente?')) return

    try {
      const response = await fetch(`${baseUrl}/agents/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (response.ok) {
        await loadAgents()
        toast.success('Agente excluído!')
      } else {
        toast.error('Erro ao excluir agente')
      }
    } catch (error) {
      console.error('Error deleting agent:', error)
      toast.error('Erro ao excluir agente')
    }
  }

  const toggleAgentStatus = async (agent: Agent) => {
    const newStatus = agent.status === 'active' ? 'paused' : 'active'

    try {
      const response = await fetch(`${baseUrl}/agents/${agent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          status: newStatus
        })
      })

      if (response.ok) {
        await loadAgents()
        toast.success(`Agente ${newStatus === 'active' ? 'ativado' : 'pausado'}!`)
      } else {
        toast.error('Erro ao atualizar status')
      }
    } catch (error) {
      console.error('Error updating agent status:', error)
      toast.error('Erro ao atualizar status')
    }
  }

  const duplicateAgent = async (agent: Agent) => {
    try {
      const newData = { ...agent.data, nome_agente_pnh: `${agent.data.nome_agente_pnh} (Cópia)` }
      const response = await fetch(`${baseUrl}/agents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          name: newData.nome_agente_pnh,
          data: newData,
          status: 'draft'
        })
      })

      if (response.ok) {
        await loadAgents()
        toast.success('Agente duplicado!')
      } else {
        toast.error('Erro ao duplicar agente')
      }
    } catch (error) {
      console.error('Error duplicating agent:', error)
      toast.error('Erro ao duplicar agente')
    }
  }

  const openEditDialog = (agent: Agent) => {
    setSelectedAgent(agent)
    setFormData(agent.data)
    setShowEditDialog(true)
  }

  const updateAgent = async () => {
    if (!selectedAgent || !validateForm()) return

    try {
      const response = await fetch(`${baseUrl}/agents/${selectedAgent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          name: formData.nome_agente_pnh,
          data: formData
        })
      })

      if (response.ok) {
        await loadAgents()
        setShowEditDialog(false)
        resetForm()
        toast.success('Agente atualizado!')
      } else {
        toast.error('Erro ao atualizar agente')
      }
    } catch (error) {
      console.error('Error updating agent:', error)
      toast.error('Erro ao atualizar agente')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500'
      case 'paused': return 'bg-yellow-500'
      case 'draft': return 'bg-gray-400'
      default: return 'bg-gray-400'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Ativo'
      case 'paused': return 'Pausado'
      case 'draft': return 'Rascunho'
      default: return status
    }
  }

  const totalUsage = agents.reduce((sum, a) => sum + a.usageCount, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl mb-1 sm:mb-2">Agentes PNH (Pessoas Não Humanas)</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Configure agentes de IA personalizados para seus atendimentos
            </p>
          </div>

          {!creatingNewAgent && (
            <Button className="gap-2" onClick={() => {
              resetForm()
              setCreatingNewAgent(true)
            }}>
              <Plus className="w-4 h-4" />
              Novo Agente
            </Button>
          )}
        </div>

        {/* New Agent Form */}
        {creatingNewAgent && (
          <Card className="border border-slate-200 bg-slate-100/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Criar Novo Agente</CardTitle>
                  <CardDescription>
                    Preencha todas as seções para configurar seu agente de IA
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCreatingNewAgent(false)
                    resetForm()
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* 0. NOME DO AGENTE */}
              <div className="border border-slate-300 rounded-lg">
                <button
                  onClick={() => toggleSection('nome_agente')}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50"
                >
                  <h3 className="font-semibold text-lg">0. NOME DO AGENTE</h3>
                  <ChevronDown
                    className={`w-5 h-5 transition-transform ${expandedSections.nome_agente ? 'rotate-180' : ''}`}
                  />
                </button>
                {expandedSections.nome_agente && (
                  <div className="p-4 space-y-4 border-t bg-white">
                    <div className="space-y-2">
                      <Label htmlFor="nome_agente_pnh">Identificador do Agente PNH *</Label>
                      <Input
                        id="nome_agente_pnh"
                        placeholder="Ex: Agente de Vendas 1, Bot de Suporte Premium, IA Consultora VIP"
                        value={formData.nome_agente_pnh}
                        onChange={(e) => handleFormChange('nome_agente_pnh', e.target.value)}
                        className="border border-slate-300"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 1. QUEM ATENDE */}
              <div className="border border-slate-300 rounded-lg">
                <button
                  onClick={() => toggleSection('quem_atende')}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50"
                >
                  <h3 className="font-semibold text-lg">1. QUEM ATENDE</h3>
                  <ChevronDown
                    className={`w-5 h-5 transition-transform ${expandedSections.quem_atende ? 'rotate-180' : ''}`}
                  />
                </button>
                {expandedSections.quem_atende && (
                  <div className="p-4 space-y-4 border-t bg-white">
                    <div className="space-y-2">
                      <Label htmlFor="agente_nome">1.1 Nome do atendente *</Label>
                      <Input
                        id="agente_nome"
                        placeholder="Ex: Murilo, Ricardo, Ana do Suporte"
                        value={formData.agente_nome}
                        onChange={(e) => handleFormChange('agente_nome', e.target.value)}
                        className="border border-slate-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="agente_funcao">1.2 Função do atendente</Label>
                      <Input
                        id="agente_funcao"
                        placeholder="Ex: Suporte, Consultor, Vendas, Atendimento Comercial"
                        value={formData.agente_funcao}
                        onChange={(e) => handleFormChange('agente_funcao', e.target.value)}
                        className="border border-slate-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="agente_jeito_falar">1.3 Jeito de falar</Label>
                      <Input
                        id="agente_jeito_falar"
                        placeholder="Ex: Bem direto e claro, Amigável e simples, Profissional e consultivo"
                        value={formData.agente_jeito_falar}
                        onChange={(e) => handleFormChange('agente_jeito_falar', e.target.value)}
                        className="border border-slate-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="agente_nao_fazer">1.4 Coisas que não deve fazer</Label>
                      <Textarea
                        id="agente_nao_fazer"
                        placeholder="Ex: Não marcar reuniões, Não prometer nada fora dos planos, Não criar soluções personalizadas"
                        value={formData.agente_nao_fazer}
                        onChange={(e) => handleFormChange('agente_nao_fazer', e.target.value)}
                        rows={3}
                        className="border border-slate-300"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 2. SOBRE A EMPRESA */}
              <div className="border border-slate-300 rounded-lg">
                <button
                  onClick={() => toggleSection('sobre_empresa')}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50"
                >
                  <h3 className="font-semibold text-lg">2. SOBRE A SUA EMPRESA</h3>
                  <ChevronDown
                    className={`w-5 h-5 transition-transform ${expandedSections.sobre_empresa ? 'rotate-180' : ''}`}
                  />
                </button>
                {expandedSections.sobre_empresa && (
                  <div className="p-4 space-y-4 border-t bg-white">
                    <div className="space-y-2">
                      <Label htmlFor="empresa_nome">2.1 Nome da empresa *</Label>
                      <Input
                        id="empresa_nome"
                        placeholder="Ex: VAI - Vendedor Automático Inteligente"
                        value={formData.empresa_nome}
                        onChange={(e) => handleFormChange('empresa_nome', e.target.value)}
                        className="border border-slate-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="empresa_o_que_faz">2.2 O que a empresa faz (em poucas palavras)</Label>
                      <Input
                        id="empresa_o_que_faz"
                        placeholder="Ex: Automação comercial, Contabilidade para e-commerce, Marketing digital"
                        value={formData.empresa_o_que_faz}
                        onChange={(e) => handleFormChange('empresa_o_que_faz', e.target.value)}
                        className="border border-slate-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="empresa_diferenciais">2.3 Diferenciais da empresa</Label>
                      <Textarea
                        id="empresa_diferenciais"
                        placeholder="Ex: 25 anos de mercado, Atendimento humanizado, Tecnologia própria"
                        value={formData.empresa_diferenciais}
                        onChange={(e) => handleFormChange('empresa_diferenciais', e.target.value)}
                        rows={2}
                        className="border border-slate-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="empresa_nao_faz">2.4 Coisas que a empresa não faz</Label>
                      <Textarea
                        id="empresa_nao_faz"
                        placeholder="Ex: Não desenvolve sistemas sob medida, Não oferece consultoria individual"
                        value={formData.empresa_nao_faz}
                        onChange={(e) => handleFormChange('empresa_nao_faz', e.target.value)}
                        rows={2}
                        className="border border-slate-300"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 3. SOBRE O PRODUTO/SERVIÇO */}
              <div className="border border-slate-300 rounded-lg">
                <button
                  onClick={() => toggleSection('sobre_produto')}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50"
                >
                  <h3 className="font-semibold text-lg">3. SOBRE O SEU PRODUTO/SERVIÇO</h3>
                  <ChevronDown
                    className={`w-5 h-5 transition-transform ${expandedSections.sobre_produto ? 'rotate-180' : ''}`}
                  />
                </button>
                {expandedSections.sobre_produto && (
                  <div className="p-4 space-y-4 border-t bg-white">
                    <div className="space-y-2">
                      <Label htmlFor="produto_o_que_e">3.1 O que é o produto/serviço (descrição simples) *</Label>
                      <Input
                        id="produto_o_que_e"
                        placeholder="Ex: Sistema de automação comercial, Plataforma de artigos automáticos"
                        value={formData.produto_o_que_e}
                        onChange={(e) => handleFormChange('produto_o_que_e', e.target.value)}
                        className="border border-slate-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="produto_funcionalidades">3.2 Principais funcionalidades (1 por linha)</Label>
                      <Textarea
                        id="produto_funcionalidades"
                        placeholder="Ex: Emissão fiscal&#10;Controle de estoque&#10;Integração com WhatsApp"
                        value={formData.produto_funcionalidades}
                        onChange={(e) => handleFormChange('produto_funcionalidades', e.target.value)}
                        rows={4}
                        className="border border-slate-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="produto_beneficios">3.3 Principais benefícios para o cliente</Label>
                      <Textarea
                        id="produto_beneficios"
                        placeholder="Ex: Reduz tempo de operação&#10;Melhora vendas&#10;Simplifica processos"
                        value={formData.produto_beneficios}
                        onChange={(e) => handleFormChange('produto_beneficios', e.target.value)}
                        rows={3}
                        className="border border-slate-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="produto_publico">3.4 Para quem é indicado</Label>
                      <Input
                        id="produto_publico"
                        placeholder="Ex: E-commerces, Mercados, Profissionais autônomos"
                        value={formData.produto_publico}
                        onChange={(e) => handleFormChange('produto_publico', e.target.value)}
                        className="border border-slate-300"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 4. PLANOS E PREÇOS */}
              <div className="border border-slate-300 rounded-lg">
                <button
                  onClick={() => toggleSection('planos_precos')}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50"
                >
                  <h3 className="font-semibold text-lg">4. PLANOS E PREÇOS</h3>
                  <ChevronDown
                    className={`w-5 h-5 transition-transform ${expandedSections.planos_precos ? 'rotate-180' : ''}`}
                  />
                </button>
                {expandedSections.planos_precos && (
                  <div className="p-4 space-y-4 border-t bg-white">

                    {/* Plans List */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-semibold">4.1 Seus planos</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={addPlan}
                          className="gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Adicionar Plano
                        </Button>
                      </div>

                      {formData.planos.map((plan, index) => (
                        <Card key={index} className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label className="font-semibold">Plano {index + 1}</Label>
                              {formData.planos.length > 1 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removePlan(index)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label htmlFor={`plan-name-${index}`} className="text-sm">Nome</Label>
                                <Input
                                  id={`plan-name-${index}`}
                                  placeholder="Ex: Básico"
                                  value={plan.name}
                                  onChange={(e) => handlePlanChange(index, 'name', e.target.value)}
                                  className="border border-slate-300"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor={`plan-price-${index}`} className="text-sm">Preço</Label>
                                <Input
                                  id={`plan-price-${index}`}
                                  placeholder="Ex: R$ 99/mês"
                                  value={plan.price}
                                  onChange={(e) => handlePlanChange(index, 'price', e.target.value)}
                                  className="border border-slate-300"
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <Label htmlFor={`plan-includes-${index}`} className="text-sm">O que inclui</Label>
                              <Textarea
                                id={`plan-includes-${index}`}
                                placeholder="Ex: Até 100 contatos, Suporte via email"
                                value={plan.includes}
                                onChange={(e) => handlePlanChange(index, 'includes', e.target.value)}
                                rows={2}
                                className="border border-slate-300"
                              />
                            </div>

                            <div className="space-y-1">
                              <Label htmlFor={`plan-limits-${index}`} className="text-sm">Limites</Label>
                              <Input
                                id={`plan-limits-${index}`}
                                placeholder="Ex: 1000 msgs/mês"
                                value={plan.limits}
                                onChange={(e) => handlePlanChange(index, 'limits', e.target.value)}
                                className="border border-slate-300"
                              />
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label htmlFor="planos_teste_gratis">4.2 Teste grátis (se houver)</Label>
                      <Input
                        id="planos_teste_gratis"
                        placeholder="Ex: 7 dias, 5 usos, Sem teste"
                        value={formData.planos_teste_gratis}
                        onChange={(e) => handleFormChange('planos_teste_gratis', e.target.value)}
                        className="border border-slate-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="planos_pagamento">4.3 Formas de pagamento</Label>
                      <Input
                        id="planos_pagamento"
                        placeholder="Ex: Pix, Cartão, Assinatura mensal"
                        value={formData.planos_pagamento}
                        onChange={(e) => handleFormChange('planos_pagamento', e.target.value)}
                        className="border border-slate-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="planos_reembolso">4.4 Política de reembolso</Label>
                      <Input
                        id="planos_reembolso"
                        placeholder="Ex: Não há reembolso por ser SaaS pré-pago"
                        value={formData.planos_reembolso}
                        onChange={(e) => handleFormChange('planos_reembolso', e.target.value)}
                        className="border border-slate-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="planos_links">4.5 Links oficiais</Label>
                      <Textarea
                        id="planos_links"
                        placeholder="Ex: site, checkout, manual, vídeo explicativo"
                        value={formData.planos_links}
                        onChange={(e) => handleFormChange('planos_links', e.target.value)}
                        rows={2}
                        className="border border-slate-300"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 5. COMO O ATENDIMENTO DEVE FUNCIONAR */}
              <div className="border border-slate-300 rounded-lg">
                <button
                  onClick={() => toggleSection('como_funciona')}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50"
                >
                  <h3 className="font-semibold text-lg">5. COMO O ATENDIMENTO DEVE FUNCIONAR</h3>
                  <ChevronDown
                    className={`w-5 h-5 transition-transform ${expandedSections.como_funciona ? 'rotate-180' : ''}`}
                  />
                </button>
                {expandedSections.como_funciona && (
                  <div className="p-4 space-y-4 border-t bg-white">
                    <div className="space-y-2">
                      <Label htmlFor="atendimento_objetivo">5.1 Qual é o objetivo do atendimento *</Label>
                      <Input
                        id="atendimento_objetivo"
                        placeholder="Ex: Fechar vendas, Gerar reuniões, Qualificar leads, Suporte + venda leve"
                        value={formData.atendimento_objetivo}
                        onChange={(e) => handleFormChange('atendimento_objetivo', e.target.value)}
                        className="border border-slate-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="atendimento_conducao">5.2 Como o atendente deve conduzir a conversa</Label>
                      <Textarea
                        id="atendimento_conducao"
                        placeholder="Ex: Ser claro e direto. Ajudar sem parecer vendedor demais. Indicar o plano ideal quando fizer sentido."
                        value={formData.atendimento_conducao}
                        onChange={(e) => handleFormChange('atendimento_conducao', e.target.value)}
                        rows={3}
                        className="border border-slate-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="atendimento_frases_sugeridas">5.3 Frases que gostaria que o atendente usasse (opcional)</Label>
                      <Textarea
                        id="atendimento_frases_sugeridas"
                        placeholder="Ex: 'Quer que eu te envie o link do plano ideal?'&#10;'Deixa eu ver qual opção fica melhor pra você.'"
                        value={formData.atendimento_frases_sugeridas}
                        onChange={(e) => handleFormChange('atendimento_frases_sugeridas', e.target.value)}
                        rows={3}
                        className="border border-slate-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="atendimento_evitar">5.4 Perguntas ou assuntos que o atendente deve evitar</Label>
                      <Textarea
                        id="atendimento_evitar"
                        placeholder="Ex: Temas sensíveis, política, saúde, finanças pessoais"
                        value={formData.atendimento_evitar}
                        onChange={(e) => handleFormChange('atendimento_evitar', e.target.value)}
                        rows={2}
                        className="border border-slate-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="atendimento_resposta_padrao_fora_escopo">5.5 Resposta padrão para pedidos fora do escopo</Label>
                      <Textarea
                        id="atendimento_resposta_padrao_fora_escopo"
                        placeholder="Ex: 'Entendi, mas hoje não fazemos esse tipo de serviço. Posso te ajudar a escolher o melhor plano?'"
                        value={formData.atendimento_resposta_padrao_fora_escopo}
                        onChange={(e) => handleFormChange('atendimento_resposta_padrao_fora_escopo', e.target.value)}
                        rows={2}
                        className="border border-slate-300"
                      />
                    </div>
                  </div>
                )}
              </div>

              <Separator className="my-6" />

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => {
                  setCreatingNewAgent(false)
                  resetForm()
                }}>
                  Cancelar
                </Button>
                <Button onClick={async () => {
                  await addAgent()
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Agente
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Agentes</p>
                  <p className="text-2xl font-bold">{agents.length}</p>
                </div>
                <Bot className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Agentes Ativos</p>
                  <p className="text-2xl font-bold text-green-600">
                    {agents.filter(a => a.status === 'active').length}
                  </p>
                </div>
                <Play className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Usos</p>
                  <p className="text-2xl font-bold">{totalUsage}</p>
                </div>
                <Sparkles className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Em Rascunho</p>
                  <p className="text-2xl font-bold">
                    {agents.filter(a => a.status === 'draft').length}
                  </p>
                </div>
                <Loader2 className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Agents Grid */}
        {agents.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Bot className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold mb-2">Nenhum agente criado</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Crie seu primeiro agente configurando identidade, empresa, produto e atendimento
              </p>
              <Button onClick={() => {
                resetForm()
                setCreatingNewAgent(true)
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Agente
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent) => (
              <Card key={agent.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{agent.name}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {agent.data.empresa_nome}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(agent.status)}>
                      {getStatusLabel(agent.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Separator />

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleAgentStatus(agent)}
                      className="flex-1"
                    >
                      {agent.status === 'active' ? (
                        <>
                          <Pause className="w-4 h-4 mr-1" />
                          Pausar
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-1" />
                          Ativar
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(agent)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => duplicateAgent(agent)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteAgent(agent.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Agente</DialogTitle>
              <DialogDescription>
                Atualize as configurações do agente
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Similar structure to creation form but in a dialog */}
              <div className="space-y-2">
                <Label htmlFor="edit-agente_nome">Nome do atendente *</Label>
                <Input
                  id="edit-agente_nome"
                  value={formData.agente_nome}
                  onChange={(e) => handleFormChange('agente_nome', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-empresa_nome">Nome da empresa *</Label>
                <Input
                  id="edit-empresa_nome"
                  value={formData.empresa_nome}
                  onChange={(e) => handleFormChange('empresa_nome', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-atendimento_objetivo">Objetivo do atendimento *</Label>
                <Input
                  id="edit-atendimento_objetivo"
                  value={formData.atendimento_objetivo}
                  onChange={(e) => handleFormChange('atendimento_objetivo', e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={updateAgent}>
                Salvar Alterações
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
