import { Card, CardContent } from "./ui/card"
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { Badge } from "./ui/badge"

interface StatsCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: {
    value: number
    label: string
  }
  color?: 'primary' | 'accent' | 'success' | 'warning' | 'error' | 'neutral'
  subtitle?: string
}

export function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  trend,
  color = 'primary',
  subtitle 
}: StatsCardProps) {
  const colorClasses = {
    primary: {
      bg: 'bg-primary/10',
      text: 'text-primary',
      border: 'border-primary/20'
    },
    accent: {
      bg: 'bg-accent/10',
      text: 'text-accent',
      border: 'border-accent/20'
    },
    success: {
      bg: 'bg-green-500/10',
      text: 'text-green-600',
      border: 'border-green-500/20'
    },
    warning: {
      bg: 'bg-yellow-500/10',
      text: 'text-yellow-600',
      border: 'border-yellow-500/20'
    },
    error: {
      bg: 'bg-red-500/10',
      text: 'text-red-600',
      border: 'border-red-500/20'
    },
    neutral: {
      bg: 'bg-muted',
      text: 'text-muted-foreground',
      border: 'border-border'
    }
  }

  const getTrendIcon = () => {
    if (!trend) return null
    if (trend.value > 0) return TrendingUp
    if (trend.value < 0) return TrendingDown
    return Minus
  }

  const getTrendColor = () => {
    if (!trend) return ''
    if (trend.value > 0) return 'text-green-600 bg-green-50 border-green-200'
    if (trend.value < 0) return 'text-red-600 bg-red-50 border-red-200'
    return 'text-gray-600 bg-gray-50 border-gray-200'
  }

  const TrendIcon = getTrendIcon()
  const classes = colorClasses[color]

  return (
    <Card className={`border-2 ${classes.border} hover:shadow-md transition-shadow`}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground font-medium mb-1">{title}</p>
            <div className="flex items-baseline gap-2">
              <h3 className={`text-3xl font-bold ${classes.text}`}>{value}</h3>
              {trend && TrendIcon && (
                <Badge 
                  variant="outline" 
                  className={`text-xs ${getTrendColor()} flex items-center gap-1`}
                >
                  <TrendIcon className="w-3 h-3" />
                  {Math.abs(trend.value)}%
                </Badge>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
            {trend && (
              <p className="text-xs text-muted-foreground mt-1">{trend.label}</p>
            )}
          </div>
          <div className={`${classes.bg} ${classes.text} p-3 rounded-xl`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
