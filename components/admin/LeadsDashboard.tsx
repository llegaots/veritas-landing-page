'use client'

import { useState, useMemo } from 'react'
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

  return (
    <div className="space-y-6">
      {/* Hero Section: Leads Ready to Contact */}
      <Card className="bg-[hsl(var(--card))] border-[hsl(var(--border))] border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold text-[hsl(var(--foreground))] mb-2">
                Leads Ready to Contact
              </CardTitle>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                {readyToContact.length} lead{readyToContact.length !== 1 ? 's' : ''} ready for
                follow-up
              </p>
            </div>
            <div className="flex items-center gap-2">
              {selectedLeads.size > 0 && (
                <>
                  <Badge variant="secondary" className="mr-2">
                    {selectedLeads.size} selected
                  </Badge>
                  <Button variant="outline" size="sm" onClick={handleClearSelection}>
                    Clear
                  </Button>
                </>
              )}
              <Button onClick={handleBulkExport} size="sm">
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
              variant={filter.bookedDemo ? 'default' : 'outline'}
              size="sm"
              onClick={() =>
                setFilter((prev) => ({
                  ...prev,
                  bookedDemo: prev.bookedDemo ? undefined : true,
                }))
              }
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Booked Demo ({leads.filter((l) => l.demo_booked > 0).length})
            </Button>
            <Button
              variant={filter.intentScoreMin !== undefined ? 'default' : 'outline'}
              size="sm"
              onClick={() =>
                setFilter((prev) => ({
                  ...prev,
                  intentScoreMin: prev.intentScoreMin ? undefined : 5,
                }))
              }
            >
              <TrendingUp className="h-3 w-3 mr-1" />
              High Intent ({leads.filter((l) => l.intent_score >= 5).length})
            </Button>
            <Button
              variant={filter.returnVisits ? 'default' : 'outline'}
              size="sm"
              onClick={() =>
                setFilter((prev) => ({
                  ...prev,
                  returnVisits: prev.returnVisits ? undefined : true,
                }))
              }
            >
              <Users className="h-3 w-3 mr-1" />
              Return Visitors ({leads.filter((l) => l.return_visits > 0).length})
            </Button>
            <Button
              variant={filter.hasName ? 'default' : 'outline'}
              size="sm"
              onClick={() =>
                setFilter((prev) => ({
                  ...prev,
                  hasName: prev.hasName ? undefined : true,
                }))
              }
            >
              Has Name ({leads.filter((l) => l.name).length})
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLeads.slice(0, 12).map((lead) => (
                <LeadCard
                  key={lead.anonymous_id}
                  lead={lead}
                  onClick={() => onLeadClick(lead)}
                  onContact={() => onContact?.(lead)}
                  onTag={() => onTag?.(lead)}
                  onExport={() => onExport?.([lead])}
                  selected={selectedLeads.has(lead.anonymous_id)}
                  onSelect={(selected) => handleSelectLead(lead.anonymous_id, selected)}
                />
              ))}
            </div>
          )}

          {filteredLeads.length > 12 && (
            <div className="mt-4 text-center">
              <Button variant="outline" onClick={() => {/* Show all in table */}}>
                View All {filteredLeads.length} Leads
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

