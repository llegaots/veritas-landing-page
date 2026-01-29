// Compiler: SequenceSpec → Message Jobs
// Deterministic compiler that converts a sequence spec into scheduled message jobs

import { SequenceSpec, SequenceNode, SendSmsNode, WaitNode, ConditionNode } from './spec';
import { getOutgoingEdges } from './spec';

export interface JobContext {
  lead_id: string;
  phone: string;
  [key: string]: any; // Additional context variables
}

export interface MessageJob {
  run_id: string;
  node_id: string;
  phone_number: string;
  message_text: string;
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
 * Parse duration string (e.g., "1 hour", "2 days", "30 minutes") to milliseconds
 * For testing: converts hours/days to minutes for test phone number (4385017336)
 */
function parseDuration(duration: string, phoneNumber?: string): number {
  const normalized = duration.toLowerCase().trim();
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
 * Render SMS content with variable substitution
 */
function renderSmsContent(content: string, context: JobContext): string {
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
    const renderedContent = renderSmsContent(smsNode.content || '', context);
    
    jobs.push({
      run_id: context.run_id as string,
      node_id: currentNodeId,
      phone_number: context.phone,
      message_text: renderedContent,
      scheduled_for: currentTime.toISOString(),
    });
  } else if (node.type === 'wait') {
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
  for (const edge of outgoingEdges) {
    currentTime = walkGraph(spec, edge.to, currentTime, context, visited, jobs);
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

