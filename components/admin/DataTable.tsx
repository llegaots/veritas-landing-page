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
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
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
                  className="pl-8 w-64"
                />
              </div>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Columns className="h-4 w-4 mr-2" />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {columns.map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={tableState.visibleColumns.has(column.id)}
                    onCheckedChange={() => toggleColumnVisibility(column.id)}
                  >
                    {column.header}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <GripVertical className="h-4 w-4 mr-2" />
                  {tableState.density === 'compact' ? 'Compact' : 'Comfortable'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuCheckboxItem
                  checked={tableState.density === 'compact'}
                  onCheckedChange={(checked) =>
                    setTableState((prev) => ({
                      ...prev,
                      density: checked ? 'compact' : 'comfortable',
                    }))
                  }
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
                >
                  Comfortable
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {visibleColumns.map((column) => (
                  <TableHead
                    key={column.id}
                    className={cn(
                      column.sortable !== false && 'cursor-pointer hover:bg-gray-50',
                      tableState.density === 'compact' && 'py-2'
                    )}
                    style={{ width: column.width }}
                    onClick={() =>
                      column.sortable !== false && handleSort(column.id)
                    }
                  >
                    <div className="flex items-center gap-2">
                      {column.header}
                      {column.sortable !== false && (
                        <ArrowUpDown className="h-3 w-3 text-gray-400" />
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
                    className="text-center py-8 text-gray-500"
                  >
                    No results found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((row, index) => (
                  <TableRow
                    key={index}
                    className={cn(
                      onRowClick && 'cursor-pointer',
                      tableState.density === 'compact' && 'py-1'
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {visibleColumns.map((column) => (
                      <TableCell key={column.id}>
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

