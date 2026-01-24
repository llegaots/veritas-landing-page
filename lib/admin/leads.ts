import { VisitorProfile } from './types'

export interface LeadFilter {
  intentScoreMin?: number
  bookedDemo?: boolean
  returnVisits?: boolean
  hasName?: boolean
}

export function filterLeads(
  leads: VisitorProfile[],
  filter: LeadFilter
): VisitorProfile[] {
  return leads.filter((lead) => {
    if (filter.intentScoreMin !== undefined && lead.intent_score < filter.intentScoreMin) {
      return false
    }
    if (filter.bookedDemo !== undefined && (lead.demo_booked > 0) !== filter.bookedDemo) {
      return false
    }
    if (filter.returnVisits !== undefined && (lead.return_visits > 0) !== filter.returnVisits) {
      return false
    }
    if (filter.hasName !== undefined && !!lead.name !== filter.hasName) {
      return false
    }
    return true
  })
}

export function prioritizeLeads(leads: VisitorProfile[]): VisitorProfile[] {
  return [...leads].sort((a, b) => {
    // Priority: Demo booked > High intent > Return visits > Has name
    if (a.demo_booked > 0 && b.demo_booked === 0) return -1
    if (a.demo_booked === 0 && b.demo_booked > 0) return 1
    
    if (a.intent_score > b.intent_score) return -1
    if (a.intent_score < b.intent_score) return 1
    
    if (a.return_visits > b.return_visits) return -1
    if (a.return_visits < b.return_visits) return 1
    
    if (a.name && !b.name) return -1
    if (!a.name && b.name) return 1
    
    return 0
  })
}

export function getHighIntentLeads(leads: VisitorProfile[], threshold: number = 5): VisitorProfile[] {
  return leads.filter((lead) => lead.intent_score >= threshold)
}

export function getLeadsReadyToContact(leads: VisitorProfile[]): VisitorProfile[] {
  return leads.filter((lead) => {
    // Ready to contact if:
    // - Booked demo (highest priority)
    // - High intent score (>= 5) and has name
    // - High intent score (>= 8) even without name
    return (
      lead.demo_booked > 0 ||
      (lead.intent_score >= 5 && lead.name) ||
      lead.intent_score >= 8
    )
  })
}

