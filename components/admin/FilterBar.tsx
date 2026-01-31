'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { X, RefreshCw, Download, Filter, Clock } from 'lucide-react'
import { FilterState, DateRange } from '@/lib/admin/types'
import { getActiveFilters } from '@/lib/admin/filters'
import { formatDate } from '@/lib/admin/format'

interface FilterBarProps {
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  onRefresh: () => void
  onExport?: () => void
  lastUpdated?: Date
}

const dateRangeOptions: Array<{ label: string; getRange: () => DateRange }> = [
  {
    label: 'Today',
    getRange: () => {
      const end = new Date()
      const start = new Date()
      start.setHours(0, 0, 0, 0)
      return { start, end, label: 'Today' }
    },
  },
  {
    label: 'Last 7 days',
    getRange: () => {
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 7)
      return { start, end, label: 'Last 7 days' }
    },
  },
  {
    label: 'Last 30 days',
    getRange: () => {
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 30)
      return { start, end, label: 'Last 30 days' }
    },
  },
]

export function FilterBar({
  filters,
  onFiltersChange,
  onRefresh,
  onExport,
  lastUpdated,
}: FilterBarProps) {
  const activeFilters = getActiveFilters(filters)

  const handleDateRangeChange = (label: string) => {
    const option = dateRangeOptions.find((opt) => opt.label === label)
    if (option) {
      onFiltersChange({
        ...filters,
        dateRange: option.getRange(),
      })
    }
  }

  const removeFilter = (key: string) => {
    onFiltersChange({
      ...filters,
      [key]: undefined,
    })
  }

  const clearAllFilters = () => {
    onFiltersChange({
      ...filters,
      source: undefined,
      device: undefined,
      page: undefined,
    })
  }

  return (
    <div className="sticky top-[73px] z-40 bg-white/60 backdrop-blur-xl border-b border-gray-200/50 shadow-sm">
      <div className="px-4 lg:px-8 py-4">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          {/* Left: Title and Date Range */}
          <div className="flex items-center gap-4 flex-1">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Engagement Analytics
              </h2>
              {lastUpdated && (
                <div className="flex items-center gap-1.5 mt-1">
                  <Clock className="h-3 w-3 text-gray-400" />
                  <p className="text-xs text-gray-500">
                    Last updated: {lastUpdated.toLocaleTimeString('en-US', { timeZone: 'America/New_York' })}
                  </p>
                </div>
              )}
            </div>
            <Select
              value={filters.dateRange.label}
              onValueChange={handleDateRangeChange}
            >
              <SelectTrigger className="w-[180px] border-gray-200 hover:border-purple-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:ring-offset-0 rounded-lg bg-white transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-lg border-gray-200 shadow-lg bg-white z-50">
                {dateRangeOptions.map((option) => (
                  <SelectItem 
                    key={option.label} 
                    value={option.label}
                    className="hover:bg-purple-50 focus:bg-purple-50 cursor-pointer rounded-md transition-colors duration-150"
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Right: Filters and Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Active Filter Chips */}
            {activeFilters.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {activeFilters.map((filter) => (
                  <Badge
                    key={filter.key}
                    className="bg-purple-100 text-purple-700 border-0 hover:bg-purple-200 transition-colors flex items-center gap-1.5 px-3 py-1 rounded-full"
                  >
                    {filter.label}: {filter.value}
                    <button
                      onClick={() => removeFilter(filter.key)}
                      className="ml-1 hover:bg-purple-300 rounded-full p-0.5 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="text-xs text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg cursor-pointer"
                >
                  Clear all
                </Button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onRefresh}
                className="border-gray-200 text-gray-700 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 transition-all duration-200 rounded-lg cursor-pointer"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              {onExport && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onExport}
                  className="border-gray-200 text-gray-700 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 transition-all duration-200 rounded-lg cursor-pointer"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
