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
  Zap
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
        setStats(data)
      } else {
        toast.error('Erro ao carregar estatísticas')
      }
    } catch (error) {
      console.error('Error loading stats:', error)
      toast.error('Erro ao carregar estatísticas')
    } finally {
      setLoading(false)
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
        toast.error('Erro ao carregar logs detalhados')
      }
    } catch (error) {
      console.error('Error loading logs:', error)
      toast.error('Erro ao carregar logs detalhados')
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
      case 'running': return 'bg-blue-500'
      case 'paused': return 'bg-yellow-500'
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
            <Button onClick={exportLogs} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </div>

        {/* Campaign Info */}
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Total de Contatos</p>
                  <p className="text-2xl font-bold">{stats.campaign.total_contacts}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Target className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Taxa de Sucesso</p>
                  <p className="text-2xl font-bold text-green-600">{stats.summary.success_rate}%</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Respostas</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.summary.response_rate}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-orange-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Tempo Médio</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {stats.summary.avg_response_time ? `${stats.summary.avg_response_time}ms` : 'N/A'}
                  </p>
                </div>
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