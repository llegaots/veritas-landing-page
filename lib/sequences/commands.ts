// Command Pattern for Workflow Edits
// Each command produces forward/inverse patches and validates invariants

import { JSONPatchOperation } from './patches';
import { WorkflowSpecV2, WorkflowStep, SendSmsStep, ConditionStep, validateWorkflowInvariants } from './workflow-v2';
import { findStepById } from './workflow-v2';

export interface Command {
  execute(workflow: WorkflowSpecV2): {
    forward: JSONPatchOperation[];
    inverse: JSONPatchOperation[];
    workflow: WorkflowSpecV2;
  };
  validate?(workflow: WorkflowSpecV2): { valid: boolean; errors: string[] };
}

/**
 * Add a new step to the workflow
 */
export class AddStepCommand implements Command {
  constructor(
    private step: WorkflowStep,
    private afterStepId?: string // Insert after this step
  ) {}

  execute(workflow: WorkflowSpecV2) {
    const stepIndex = workflow.steps.length;
    const forward: JSONPatchOperation[] = [
      {
        op: 'add',
        path: `/steps/${stepIndex}`,
        value: this.step,
      },
    ];

    const inverse: JSONPatchOperation[] = [
      {
        op: 'remove',
        path: `/steps/${stepIndex}`,
      },
    ];

    // Apply forward patch
    const updated = applyPatches(workflow, forward);

    return { forward, inverse, workflow: updated };
  }

  validate(workflow: WorkflowSpecV2) {
    // Check for duplicate IDs
    if (workflow.steps.some(s => s.id === this.step.id)) {
      return { valid: false, errors: [`Step ID ${this.step.id} already exists`] };
    }

    // If inserting after a step, verify it exists
    if (this.afterStepId && !findStepById(workflow, this.afterStepId)) {
      return { valid: false, errors: [`Step ${this.afterStepId} not found`] };
    }

    return { valid: true, errors: [] };
  }
}

/**
 * Remove a step from the workflow
 */
export class RemoveStepCommand implements Command {
  constructor(private stepId: string) {}

  execute(workflow: WorkflowSpecV2) {
    const stepIndex = workflow.steps.findIndex(s => s.id === this.stepId);
    if (stepIndex === -1) {
      throw new Error(`Step ${this.stepId} not found`);
    }

    const step = workflow.steps[stepIndex];
    const forward: JSONPatchOperation[] = [
      {
        op: 'remove',
        path: `/steps/${stepIndex}`,
      },
    ];

    const inverse: JSONPatchOperation[] = [
      {
        op: 'add',
        path: `/steps/${stepIndex}`,
        value: step,
      },
    ];

    // Remove references to this step
    workflow.steps.forEach((s, idx) => {
      if (s.type === 'send_sms') {
        if (s.next === this.stepId) {
          forward.push({
            op: 'replace',
            path: `/steps/${idx}/next`,
            value: undefined,
          });
          inverse.push({
            op: 'replace',
            path: `/steps/${idx}/next`,
            value: this.stepId,
          });
        }
        if (s.onNoResponse === this.stepId) {
          forward.push({
            op: 'replace',
            path: `/steps/${idx}/onNoResponse`,
            value: undefined,
          });
          inverse.push({
            op: 'replace',
            path: `/steps/${idx}/onNoResponse`,
            value: this.stepId,
          });
        }
      } else if (s.type === 'wait') {
        if (s.next === this.stepId) {
          forward.push({
            op: 'replace',
            path: `/steps/${idx}/next`,
            value: undefined,
          });
          inverse.push({
            op: 'replace',
            path: `/steps/${idx}/next`,
            value: this.stepId,
          });
        }
      } else if (s.type === 'condition') {
        if (s.ifTrue === this.stepId) {
          forward.push({
            op: 'replace',
            path: `/steps/${idx}/ifTrue`,
            value: 'end', // Default to end
          });
          inverse.push({
            op: 'replace',
            path: `/steps/${idx}/ifTrue`,
            value: this.stepId,
          });
        }
        if (s.ifFalse === this.stepId) {
          forward.push({
            op: 'replace',
            path: `/steps/${idx}/ifFalse`,
            value: 'end',
          });
          inverse.push({
            op: 'replace',
            path: `/steps/${idx}/ifFalse`,
            value: this.stepId,
          });
        }
      }
    });

    const updated = applyPatches(workflow, forward);

    return { forward, inverse, workflow: updated };
  }

  validate(workflow: WorkflowSpecV2) {
    const step = findStepById(workflow, this.stepId);
    if (!step) {
      return { valid: false, errors: [`Step ${this.stepId} not found`] };
    }

    // Can't remove end step
    if (step.type === 'end') {
      return { valid: false, errors: ['Cannot remove end step'] };
    }

    return { valid: true, errors: [] };
  }
}

/**
 * Update message content in a SendSms step
 */
export class UpdateMessageCommand implements Command {
  constructor(
    private stepId: string,
    private message: string
  ) {}

  execute(workflow: WorkflowSpecV2) {
    const stepIndex = workflow.steps.findIndex(s => s.id === this.stepId);
    if (stepIndex === -1) {
      throw new Error(`Step ${this.stepId} not found`);
    }

    const step = workflow.steps[stepIndex];
    if (step.type !== 'send_sms') {
      throw new Error(`Step ${this.stepId} is not a send_sms step`);
    }

    const oldMessage = step.message;
    const forward: JSONPatchOperation[] = [
      {
        op: 'replace',
        path: `/steps/${stepIndex}/message`,
        value: this.message,
      },
    ];

    const inverse: JSONPatchOperation[] = [
      {
        op: 'replace',
        path: `/steps/${stepIndex}/message`,
        value: oldMessage,
      },
    ];

    const updated = applyPatches(workflow, forward);

    return { forward, inverse, workflow: updated };
  }
}

/**
 * Update timing for a step
 */
export class UpdateTimingCommand implements Command {
  constructor(
    private stepId: string,
    private timing: { value: number; unit: 'minutes' | 'hours' | 'days' } | undefined
  ) {}

  execute(workflow: WorkflowSpecV2) {
    const stepIndex = workflow.steps.findIndex(s => s.id === this.stepId);
    if (stepIndex === -1) {
      throw new Error(`Step ${this.stepId} not found`);
    }

    const step = workflow.steps[stepIndex];
    if (step.type !== 'send_sms' && step.type !== 'wait') {
      throw new Error(`Step ${this.stepId} does not support timing`);
    }

    const oldTiming = step.type === 'send_sms' ? step.timing : (step as any).timing;
    const forward: JSONPatchOperation[] = [
      {
        op: this.timing ? 'replace' : 'remove',
        path: `/steps/${stepIndex}/timing`,
        value: this.timing,
      },
    ];

    const inverse: JSONPatchOperation[] = [
      {
        op: oldTiming ? 'replace' : 'add',
        path: `/steps/${stepIndex}/timing`,
        value: oldTiming,
      },
    ];

    const updated = applyPatches(workflow, forward);

    return { forward, inverse, workflow: updated };
  }
}

/**
 * Connect two steps
 */
export class ConnectStepCommand implements Command {
  constructor(
    private fromStepId: string,
    private toStepId: string,
    private connectionType: 'next' | 'onNoResponse' | 'ifTrue' | 'ifFalse' = 'next'
  ) {}

  execute(workflow: WorkflowSpecV2) {
    const fromIndex = workflow.steps.findIndex(s => s.id === this.fromStepId);
    if (fromIndex === -1) {
      throw new Error(`Step ${this.fromStepId} not found`);
    }

    const fromStep = workflow.steps[fromIndex];
    const oldValue = (fromStep as any)[this.connectionType];

    const forward: JSONPatchOperation[] = [
      {
        op: 'replace',
        path: `/steps/${fromIndex}/${this.connectionType}`,
        value: this.toStepId,
      },
    ];

    const inverse: JSONPatchOperation[] = [
      {
        op: oldValue ? 'replace' : 'remove',
        path: `/steps/${fromIndex}/${this.connectionType}`,
        value: oldValue,
      },
    ];

    const updated = applyPatches(workflow, forward);

    return { forward, inverse, workflow: updated };
  }

  validate(workflow: WorkflowSpecV2) {
    if (!findStepById(workflow, this.fromStepId)) {
      return { valid: false, errors: [`Step ${this.fromStepId} not found`] };
    }
    if (!findStepById(workflow, this.toStepId)) {
      return { valid: false, errors: [`Step ${this.toStepId} not found`] };
    }

    const fromStep = findStepById(workflow, this.fromStepId)!;
    
    // Validate connection type matches step type
    if (this.connectionType === 'ifTrue' || this.connectionType === 'ifFalse') {
      if (fromStep.type !== 'condition') {
        return { valid: false, errors: ['ifTrue/ifFalse only valid for condition steps'] };
      }
    } else if (this.connectionType === 'next' || this.connectionType === 'onNoResponse') {
      if (fromStep.type !== 'send_sms' && fromStep.type !== 'wait') {
        return { valid: false, errors: ['next/onNoResponse only valid for send_sms/wait steps'] };
      }
    }

    return { valid: true, errors: [] };
  }
}

/**
 * Helper: Apply patches to workflow (simplified)
 */
function applyPatches(workflow: WorkflowSpecV2, patches: JSONPatchOperation[]): WorkflowSpecV2 {
  // Use fast-json-patch
  const { applyPatch } = require('fast-json-patch');
  const result = applyPatch(workflow, patches, false, false);
  const lastResult = result[result.length - 1];
  const finalDoc = (lastResult as any).newDocument || lastResult;
  return finalDoc as WorkflowSpecV2;
}

/**
 * Execute command with validation
 */
export function executeCommand(
  workflow: WorkflowSpecV2,
  command: Command
): { workflow: WorkflowSpecV2; ops: JSONPatchOperation[]; errors: string[] } {
  // Validate command
  if (command.validate) {
    const validation = command.validate(workflow);
    if (!validation.valid) {
      return { workflow, ops: [], errors: validation.errors };
    }
  }

  // Execute command
  const { forward, workflow: updated } = command.execute(workflow);

  // Validate result
  const invariantCheck = validateWorkflowInvariants(updated);
  if (!invariantCheck.valid) {
    return { workflow, ops: [], errors: invariantCheck.errors };
  }

  return { workflow: updated, ops: forward, errors: [] };
}

