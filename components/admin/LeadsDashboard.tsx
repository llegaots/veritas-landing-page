'use client'

import { useState, useMemo, useEffect } from 'react'
import { VisitorProfile } from '@/lib/admin/types'
import { LeadCard } from './LeadCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  filterLeads,
  prioritizeLeads,
  getLeadsReadyToContact,
  LeadFilter,
} from '@/lib/admin/leads'
import { Search, Filter, Users, TrendingUp, CheckCircle2, Download } from 'lucide-react'
import { EmptyState } from './EmptyState'
import { cn } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface LeadsDashboardProps {
  leads: VisitorProfile[]
  onLeadClick: (lead: VisitorProfile) => void
  onContact?: (lead: VisitorProfile) => void
  onTag?: (lead: VisitorProfile) => void
  onExport?: (leads: VisitorProfile[]) => void
}

export function LeadsDashboard({
  leads,
  onLeadClick,
  onContact,
  onTag,
  onExport,
}: LeadsDashboardProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<LeadFilter>({})
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set())
  const [visibleCount, setVisibleCount] = useState(6)
  const [activeTab, setActiveTab] = useState('ready')

  const readyToContact = useMemo(() => {
    return getLeadsReadyToContact(leads)
  }, [leads])

  const filteredLeads = useMemo(() => {
    let filtered = filterLeads(leads, filter)

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (lead) =>
          lead.name?.toLowerCase().includes(query) ||
          lead.anonymous_id.toLowerCase().includes(query)
      )
    }

    return prioritizeLeads(filtered)
  }, [leads, filter, searchQuery])

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(6)
  }, [filter, searchQuery, activeTab])

  const handleSelectLead = (leadId: string, selected: boolean) => {
    setSelectedLeads((prev) => {
      const newSet = new Set(prev)
      if (selected) {
        newSet.add(leadId)
      } else {
        newSet.delete(leadId)
      }
      return newSet
    })
  }

  const handleBulkExport = () => {
    if (selectedLeads.size === 0) {
      onExport?.(filteredLeads)
    } else {
      const selected = filteredLeads.filter((lead) =>
        selectedLeads.has(lead.anonymous_id)
      )
      onExport?.(selected)
    }
  }

  const handleClearSelection = () => {
    setSelectedLeads(new Set())
  }

  // Get leads to display based on active tab
  const allLeadsFiltered = useMemo(() => {
    if (!searchQuery) return leads
    const query = searchQuery.toLowerCase()
    return leads.filter(
      (lead) =>
        lead.name?.toLowerCase().includes(query) ||
        lead.anonymous_id.toLowerCase().includes(query)
    )
  }, [leads, searchQuery])

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-gray-100 p-1 rounded-xl border-0 w-full max-w-md grid grid-cols-2">
          <TabsTrigger 
            value="ready" 
            className="data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm rounded-lg font-medium transition-all duration-200 cursor-pointer"
          >
            Ready to Contact
          </TabsTrigger>
          <TabsTrigger 
            value="all"
            className="data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm rounded-lg font-medium transition-all duration-200 cursor-pointer"
          >
            All Leads
          </TabsTrigger>
        </TabsList>

        {/* Ready to Contact Tab */}
        <TabsContent value="ready" className="mt-6">
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-bold text-gray-900 mb-1">
                    Leads Ready to Contact
                  </CardTitle>
                  <p className="text-sm text-gray-500">
                    {filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''} {filteredLeads.length === 0 ? 'found' : 'ready for follow-up'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedLeads.size > 0 && (
                    <>
                      <Badge variant="secondary" className="mr-2">
                        {selectedLeads.size} selected
                      </Badge>
                      <Button variant="outline" size="sm" onClick={handleClearSelection} className="cursor-pointer">
                        Clear
                      </Button>
                    </>
                  )}
                  <Button onClick={handleBulkExport} size="sm" className="cursor-pointer">
                    <Download className="h-4 w-4 mr-2" />
                    Export {selectedLeads.size > 0 ? `(${selectedLeads.size})` : 'All'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
          {/* Quick Filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setFilter((prev) => ({
                  ...prev,
                  bookedDemo: prev.bookedDemo === true ? undefined : true,
                }))
              }
              className={cn(
                "cursor-pointer transition-all duration-200",
                filter.bookedDemo === true 
                  ? "border-purple-500 bg-purple-50 text-purple-700 hover:bg-purple-100 hover:border-purple-600" 
                  : "border-gray-200 text-gray-700 hover:bg-purple-50 hover:border-purple-300"
              )}
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Booked Demo ({leads.filter((l) => l.demo_booked > 0).length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setFilter((prev) => ({
                  ...prev,
                  intentScoreMin: prev.intentScoreMin !== undefined ? undefined : 5,
                }))
              }
              className={cn(
                "cursor-pointer transition-all duration-200",
                filter.intentScoreMin !== undefined 
                  ? "border-purple-500 bg-purple-50 text-purple-700 hover:bg-purple-100 hover:border-purple-600" 
                  : "border-gray-200 text-gray-700 hover:bg-purple-50 hover:border-purple-300"
              )}
            >
              <TrendingUp className="h-3 w-3 mr-1" />
              High Intent ({leads.filter((l) => l.intent_score >= 5).length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setFilter((prev) => ({
                  ...prev,
                  returnVisits: prev.returnVisits === true ? undefined : true,
                }))
              }
              className={cn(
                "cursor-pointer transition-all duration-200",
                filter.returnVisits === true 
                  ? "border-purple-500 bg-purple-50 text-purple-700 hover:bg-purple-100 hover:border-purple-600" 
                  : "border-gray-200 text-gray-700 hover:bg-purple-50 hover:border-purple-300"
              )}
            >
              <Users className="h-3 w-3 mr-1" />
              Return Visitors ({leads.filter((l) => l.return_visits > 0).length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setFilter((prev) => ({
                  ...prev,
                  hasName: prev.hasName === true ? undefined : true,
                }))
              }
              className={cn(
                "cursor-pointer transition-all duration-200",
                filter.hasName === true 
                  ? "border-purple-500 bg-purple-50 text-purple-700 hover:bg-purple-100 hover:border-purple-600" 
                  : "border-gray-200 text-gray-700 hover:bg-purple-50 hover:border-purple-300"
              )}
            >
              Has Name ({leads.filter((l) => {
                if (!l.name) return false
                // Exclude "Visitor anon_..." format names
                return !l.name.match(/^Visitor\s+anon[_\-]?/i)
              }).length})
            </Button>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
            <Input
              placeholder="Search leads by name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

              {/* Leads Grid */}
              {filteredLeads.length === 0 ? (
                <EmptyState
                  title="No leads found"
                  description="Try adjusting your filters or search query."
                />
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {filteredLeads.slice(0, visibleCount).map((lead) => (
                      <LeadCard
                        key={lead.anonymous_id}
                        lead={lead}
                        onClick={() => onLeadClick(lead)}
                        selected={selectedLeads.has(lead.anonymous_id)}
                        onSelect={(selected) => handleSelectLead(lead.anonymous_id, selected)}
                      />
                    ))}
                  </div>
                  {filteredLeads.length > visibleCount && (
                    <div className="mt-4 text-center">
                      <Button 
                        variant="outline" 
                        onClick={() => setVisibleCount(prev => prev + 6)} 
                        className="cursor-pointer border-gray-200 text-gray-700 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 transition-all duration-200 rounded-lg"
                      >
                        Load More ({filteredLeads.length - visibleCount} remaining)
                      </Button>
                    </div>
                  )}
                </>
              )}
        </CardContent>
      </Card>
        </TabsContent>

        {/* All Leads Tab */}
        <TabsContent value="all" className="mt-6">
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-bold text-gray-900 mb-1">
                    All Leads
                  </CardTitle>
                  <p className="text-sm text-gray-500">
                    {allLeadsFiltered.length} total lead{allLeadsFiltered.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedLeads.size > 0 && (
                    <>
                      <Badge variant="secondary" className="mr-2">
                        {selectedLeads.size} selected
                      </Badge>
                      <Button variant="outline" size="sm" onClick={handleClearSelection} className="cursor-pointer">
                        Clear
                      </Button>
                    </>
                  )}
                  <Button onClick={() => onExport?.(selectedLeads.size > 0 ? allLeadsFiltered.filter(l => selectedLeads.has(l.anonymous_id)) : allLeadsFiltered)} size="sm" className="cursor-pointer">
                    <Download className="h-4 w-4 mr-2" />
                    Export {selectedLeads.size > 0 ? `(${selectedLeads.size})` : 'All'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search leads by name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Leads Grid */}
              {allLeadsFiltered.length === 0 ? (
                <EmptyState
                  title="No leads found"
                  description="Try adjusting your search query."
                />
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {allLeadsFiltered.slice(0, visibleCount).map((lead) => (
                      <LeadCard
                        key={lead.anonymous_id}
                        lead={lead}
                        onClick={() => onLeadClick(lead)}
                        selected={selectedLeads.has(lead.anonymous_id)}
                        onSelect={(selected) => handleSelectLead(lead.anonymous_id, selected)}
                      />
                    ))}
                  </div>
                  {allLeadsFiltered.length > visibleCount && (
                    <div className="mt-4 text-center">
                      <Button 
                        variant="outline" 
                        onClick={() => setVisibleCount(prev => prev + 6)} 
                        className="cursor-pointer border-gray-200 text-gray-700 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 transition-all duration-200 rounded-lg"
                      >
                        Load More ({allLeadsFiltered.length - visibleCount} remaining)
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

