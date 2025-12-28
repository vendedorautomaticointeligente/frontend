import { Button } from "./ui/button"
import { LucideIcon } from "lucide-react"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  secondaryActionLabel?: string
  onSecondaryAction?: () => void
  gradient?: 'primary' | 'accent' | 'neutral'
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  gradient = 'neutral'
}: EmptyStateProps) {
  const gradientClasses = {
    primary: 'from-primary/10 to-primary/5',
    accent: 'from-accent/10 to-accent/5',
    neutral: 'from-muted to-background'
  }

  const iconClasses = {
    primary: 'bg-primary/10 text-primary',
    accent: 'bg-accent/10 text-accent',
    neutral: 'bg-muted text-muted-foreground'
  }

  return (
    <div className={`flex flex-col items-center justify-center min-h-[400px] px-4 py-12 bg-gradient-to-b ${gradientClasses[gradient]} rounded-xl border-2 border-dashed border-border`}>
      <div className={`flex items-center justify-center w-16 h-16 ${iconClasses[gradient]} rounded-2xl mb-4`}>
        <Icon className="w-8 h-8" />
      </div>
      
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground text-center max-w-md mb-6">{description}</p>
      
      <div className="flex items-center gap-3">
        {actionLabel && onAction && (
          <Button onClick={onAction} size="lg" className="gap-2">
            {actionLabel}
          </Button>
        )}
        
        {secondaryActionLabel && onSecondaryAction && (
          <Button onClick={onSecondaryAction} variant="outline" size="lg" className="gap-2">
            {secondaryActionLabel}
          </Button>
        )}
      </div>
    </div>
  )
}
