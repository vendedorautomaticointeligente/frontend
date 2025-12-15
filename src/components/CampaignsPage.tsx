import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Textarea } from "./ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Badge } from "./ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "./ui/dialog"
import { Progress } from "./ui/progress"
import { Separator } from "./ui/separator"
import { useAuth } from "../hooks/useAuthLaravel"
import { toast } from "sonner"
import { 
  Send, 
  Plus, 
  Edit, 
  Trash2, 
  Play, 
  Pause,
  Mail,
  MessageSquare,
  BarChart3,
  Clock,
  CheckCircle,
  Eye,
  Loader2
} from "lucide-react"

interface Campaign {
  id: string
  name: string
  description: string
  status: 'scheduled' | 'running' | 'paused' | 'completed'
  targetList: string
  targetListId: string
  agent: string
  agentId: string
  channel: 'email' | 'whatsapp' | 'dm' | 'messenger'
  whatsappConnectionId?: string
  whatsappConnection?: string
  scheduledDate: string
  totalContacts: number
  sent: number
  delivered: number
  opened: number
  replied: number
  createdAt: string
}

interface ListData {
  id: string
  name: string
  totalContacts: number
}

interface AgentData {
  id: string
  name: string
  tone: string
}

interface WhatsAppConnection {
  id: string
  name: string
  phoneNumber: string
  status: 'connected' | 'disconnected'
}

export function CampaignsPage() {
  const { accessToken } = useAuth()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewCampaignDialog, setShowNewCampaignDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  
  // Available data for selection
  const [availableLists, setAvailableLists] = useState<ListData[]>([])
  const [availableAgents, setAvailableAgents] = useState<AgentData[]>([])
  const [whatsappConnections, setWhatsappConnections] = useState<WhatsAppConnection[]>([])
  
  // Form fields
  const [campaignName, setCampaignName] = useState("")
  const [campaignDescription, setCampaignDescription] = useState("")
  const [selectedList, setSelectedList] = useState("")
  const [selectedAgent, setSelectedAgent] = useState("")
  const [selectedWhatsappConnection, setSelectedWhatsappConnection] = useState("")
  const [selectedChannel, setSelectedChannel] = useState<'email' | 'whatsapp' | 'dm' | 'messenger'>('email')
  const [scheduleType, setScheduleType] = useState<'scheduled' | 'immediate'>('scheduled')
  const [scheduledDate, setScheduledDate] = useState("")
  const [campaignMessage, setCampaignMessage] = useState("")

  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8002/api'
  
  const getHeaders = (includeContentType = false) => ({
    'Authorization': `Bearer ${accessToken}`,
    ...(includeContentType && { 'Content-Type': 'application/json' })
  })

  useEffect(() => {
    loadCampaigns()
    loadAvailableData()
  }, [])

  const loadCampaigns = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${baseUrl}/campaigns`, {
        headers: getHeaders()
      })

      if (response.ok) {
        const data = await response.json()
        setCampaigns(data.campaigns || [])
      }
    } catch (error) {
      console.error('Error loading campaigns:', error)
      toast.error('Erro ao carregar campanhas')
    } finally {
      setLoading(false)
    }
  }

  const loadAvailableData = async () => {
    try {
      const listResponse = await fetch(`${baseUrl}/lists`, {
        headers: getHeaders()
      })
      const agentResponse = await fetch(`${baseUrl}/agents`, {
        headers: getHeaders()
      })
      const whatsappResponse = await fetch(`${baseUrl}/whatsapp-connections`, {
        headers: getHeaders()
      })

      if (listResponse.ok) {
        const listData = await listResponse.json()
        console.log('📋 Listas carregadas:', listData)
        setAvailableLists(listData.lists || [])
      } else {
        console.error('Erro ao carregar listas:', await listResponse.text())
      }
      
      if (agentResponse.ok) {
        const agentData = await agentResponse.json()
        console.log('🤖 Agentes carregados:', agentData)
        setAvailableAgents(agentData.agents || [])
      } else {
        console.error('Erro ao carregar agentes:', await agentResponse.text())
      }
      
      if (whatsappResponse.ok) {
        const whatsappData = await whatsappResponse.json()
        console.log('📱 Conexões WhatsApp carregadas:', whatsappData)
        setWhatsappConnections(whatsappData.connections || [])
      } else {
        console.error('Erro ao carregar conexões WhatsApp:', await whatsappResponse.text())
      }
    } catch (error) {
      console.error('Error loading available data:', error)
      toast.error('Erro ao carregar dados disponíveis')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-500'
      case 'running': return 'bg-green-500'
      case 'paused': return 'bg-yellow-500'
      case 'completed': return 'bg-gray-500'
      default: return 'bg-gray-400'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'scheduled': return 'Agendada'
      case 'running': return 'Em Execução'
      case 'paused': return 'Pausada'
      case 'completed': return 'Concluída'
      default: return status
    }
  }

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email': return Mail
      case 'whatsapp': return MessageSquare
      case 'dm': return Send
      case 'messenger': return Send
      default: return Send
    }
  }

  const addCampaign = async () => {
    if (!campaignName) {
      toast.error('Preencha o nome da campanha')
      return
    }
    
    if (!campaignMessage) {
      toast.error('Preencha a mensagem da campanha')
      return
    }

    try {
      const response = await fetch(`${baseUrl}/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          name: campaignName,
          description: campaignDescription,
          message: campaignMessage,
          targetList: selectedList,
          agent: selectedAgent,
          channel: selectedChannel,
          schedule: scheduleType,
          scheduledDate: scheduleType === 'scheduled' ? scheduledDate : null,
          status: 'draft',
          whatsappConnectionId: selectedChannel === 'whatsapp' ? selectedWhatsappConnection : undefined
        })
      })

      if (response.ok) {
        await loadCampaigns()
        setShowNewCampaignDialog(false)
        resetForm()
        toast.success('Campanha criada!')
      } else {
        toast.error('Erro ao criar campanha')
      }
    } catch (error) {
      console.error('Error creating campaign:', error)
      toast.error('Erro ao criar campanha')
    }
  }

  const deleteCampaign = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta campanha?')) return

    try {
      const response = await fetch(`${baseUrl}/campaigns/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (response.ok) {
        await loadCampaigns()
        toast.success('Campanha excluída!')
      } else {
        toast.error('Erro ao excluir campanha')
      }
    } catch (error) {
      console.error('Error deleting campaign:', error)
      toast.error('Erro ao excluir campanha')
    }
  }

  const toggleCampaignStatus = async (campaign: Campaign) => {
    const newStatus = campaign.status === 'active' ? 'paused' : 'active'
    
    try {
      const response = await fetch(`${baseUrl}/campaigns/${campaign.id}`, {
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
        await loadCampaigns()
        toast.success(`Campanha ${newStatus === 'active' ? 'ativada' : 'pausada'}!`)
      } else {
        toast.error('Erro ao atualizar status')
      }
    } catch (error) {
      console.error('Error updating campaign status:', error)
      toast.error('Erro ao atualizar status')
    }
  }

  const resetForm = () => {
    setCampaignName("")
    setCampaignDescription("")
    setSelectedList("")
    setSelectedAgent("")
    setScheduledDate("")
    setCampaignMessage("")
    setSelectedWhatsappConnection("")
    setSelectedCampaign(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const totalSent = campaigns.reduce((sum, c) => sum + c.sent, 0)
  const totalDelivered = campaigns.reduce((sum, c) => sum + c.delivered, 0)
  const totalReplies = campaigns.reduce((sum, c) => sum + c.replied, 0)

  return (
    <div className="h-full overflow-auto bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl">Campanhas</h1>
            <p className="text-muted-foreground">
              Gerencie seus disparos em massa
            </p>
          </div>
          
          <Dialog open={showNewCampaignDialog} onOpenChange={setShowNewCampaignDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Campanha
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Criar Nova Campanha</DialogTitle>
                <DialogDescription>
                  Configure sua campanha de disparos
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Campanha *</Label>
                  <Input
                    id="name"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="Ex: Prospecção Q1 2024"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={campaignDescription}
                    onChange={(e) => setCampaignDescription(e.target.value)}
                    placeholder="Descreva o objetivo desta campanha..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="list">Lista de Contatos</Label>
                  <Select value={selectedList} onValueChange={(v) => setSelectedList(v)}>
                    <SelectTrigger id="list">
                      <SelectValue placeholder="Selecione uma lista" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableLists.length === 0 ? (
                        <SelectItem value="no-lists" disabled>
                          Nenhuma lista disponível - Crie uma lista primeiro
                        </SelectItem>
                      ) : (
                        availableLists.map(list => (
                          <SelectItem key={list.id} value={list.id}>
                            {list.name} ({list.totalContacts} contatos)
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="agent">Agente de Abordagem</Label>
                  <Select value={selectedAgent} onValueChange={(v) => setSelectedAgent(v)}>
                    <SelectTrigger id="agent">
                      <SelectValue placeholder="Selecione um agente" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableAgents.length === 0 ? (
                        <SelectItem value="no-agents" disabled>
                          Nenhum agente disponível - Crie um agente primeiro
                        </SelectItem>
                      ) : (
                        availableAgents.map(agent => (
                          <SelectItem key={agent.id} value={agent.id}>
                            {agent.name} ({agent.tone})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="channel">Canal de Envio</Label>
                  <Select value={selectedChannel} onValueChange={(v) => setSelectedChannel(v as any)}>
                    <SelectTrigger id="channel">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="dm">DM</SelectItem>
                      <SelectItem value="messenger">Messenger</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {selectedChannel === 'whatsapp' && (
                  <div className="space-y-2">
                    <Label htmlFor="whatsappConnection">Conexão WhatsApp</Label>
                    <Select value={selectedWhatsappConnection} onValueChange={(v) => setSelectedWhatsappConnection(v)}>
                      <SelectTrigger id="whatsappConnection">
                        <SelectValue placeholder="Selecione uma conexão" />
                      </SelectTrigger>
                      <SelectContent>
                        {whatsappConnections.map(connection => (
                          <SelectItem key={connection.id} value={connection.id}>
                            {connection.name} ({connection.phoneNumber})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="message">Mensagem *</Label>
                  <Textarea
                    id="message"
                    value={campaignMessage}
                    onChange={(e) => setCampaignMessage(e.target.value)}
                    placeholder="Escreva a mensagem que será enviada..."
                    rows={5}
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                    <p className="text-xs text-muted-foreground w-full mb-1">
                      Variáveis disponíveis (clique para inserir):
                    </p>
                    {[
                      { label: 'Nome', value: '{nome}' },
                      { label: 'Empresa', value: '{empresa}' },
                      { label: 'Cargo', value: '{cargo}' },
                      { label: 'Email', value: '{email}' },
                      { label: 'Telefone', value: '{telefone}' },
                      { label: 'Cidade', value: '{cidade}' },
                      { label: 'Estado', value: '{estado}' }
                    ].map((variable) => (
                      <Button
                        key={variable.value}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => {
                          const textarea = document.getElementById('message') as HTMLTextAreaElement
                          const cursorPos = textarea.selectionStart
                          const textBefore = campaignMessage.substring(0, cursorPos)
                          const textAfter = campaignMessage.substring(cursorPos)
                          setCampaignMessage(textBefore + variable.value + textAfter)
                          
                          // Reposiciona o cursor
                          setTimeout(() => {
                            textarea.focus()
                            textarea.setSelectionRange(
                              cursorPos + variable.value.length,
                              cursorPos + variable.value.length
                            )
                          }, 0)
                        }}
                      >
                        {variable.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scheduleType">Agendamento</Label>
                  <Select value={scheduleType} onValueChange={(v) => setScheduleType(v as any)}>
                    <SelectTrigger id="scheduleType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Agendada</SelectItem>
                      <SelectItem value="immediate">Imediata</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {scheduleType === 'scheduled' && (
                  <div className="space-y-2">
                    <Label htmlFor="scheduled">Data/Hora Agendada</Label>
                    <Input
                      id="scheduled"
                      type="datetime-local"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowNewCampaignDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={addCampaign}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Campanha
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Campanhas</p>
                  <p className="text-2xl font-bold">{campaigns.length}</p>
                </div>
                <Send className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Mensagens Enviadas</p>
                  <p className="text-2xl font-bold">{totalSent}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Entregues</p>
                  <p className="text-2xl font-bold">{totalDelivered}</p>
                </div>
                <Eye className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Respostas</p>
                  <p className="text-2xl font-bold text-green-600">{totalReplies}</p>
                </div>
                <MessageSquare className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Campaigns List */}
        {campaigns.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Send className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold mb-2">Nenhuma campanha criada</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Crie sua primeira campanha para começar a enviar mensagens
              </p>
              <Button onClick={() => setShowNewCampaignDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeira Campanha
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {campaigns.map((campaign) => {
              const ChannelIcon = getChannelIcon(campaign.channel)
              const progress = campaign.totalContacts > 0 
                ? (campaign.sent / campaign.totalContacts) * 100 
                : 0

              return (
                <Card key={campaign.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle>{campaign.name}</CardTitle>
                          <Badge className={getStatusColor(campaign.status)}>
                            {getStatusLabel(campaign.status)}
                          </Badge>
                          <Badge variant="outline">
                            <ChannelIcon className="w-3 h-3 mr-1" />
                            {campaign.channel.toUpperCase()}
                          </Badge>
                        </div>
                        <CardDescription>{campaign.description}</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleCampaignStatus(campaign)}
                          disabled={campaign.status === 'completed'}
                        >
                          {campaign.status === 'running' ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteCampaign(campaign.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Progresso</span>
                        <span className="font-medium">
                          {campaign.sent} / {campaign.totalContacts}
                        </span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>

                    <div className="grid grid-cols-4 gap-4 text-center text-sm">
                      <div>
                        <p className="text-muted-foreground">Enviadas</p>
                        <p className="font-bold text-lg">{campaign.sent}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Entregues</p>
                        <p className="font-bold text-lg text-blue-600">{campaign.delivered}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Abertas</p>
                        <p className="font-bold text-lg text-purple-600">{campaign.opened}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Respostas</p>
                        <p className="font-bold text-lg text-green-600">{campaign.replied}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}