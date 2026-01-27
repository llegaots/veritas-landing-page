'use client'

import { useEffect, useState, Suspense, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { DataTable } from '@/components/admin/DataTable'
import { FilterBar } from '@/components/admin/FilterBar'
import { EmptyState } from '@/components/admin/EmptyState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TableColumn } from '@/lib/admin/types'
import { formatDateTime } from '@/lib/admin/format'
import { Search, Download, Mail, Phone } from 'lucide-react'
import Link from 'next/link'

interface Investor {
  id: number
  airtable_id: string
  investor_name: string | null
  email_address: string | null
  phone_number: string | null
  status: string | null
  investor_type: string | null
  liquid_ready: string | null
  ready_for_follow_up: string | null
  amount_dollars: number | null
  deal: string | null
  source: string | null
  investor_notes: string | null
  created_time: string | null
  created_at: string
  updated_at: string
}

interface InvestorsResponse {
  investors: Investor[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  filters: {
    statuses: string[]
    sources: string[]
  }
}

function InvestorsPageContent() {
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [data, setData] = useState<InvestorsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [sourceFilter, setSourceFilter] = useState<string>('')
  const [readyForFollowUpFilter, setReadyForFollowUpFilter] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    const key = searchParams.get('key')
    if (key) {
      setPassword(key)
      setAuthenticated(true)
      fetchInvestors(key)
    }
  }, [searchParams])

  const fetchInvestors = async (key: string, page: number = 1) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        key,
        page: page.toString(),
        page_size: '50',
      })

      if (search) params.append('search', search)
      if (statusFilter) params.append('status', statusFilter)
      if (sourceFilter) params.append('source', sourceFilter)
      if (readyForFollowUpFilter) params.append('ready_for_follow_up', readyForFollowUpFilter)

      const response = await fetch(`/api/admin/investors?${params.toString()}`)
      if (!response.ok) {
        if (response.status === 401) {
          setError('Invalid password')
          setAuthenticated(false)
        } else {
          setError('Failed to fetch investors')
        }
        return
      }
      const result = await response.json()
      setData(result)
      setCurrentPage(page)
    } catch (err) {
      setError('Error fetching investors')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (password) {
      setAuthenticated(true)
      fetchInvestors(password)
      window.history.pushState({}, '', `?key=${encodeURIComponent(password)}`)
    }
  }

  const handleRefresh = () => {
    if (password) {
      fetchInvestors(password, currentPage)
    }
  }

  const handleSearch = () => {
    if (password) {
      fetchInvestors(password, 1)
    }
  }

  const handleExport = () => {
    if (!data?.investors) return

    const csv = [
      ['Name', 'Email', 'Phone', 'Status', 'Source', 'Amount', 'Ready for Follow Up', 'Created Time'].join(','),
      ...data.investors.map((investor) =>
        [
          investor.investor_name || '',
          investor.email_address || '',
          investor.phone_number || '',
          investor.status || '',
          investor.source || '',
          investor.amount_dollars || 0,
          investor.ready_for_follow_up || '',
          investor.created_time || '',
        ].join(',')
      ),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `investors-export-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  // Table columns
  const columns: TableColumn<Investor>[] = [
    {
      id: 'investor_name',
      header: 'Name',
      accessor: (row) => (
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
            {row.investor_name ? row.investor_name.charAt(0).toUpperCase() : '?'}
          </div>
          <span className="font-semibold text-gray-900">{row.investor_name || 'N/A'}</span>
        </div>
      ),
      sortable: true,
    },
    {
      id: 'email_address',
      header: 'Email',
      accessor: (row) =>
        row.email_address ? (
            <a
              href={`mailto:${row.email_address}`}
              className="text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1.5 font-medium bg-blue-50 px-2 py-1 rounded-md hover:bg-blue-100 transition-colors"
            >
              <Mail className="h-3.5 w-3.5" />
              {row.email_address}
            </a>
          ) : (
            <span className="text-gray-400">-</span>
        ),
      sortable: true,
    },
    {
      id: 'phone_number',
      header: 'Phone',
      accessor: (row) =>
        row.phone_number ? (
            <a
              href={`tel:${row.phone_number}`}
              className="text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1.5 font-medium bg-blue-50 px-2 py-1 rounded-md hover:bg-blue-100 transition-colors"
            >
              <Phone className="h-3.5 w-3.5" />
              {row.phone_number}
            </a>
          ) : (
            <span className="text-gray-400">-</span>
        ),
      sortable: true,
    },
    {
      id: 'status',
      header: 'Status',
      accessor: (row) =>
        row.status ? (
          <Badge
            className={
              row.status === 'New Lead'
                ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0 shadow-sm font-medium px-3 py-1'
                : row.status === 'Contacted'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 shadow-sm font-medium px-3 py-1'
                  : 'bg-gradient-to-r from-gray-400 to-gray-500 text-white border-0 shadow-sm font-medium px-3 py-1'
            }
          >
            {row.status}
          </Badge>
        ) : (
          <span className="text-gray-400">-</span>
        ),
      sortable: true,
    },
    {
      id: 'source',
      header: 'Source',
      accessor: (row) =>
        row.source ? (
          <Badge className="bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0 shadow-sm font-medium px-3 py-1">
            {row.source}
          </Badge>
        ) : (
          <span className="text-gray-400">-</span>
        ),
      sortable: true,
    },
    {
      id: 'amount_dollars',
      header: 'Amount',
      accessor: (row) =>
        row.amount_dollars && row.amount_dollars > 0 ? (
          <span className="font-bold text-green-700 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
            ${row.amount_dollars.toLocaleString()}
          </span>
        ) : (
          <span className="text-gray-400 font-medium">$0</span>
        ),
      sortable: true,
    },
    {
      id: 'ready_for_follow_up',
      header: 'Follow Up',
      accessor: (row) =>
        row.ready_for_follow_up === 'YES' ? (
          <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 shadow-sm font-semibold px-3 py-1">YES</Badge>
        ) : (
          <Badge className="bg-gray-200 text-gray-600 border-0 font-medium px-3 py-1">NO</Badge>
        ),
      sortable: true,
    },
    {
      id: 'created_time',
      header: 'Created',
      accessor: (row) =>
        row.created_time ? (
          <span className="text-sm text-gray-600">
            {formatDateTime(new Date(row.created_time).getTime())}
          </span>
        ) : (
          <span className="text-gray-400">-</span>
        ),
      sortable: true,
    },
  ]

  if (!authenticated) {
    return (
      <div className="admin-theme min-h-screen bg-[hsl(var(--background))] flex items-center justify-center p-4">
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg shadow-xl p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))] mb-6">Investors Dashboard</h1>
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label htmlFor="password" className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                Password
              </label>
              <Input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                required
                className="bg-[hsl(var(--input))] border-[hsl(var(--border))] text-[hsl(var(--foreground))]"
              />
            </div>
            <Button type="submit" className="w-full bg-[hsl(var(--primary))] hover:opacity-90 text-[hsl(var(--primary-foreground))]">
              Access Dashboard
            </Button>
          </form>
          {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="admin-theme min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white shadow-lg sticky top-0 z-10">
        <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Investors</h1>
              <p className="text-sm text-blue-100 mt-1.5">
                {data?.total || 0} total investors
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/admin?key=${encodeURIComponent(password)}`}>
                <Button variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                  Back to Analytics
                </Button>
              </Link>
              <Button onClick={handleExport} size="sm" className="bg-white text-blue-700 hover:bg-blue-50 shadow-md">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button onClick={handleRefresh} variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto">
        {/* Filters with colored background */}
        <div className="mb-6 bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 px-6 py-4 border-b border-indigo-100">
            <h2 className="text-lg font-semibold text-gray-800">Filter Investors</h2>
          </div>
          <CardContent className="pt-6 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-indigo-500" />
                <Input
                  placeholder="Search name, email, phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10 border-indigo-200 focus:border-indigo-400 focus:ring-indigo-400"
                />
              </div>
              <Select value={statusFilter || 'all'} onValueChange={(value) => setStatusFilter(value === 'all' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {data?.filters.statuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sourceFilter || 'all'} onValueChange={(value) => setSourceFilter(value === 'all' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {data?.filters.sources.map((source) => (
                    <SelectItem key={source} value={source}>
                      {source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={readyForFollowUpFilter || 'all'} onValueChange={(value) => setReadyForFollowUpFilter(value === 'all' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Follow Up Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="YES">Ready for Follow Up</SelectItem>
                  <SelectItem value="NO">Not Ready</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={handleSearch} size="sm" className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-md">
                Apply Filters
              </Button>
              <Button
                onClick={() => {
                  setSearch('')
                  setStatusFilter('')
                  setSourceFilter('')
                  setReadyForFollowUpFilter('')
                  if (password) fetchInvestors(password, 1)
                }}
                variant="outline"
                size="sm"
                className="border-gray-300 hover:bg-gray-50"
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </div>

        {loading && (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {data && !loading && (
          <>
            {data.investors.length === 0 ? (
              <EmptyState
                title="No investors found"
                description="Try adjusting your filters or search query."
              />
            ) : (
              <>
                <DataTable
                  data={data.investors}
                  columns={columns}
                  searchable={false}
                  pageSize={50}
                />
                {/* Pagination */}
                {data.totalPages > 1 && (
                  <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 px-6 py-4 flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-700">
                      Showing <span className="font-semibold text-gray-900">{((currentPage - 1) * data.pageSize) + 1}</span> to{' '}
                      <span className="font-semibold text-gray-900">{Math.min(currentPage * data.pageSize, data.total)}</span> of{' '}
                      <span className="font-semibold text-gray-900">{data.total}</span> investors
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchInvestors(password, currentPage - 1)}
                        disabled={currentPage === 1}
                        className="border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchInvestors(password, currentPage + 1)}
                        disabled={currentPage >= data.totalPages}
                        className="border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function InvestorsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      }
    >
      <InvestorsPageContent />
    </Suspense>
  )
}

