import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Progress } from "../ui/progress"
import { CheckCircle, XCircle, Clock, TrendingUp } from "lucide-react"

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

interface StatsOverviewProps {
  stats: CampaignStats
}

export function StatsOverview({ stats }: StatsOverviewProps) {
  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return "bg-green-500"
    if (percentage >= 60) return "bg-yellow-500"
    return "bg-red-500"
  }

  return (
    <div className="space-y-6">
      {/* Métricas Principais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Performance Geral
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progresso da Campanha</span>
              <span className="font-medium">
                {stats.summary.total_processed} / {stats.campaign.total_contacts}
              </span>
            </div>
            <Progress
              value={(stats.summary.total_processed / stats.campaign.total_contacts) * 100}
              className="h-3"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-green-600">{stats.summary.successful}</p>
              <p className="text-xs text-green-700">Sucessos</p>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <XCircle className="w-6 h-6 text-red-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-red-600">{stats.summary.failed}</p>
              <p className="text-xs text-red-700">Falhas</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Status dos Envios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(stats.status_breakdown).map(([status, count]) => {
              const percentage = stats.summary.total_processed > 0
                ? (count / stats.summary.total_processed) * 100
                : 0

              const getStatusInfo = (status: string) => {
                switch (status) {
                  case 'sent':
                    return { label: 'Enviado', color: 'bg-blue-500', textColor: 'text-blue-700' }
                  case 'delivered':
                    return { label: 'Entregue', color: 'bg-green-500', textColor: 'text-green-700' }
                  case 'failed':
                    return { label: 'Falhou', color: 'bg-red-500', textColor: 'text-red-700' }
                  case 'opened':
                    return { label: 'Aberto', color: 'bg-purple-500', textColor: 'text-purple-700' }
                  case 'replied':
                    return { label: 'Respondeu', color: 'bg-orange-500', textColor: 'text-orange-700' }
                  case 'queued':
                    return { label: 'Na Fila', color: 'bg-gray-500', textColor: 'text-gray-700' }
                  default:
                    return { label: status, color: 'bg-gray-400', textColor: 'text-gray-700' }
                }
              }

              const statusInfo = getStatusInfo(status)

              return (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${statusInfo.color}`} />
                    <span className="font-medium">{statusInfo.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${statusInfo.textColor}`}>{count}</span>
                    <span className="text-sm text-muted-foreground">
                      ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Métricas de Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium">Taxa de Sucesso</span>
              <span className="text-lg font-bold text-blue-600">
                {stats.summary.success_rate.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
              <span className="text-sm font-medium">Taxa de Resposta</span>
              <span className="text-lg font-bold text-purple-600">
                {stats.summary.response_rate}
              </span>
            </div>
            {stats.summary.avg_response_time && (
              <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                <span className="text-sm font-medium">Tempo Médio de Resposta</span>
                <span className="text-lg font-bold text-orange-600">
                  {stats.summary.avg_response_time}ms
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}