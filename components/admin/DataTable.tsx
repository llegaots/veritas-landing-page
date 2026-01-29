'use client'

import { useState, useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Columns,
  Search,
  GripVertical,
  Minus,
} from 'lucide-react'
import { TableColumn, TableState } from '@/lib/admin/types'
import { cn } from '@/lib/utils'

interface DataTableProps<T> {
  data: T[]
  columns: TableColumn<T>[]
  searchable?: boolean
  searchPlaceholder?: string
  onRowClick?: (row: T) => void
  pageSize?: number
  className?: string
}

export function DataTable<T extends { [key: string]: any }>({
  data,
  columns,
  searchable = true,
  searchPlaceholder = 'Search...',
  onRowClick,
  pageSize = 10,
  className,
}: DataTableProps<T>) {
  const [tableState, setTableState] = useState<TableState>({
    search: '',
    sortColumn: null,
    sortDirection: 'desc',
    page: 1,
    pageSize,
    visibleColumns: new Set(columns.map((col) => col.id)),
    density: 'comfortable',
  })

  // Filter and sort data
  const processedData = useMemo(() => {
    let filtered = data

    // Apply search
    if (tableState.search && searchable) {
      const searchLower = tableState.search.toLowerCase()
      filtered = filtered.filter((row) =>
        columns.some((col) => {
          const value = col.accessor(row)
          return String(value).toLowerCase().includes(searchLower)
        })
      )
    }

    // Apply sorting
    if (tableState.sortColumn) {
      const column = columns.find((col) => col.id === tableState.sortColumn)
      if (column) {
        filtered = [...filtered].sort((a, b) => {
          const aVal = column.accessor(a)
          const bVal = column.accessor(b)
          const comparison =
            aVal < bVal ? -1 : aVal > bVal ? 1 : 0
          return tableState.sortDirection === 'asc' ? comparison : -comparison
        })
      }
    }

    return filtered
  }, [data, columns, tableState.search, tableState.sortColumn, tableState.sortDirection, searchable])

  // Paginate
  const paginatedData = useMemo(() => {
    const start = (tableState.page - 1) * tableState.pageSize
    const end = start + tableState.pageSize
    return processedData.slice(start, end)
  }, [processedData, tableState.page, tableState.pageSize])

  const totalPages = Math.ceil(processedData.length / tableState.pageSize)

  const visibleColumns = columns.filter((col) =>
    tableState.visibleColumns.has(col.id)
  )

  const handleSort = (columnId: string) => {
    setTableState((prev) => ({
      ...prev,
      sortColumn: columnId,
      sortDirection:
        prev.sortColumn === columnId && prev.sortDirection === 'asc'
          ? 'desc'
          : 'asc',
      page: 1,
    }))
  }

  const toggleColumnVisibility = (columnId: string) => {
    setTableState((prev) => {
      const newVisible = new Set(prev.visibleColumns)
      if (newVisible.has(columnId)) {
        newVisible.delete(columnId)
      } else {
        newVisible.add(columnId)
      }
      return { ...prev, visibleColumns: newVisible }
    })
  }

  return (
    <Card className={cn("bg-white border-0 shadow-sm rounded-xl overflow-hidden", className)}>
      <CardHeader className="bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <CardTitle className="text-gray-900 font-semibold">
            {processedData.length} {processedData.length === 1 ? 'result' : 'results'}
          </CardTitle>
          <div className="flex items-center gap-2">
            {searchable && (
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={searchPlaceholder}
                  value={tableState.search}
                  onChange={(e) =>
                    setTableState((prev) => ({ ...prev, search: e.target.value, page: 1 }))
                  }
                  className="pl-8 w-64 border-gray-200 hover:border-gray-300 focus:border-gray-400 focus:ring-2 focus:ring-gray-400 focus:ring-offset-0 rounded-lg transition-all duration-200 text-gray-900"
                />
              </div>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="border-gray-200 hover:border-gray-300 hover:bg-gray-50 cursor-pointer transition-all duration-200 text-gray-900">
                  <Columns className="h-4 w-4 mr-2" />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-lg border-gray-200 shadow-lg bg-white z-50">
                <DropdownMenuLabel className="text-gray-900">Toggle columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {columns.map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={tableState.visibleColumns.has(column.id)}
                    onCheckedChange={() => toggleColumnVisibility(column.id)}
                    className="hover:bg-gray-50 focus:bg-gray-50 cursor-pointer rounded-md transition-colors duration-150 text-gray-900"
                  >
                    {column.header}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="border-gray-200 hover:border-gray-300 hover:bg-gray-50 cursor-pointer transition-all duration-200 text-gray-900">
                  <GripVertical className="h-4 w-4 mr-2" />
                  {tableState.density === 'compact' ? 'Compact' : 'Comfortable'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-lg border-gray-200 shadow-lg bg-white z-50">
                <DropdownMenuCheckboxItem
                  checked={tableState.density === 'compact'}
                  onCheckedChange={(checked) =>
                    setTableState((prev) => ({
                      ...prev,
                      density: checked ? 'compact' : 'comfortable',
                    }))
                  }
                  className="hover:bg-gray-50 focus:bg-gray-50 cursor-pointer rounded-md transition-colors duration-150 text-gray-900"
                >
                  Compact
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={tableState.density === 'comfortable'}
                  onCheckedChange={(checked) =>
                    setTableState((prev) => ({
                      ...prev,
                      density: checked ? 'comfortable' : 'compact',
                    }))
                  }
                  className="hover:bg-gray-50 focus:bg-gray-50 cursor-pointer rounded-md transition-colors duration-150 text-gray-900"
                >
                  Comfortable
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="rounded-lg overflow-hidden border-0 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-100 hover:bg-gray-100 border-b-2 border-gray-300">
                {visibleColumns.map((column) => (
                  <TableHead
                    key={column.id}
                    className={cn(
                      'font-semibold text-gray-900',
                      column.sortable !== false && 'cursor-pointer hover:bg-gray-200 transition-colors duration-200',
                      tableState.density === 'compact' ? 'py-3' : 'py-4'
                    )}
                    style={{ width: column.width }}
                    onClick={() =>
                      column.sortable !== false && handleSort(column.id)
                    }
                  >
                    <div className="flex items-center gap-2">
                      {column.header}
                      {column.sortable !== false && (
                        <ArrowUpDown className="h-3.5 w-3.5 text-gray-700" />
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={visibleColumns.length}
                    className="text-center py-12 text-gray-500 bg-gray-50"
                  >
                    No results found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((row, index) => (
                  <TableRow
                    key={index}
                    className={cn(
                      'border-b border-gray-100',
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50',
                      onRowClick && 'cursor-pointer transition-all duration-200 hover:bg-gray-100 hover:shadow-sm',
                      tableState.density === 'compact' ? 'py-2' : 'py-4'
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {visibleColumns.map((column) => (
                      <TableCell key={column.id} className="font-medium">
                        {column.accessor(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-600">
              Page {tableState.page} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setTableState((prev) => ({
                    ...prev,
                    page: Math.max(1, prev.page - 1),
                  }))
                }
                disabled={tableState.page === 1}
                className="border-gray-300 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 cursor-pointer transition-all duration-200 text-gray-900"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setTableState((prev) => ({
                    ...prev,
                    page: Math.min(totalPages, prev.page + 1),
                  }))
                }
                disabled={tableState.page === totalPages}
                className="border-gray-300 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 cursor-pointer transition-all duration-200 text-gray-900"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

