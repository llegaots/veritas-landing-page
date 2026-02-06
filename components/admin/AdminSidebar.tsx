'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { 
  BarChart3, 
  Users, 
  MessageSquare, 
  FileText, 
  Activity,
  Mail,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

interface AdminSidebarProps {
  password?: string
}

export function AdminSidebar({ password = '' }: AdminSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const key = searchParams.get('key') || password

  const navItems: NavItem[] = [
    {
      name: 'Analytics',
      href: `/admin?key=${encodeURIComponent(key)}`,
      icon: BarChart3,
    },
    {
      name: 'Investors',
      href: `/admin/investors?key=${encodeURIComponent(key)}`,
      icon: Users,
    },
    {
      name: 'Sequences',
      href: `/admin/sequences/list?key=${encodeURIComponent(key)}`,
      icon: MessageSquare,
    },
    {
      name: 'Sequence Builder',
      href: `/admin/sequences?key=${encodeURIComponent(key)}`,
      icon: FileText,
    },
    {
      name: 'SMS Logs',
      href: `/admin/sequences/jobs?key=${encodeURIComponent(key)}`,
      icon: Activity,
    },
    {
      name: 'SMS Flow Debug',
      href: `/admin/sequences/preview?key=${encodeURIComponent(key)}`,
      icon: Zap,
    },
    {
      name: 'Email Setup',
      href: `/admin/email-setup?key=${encodeURIComponent(key)}`,
      icon: Mail,
    },
  ]

  const isActive = (href: string) => {
    if (href === '/admin' || href.startsWith('/admin?')) {
      return pathname === '/admin'
    }
    return pathname.startsWith(href.split('?')[0])
  }

  return (
    <div
      className={cn(
        'fixed left-0 top-0 h-screen bg-white border-r border-gray-200 transition-all duration-300 z-40 flex flex-col',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="h-16 border-b border-gray-200 flex items-center justify-between px-4">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-gray-900">Admin</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="ml-auto h-8 w-8 p-0"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                  active
                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900',
                  isCollapsed && 'justify-center'
                )}
              >
                <Icon className={cn('h-5 w-5 flex-shrink-0', active && 'text-purple-600')} />
                {!isCollapsed && (
                  <span className="font-medium text-sm">{item.name}</span>
                )}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

