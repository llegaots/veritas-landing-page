'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, RefreshCw } from 'lucide-react'

interface EmptyStateProps {
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
  icon?: React.ReactNode
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: EmptyStateProps) {
  return (
    <Card className="bg-[hsl(var(--card))] border-[hsl(var(--border))]">
      <CardContent className="flex flex-col items-center justify-center py-12">
        {icon || <FileText className="h-12 w-12 text-[hsl(var(--muted-foreground))] mb-4" />}
        <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">{title}</h3>
        <p className="text-sm text-[hsl(var(--muted-foreground))] text-center max-w-md mb-4">
          {description}
        </p>
        {action && (
          <Button onClick={action.onClick} variant="outline" className="border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))]">
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

