// Compiler V2: WorkflowSpecV2 → Message Jobs
// Works with the new domain model

import { WorkflowSpecV2, WorkflowStep, SendSmsStep, ConditionStep, WaitStep } from './workflow-v2';
import { findStepById } from './workflow-v2';
import { timingToString } from './adapters';

export interface JobContext {
  lead_id: string;
  phone: string;
  [key: string]: any;
}

export interface MessageJob {
  run_id: string;
  node_id: string;
  phone_number: string;
  message_text: string;
  scheduled_for: string; // ISO timestamp
}

/**
 * Parse timing to milliseconds
 */
function parseTiming(timing: { value: number; unit: 'minutes' | 'hours' | 'days' }, phoneNumber?: string): number {
  const TEST_PHONE = '4385017336';
  const isTestPhone = phoneNumber && (
    phoneNumber.includes(TEST_PHONE) || 
    phoneNumber.replace(/\D/g, '').includes(TEST_PHONE)
  );

  const multipliers: Record<string, number> = {
    minutes: 60 * 1000,
    hours: isTestPhone ? 60 * 1000 : 60 * 60 * 1000,
    days: isTestPhone ? 60 * 1000 : 24 * 60 * 60 * 1000,
  };

  return timing.value * (multipliers[timing.unit] || 60 * 60 * 1000);
}

/**
 * Render message with variable substitution
 */
function renderMessage(message: string, context: JobContext): string {
  let rendered = message;
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
 * Evaluate condition
 */
function evaluateCondition(condition: { field: string; operator: string; value: any }, context: JobContext): boolean {
  const fieldValue = context[condition.field] || '';

  switch (condition.operator) {
    case 'equals':
      return String(fieldValue) === String(condition.value);
    case 'not_equals':
      return String(fieldValue) !== String(condition.value);
    case 'contains':
      return String(fieldValue).includes(String(condition.value));
    case 'greater_than':
      return Number(fieldValue) > Number(condition.value);
    case 'less_than':
      return Number(fieldValue) < Number(condition.value);
    default:
      return false;
  }
}

/**
 * Walk workflow and compile jobs
 */
function walkWorkflow(
  workflow: WorkflowSpecV2,
  currentStepId: string,
  currentTime: Date,
  context: JobContext & { run_id: string },
  visited: Set<string>,
  jobs: MessageJob[]
): Date {
  if (visited.has(currentStepId)) {
    return currentTime; // Cycle detected
  }
  visited.add(currentStepId);

  const step = findStepById(workflow, currentStepId);
  if (!step) {
    return currentTime;
  }

  if (step.type === 'send_sms') {
    const smsStep = step as SendSmsStep;
    const renderedMessage = renderMessage(smsStep.message || '', context);
    
    jobs.push({
      run_id: context.run_id,
      node_id: currentStepId,
      phone_number: context.phone,
      message_text: renderedMessage,
      scheduled_for: currentTime.toISOString(),
    });

    // Apply timing before next step
    if (smsStep.timing) {
      const waitMs = parseTiming(smsStep.timing, context.phone);
      currentTime = new Date(currentTime.getTime() + waitMs);
    }

    // Continue to next step
    if (smsStep.next) {
      currentTime = walkWorkflow(workflow, smsStep.next, currentTime, context, visited, jobs);
    } else if (smsStep.onNoResponse) {
      // Could implement no-response logic here
      currentTime = walkWorkflow(workflow, smsStep.onNoResponse, currentTime, context, visited, jobs);
    }
  } else if (step.type === 'wait') {
    const waitStep = step as WaitStep;
    const waitMs = parseTiming(waitStep.timing, context.phone);
    currentTime = new Date(currentTime.getTime() + waitMs);

    if (waitStep.next) {
      currentTime = walkWorkflow(workflow, waitStep.next, currentTime, context, visited, jobs);
    }
  } else if (step.type === 'condition') {
    const condStep = step as ConditionStep;
    const result = evaluateCondition(condStep.condition, context);
    
    const nextStepId = result ? condStep.ifTrue : condStep.ifFalse;
    if (nextStepId) {
      currentTime = walkWorkflow(workflow, nextStepId, currentTime, context, visited, jobs);
    }
  } else if (step.type === 'end') {
    return currentTime; // Stop here
  }

  return currentTime;
}

/**
 * Compile WorkflowSpecV2 to message jobs
 */
export function compileWorkflowToJobs(
  workflow: WorkflowSpecV2,
  runId: string,
  context: JobContext
): MessageJob[] {
  const jobs: MessageJob[] = [];
  const visited = new Set<string>();
  const startTime = new Date();
  
  const fullContext: JobContext & { run_id: string } = { ...context, run_id: runId };

  // Start from first step (after trigger)
  if (workflow.steps.length > 0) {
    const firstStep = workflow.steps[0];
    if (firstStep.type !== 'end') {
      walkWorkflow(workflow, firstStep.id, startTime, fullContext, visited, jobs);
    }
  }

  return jobs;
}


