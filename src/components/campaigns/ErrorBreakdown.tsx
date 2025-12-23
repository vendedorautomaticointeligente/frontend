import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Badge } from "../ui/badge"
import { Progress } from "../ui/progress"
import { AlertTriangle, XCircle, Clock, Wifi, UserX, MessageSquare } from 'lucide-react'

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

interface ErrorBreakdownProps {
  stats: CampaignStats
}

const ERROR_CATEGORIES = {
  'network_error': {
    label: 'Erro de Rede',
    description: 'Problemas de conectividade ou timeout',
    icon: Wifi,
    color: 'bg-red-100 text-red-800 border-red-200'
  },
  'invalid_number': {
    label: 'Número Inválido',
    description: 'Número não existe ou está incorreto',
    icon: UserX,
    color: 'bg-orange-100 text-orange-800 border-orange-200'
  },
  'rate_limit': {
    label: 'Limite de Taxa',
    description: 'Muitas mensagens enviadas rapidamente',
    icon: Clock,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200'
  },
  'blocked': {
    label: 'Bloqueado',
    description: 'Número bloqueou mensagens',
    icon: XCircle,
    color: 'bg-red-100 text-red-800 border-red-200'
  },
  'api_error': {
    label: 'Erro da API',
    description: 'Problema no serviço de mensagens',
    icon: AlertTriangle,
    color: 'bg-purple-100 text-purple-800 border-purple-200'
  },
  'message_error': {
    label: 'Erro na Mensagem',
    description: 'Conteúdo ou formato inválido',
    icon: MessageSquare,
    color: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  'other': {
    label: 'Outros',
    description: 'Erros não categorizados',
    icon: AlertTriangle,
    color: 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

export function ErrorBreakdown({ stats }: ErrorBreakdownProps) {
  const totalErrors = Object.values(stats.error_breakdown).reduce((sum, count) => sum + count, 0)

  if (totalErrors === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Análise de Erros</CardTitle>
          <p className="text-sm text-muted-foreground">
            Detalhamento dos tipos de erro encontrados
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-medium">Nenhum erro encontrado!</p>
              <p className="text-sm">Todos os envios foram bem-sucedidos</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const errorEntries = Object.entries(stats.error_breakdown)
    .sort(([, a], [, b]) => b - a)
    .map(([category, count]) => {
      const config = ERROR_CATEGORIES[category as keyof typeof ERROR_CATEGORIES] || ERROR_CATEGORIES.other
      const percentage = totalErrors > 0 ? (count / totalErrors) * 100 : 0

      return {
        category,
        count,
        percentage,
        config
      }
    })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Análise de Erros</CardTitle>
        <p className="text-sm text-muted-foreground">
          Detalhamento dos tipos de erro encontrados ({totalErrors} erros totais)
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {errorEntries.map(({ category, count, percentage, config }) => {
            const IconComponent = config.icon

            return (
              <div key={category} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${config.color.split(' ')[0]}`}>
                      <IconComponent className={`w-5 h-5 ${config.color.split(' ')[1]}`} />
                    </div>
                    <div>
                      <h4 className="font-medium">{config.label}</h4>
                      <p className="text-sm text-muted-foreground">{config.description}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={config.color}>
                    {count} erro{count !== 1 ? 's' : ''}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Porcentagem do total de erros</span>
                    <span className="font-medium">{percentage.toFixed(1)}%</span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>

                <div className="mt-3 text-xs text-muted-foreground">
                  Representa {(percentage / 100 * stats.summary.failed).toFixed(0)} dos {stats.summary.failed} envios falhados
                </div>
              </div>
            )
          })}
        </div>

        {/* Resumo geral */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-3">Resumo Geral</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Total de Erros:</span>
              <span className="font-bold ml-2">{totalErrors}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Taxa de Erro:</span>
              <span className="font-bold ml-2">
                {stats.summary.total_processed > 0
                  ? ((totalErrors / stats.summary.total_processed) * 100).toFixed(1)
                  : 0
                }%
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Categoria Mais Comum:</span>
              <span className="font-bold ml-2">
                {errorEntries[0]?.config.label || 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Sucesso Geral:</span>
              <span className="font-bold ml-2 text-green-600">
                {stats.summary.success_rate.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Recomendações */}
        {errorEntries.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">💡 Recomendações</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              {errorEntries[0]?.category === 'invalid_number' && (
                <li>• Verifique e limpe a lista de contatos antes de enviar</li>
              )}
              {errorEntries[0]?.category === 'rate_limit' && (
                <li>• Reduza a velocidade de envio ou aumente intervalos entre mensagens</li>
              )}
              {errorEntries[0]?.category === 'blocked' && (
                <li>• Considere remover números bloqueados da lista de contatos</li>
              )}
              {errorEntries[0]?.category === 'network_error' && (
                <li>• Verifique a conectividade e tente novamente mais tarde</li>
              )}
              {errorEntries.some(e => e.category === 'api_error') && (
                <li>• Entre em contato com o suporte se erros de API persistirem</li>
              )}
              <li>• Monitore campanhas futuras para identificar padrões de erro</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}