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
import { X, RefreshCw, Download, Filter } from 'lucide-react'
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
    <div className="sticky top-0 z-50 bg-white border-b shadow-sm">
      <div className="px-4 lg:px-8 py-4">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          {/* Left: Title and Date Range */}
          <div className="flex items-center gap-4 flex-1">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Engagement Analytics
              </h1>
              {lastUpdated && (
                <p className="text-xs text-gray-500 mt-1">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </p>
              )}
            </div>
            <Select
              value={filters.dateRange.label}
              onValueChange={handleDateRangeChange}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dateRangeOptions.map((option) => (
                  <SelectItem key={option.label} value={option.label}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Right: Filters and Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Active Filter Chips */}
            {activeFilters.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {activeFilters.map((filter) => (
                  <Badge
                    key={filter.key}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {filter.label}: {filter.value}
                    <button
                      onClick={() => removeFilter(filter.key)}
                      className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="text-xs"
                >
                  Clear all
                </Button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              {onExport && (
                <Button variant="outline" size="sm" onClick={onExport}>
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

