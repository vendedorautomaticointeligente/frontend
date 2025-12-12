import { Loader2 } from "lucide-react"
import { Card, CardContent } from "./ui/card"

interface LoadingStateProps {
  message?: string
  fullPage?: boolean
  variant?: 'default' | 'card' | 'inline'
}

export function LoadingState({ 
  message = "Carregando...", 
  fullPage = false,
  variant = 'default'
}: LoadingStateProps) {
  if (variant === 'inline') {
    return (
      <div className="flex items-center justify-center gap-2 py-4">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">{message}</span>
      </div>
    )
  }

  if (variant === 'card') {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
          <p className="text-muted-foreground">{message}</p>
        </CardContent>
      </Card>
    )
  }

  const content = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
        <Loader2 className="relative w-10 h-10 animate-spin text-primary" />
      </div>
      <p className="text-muted-foreground font-medium">{message}</p>
    </div>
  )

  if (fullPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        {content}
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      {content}
    </div>
  )
}
