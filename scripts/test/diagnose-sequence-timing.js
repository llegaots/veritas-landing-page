// Script to diagnose sequence timing calculations
// Run: node scripts/diagnose-sequence-timing.js [sequence-id]

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Copy the parseDuration function from compiler
function parseDuration(duration, phoneNumber) {
  const normalized = duration.toLowerCase().trim();
  
  // Handle "Day 1", "Day 2", "After Day 2", etc.
  // These are RELATIVE delays, just like "1 minutes" or "6 hours"
  // "After Day 2" means "2 days delay from the previous node"
  // Use ACTUAL timing (no test mode conversion)
  const dayMatch = normalized.match(/(?:after\s+)?day\s+(\d+)/i);
  if (dayMatch) {
    const dayNumber = parseInt(dayMatch[1], 10);
    // Treat as relative delay: "Day 2" = 2 days delay, "Day 1" = 1 day delay
    const days = dayNumber;
    // Always use actual days (24 hours per day) - no test mode conversion
    return days * 24 * 60 * 60 * 1000;
  }
  
  // Handle standard duration formats
  const match = normalized.match(/^(\d+)\s*(hour|hours|day|days|minute|minutes|min|mins|h|d|m)$/);
  
  if (!match) {
    return 60 * 60 * 1000; // Default to 1 hour
  }

  const amount = parseInt(match[1], 10);
  const unit = match[2];

  // Use ACTUAL timing - no test mode conversion
  const multipliers = {
    minute: 60 * 1000,
    minutes: 60 * 1000,
    min: 60 * 1000,
    mins: 60 * 1000,
    m: 60 * 1000,
    hour: 60 * 60 * 1000,
    hours: 60 * 60 * 1000,
    h: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return amount * (multipliers[unit] || 60 * 60 * 1000);
}

// Simplified graph walker for diagnostics
function walkGraph(spec, currentNodeId, currentTime, visited, results, phoneNumber) {
  if (visited.has(currentNodeId)) {
    return currentTime;
  }
  visited.add(currentNodeId);

  const node = spec.nodes.find((n) => n.id === currentNodeId);
  if (!node) {
    return currentTime;
  }

  // Handle different node types
  if (node.type === 'send_sms') {
    const timingStr = node.timing?.trim() || '';
    let scheduledTime = new Date(currentTime);
    
    if (timingStr && timingStr.length > 0) {
      const waitMs = parseDuration(timingStr, phoneNumber);
      scheduledTime = new Date(currentTime.getTime() + waitMs);
    }
    
    results.push({
      nodeId: currentNodeId,
      type: 'sms',
      timing: timingStr || '(none)',
      currentTime: currentTime.toISOString(),
      scheduledTime: scheduledTime.toISOString(),
      delayMs: scheduledTime.getTime() - currentTime.getTime(),
      delayMinutes: Math.round((scheduledTime.getTime() - currentTime.getTime()) / 1000 / 60),
      delayHours: Math.round((scheduledTime.getTime() - currentTime.getTime()) / 1000 / 60 / 60 * 10) / 10,
      delayDays: Math.round((scheduledTime.getTime() - currentTime.getTime()) / 1000 / 60 / 60 / 24 * 10) / 10,
      content: (node.content || '').substring(0, 50) + '...',
    });
    
    currentTime = new Date(scheduledTime);
  } else if (node.type === 'send_email') {
    const timingStr = node.timing?.trim() || '';
    let scheduledTime = new Date(currentTime);
    
    if (timingStr && timingStr.length > 0) {
      const waitMs = parseDuration(timingStr, phoneNumber);
      scheduledTime = new Date(currentTime.getTime() + waitMs);
    }
    
    results.push({
      nodeId: currentNodeId,
      type: 'email',
      timing: timingStr || '(none)',
      currentTime: currentTime.toISOString(),
      scheduledTime: scheduledTime.toISOString(),
      delayMs: scheduledTime.getTime() - currentTime.getTime(),
      delayMinutes: Math.round((scheduledTime.getTime() - currentTime.getTime()) / 1000 / 60),
      delayHours: Math.round((scheduledTime.getTime() - currentTime.getTime()) / 1000 / 60 / 60 * 10) / 10,
      delayDays: Math.round((scheduledTime.getTime() - currentTime.getTime()) / 1000 / 60 / 60 / 24 * 10) / 10,
      subject: node.subject || '(no subject)',
    });
    
    currentTime = new Date(scheduledTime);
  } else if (node.type === 'wait') {
    const waitMs = parseDuration(node.duration || '1 hour', phoneNumber);
    currentTime = new Date(currentTime.getTime() + waitMs);
  }

  // Continue to next nodes via edges
  const outgoingEdges = spec.edges.filter(e => e.from === currentNodeId);
  
  if (outgoingEdges.length > 1) {
    // Parallel execution
    const branchTimes = [];
    const parallelTime = new Date(currentTime);
    
    for (const edge of outgoingEdges) {
      const branchTime = walkGraph(spec, edge.to, new Date(parallelTime), new Set(visited), results, phoneNumber);
      branchTimes.push(branchTime);
    }
    
    if (branchTimes.length > 0) {
      const maxTime = new Date(Math.max(...branchTimes.map(t => t.getTime())));
      currentTime = maxTime;
    }
  } else if (outgoingEdges.length === 1) {
    // Sequential execution
    currentTime = walkGraph(spec, outgoingEdges[0].to, currentTime, visited, results, phoneNumber);
  }

  return currentTime;
}

async function diagnoseSequence(sequenceId) {
  console.log(`\n🔍 Diagnosing sequence timing for: ${sequenceId}\n`);
  
  // Get sequence
  const { data: sequence, error: seqError } = await supabase
    .from('sequences')
    .select('id, name, active_version_id')
    .eq('id', sequenceId)
    .single();
  
  if (seqError || !sequence) {
    console.error('Error fetching sequence:', seqError);
    return;
  }
  
  console.log(`Sequence: ${sequence.name}`);
  console.log(`Active Version ID: ${sequence.active_version_id}\n`);
  
  // Get active version
  const { data: version, error: versionError } = await supabase
    .from('sequence_versions')
    .select('id, version_number, spec_jsonb')
    .eq('id', sequence.active_version_id)
    .single();
  
  if (versionError || !version) {
    console.error('Error fetching version:', versionError);
    return;
  }
  
  const spec = version.spec_jsonb;
  if (!spec) {
    console.error('No spec found in version');
    return;
  }
  
  // Find trigger node
  const triggerNode = spec.nodes.find(n => n.type === 'trigger');
  if (!triggerNode) {
    console.error('No trigger node found');
    return;
  }
  
  // Simulate compilation
  const results = [];
  const startTime = new Date();
  const testPhone = '+14385017336'; // Test phone number
  
  console.log(`📅 Start Time: ${startTime.toISOString()}\n`);
  console.log('=' .repeat(100));
  
  walkGraph(spec, triggerNode.id, startTime, new Set(), results, testPhone);
  
  // Sort results by scheduled time
  results.sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());
  
  // Display results
  console.log('\n📊 SCHEDULED MESSAGES (in chronological order):\n');
  
  let prevScheduledTime = startTime;
  
  results.forEach((result, idx) => {
    const scheduled = new Date(result.scheduledTime);
    const timeFromStart = Math.round((scheduled.getTime() - startTime.getTime()) / 1000 / 60);
    const timeFromPrev = Math.round((scheduled.getTime() - prevScheduledTime.getTime()) / 1000 / 60);
    
    console.log(`${idx + 1}. ${result.type.toUpperCase()} Node: ${result.nodeId}`);
    console.log(`   Timing Setting: "${result.timing}"`);
    console.log(`   Current Time (when node processed): ${result.currentTime}`);
    console.log(`   Scheduled Time: ${result.scheduledTime}`);
    console.log(`   Delay from Current Time: ${result.delayMinutes} min (${result.delayHours} hours, ${result.delayDays} days)`);
    console.log(`   Time from Start: ${timeFromStart} minutes (${Math.round(timeFromStart / 60 * 10) / 10} hours, ${Math.round(timeFromStart / 60 / 24 * 10) / 10} days)`);
    console.log(`   Time from Previous: ${timeFromPrev} minutes`);
    
    if (result.type === 'sms') {
      console.log(`   Content: ${result.content}`);
    } else {
      console.log(`   Subject: ${result.subject}`);
    }
    
    console.log('');
    
    prevScheduledTime = scheduled;
  });
  
  console.log('=' .repeat(100));
  console.log(`\n✅ Total messages: ${results.length}`);
  console.log(`📅 Sequence duration: ${Math.round((prevScheduledTime.getTime() - startTime.getTime()) / 1000 / 60 / 60 / 24 * 10) / 10} days\n`);
}

// Get sequence ID from command line or list all sequences
const sequenceId = process.argv[2];

if (sequenceId) {
  diagnoseSequence(sequenceId).catch(console.error);
} else {
  // List all sequences
  supabase
    .from('sequences')
    .select('id, name, active_version_id')
    .order('created_at', { ascending: false })
    .limit(10)
    .then(({ data, error }) => {
      if (error) {
        console.error('Error:', error);
        return;
      }
      
      console.log('\n📋 Available Sequences:\n');
      data.forEach((seq, idx) => {
        console.log(`${idx + 1}. ${seq.name}`);
        console.log(`   ID: ${seq.id}`);
        console.log(`   Active Version: ${seq.active_version_id || 'None'}\n`);
      });
      
      console.log('\n💡 Usage: node scripts/diagnose-sequence-timing.js <sequence-id>\n');
    });
}

