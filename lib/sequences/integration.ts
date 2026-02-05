/**
 * Integration helper for automatically triggering SMS sequences when leads are created
 * 
 * This module provides utilities to connect lead creation to SMS sequence triggers
 */

export interface LeadData {
  lead_id: string;
  phone: string;
  name?: string;
  email?: string;
  investor_id?: string | number;
  property_name?: string;
  attributes?: Record<string, any>;
}

/**
 * Trigger SMS sequence for a new lead
 * Call this function whenever a lead is created in your system
 */
export async function triggerSmsSequenceForLead(leadData: LeadData): Promise<{
  success: boolean;
  runs_created?: number;
  run_ids?: string[];
  error?: string;
}> {
  try {
    // Determine base URL - prefer env var, fallback to Vercel URL, then localhost
    let baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    
    if (!baseUrl) {
      // In server-side context, try to construct from Vercel env vars
      if (process.env.VERCEL_URL) {
        baseUrl = `https://${process.env.VERCEL_URL}`;
      } else if (process.env.VERCEL) {
        // Use production domain if available
        baseUrl = 'https://veritas-landing-page.vercel.app';
      } else {
        // Fallback to localhost for local development
        baseUrl = 'http://localhost:3000';
      }
    }
    
    const adminPassword = process.env.ADMIN_PASSWORD || 'veritas2024admin';
    
    // Prepare attributes for SMS personalization
    const attributes: Record<string, any> = {
      FirstName: extractFirstName(leadData.name),
      FullName: leadData.name || '', // Add FullName for {{FullName}} variable
      PropertyName: leadData.property_name || 'Horizontal Parks',
      CalendarLink: 'https://calendly.com/alex-veritasequitypartners/15-minute-intro-call',
      ...leadData.attributes,
    };
    
    // Add investor_id if provided
    if (leadData.investor_id) {
      attributes.investor_id = leadData.investor_id.toString();
    }
    
    // Add email if provided
    if (leadData.email) {
      attributes.email = leadData.email;
    }
    
    const url = `${baseUrl}/api/events/lead.created`;
    console.log(`[triggerSmsSequenceForLead] Calling: ${url}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminPassword}`,
      },
      body: JSON.stringify({
        lead_id: leadData.lead_id,
        phone: leadData.phone,
        email: leadData.email,
        attributes,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[triggerSmsSequenceForLead] HTTP ${response.status}: ${errorText}`);
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText || 'Failed to trigger SMS sequence'}`,
      };
    }
    
    const result = await response.json();
    return {
      success: true,
      runs_created: result.runs_created || 0,
      run_ids: result.run_ids || [],
    };
  } catch (error) {
    console.error('[triggerSmsSequenceForLead] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Extract first name from full name
 */
function extractFirstName(name?: string): string {
  if (!name) return '';
  return name.split(' ')[0] || name;
}

/**
 * Helper to trigger SMS sequence from investor data
 * Use this when adding a new investor who should receive SMS
 * 
 * @param investor - Investor data with id, name, phone, etc.
 * @param options - Optional configuration
 * @param options.onlyIfStatus - Only trigger if investor status matches (e.g., "New Lead")
 */
export async function triggerSmsSequenceForInvestor(
  investor: {
    id: string | number;
    investor_name: string | null;
    phone_number: string | null;
    email_address?: string | null;
    property_name?: string;
    status?: string | null;
    source?: string | null;
  },
  options?: {
    onlyIfStatus?: string;
  }
): Promise<{
  success: boolean;
  runs_created?: number;
  error?: string;
  skipped?: boolean;
}> {
  if (!investor.phone_number) {
    return {
      success: false,
      error: 'Investor phone number is required',
    };
  }

  // Check status filter if provided
  if (options?.onlyIfStatus) {
    const investorStatus = investor.status?.toLowerCase().trim();
    const requiredStatus = options.onlyIfStatus.toLowerCase().trim();
    
    if (investorStatus !== requiredStatus) {
      return {
        success: true,
        skipped: true,
        error: `Investor status "${investor.status}" does not match required status "${options.onlyIfStatus}"`,
      };
    }
  }
  
  return triggerSmsSequenceForLead({
    lead_id: `investor_${investor.id}`,
    phone: investor.phone_number,
    name: investor.investor_name || undefined,
    email: investor.email_address || undefined,
    investor_id: investor.id.toString(),
    property_name: investor.property_name,
    attributes: {
      source: investor.source ?? undefined,
    },
  });
}

/**
 * Helper to trigger SMS sequence from visitor/lead profile
 * Use this when a visitor becomes a qualified lead
 */
export async function triggerSmsSequenceForVisitor(visitor: {
  anonymous_id: string;
  name?: string | null;
  phone?: string;
  email?: string;
  property_name?: string;
}): Promise<{
  success: boolean;
  runs_created?: number;
  error?: string;
}> {
  if (!visitor.phone) {
    return {
      success: false,
      error: 'Visitor phone number is required',
    };
  }
  
  return triggerSmsSequenceForLead({
    lead_id: visitor.anonymous_id,
    phone: visitor.phone,
    name: visitor.name || undefined,
    email: visitor.email,
    property_name: visitor.property_name,
  });
}

