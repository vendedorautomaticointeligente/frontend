import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { Progress } from "../ui/progress"
import { useAuth } from "../../hooks/useAuthLaravel"
import { toast } from "sonner"
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  Download,
  Filter,
  Calendar,
  Users,
  Target,
  Zap,
  RefreshCw
} from "lucide-react"
import { StatsOverview } from "./StatsOverview"
import { SuccessFailureChart } from "./SuccessFailureChart"
import { TimelineChart } from "./TimelineChart"
import { DetailedLogsTable } from "./DetailedLogsTable"
import { ErrorBreakdown } from "./ErrorBreakdown"

interface CampaignStats {
  campaign: {
    id: string
    name: string
    status: string
    total_contacts: number
    created_at: string
  }
  summary: {
    total_processed: number
    successful: number
    failed: number
    success_rate: number
    response_rate: number
    avg_response_time: number | null
  }
  status_breakdown: Record<string, number>
  error_breakdown: Record<string, number>
  timeline: Record<string, Record<string, number>>
  performance: {
    total_sent: number
    total_delivered: number
    total_replied: number
    processing_status: any
  }
}

interface CampaignLog {
  id: string
  campaign_id: string
  contact_id: string
  contact_name: string
  contact_phone: string
  status: 'sent' | 'delivered' | 'failed' | 'opened' | 'replied' | 'queued'
  error_message: string | null
  error_category: string | null
  sent_at: string
  delivered_at: string | null
  opened_at: string | null
  replied_at: string | null
  response_time: number | null
  metadata: Record<string, any>
}

interface CampaignStatsPageProps {
  campaignId: string
  onBack: () => void
}

export function CampaignStatsPage({ campaignId, onBack }: CampaignStatsPageProps) {
  const { accessToken } = useAuth()
  const [stats, setStats] = useState<CampaignStats | null>(null)
  const [logs, setLogs] = useState<CampaignLog[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'logs' | 'errors'>('overview')
  const [timelinePeriod, setTimelinePeriod] = useState<'1h' | '24h' | '7d' | '30d'>('24h')

  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

  const getHeaders = (includeContentType = false) => ({
    'Authorization': `Bearer ${accessToken}`,
    ...(includeContentType && { 'Content-Type': 'application/json' })
  })

  useEffect(() => {
    if (campaignId) {
      loadStats()
    }
  }, [campaignId])

  useEffect(() => {
    if (activeTab === 'logs' && campaignId && logs.length === 0) {
      loadLogs()
    }
  }, [activeTab, campaignId])

  const loadStats = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${baseUrl}/campaigns/${campaignId}/stats`, {
        headers: getHeaders()
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Stats loaded:', data)
        setStats(data)
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Stats error response:', errorData)
        toast.error(errorData.error || 'Erro ao carregar estatísticas')
      }
    } catch (error) {
      console.error('Error loading stats:', error)
      toast.error('Erro ao carregar estatísticas: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    setStats(null)
    try {
      const response = await fetch(`${baseUrl}/campaigns/${campaignId}/stats`, {
        headers: getHeaders()
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data)
        toast.success('Estatísticas atualizadas!')
      } else {
        toast.error('Erro ao atualizar estatísticas')
      }
    } catch (error) {
      console.error('Error refreshing stats:', error)
      toast.error('Erro ao atualizar estatísticas')
    } finally {
      setRefreshing(false)
    }
  }

  const loadLogs = async () => {
    try {
      setLoadingLogs(true)
      const response = await fetch(`${baseUrl}/campaigns/${campaignId}/stats/logs`, {
        headers: getHeaders()
      })

      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs || [])
      } else {
        const errorData = await response.json().catch(() => ({}))
        toast.error(errorData.error || 'Erro ao carregar logs detalhados')
      }
    } catch (error) {
      console.error('Error loading logs:', error)
      toast.error('Erro ao carregar logs detalhados: ' + (error as Error).message)
    } finally {
      setLoadingLogs(false)
    }
  }

  const exportLogs = async () => {
    try {
      const response = await fetch(`${baseUrl}/campaigns/${campaignId}/stats/export`, {
        headers: getHeaders()
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `campaign_${campaignId}_logs.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success('Logs exportados com sucesso!')
      } else {
        toast.error('Erro ao exportar logs')
      }
    } catch (error) {
      console.error('Error exporting logs:', error)
      toast.error('Erro ao exportar logs')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500'
      case 'active': return 'bg-blue-500'
      case 'running': return 'bg-blue-500'
      case 'paused': return 'bg-gray-500'
      case 'scheduled': return 'bg-gray-500'
      default: return 'bg-gray-400'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Concluída'
      case 'running': return 'Em Execução'
      case 'paused': return 'Pausada'
      case 'scheduled': return 'Agendada'
      default: return status
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 animate-pulse text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando estatísticas...</p>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <p className="text-muted-foreground">Erro ao carregar estatísticas</p>
          <Button onClick={onBack} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={onBack}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">{stats.campaign.name}</h1>
              <p className="text-muted-foreground">
                Estatísticas detalhadas da campanha
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(stats.campaign.status)}>
              {getStatusLabel(stats.campaign.status)}
            </Badge>
            <Button 
              onClick={handleRefresh} 
              variant="outline" 
              size="sm"
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Atualizando...' : 'Atualizar'}
            </Button>
            <Button onClick={exportLogs} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </div>

        {/* Campaign Info */}
        <Card>
          <CardContent className="p-6 space-y-4">
            {/* Status da Pausa */}
            {!stats.campaign.is_active && stats.campaign.paused_at && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-yellow-800">📋 Campanha Pausada</p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Parada em: {new Date(stats.campaign.paused_at).toLocaleString('pt-BR')}
                    </p>
                    {stats.campaign.paused_at_contact_index !== null && (
                      <p className="text-xs text-yellow-700">
                        Parada no contato #{stats.campaign.paused_at_contact_index + 1}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground font-medium">Total de Contatos</p>
                  <Users className="w-5 h-5 text-blue-500" />
                </div>
                <p className="text-3xl font-bold text-blue-700">{stats.campaign.total_contacts}</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground font-medium">Taxa de Sucesso</p>
                  <Target className="w-5 h-5 text-green-500" />
                </div>
                <p className="text-3xl font-bold text-green-700">{stats.summary.success_rate}%</p>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground font-medium">Taxa de Respostas</p>
                  <MessageSquare className="w-5 h-5 text-purple-500" />
                </div>
                <p className="text-3xl font-bold text-purple-700">{stats.summary.response_rate}%</p>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground font-medium">Tempo Médio Resp.</p>
                  <Clock className="w-5 h-5 text-orange-500" />
                </div>
                <p className="text-3xl font-bold text-orange-700">
                  {stats.summary.avg_response_time ? `${stats.summary.avg_response_time}s` : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b">
          {[
            { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
            { id: 'timeline', label: 'Timeline', icon: TrendingUp },
            { id: 'logs', label: 'Logs Detalhados', icon: MessageSquare },
            { id: 'errors', label: 'Análise de Erros', icon: XCircle }
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab(tab.id as any)}
                className="gap-2"
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </Button>
            )
          })}
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <StatsOverview stats={stats} />
              <SuccessFailureChart stats={stats} />
            </div>
          )}

          {activeTab === 'timeline' && (
            <TimelineChart stats={stats} />
          )}

          {activeTab === 'logs' && (
            <DetailedLogsTable logs={logs} onExport={exportLogs} />
          )}

          {activeTab === 'errors' && (
            <ErrorBreakdown stats={stats} />
          )}
        </div>
      </div>
    </div>
  )
}