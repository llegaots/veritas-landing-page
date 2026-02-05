// WorkflowSpecV2 - Domain Model (Canonical)
// This is the source of truth for SMS sequences
// Graph representation is derived from this model

import { z } from 'zod';

// Timing specification
export const TimingSchema = z.object({
  value: z.number(),
  unit: z.enum(['minutes', 'hours', 'days']),
  condition: z.string().optional(), // e.g., "if no response"
});

export type Timing = z.infer<typeof TimingSchema>;

// Condition specification
export const ConditionSchema = z.object({
  field: z.string(),
  operator: z.enum(['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'not_contains']),
  value: z.any(),
});

export type Condition = z.infer<typeof ConditionSchema>;

// Step types
export const SendSmsStepSchema = z.object({
  id: z.string(),
  type: z.literal('send_sms'),
  message: z.string(),
  timing: TimingSchema.optional(),
  next: z.string().optional(), // stepId
  onNoResponse: z.string().optional(), // stepId (alternative path)
});

export const ConditionStepSchema = z.object({
  id: z.string(),
  type: z.literal('condition'),
  condition: ConditionSchema,
  ifTrue: z.string(), // stepId
  ifFalse: z.string(), // stepId
});

export const WaitStepSchema = z.object({
  id: z.string(),
  type: z.literal('wait'),
  timing: TimingSchema,
  next: z.string().optional(), // stepId
});

export const SendEmailStepSchema = z.object({
  id: z.string(),
  type: z.literal('send_email'),
  subject: z.string(),
  html_content: z.string(),
  text_content: z.string().optional(),
  timing: TimingSchema.optional(),
  next: z.string().optional(), // stepId
  onNoResponse: z.string().optional(), // stepId (alternative path)
});

export const EndStepSchema = z.object({
  id: z.string(),
  type: z.literal('end'),
});

export const WorkflowStepSchema = z.discriminatedUnion('type', [
  SendSmsStepSchema,
  SendEmailStepSchema,
  ConditionStepSchema,
  WaitStepSchema,
  EndStepSchema,
]);

export type SendSmsStep = z.infer<typeof SendSmsStepSchema>;
export type SendEmailStep = z.infer<typeof SendEmailStepSchema>;
export type ConditionStep = z.infer<typeof ConditionStepSchema>;
export type WaitStep = z.infer<typeof WaitStepSchema>;
export type EndStep = z.infer<typeof EndStepSchema>;
export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;

// Trigger
export const TriggerSchema = z.object({
  type: z.enum(['lead.created', 'lead.demo_booked', 'investor.matched', 'manual']),
  filters: z.record(z.string(), z.any()).optional(),
});

export type Trigger = z.infer<typeof TriggerSchema>;

// Metadata
export const MetadataSchema = z.object({
  name: z.string(),
  status: z.enum(['draft', 'active', 'archived']),
  version: z.number(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Metadata = z.infer<typeof MetadataSchema>;

// Layout overrides (optional, can be dropped)
export const LayoutOverridesSchema = z.object({
  positions: z.record(z.string(), z.object({ x: z.number(), y: z.number() })).optional(),
  zoom: z.number().optional(),
  collapsed: z.array(z.string()).optional(),
});

export type LayoutOverrides = z.infer<typeof LayoutOverridesSchema>;

// Main WorkflowSpecV2
export const WorkflowSpecV2Schema = z.object({
  specVersion: z.literal(2),
  trigger: TriggerSchema,
  variables: z.record(z.string(), z.string()),
  steps: z.array(WorkflowStepSchema).min(1), // At least trigger + steps
  metadata: MetadataSchema,
  layoutOverrides: LayoutOverridesSchema.optional(),
});

export type WorkflowSpecV2 = z.infer<typeof WorkflowSpecV2Schema>;

// Helper functions
export function createEmptyWorkflow(name: string, createdBy: string = 'system'): WorkflowSpecV2 {
  const endStep: EndStep = { id: 'end', type: 'end' };
  
  return {
    specVersion: 2,
    trigger: { type: 'manual' },
    variables: {},
    steps: [endStep],
    metadata: {
      name,
      status: 'draft',
      version: 1,
      createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
}

export function findStepById(workflow: WorkflowSpecV2, stepId: string): WorkflowStep | undefined {
  return workflow.steps.find(s => s.id === stepId);
}

export function getTriggerStep(workflow: WorkflowSpecV2): WorkflowStep | undefined {
  // In V2, trigger is metadata, not a step
  // First step after trigger is the entry point
  return workflow.steps[0];
}

export function getEndStep(workflow: WorkflowSpecV2): EndStep | undefined {
  return workflow.steps.find(s => s.type === 'end') as EndStep | undefined;
}

// Validation helpers
export function validateWorkflowInvariants(workflow: WorkflowSpecV2): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Must have exactly one end step
  const endSteps = workflow.steps.filter(s => s.type === 'end');
  if (endSteps.length === 0) {
    errors.push('Workflow must have exactly one end step');
  } else if (endSteps.length > 1) {
    errors.push('Workflow must have exactly one end step');
  }
  
  // All step references must exist
  const stepIds = new Set(workflow.steps.map(s => s.id));
  
  workflow.steps.forEach(step => {
    if (step.type === 'send_sms') {
      if (step.next && !stepIds.has(step.next)) {
        errors.push(`Step ${step.id} references non-existent next step: ${step.next}`);
      }
      if (step.onNoResponse && !stepIds.has(step.onNoResponse)) {
        errors.push(`Step ${step.id} references non-existent onNoResponse step: ${step.onNoResponse}`);
      }
    } else if (step.type === 'send_email') {
      if (step.next && !stepIds.has(step.next)) {
        errors.push(`Step ${step.id} references non-existent next step: ${step.next}`);
      }
      if (step.onNoResponse && !stepIds.has(step.onNoResponse)) {
        errors.push(`Step ${step.id} references non-existent onNoResponse step: ${step.onNoResponse}`);
      }
    } else if (step.type === 'wait') {
      if (step.next && !stepIds.has(step.next)) {
        errors.push(`Step ${step.id} references non-existent next step: ${step.next}`);
      }
    } else if (step.type === 'condition') {
      if (!stepIds.has(step.ifTrue)) {
        errors.push(`Condition step ${step.id} references non-existent ifTrue step: ${step.ifTrue}`);
      }
      if (!stepIds.has(step.ifFalse)) {
        errors.push(`Condition step ${step.id} references non-existent ifFalse step: ${step.ifFalse}`);
      }
    }
  });
  
  // All steps must be reachable (BFS from first step)
  const reachable = new Set<string>();
  const queue: string[] = [];
  
  // Start from first step (after trigger)
  if (workflow.steps.length > 0) {
    queue.push(workflow.steps[0].id);
    reachable.add(workflow.steps[0].id);
  }
  
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const step = findStepById(workflow, currentId);
    if (!step) continue;
    
    if (step.type === 'send_sms') {
      if (step.next && !reachable.has(step.next)) {
        reachable.add(step.next);
        queue.push(step.next);
      }
      if (step.onNoResponse && !reachable.has(step.onNoResponse)) {
        reachable.add(step.onNoResponse);
        queue.push(step.onNoResponse);
      }
    } else if (step.type === 'send_email') {
      if (step.next && !reachable.has(step.next)) {
        reachable.add(step.next);
        queue.push(step.next);
      }
      if (step.onNoResponse && !reachable.has(step.onNoResponse)) {
        reachable.add(step.onNoResponse);
        queue.push(step.onNoResponse);
      }
    } else if (step.type === 'wait') {
      if (step.next && !reachable.has(step.next)) {
        reachable.add(step.next);
        queue.push(step.next);
      }
    } else if (step.type === 'condition') {
      if (!reachable.has(step.ifTrue)) {
        reachable.add(step.ifTrue);
        queue.push(step.ifTrue);
      }
      if (!reachable.has(step.ifFalse)) {
        reachable.add(step.ifFalse);
        queue.push(step.ifFalse);
      }
    }
  }
  
  const unreachable = workflow.steps.filter(s => !reachable.has(s.id) && s.type !== 'end');
  if (unreachable.length > 0) {
    errors.push(`Unreachable steps: ${unreachable.map(s => s.id).join(', ')}`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

