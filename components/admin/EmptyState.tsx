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
    <Card className="bg-white border-0 shadow-sm rounded-xl">
      <CardContent className="flex flex-col items-center justify-center py-12">
        {icon || <FileText className="h-12 w-12 text-purple-400 mb-4" />}
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 text-center max-w-md mb-4">
          {description}
        </p>
        {action && (
          <Button 
            onClick={action.onClick} 
            variant="outline" 
            className="border-gray-300 hover:bg-purple-50 hover:border-purple-300 text-gray-700 cursor-pointer transition-all duration-200"
          >
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

