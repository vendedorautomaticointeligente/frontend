import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

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

interface TimelineChartProps {
  stats: CampaignStats
}

export function TimelineChart({ stats }: TimelineChartProps) {
  // Preparar dados para o gráfico de linha
  const chartData = Object.entries(stats.timeline)
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
    .map(([date, data]) => {
      const parsedDate = parseISO(date)
      return {
        date: parsedDate,
        formattedDate: format(parsedDate, 'dd/MM HH:mm', { locale: ptBR }),
        fullDate: format(parsedDate, 'dd/MM/yyyy HH:mm', { locale: ptBR }),
        sent: data.sent || 0,
        delivered: data.delivered || 0,
        failed: data.failed || 0,
        replied: data.replied || 0,
        opened: data.opened || 0,
        total: (data.sent || 0) + (data.delivered || 0) + (data.failed || 0) + (data.replied || 0) + (data.opened || 0)
      }
    })

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg min-w-48">
          <p className="font-medium mb-2">{data.fullDate}</p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex justify-between items-center text-sm">
                <span style={{ color: entry.color }}>
                  {entry.name}:
                </span>
                <span className="font-bold ml-2">
                  {entry.value}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t mt-2 pt-2">
            <div className="flex justify-between items-center text-sm font-medium">
              <span>Total:</span>
              <span>{data.total}</span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  const formatYAxisTick = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`
    }
    return value.toString()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evolução Temporal</CardTitle>
        <p className="text-sm text-muted-foreground">
          Progressão dos envios ao longo do tempo
        </p>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="formattedDate"
                  tick={{ fontSize: 12 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={formatYAxisTick}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="sent"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  name="Enviados"
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="delivered"
                  stroke="#10B981"
                  strokeWidth={2}
                  name="Entregues"
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="failed"
                  stroke="#EF4444"
                  strokeWidth={2}
                  name="Falhas"
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="replied"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  name="Respostas"
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="opened"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  name="Abertos"
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p>Nenhum dado temporal disponível</p>
              <p className="text-sm">A campanha ainda não foi executada</p>
            </div>
          </div>
        )}

        {/* Estatísticas rápidas */}
        {chartData.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700 font-medium">Período</p>
              <p className="text-lg font-bold text-blue-600">
                {chartData.length > 1
                  ? `${format(chartData[0].date, 'dd/MM')} - ${format(chartData[chartData.length - 1].date, 'dd/MM')}`
                  : format(chartData[0].date, 'dd/MM')
                }
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-700 font-medium">Pico de Atividade</p>
              <p className="text-lg font-bold text-green-600">
                {Math.max(...chartData.map(d => d.total))}
              </p>
              <p className="text-xs text-green-600">envios/min</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <p className="text-sm text-purple-700 font-medium">Total de Pontos</p>
              <p className="text-lg font-bold text-purple-600">
                {chartData.length}
              </p>
              <p className="text-xs text-purple-600">intervalos</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}