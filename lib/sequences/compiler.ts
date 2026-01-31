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
  
  // Handle "Day 1", "Day 2", etc. - treat as immediate (0 delay) for first message
  // Subsequent days are calculated from the start
  const dayMatch = normalized.match(/^day\s+(\d+)$/);
  if (dayMatch) {
    const dayNumber = parseInt(dayMatch[1], 10);
    if (dayNumber === 1) {
      return 0; // Day 1 = immediate
    }
    // For Day 2+, calculate as (dayNumber - 1) days
    const days = dayNumber - 1;
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
    const parts = varPath.split('.');
    let value: any = context;
    
    for (const part of parts) {
      value = value?.[part.trim()];
      if (value === undefined) break;
    }
    
    return value !== undefined ? String(value) : match;
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
    let scheduledTime = new Date(currentTime);
    if (smsNode.timing) {
      const waitMs = parseDuration(smsNode.timing, context.phone);
      scheduledTime = new Date(currentTime.getTime() + waitMs);
      console.log(`[Compiler] Processing SMS node ${currentNodeId}:`);
      console.log(`  - Current time: ${currentTime.toISOString()}`);
      console.log(`  - Timing property: ${smsNode.timing}`);
      console.log(`  - Timing delay: ${waitMs}ms (${waitMs / 1000 / 60} minutes)`);
      console.log(`  - Scheduled time: ${scheduledTime.toISOString()}`);
    } else {
      console.log(`[Compiler] Processing SMS node ${currentNodeId}:`);
      console.log(`  - Current time: ${currentTime.toISOString()}`);
      console.log(`  - No timing specified, scheduling immediately`);
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
    let scheduledTime = new Date(currentTime);
    if (emailNode.timing) {
      const waitMs = parseDuration(emailNode.timing, context.phone);
      scheduledTime = new Date(currentTime.getTime() + waitMs);
      console.log(`[Compiler] Processing Email node ${currentNodeId}:`);
      console.log(`  - Current time: ${currentTime.toISOString()}`);
      console.log(`  - Timing property: ${emailNode.timing}`);
      console.log(`  - Timing delay: ${waitMs}ms (${waitMs / 1000 / 60} minutes)`);
      console.log(`  - Scheduled time: ${scheduledTime.toISOString()}`);
    } else {
      console.log(`[Compiler] Processing Email node ${currentNodeId}:`);
      console.log(`  - Current time: ${currentTime.toISOString()}`);
      console.log(`  - No timing specified, scheduling immediately`);
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
  
  // Process edges sequentially, passing updated currentTime to each
  // This ensures timing delays are properly accumulated
  for (const edge of outgoingEdges) {
    console.log(`[Compiler] Processing edge ${currentNodeId} -> ${edge.to} with currentTime: ${currentTime.toISOString()}`);
    // Use the updated currentTime from the previous iteration
    // This ensures sequential nodes get properly delayed times
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

