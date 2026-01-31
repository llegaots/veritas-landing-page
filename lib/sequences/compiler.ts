// Compiler: SequenceSpec → Message Jobs
// Deterministic compiler that converts a sequence spec into scheduled message jobs

import { SequenceSpec, SequenceNode, SendSmsNode, SendEmailNode, WaitNode, ConditionNode } from './spec';
import { getOutgoingEdges } from './spec';

export interface JobContext {
  lead_id: string;
  phone: string;
  email?: string; // Email address for email jobs
  [key: string]: any; // Additional context variables
}

export interface MessageJob {
  run_id: string;
  node_id: string;
  job_type: 'sms' | 'email'; // Type of job
  phone_number?: string; // For SMS jobs
  email_address?: string; // For email jobs
  message_text?: string; // For SMS jobs
  email_subject?: string; // For email jobs
  email_html?: string; // For email jobs
  email_text?: string; // For email jobs (plain text fallback)
  scheduled_for: string; // ISO timestamp
}

/**
 * Evaluate a condition node against context
 */
function evaluateCondition(
  node: ConditionNode,
  context: JobContext
): boolean {
  if (!node.condition) return false;

  const { field, operator, value } = node.condition;
  const fieldValue = context[field] || '';

  switch (operator) {
    case 'equals':
      return String(fieldValue) === String(value);
    case 'not_equals':
      return String(fieldValue) !== String(value);
    case 'contains':
      return String(fieldValue).includes(String(value));
    case 'greater_than':
      return Number(fieldValue) > Number(value);
    case 'less_than':
      return Number(fieldValue) < Number(value);
    default:
      return false;
  }
}

/**
 * Parse duration string (e.g., "Day 1", "1 hour", "2 days", "30 minutes") to milliseconds
 * Supports formats like "Day 1", "Day 2", "1 hour", "2 days", "30 minutes"
 * For testing: converts hours/days to minutes for test phone number (4385017336)
 */
function parseDuration(duration: string, phoneNumber?: string): number {
  const normalized = duration.toLowerCase().trim();
  
  // Handle "Day 1", "Day 2", "After Day 2", etc.
  // These are RELATIVE delays, just like "1 minutes" or "6 hours"
  // "After Day 2" means "2 days delay from the previous node"
  // In test mode, days are converted to minutes for faster testing
  const dayMatch = normalized.match(/(?:after\s+)?day\s+(\d+)/i);
  if (dayMatch) {
    const dayNumber = parseInt(dayMatch[1], 10);
    // Treat as relative delay: "Day 2" = 2 days delay, "Day 1" = 1 day delay
    const days = dayNumber;
    const TEST_PHONE = '4385017336';
    const isTestPhone = phoneNumber && (
      phoneNumber.includes(TEST_PHONE) || 
      phoneNumber.replace(/\D/g, '').includes(TEST_PHONE)
    );
    return days * (isTestPhone ? 60 * 1000 : 24 * 60 * 60 * 1000);
  }
  
  // Handle standard duration formats
  const match = normalized.match(/^(\d+)\s*(hour|hours|day|days|minute|minutes|min|mins|h|d|m)$/);
  
  if (!match) {
    // Default to 1 hour if parsing fails
    return 60 * 60 * 1000;
  }

  const amount = parseInt(match[1], 10);
  const unit = match[2];

  // TEST MODE: Convert hours/days to minutes for test phone number
  const TEST_PHONE = '4385017336';
  const isTestPhone = phoneNumber && (
    phoneNumber.includes(TEST_PHONE) || 
    phoneNumber.replace(/\D/g, '').includes(TEST_PHONE)
  );
  
  const multipliers: Record<string, number> = {
    minute: 60 * 1000,
    minutes: 60 * 1000,
    min: 60 * 1000,
    mins: 60 * 1000,
    m: 60 * 1000,
    hour: isTestPhone ? 60 * 1000 : 60 * 60 * 1000, // Convert hours to minutes for test
    hours: isTestPhone ? 60 * 1000 : 60 * 60 * 1000,
    h: isTestPhone ? 60 * 1000 : 60 * 60 * 1000,
    day: isTestPhone ? 60 * 1000 : 24 * 60 * 60 * 1000, // Convert days to minutes for test
    days: isTestPhone ? 60 * 1000 : 24 * 60 * 60 * 1000,
    d: isTestPhone ? 60 * 1000 : 24 * 60 * 60 * 1000,
  };

  return amount * (multipliers[unit] || 60 * 60 * 1000);
}

/**
 * Render content with variable substitution (for SMS or email)
 */
function renderContent(content: string, context: JobContext): string {
  let rendered = content;
  
  // Replace {{variable}} patterns
  const variablePattern = /\{\{([^}]+)\}\}/g;
  rendered = rendered.replace(variablePattern, (match, varPath) => {
    const trimmedVarPath = varPath.trim();
    const parts = trimmedVarPath.split('.');
    let value: any = context;
    
    for (const part of parts) {
      value = value?.[part.trim()];
      if (value === undefined) break;
    }
    
    if (value === undefined) {
      console.warn(`[renderContent] Variable "${trimmedVarPath}" not found in context. Available keys: ${Object.keys(context).join(', ')}`);
      return match; // Return original placeholder if not found
    }
    
    return String(value);
  });
  
  return rendered;
}

/**
 * Walk the sequence graph and compile jobs
 */
function walkGraph(
  spec: SequenceSpec,
  currentNodeId: string,
  currentTime: Date,
  context: JobContext & { run_id: string },
  visited: Set<string>,
  jobs: MessageJob[]
): Date {
  if (visited.has(currentNodeId)) {
    // Cycle detected - stop
    return currentTime;
  }
  visited.add(currentNodeId);

  const node = spec.nodes.find((n) => n.id === currentNodeId);
  if (!node) {
    return currentTime;
  }

  // Handle different node types
  if (node.type === 'send_sms') {
    const smsNode = node as SendSmsNode;
    const renderedContent = renderContent(smsNode.content || '', context);
    
    // Calculate scheduled time: apply timing delay AFTER currentTime
    // IMPORTANT: If timing is empty/undefined, schedule immediately (no delay)
    // The delay is applied relative to currentTime, which accumulates as we traverse the graph
    let scheduledTime = new Date(currentTime);
    const timingStr = smsNode.timing?.trim();
    if (timingStr && timingStr.length > 0) {
      const waitMs = parseDuration(timingStr, context.phone);
      scheduledTime = new Date(currentTime.getTime() + waitMs);
      console.log(`[Compiler] Processing SMS node ${currentNodeId}:`);
      console.log(`  - Current time: ${currentTime.toISOString()}`);
      console.log(`  - Timing property: "${timingStr}"`);
      console.log(`  - Timing delay: ${waitMs}ms (${waitMs / 1000 / 60} minutes)`);
      console.log(`  - Scheduled time: ${scheduledTime.toISOString()}`);
    } else {
      // No timing = schedule immediately at currentTime (no additional delay)
      console.log(`[Compiler] Processing SMS node ${currentNodeId}:`);
      console.log(`  - Current time: ${currentTime.toISOString()}`);
      console.log(`  - No timing specified (empty/undefined), scheduling immediately at currentTime`);
      scheduledTime = new Date(currentTime); // Explicitly use currentTime (no delay)
    }
    console.log(`  - Message: ${renderedContent.substring(0, 50)}...`);
    
    jobs.push({
      run_id: context.run_id as string,
      node_id: currentNodeId,
      job_type: 'sms',
      phone_number: context.phone,
      message_text: renderedContent,
      scheduled_for: scheduledTime.toISOString(),
    });
    
    // Update currentTime to the scheduled time of this message
    currentTime = new Date(scheduledTime);
    console.log(`  - Updated currentTime to scheduled time: ${currentTime.toISOString()}`);
  } else if (node.type === 'send_email') {
    const emailNode = node as SendEmailNode;
    const renderedSubject = renderContent(emailNode.subject || '', context);
    const renderedHtml = renderContent(emailNode.html_content || '', context);
    const renderedText = emailNode.text_content ? renderContent(emailNode.text_content, context) : undefined;
    
    if (!context.email) {
      console.warn(`[Compiler] Email node ${currentNodeId} requires email address, but none provided in context`);
      return currentTime;
    }
    
    // Calculate scheduled time: apply timing delay AFTER currentTime
    // IMPORTANT: If timing is empty/undefined, schedule immediately (no delay)
    // The delay is applied relative to currentTime, which accumulates as we traverse the graph
    let scheduledTime = new Date(currentTime);
    const timingStr = emailNode.timing?.trim();
    if (timingStr && timingStr.length > 0) {
      const waitMs = parseDuration(timingStr, context.phone);
      scheduledTime = new Date(currentTime.getTime() + waitMs);
      console.log(`[Compiler] Processing Email node ${currentNodeId}:`);
      console.log(`  - Current time: ${currentTime.toISOString()}`);
      console.log(`  - Timing property: "${timingStr}"`);
      console.log(`  - Timing delay: ${waitMs}ms (${waitMs / 1000 / 60} minutes)`);
      console.log(`  - Scheduled time: ${scheduledTime.toISOString()}`);
    } else {
      // No timing = schedule immediately at currentTime (no additional delay)
      console.log(`[Compiler] Processing Email node ${currentNodeId}:`);
      console.log(`  - Current time: ${currentTime.toISOString()}`);
      console.log(`  - No timing specified (empty/undefined), scheduling immediately at currentTime`);
      scheduledTime = new Date(currentTime); // Explicitly use currentTime (no delay)
    }
    console.log(`  - Subject: ${renderedSubject}`);
    console.log(`  - HTML length: ${renderedHtml.length} chars`);
    
    jobs.push({
      run_id: context.run_id as string,
      node_id: currentNodeId,
      job_type: 'email',
      email_address: context.email,
      email_subject: renderedSubject,
      email_html: renderedHtml,
      email_text: renderedText,
      scheduled_for: scheduledTime.toISOString(),
    });
    
    // Update currentTime to the scheduled time of this message
    currentTime = new Date(scheduledTime);
    console.log(`  - Updated currentTime to scheduled time: ${currentTime.toISOString()}`);
  } else if (node.type === 'wait') {
    // Keep wait node support for backward compatibility, but prefer SMS timing
    const waitNode = node as WaitNode;
    const waitMs = parseDuration(waitNode.duration || '1 hour', context.phone);
    currentTime = new Date(currentTime.getTime() + waitMs);
  } else if (node.type === 'condition') {
    const condNode = node as ConditionNode;
    const result = evaluateCondition(condNode, context);
    
    // Follow the appropriate path
    const nextNodeId = result ? condNode.truePath : condNode.falsePath;
    if (nextNodeId) {
      currentTime = walkGraph(spec, nextNodeId, currentTime, context, visited, jobs);
    }
    return currentTime; // Don't continue to other edges
  } else if (node.type === 'end') {
    return currentTime; // Stop here
  }

  // Continue to next nodes via edges
  // (condition nodes already handled their edges above, so this only runs for other types)
  const outgoingEdges = getOutgoingEdges(spec, currentNodeId);
  
  if (outgoingEdges.length > 0) {
    console.log(`[Compiler] Node ${currentNodeId} has ${outgoingEdges.length} outgoing edge(s), currentTime: ${currentTime.toISOString()}`);
  }
  
  // PARALLEL EXECUTION: When a node has multiple outgoing edges, all branches start from the SAME time
  // This allows SMS and Email to be sent simultaneously
  if (outgoingEdges.length > 1) {
    // Multiple edges = parallel execution
    // All branches start from the same currentTime
    console.log(`[Compiler] PARALLEL EXECUTION: Processing ${outgoingEdges.length} branches from ${currentNodeId} starting at ${currentTime.toISOString()}`);
    
    const branchTimes: Date[] = [];
    const parallelTime = new Date(currentTime); // Use the same starting time for all parallel branches
    
    for (const edge of outgoingEdges) {
      console.log(`[Compiler] Processing parallel branch ${currentNodeId} -> ${edge.to} with startTime: ${parallelTime.toISOString()}`);
      // Each branch gets its own visited set copy to allow parallel paths
      // This prevents cycles within each branch while allowing the same node to be reached via different parallel paths
      const branchVisited = new Set(visited);
      // IMPORTANT: Each parallel branch starts from the SAME time (parallelTime)
      // This ensures parallel nodes execute simultaneously
      const branchTime = walkGraph(spec, edge.to, new Date(parallelTime), context, branchVisited, jobs);
      branchTimes.push(branchTime);
      console.log(`[Compiler] Branch ${currentNodeId} -> ${edge.to} completed at: ${branchTime.toISOString()} (started at ${parallelTime.toISOString()})`);
    }
    
    // After all parallel branches complete, currentTime = max time from all branches
    // This ensures sequential nodes after the parallel section start from the latest time
    if (branchTimes.length > 0) {
      const maxTime = new Date(Math.max(...branchTimes.map(t => t.getTime())));
      currentTime = maxTime;
      console.log(`[Compiler] PARALLEL EXECUTION complete: max time from ${outgoingEdges.length} branches = ${currentTime.toISOString()}`);
    }
  } else if (outgoingEdges.length === 1) {
    // Single edge = sequential execution (normal flow)
    const edge = outgoingEdges[0];
    console.log(`[Compiler] Processing sequential edge ${currentNodeId} -> ${edge.to} with currentTime: ${currentTime.toISOString()}`);
    const timeBeforeRecursion = new Date(currentTime);
    currentTime = walkGraph(spec, edge.to, currentTime, context, visited, jobs);
    console.log(`[Compiler] After processing edge ${currentNodeId} -> ${edge.to}: currentTime ${timeBeforeRecursion.toISOString()} -> ${currentTime.toISOString()}`);
  }

  return currentTime;
}

/**
 * Compile a SequenceSpec into message jobs
 */
export function compileSequenceToJobs(
  spec: SequenceSpec,
  runId: string,
  context: JobContext
): MessageJob[] {
  const jobs: MessageJob[] = [];
  const visited = new Set<string>();
  const startTime = new Date();
  
  // Add run_id to context
  const fullContext: JobContext & { run_id: string } = { ...context, run_id: runId };

  // Find trigger node
  const triggerNode = spec.nodes.find((n) => n.type === 'trigger');
  if (!triggerNode) {
    return jobs;
  }

  // Walk the graph starting from trigger
  walkGraph(spec, triggerNode.id, startTime, fullContext, visited, jobs);

  return jobs;
}

