import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { Progress } from "./ui/progress"
import { useAuth } from "../hooks/useAuthLaravel"
import { toast } from "sonner"
import { 
  Send, 
  Plus, 
  Trash2, 
  Play, 
  Pause,
  Mail,
  MessageSquare,
  CheckCircle,
  Eye,
  Loader2,
  Edit,
  BarChart3
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
  // Novos campos para processamento ativo
  is_active?: boolean
  processing_status?: {
    current: number
    total: number
    success: number
    failed: number
    status: string
  }
  start_time?: string
  end_time?: string
  message?: string
}


interface CampaignsPageProps {
  onCreateCampaign?: () => void
  onEditCampaign?: () => void
  onViewStats?: (campaignId: string) => void
}

export function CampaignsPage({ onCreateCampaign, onEditCampaign, onViewStats }: CampaignsPageProps = {}) {
  const { accessToken } = useAuth()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
  
  const getHeaders = (includeContentType = false) => ({
    'Authorization': `Bearer ${accessToken}`,
    ...(includeContentType && { 'Content-Type': 'application/json' })
  })

  useEffect(() => {
    loadCampaigns()
  }, [])

  // Polling para campanhas ativas
  useEffect(() => {
    const activeCampaigns = campaigns.filter(c => c.is_active)
    if (activeCampaigns.length === 0) return

    const interval = setInterval(() => {
      loadCampaigns() // Recarrega todas as campanhas para atualizar status
    }, 10000) // A cada 10 segundos

    return () => clearInterval(interval)
  }, [campaigns.filter(c => c.is_active).length])

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-500'
      case 'running': return 'bg-blue-500'
      case 'completed': return 'bg-green-500'
      case 'paused': return 'bg-gray-500'
      case 'scheduled': return 'bg-blue-500'
      case 'draft': return 'bg-gray-500'
      default: return 'bg-gray-400'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Ativa'
      case 'scheduled': return 'Agendada'
      case 'running': return 'Em Execução'
      case 'paused': return 'Pausada'
      case 'draft': return 'Rascunho'
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

  const editCampaign = (campaign: any) => {
    // Store campaign data in localStorage for editing
    localStorage.setItem('editCampaignData', JSON.stringify(campaign))
    // Navigate to create page using the provided callback
    if (onEditCampaign) {
      onEditCampaign()
    } else {
      // Fallback if no callback provided
      window.location.href = '/campaigns/create'
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

  const viewStats = (campaignId: string) => {
    if (onViewStats) {
      onViewStats(campaignId)
    }
  }

  const startCampaign = async (campaignId: string) => {
    try {
      const response = await fetch(`${baseUrl}/campaigns/${campaignId}/start`, {
        method: 'POST',
        headers: getHeaders(true)
      })

      if (response.ok) {
        await loadCampaigns()
        toast.success('Campanha iniciada!')
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erro ao iniciar campanha')
      }
    } catch (error) {
      console.error('Error starting campaign:', error)
      toast.error('Erro ao iniciar campanha')
    }
  }


  const stopCampaign = async (campaignId: string) => {
    try {
      const response = await fetch(`${baseUrl}/campaigns/${campaignId}/stop`, {
        method: 'POST',
        headers: getHeaders(true)
      })

      if (response.ok) {
        await loadCampaigns()
        toast.success('Campanha parada!')
      } else {
        toast.error('Erro ao parar campanha')
      }
    } catch (error) {
      console.error('Error stopping campaign:', error)
      toast.error('Erro ao parar campanha')
    }
  }

  const pauseCampaign = async (campaignId: string) => {
    try {
      console.log('🔸 Pausando campanha:', campaignId)
      const response = await fetch(`${baseUrl}/campaigns/${campaignId}/pause`, {
        method: 'POST',
        headers: getHeaders(true)
      })

      console.log('🔸 Response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Campanha pausada com sucesso:', data)
        await loadCampaigns()
        toast.success('Campanha pausada!')
      } else {
        const error = await response.json()
        console.error('❌ Erro ao pausar:', error)
        toast.error(error.message || 'Erro ao pausar campanha')
      }
    } catch (error) {
      console.error('Error pausing campaign:', error)
      toast.error('Erro ao pausar campanha')
    }
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
          
          <Button onClick={onCreateCampaign}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Campanha
          </Button>
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
              <Button onClick={onCreateCampaign}>
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
                ? Math.min((campaign.sent / campaign.totalContacts) * 100, 100) 
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
                        {!campaign.is_active && campaign.status !== 'completed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startCampaign(campaign.id)}
                            className="text-green-600"
                          >
                            <Play className="w-4 h-4 mr-1" />
                            Iniciar
                          </Button>
                        )}
                        {campaign.is_active && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => pauseCampaign(campaign.id)}
                            className="text-yellow-600"
                          >
                            <Pause className="w-4 h-4 mr-1" />
                            Pausar
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => editCampaign(campaign)}
                          className="text-blue-600"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewStats(campaign.id)}
                          className="text-purple-600"
                        >
                          <BarChart3 className="w-4 h-4 mr-1" />
                          Estatísticas
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
                    {/* Status de processamento ativo */}
                    {campaign.is_active && campaign.processing_status && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-blue-800">
                            📊 {campaign.processing_status.current}/{campaign.processing_status.total} 
                            ({campaign.processing_status.total > 0 ? Math.round((campaign.processing_status.current / campaign.processing_status.total) * 100) : 0}%)
                          </span>
                          <Badge variant="outline" className="text-blue-700">
                            {campaign.processing_status.status}
                          </Badge>
                        </div>
                        <div className="flex gap-4 text-xs text-blue-700">
                          <span>✅ {campaign.processing_status.success} Sucessos</span>
                          <span>❌ {campaign.processing_status.failed} Falhas</span>
                        </div>
                      </div>
                    )}

                    {/* Horário de funcionamento */}
                    {campaign.start_time && campaign.end_time && (
                      <div className="text-xs text-muted-foreground">
                        🕐 Funcionamento: {campaign.start_time} - {campaign.end_time}
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Progresso</span>
                        <span className="font-medium">
                          {campaign.processing_status ? campaign.processing_status.current : campaign.sent} / {campaign.totalContacts}
                        </span>
                      </div>
                      <Progress 
                        value={
                          campaign.processing_status && campaign.processing_status.total > 0 
                            ? Math.min((campaign.processing_status.current / campaign.processing_status.total) * 100, 100)
                            : (campaign.totalContacts > 0 ? Math.min((campaign.sent / campaign.totalContacts) * 100, 100) : 0)
                        } 
                        className="h-2" 
                      />
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