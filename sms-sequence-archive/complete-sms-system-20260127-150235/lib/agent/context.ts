// Context loader for leads and investors
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

let supabaseClient: ReturnType<typeof createClient> | null = null;

if (supabaseUrl && supabaseAnonKey) {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
}

export interface LeadContext {
  anonymous_id: string;
  name?: string;
  email?: string;
  phone?: string;
  source?: string;
  intent_score?: number;
  demo_booked?: boolean;
  return_visits?: number;
  properties: Record<string, any>;
}

export interface InvestorContext {
  id: number;
  investor_name?: string;
  email_address?: string;
  phone_number?: string;
  status?: string;
  investor_type?: string;
  source?: string;
  amount_dollars?: number;
  [key: string]: any;
}

// Load lead context from events table
export async function loadLeadContext(anonymousId: string): Promise<LeadContext | null> {
  if (!supabaseClient) {
    throw new Error('Supabase client not initialized');
  }

  try {
    const { data: events, error } = await supabaseClient
      .from('events')
      .select('*')
      .eq('anonymous_id', anonymousId)
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error loading lead context:', error);
      return null;
    }

    if (!events || events.length === 0) {
      return null;
    }

    // Aggregate data from events
    const latestEvent = events[0] as any;
    const allProperties: Record<string, any> = {};
    
    // Extract common properties
    let name: string | undefined;
    let email: string | undefined;
    let phone: string | undefined;
    let source: string | undefined;
    let intent_score: number | undefined;
    let demo_booked = false;
    let return_visits = 0;

    for (const event of events as any[]) {
      const props = typeof event.properties === 'string' 
        ? JSON.parse(event.properties) 
        : event.properties;

      // Merge properties
      Object.assign(allProperties, props);

      // Extract specific fields
      if (event.name && !name) {
        name = event.name;
      }
      if (props.email && !email) {
        email = props.email;
      }
      if (props.phone && !phone) {
        phone = props.phone;
      }
      if (props.source && !source) {
        source = props.source;
      }
      if (props.intent_score !== undefined && intent_score === undefined) {
        intent_score = props.intent_score;
      }
      if (event.event === 'demo_booked') {
        demo_booked = true;
      }
    }

    // Count return visits (events with same anonymous_id, different timestamps)
    const uniqueTimestamps = new Set((events as any[]).map((e) => e.timestamp));
    return_visits = uniqueTimestamps.size - 1; // Subtract 1 for first visit

    return {
      anonymous_id: anonymousId,
      name,
      email,
      phone,
      source,
      intent_score,
      demo_booked,
      return_visits,
      properties: allProperties,
    };
  } catch (error) {
    console.error('Error loading lead context:', error);
    return null;
  }
}

// Load investor context from investors table
export async function loadInvestorContext(investorId: number): Promise<InvestorContext | null> {
  if (!supabaseClient) {
    throw new Error('Supabase client not initialized');
  }

  try {
    const { data, error } = await supabaseClient
      .from('investors')
      .select('*')
      .eq('id', investorId)
      .single();

    if (error) {
      console.error('Error loading investor context:', error);
      return null;
    }

    return data as InvestorContext;
  } catch (error) {
    console.error('Error loading investor context:', error);
    return null;
  }
}

// Get available variables for a trigger type
export async function getAvailableVariables(triggerType: string, identifier: string): Promise<Record<string, string>> {
  if (triggerType === 'lead.created' || triggerType === 'lead.demo_booked') {
    const context = await loadLeadContext(identifier);
    if (!context) {
      return {};
    }

    return {
      'lead.first_name': context.name?.split(' ')[0] || 'there',
      'lead.full_name': context.name || 'there',
      'lead.email': context.email || '',
      'lead.phone': context.phone || '',
      'lead.source': context.source || 'our website',
      'lead.intent_score': context.intent_score?.toString() || '0',
      'lead.demo_booked': context.demo_booked ? 'yes' : 'no',
      'lead.return_visits': context.return_visits?.toString() || '0',
    };
  } else if (triggerType === 'investor.matched') {
    const context = await loadInvestorContext(parseInt(identifier));
    if (!context) {
      return {};
    }

    return {
      'investor.name': context.investor_name || 'there',
      'investor.email': context.email_address || '',
      'investor.phone': context.phone_number || '',
      'investor.status': context.status || '',
      'investor.type': context.investor_type || '',
      'investor.source': context.source || '',
      'investor.amount': context.amount_dollars?.toString() || '0',
    };
  }

  return {};
}

