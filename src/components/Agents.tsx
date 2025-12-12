import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Textarea } from "./ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Badge } from "./ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "./ui/dialog"
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
  Briefcase,
  Headphones,
  HelpCircle,
  LifeBuoy,
  Sparkles,
  Copy,
  Loader2
} from "lucide-react"

interface Agent {
  id: string
  name: string
  description: string
  approachStyle: 'commercial' | 'service' | 'faq' | 'support'
  tone: string
  template: string
  greeting: string
  status: 'active' | 'paused' | 'draft'
  usageCount: number
  createdAt: string
}

export function Agents() {
  const { accessToken } = useAuth()
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)

  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8002/api'
  
  const getHeaders = (includeContentType = false) => ({
    'Authorization': `Bearer ${accessToken}`,
    ...(includeContentType && { 'Content-Type': 'application/json' })
  })
  const [showNewAgentDialog, setShowNewAgentDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  
  // Form fields
  const [agentName, setAgentName] = useState("")
  const [agentDescription, setAgentDescription] = useState("")
  const [approachStyle, setApproachStyle] = useState<'commercial' | 'service' | 'faq' | 'support'>('commercial')
  const [tone, setTone] = useState("")
  const [template, setTemplate] = useState("")
  const [greeting, setGreeting] = useState("")

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

  const approachStyles = [
    { 
      value: 'commercial', 
      label: 'Comercial',
      description: 'Abordagem direta focada em vendas',
      icon: Briefcase,
      color: 'blue'
    },
    { 
      value: 'service', 
      label: 'Atendimento',
      description: 'Consultivo e focado em relacionamento',
      icon: Headphones,
      color: 'green'
    },
    { 
      value: 'faq', 
      label: 'FAQ',
      description: 'Informativo e educativo',
      icon: HelpCircle,
      color: 'purple'
    },
    { 
      value: 'support', 
      label: 'Suporte',
      description: 'Resolução de problemas técnicos',
      icon: LifeBuoy,
      color: 'orange'
    }
  ]

  const getApproachInfo = (style: string) => {
    return approachStyles.find(s => s.value === style) || approachStyles[0]
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

  const addAgent = async () => {
    if (!agentName) {
      toast.error('Preencha o nome do agente')
      return
    }

    try {
      const response = await fetch(`${baseUrl}/agents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          name: agentName,
          description: agentDescription,
          approachStyle,
          tone,
          template,
          greeting,
          status: 'draft'
        })
      })

      if (response.ok) {
        await loadAgents()
        setShowNewAgentDialog(false)
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

  const openEditDialog = (agent: Agent) => {
    setSelectedAgent(agent)
    setAgentName(agent.name)
    setAgentDescription(agent.description)
    setApproachStyle(agent.approachStyle)
    setTone(agent.tone)
    setTemplate(agent.template)
    setGreeting(agent.greeting)
    setShowEditDialog(true)
  }

  const updateAgent = async () => {
    if (!selectedAgent) return

    try {
      const response = await fetch(`${baseUrl}/agents/${selectedAgent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          name: agentName,
          description: agentDescription,
          approachStyle,
          tone,
          template,
          greeting
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

  const resetForm = () => {
    setAgentName("")
    setAgentDescription("")
    setTone("")
    setTemplate("")
    setGreeting("")
    setSelectedAgent(null)
  }

  const duplicateAgent = async (agent: Agent) => {
    try {
      const response = await fetch(`${baseUrl}/agents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          name: `${agent.name} (Cópia)`,
          description: agent.description,
          approachStyle: agent.approachStyle,
          tone: agent.tone,
          template: agent.template,
          greeting: agent.greeting,
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
            <h1 className="text-2xl sm:text-3xl mb-1 sm:mb-2">Agentes de Abordagem</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Configure diferentes estilos de comunicação para suas campanhas
            </p>
          </div>
          
          <Dialog open={showNewAgentDialog} onOpenChange={setShowNewAgentDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={() => resetForm()}>
                <Plus className="w-4 h-4" />
                Novo Agente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Criar Novo Agente de Abordagem</DialogTitle>
                <DialogDescription>
                  Configure um estilo de comunicação personalizado
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="agent-name">Nome do Agente *</Label>
                  <Input
                    id="agent-name"
                    placeholder="Ex: Agente Comercial Agressivo"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="agent-description">Descrição</Label>
                  <Input
                    id="agent-description"
                    placeholder="Descreva o propósito deste agente"
                    value={agentDescription}
                    onChange={(e) => setAgentDescription(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Estilo de Abordagem *</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {approachStyles.map((style) => {
                      const StyleIcon = style.icon
                      return (
                        <Card 
                          key={style.value}
                          className={`cursor-pointer transition-all ${
                            approachStyle === style.value 
                              ? 'border-primary border-2 bg-primary/5' 
                              : 'hover:border-primary/50'
                          }`}
                          onClick={() => setApproachStyle(style.value as any)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className={`p-2 bg-${style.color}-100 rounded-lg`}>
                                <StyleIcon className={`w-5 h-5 text-${style.color}-600`} />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold">{style.label}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {style.description}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tone">Tom de Voz</Label>
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger id="tone">
                      <SelectValue placeholder="Selecione o tom de voz" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="formal">Formal</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="amigavel">Amigável</SelectItem>
                      <SelectItem value="profissional">Profissional</SelectItem>
                      <SelectItem value="entusiasmado">Entusiasmado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="greeting">Saudação Inicial</Label>
                  <Textarea
                    id="greeting"
                    placeholder="Olá! Sou da equipe [sua empresa] e gostaria de apresentar..."
                    value={greeting}
                    onChange={(e) => setGreeting(e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template">Template de Mensagem</Label>
                  <Textarea
                    id="template"
                    placeholder="Digite o template da mensagem que o agente enviará..."
                    value={template}
                    onChange={(e) => setTemplate(e.target.value)}
                    rows={5}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use variáveis como {'{{nome}}'}, {'{{empresa}}'}, {'{{produto}}'}, etc.
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowNewAgentDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={addAgent}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Agente
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

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
                  <p className="text-sm text-muted-foreground">Estilos</p>
                  <p className="text-2xl font-bold">{approachStyles.length}</p>
                </div>
                <Briefcase className="w-8 h-8 text-orange-500" />
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
                Crie seu primeiro agente de abordagem para começar
              </p>
              <Button onClick={() => setShowNewAgentDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Agente
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent) => {
              const styleInfo = getApproachInfo(agent.approachStyle)
              const StyleIcon = styleInfo.icon

              return (
                <Card key={agent.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`p-2 bg-${styleInfo.color}-100 rounded-lg flex-shrink-0`}>
                          <StyleIcon className={`w-5 h-5 text-${styleInfo.color}-600`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg truncate">{agent.name}</CardTitle>
                          <CardDescription className="line-clamp-2">
                            {agent.description || styleInfo.description}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge className={getStatusColor(agent.status)}>
                        {getStatusLabel(agent.status)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Separator />
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Estilo:</span>
                        <span className="font-medium">{styleInfo.label}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Tom:</span>
                        <span className="font-medium capitalize">{agent.tone || 'Não definido'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Usos:</span>
                        <Badge variant="secondary">{agent.usageCount}</Badge>
                      </div>
                    </div>

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
              )
            })}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Agente</DialogTitle>
              <DialogDescription>
                Atualize as configurações do agente
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nome do Agente</Label>
                <Input
                  id="edit-name"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Descrição</Label>
                <Input
                  id="edit-description"
                  value={agentDescription}
                  onChange={(e) => setAgentDescription(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Estilo de Abordagem</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {approachStyles.map((style) => {
                    const StyleIcon = style.icon
                    return (
                      <Card 
                        key={style.value}
                        className={`cursor-pointer transition-all ${
                          approachStyle === style.value 
                            ? 'border-primary border-2 bg-primary/5' 
                            : 'hover:border-primary/50'
                        }`}
                        onClick={() => setApproachStyle(style.value as any)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 bg-${style.color}-100 rounded-lg`}>
                              <StyleIcon className={`w-5 h-5 text-${style.color}-600`} />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold">{style.label}</h4>
                              <p className="text-sm text-muted-foreground">
                                {style.description}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-tone">Tom de Voz</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger id="edit-tone">
                    <SelectValue placeholder="Selecione o tom de voz" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="formal">Formal</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="amigavel">Amigável</SelectItem>
                    <SelectItem value="profissional">Profissional</SelectItem>
                    <SelectItem value="entusiasmado">Entusiasmado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-greeting">Saudação Inicial</Label>
                <Textarea
                  id="edit-greeting"
                  value={greeting}
                  onChange={(e) => setGreeting(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-template">Template de Mensagem</Label>
                <Textarea
                  id="edit-template"
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  rows={5}
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