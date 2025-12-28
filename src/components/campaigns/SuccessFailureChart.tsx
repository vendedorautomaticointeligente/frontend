import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

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

interface SuccessFailureChartProps {
  stats: CampaignStats
}

const COLORS = {
  successful: '#10B981', // green-500
  failed: '#EF4444',     // red-500
  sent: '#3B82F6',       // blue-500
  delivered: '#8B5CF6',  // purple-500
  replied: '#F59E0B',    // amber-500
  queued: '#6B7280',     // gray-500
  opened: '#EC4899',     // pink-500
}

export function SuccessFailureChart({ stats }: SuccessFailureChartProps) {
  // Preparar dados para o gráfico
  const chartData = Object.entries(stats.status_breakdown).map(([status, count]) => {
    const getStatusLabel = (status: string) => {
      switch (status) {
        case 'sent': return 'Enviado'
        case 'delivered': return 'Entregue'
        case 'failed': return 'Falhou'
        case 'opened': return 'Aberto'
        case 'replied': return 'Respondeu'
        case 'queued': return 'Na Fila'
        default: return status
      }
    }

    return {
      name: getStatusLabel(status),
      value: count,
      status: status,
      percentage: stats.summary.total_processed > 0
        ? ((count / stats.summary.total_processed) * 100).toFixed(1)
        : '0.0'
    }
  })

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-gray-600">
            Quantidade: <span className="font-bold">{data.value}</span>
          </p>
          <p className="text-sm text-gray-600">
            Porcentagem: <span className="font-bold">{data.percentage}%</span>
          </p>
        </div>
      )
    }
    return null
  }

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percentage }: any) => {
    if (percentage < 5) return null // Não mostrar label se for menos de 5%

    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${percentage}%`}
      </text>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribuição de Status</CardTitle>
        <p className="text-sm text-muted-foreground">
          Visualização dos diferentes status dos envios
        </p>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[entry.status as keyof typeof COLORS] || COLORS.queued}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value, entry: any) => (
                    <span style={{ color: COLORS[entry.payload.status as keyof typeof COLORS] || COLORS.queued }}>
                      {value} ({entry.payload.percentage}%)
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p>Nenhum dado disponível</p>
              <p className="text-sm">A campanha ainda não foi executada</p>
            </div>
          </div>
        )}

        {/* Resumo numérico */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-green-700 font-medium">Sucessos</p>
            <p className="text-2xl font-bold text-green-600">
              {stats.summary.successful}
            </p>
            <p className="text-xs text-green-600">
              {stats.summary.success_rate.toFixed(1)}%
            </p>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <p className="text-sm text-red-700 font-medium">Falhas</p>
            <p className="text-2xl font-bold text-red-600">
              {stats.summary.failed}
            </p>
            <p className="text-xs text-red-600">
              {((stats.summary.failed / Math.max(stats.summary.total_processed, 1)) * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}