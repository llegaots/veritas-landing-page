// Adapters: Convert between SequenceSpec (graph) and WorkflowSpecV2 (domain model)
// This allows gradual migration while keeping both representations in sync

import { SequenceSpec, SequenceNode, SendSmsNode, SendEmailNode, ConditionNode, WaitNode, EndNode, TriggerNode } from './spec';
import { WorkflowSpecV2, WorkflowStep, SendSmsStep, SendEmailStep, ConditionStep, WaitStep, EndStep, Timing, Condition } from './workflow-v2';

/**
 * Convert SequenceSpec (graph) → WorkflowSpecV2 (domain model)
 * This is a migration function for existing sequences
 */
export function sequenceSpecToWorkflow(seq: SequenceSpec): WorkflowSpecV2 {
  console.log('[Adapter] Converting SequenceSpec to WorkflowSpecV2:', {
    nodes: seq.nodes.length,
    edges: seq.edges.length,
    nodeTypes: seq.nodes.map(n => n.type),
  });
  
  // Find trigger and end nodes
  const triggerNode = seq.nodes.find(n => n.type === 'trigger') as TriggerNode | undefined;
  const endNode = seq.nodes.find(n => n.type === 'end') as EndNode | undefined;
  
  if (!endNode) {
    throw new Error('Sequence must have an end node');
  }
  
  // Convert nodes to steps
  const steps: WorkflowStep[] = [];
  const nodeToStepId = new Map<string, string>();
  
  // First pass: create all step IDs
  seq.nodes.forEach((node) => {
    if (node.type === 'trigger') return; // Trigger is metadata, not a step
    const stepId = node.type === 'end' ? 'end' : `step_${node.id}`;
    nodeToStepId.set(node.id, stepId);
  });
  
  // Second pass: create steps with proper connections
  seq.nodes.forEach((node, idx) => {
    if (node.type === 'trigger') return; // Trigger is metadata, not a step
    
    const stepId = nodeToStepId.get(node.id)!;
    
    if (node.type === 'send_sms') {
      const smsNode = node as SendSmsNode;
      const timing: Timing | undefined = smsNode.timing ? parseTimingString(smsNode.timing) : undefined;
      
      // Find outgoing edges
      const outgoing = seq.edges.filter(e => e.from === node.id);
      const nextEdge = outgoing.find(e => e.to !== endNode.id);
      const noResponseEdge = outgoing.find(e => e.to === endNode.id && outgoing.length > 1);
      
      console.log('[Adapter] Converting send_sms node:', {
        nodeId: node.id,
        stepId,
        outgoing: outgoing.length,
        nextEdge: nextEdge ? { from: nextEdge.from, to: nextEdge.to } : null,
        nextStepId: nextEdge ? nodeToStepId.get(nextEdge.to) : undefined,
      });
      
      const step: SendSmsStep = {
        id: stepId,
        type: 'send_sms',
        message: smsNode.content || '',
        timing,
        next: nextEdge ? nodeToStepId.get(nextEdge.to) : undefined,
        onNoResponse: noResponseEdge ? 'end' : undefined,
      };
      steps.push(step);
    } else if (node.type === 'send_email') {
      const emailNode = node as SendEmailNode;
      const timing: Timing | undefined = emailNode.timing ? parseTimingString(emailNode.timing) : undefined;
      
      // Find outgoing edges
      const outgoing = seq.edges.filter(e => e.from === node.id);
      const nextEdge = outgoing.find(e => e.to !== endNode.id);
      const noResponseEdge = outgoing.find(e => e.to === endNode.id && outgoing.length > 1);
      
      console.log('[Adapter] Converting send_email node:', {
        nodeId: node.id,
        stepId,
        outgoing: outgoing.length,
        nextEdge: nextEdge ? { from: nextEdge.from, to: nextEdge.to } : null,
        nextStepId: nextEdge ? nodeToStepId.get(nextEdge.to) : undefined,
      });
      
      const step: SendEmailStep = {
        id: stepId,
        type: 'send_email',
        subject: emailNode.subject || '',
        html_content: emailNode.html_content || '',
        text_content: emailNode.text_content,
        timing,
        next: nextEdge ? nodeToStepId.get(nextEdge.to) : undefined,
        onNoResponse: noResponseEdge ? 'end' : undefined,
      };
      steps.push(step);
    } else if (node.type === 'condition') {
      const condNode = node as ConditionNode;
      const outgoing = seq.edges.filter(e => e.from === node.id);
      const trueEdge = outgoing.find(e => e.label === 'true');
      const falseEdge = outgoing.find(e => e.label === 'false');
      
      // If no labeled edges, use first two
      const ifTrueId = trueEdge ? nodeToStepId.get(trueEdge.to) : (outgoing[0] ? nodeToStepId.get(outgoing[0].to) : 'end');
      const ifFalseId = falseEdge ? nodeToStepId.get(falseEdge.to) : (outgoing[1] ? nodeToStepId.get(outgoing[1].to) : 'end');
      
      const step: ConditionStep = {
        id: stepId,
        type: 'condition',
        condition: condNode.condition || { field: '', operator: 'equals', value: '' },
        ifTrue: ifTrueId || 'end',
        ifFalse: ifFalseId || 'end',
      };
      steps.push(step);
    } else if (node.type === 'wait') {
      const waitNode = node as WaitNode;
      const timing = parseTimingString(waitNode.duration || '1 hour');
      const outgoing = seq.edges.find(e => e.from === node.id);
      
      const step: WaitStep = {
        id: stepId,
        type: 'wait',
        timing,
        next: outgoing ? nodeToStepId.get(outgoing.to) : 'end',
      };
      steps.push(step);
    } else if (node.type === 'end') {
      steps.push({ id: 'end', type: 'end' });
    }
  });
  
  // Ensure end step exists
  if (!steps.find(s => s.type === 'end')) {
    steps.push({ id: 'end', type: 'end' });
  }
  
  // Build workflow from trigger
  const trigger = triggerNode ? { type: seq.trigger.type, filters: seq.trigger.filters } : seq.trigger;
  
  return {
    specVersion: 2,
    trigger,
    variables: seq.variables || {},
    steps,
    metadata: seq.metadata,
    layoutOverrides: {
      positions: seq.ui?.positions,
      zoom: seq.ui?.zoom,
    },
  };
}

/**
 * Convert WorkflowSpecV2 (domain model) → GraphSpec (for React Flow rendering)
 * This creates a graph representation purely for visualization
 */
export interface GraphNode {
  id: string;
  type: string;
  data: any;
  position: { x: number; y: number };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: string;
}

export interface GraphSpec {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function workflowToGraph(
  workflow: WorkflowSpecV2, 
  layoutPositions?: Record<string, { x: number; y: number }>,
  originalSpec?: { edges: Array<{ from: string; to: string; label?: string }> }
): GraphSpec {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  
  // Build mapping from step ID back to original node ID
  // Step IDs are like "step_send_sms_123" for node "send_sms_123"
  const stepIdToNodeId = new Map<string, string>();
  workflow.steps.forEach(step => {
    if (step.id.startsWith('step_')) {
      // Extract original node ID: "step_send_sms_123" -> "send_sms_123"
      const originalNodeId = step.id.replace(/^step_/, '');
      stepIdToNodeId.set(step.id, originalNodeId);
    } else {
      // For "end" and other non-prefixed IDs, use as-is
      stepIdToNodeId.set(step.id, step.id);
    }
  });
  
  // Add trigger node (visual only, not in steps)
  const triggerPos = layoutPositions?.['trigger'] || workflow.layoutOverrides?.positions?.['trigger'];
  nodes.push({
    id: 'trigger',
    type: 'trigger',
    data: { type: 'trigger', trigger: workflow.trigger },
    position: (triggerPos as { x: number; y: number }) || { x: 0, y: 0 },
  });
  
  // Convert steps to nodes
  workflow.steps.forEach(step => {
    // Try to find position using step ID first, then original node ID
    const originalNodeId = stepIdToNodeId.get(step.id) || step.id;
    const stepPos = layoutPositions?.[step.id] 
      || layoutPositions?.[originalNodeId]
      || workflow.layoutOverrides?.positions?.[step.id]
      || workflow.layoutOverrides?.positions?.[originalNodeId];
    
    const finalPos = (stepPos as { x: number; y: number }) || { x: 0, y: 0 };
    
    console.log('[Adapter] Creating graph node:', {
      stepId: step.id,
      originalNodeId,
      hasLayoutPos: !!layoutPositions?.[step.id] || !!layoutPositions?.[originalNodeId],
      hasOverridePos: !!workflow.layoutOverrides?.positions?.[step.id] || !!workflow.layoutOverrides?.positions?.[originalNodeId],
      finalPosition: finalPos,
    });
    
    nodes.push({
      id: step.id,
      type: step.type,
      data: step,
      position: finalPos,
    });
    
    // Create edges based on step connections
    if (step.type === 'send_sms') {
      if (step.next) {
        edges.push({
          id: `${step.id}-next-${step.next}`,
          source: step.id,
          target: step.next,
          type: 'smoothstep',
        });
      }
      if (step.onNoResponse) {
        edges.push({
          id: `${step.id}-noresponse-${step.onNoResponse}`,
          source: step.id,
          target: step.onNoResponse,
          label: 'no response',
          type: 'smoothstep',
        });
      }
    } else if (step.type === 'send_email') {
      if (step.next) {
        edges.push({
          id: `${step.id}-next-${step.next}`,
          source: step.id,
          target: step.next,
          type: 'smoothstep',
        });
      }
      if (step.onNoResponse) {
        edges.push({
          id: `${step.id}-noresponse-${step.onNoResponse}`,
          source: step.id,
          target: step.onNoResponse,
          label: 'no response',
          type: 'smoothstep',
        });
      }
    } else if (step.type === 'wait') {
      if (step.next) {
        edges.push({
          id: `${step.id}-next-${step.next}`,
          source: step.id,
          target: step.next,
          type: 'smoothstep',
        });
      }
    } else if (step.type === 'condition') {
      edges.push({
        id: `${step.id}-true-${step.ifTrue}`,
        source: step.id,
        target: step.ifTrue,
        label: 'true',
        type: 'smoothstep',
      });
      edges.push({
        id: `${step.id}-false-${step.ifFalse}`,
        source: step.id,
        target: step.ifFalse,
        label: 'false',
        type: 'smoothstep',
      });
    }
  });
  
  // Also include edges directly from the original spec (for manually added connections)
  // This ensures edges that aren't yet reflected in step connections are still visible
  if (originalSpec) {
    const nodeIdToStepId = new Map<string, string>();
    // Build reverse mapping: node ID -> step ID
    workflow.steps.forEach(step => {
      if (step.id.startsWith('step_')) {
        const originalNodeId = step.id.replace(/^step_/, '');
        nodeIdToStepId.set(originalNodeId, step.id);
      } else {
        nodeIdToStepId.set(step.id, step.id);
      }
    });
    nodeIdToStepId.set('trigger', 'trigger');
    nodeIdToStepId.set('end', 'end');
    
    // Add edges from spec, converting node IDs to step IDs
    for (const specEdge of originalSpec.edges) {
      const sourceStepId = nodeIdToStepId.get(specEdge.from) || specEdge.from;
      const targetStepId = nodeIdToStepId.get(specEdge.to) || specEdge.to;
      
      // Check if this edge is already created from step connections
      const alreadyExists = edges.some(
        e => e.source === sourceStepId && e.target === targetStepId
      );
      
      if (!alreadyExists) {
        edges.push({
          id: `${sourceStepId}-${targetStepId}-${specEdge.label || ''}`,
          source: sourceStepId,
          target: targetStepId,
          label: specEdge.label,
          type: 'smoothstep',
        });
        console.log('[Adapter] Added edge from spec:', sourceStepId, '→', targetStepId);
      }
    }
  } else {
    // Fallback: Connect trigger to first step if no spec provided
    if (workflow.steps.length > 0 && workflow.steps[0].type !== 'end') {
      edges.push({
        id: 'trigger-to-first',
        source: 'trigger',
        target: workflow.steps[0].id,
        type: 'smoothstep',
      });
    } else {
      // If only end step, connect trigger to end
      const endStep = workflow.steps.find(s => s.type === 'end');
      if (endStep) {
        edges.push({
          id: 'trigger-to-end',
          source: 'trigger',
          target: endStep.id,
          type: 'smoothstep',
        });
      }
    }
  }
  
  return { nodes, edges };
}

/**
 * Helper: Parse timing string to Timing object
 */
export function parseTimingString(timing: string): Timing {
  const normalized = timing.toLowerCase().trim();
  
  // Handle "Day 1", "Day 2", etc.
  const dayMatch = normalized.match(/^day\s+(\d+)$/);
  if (dayMatch) {
    const dayNumber = parseInt(dayMatch[1], 10);
    return {
      value: dayNumber === 1 ? 0 : dayNumber - 1,
      unit: 'days',
    };
  }
  
  // Handle standard formats: "2 hours", "30 minutes", "3 days"
  const match = normalized.match(/^(\d+)\s*(minute|minutes|min|mins|hour|hours|h|day|days|d)$/);
  if (match) {
    const value = parseInt(match[1], 10);
    const unitStr = match[2];
    
    let unit: 'minutes' | 'hours' | 'days' = 'hours';
    if (unitStr.includes('minute') || unitStr.includes('min')) {
      unit = 'minutes';
    } else if (unitStr.includes('hour') || unitStr === 'h') {
      unit = 'hours';
    } else if (unitStr.includes('day') || unitStr === 'd') {
      unit = 'days';
    }
    
    return { value, unit };
  }
  
  // Default to 1 hour
  return { value: 1, unit: 'hours' };
}

/**
 * Helper: Convert Timing object to string
 */
export function timingToString(timing: Timing): string {
  if (timing.value === 0 && timing.unit === 'days') {
    return 'Day 1';
  }
  if (timing.unit === 'days' && timing.value > 0) {
    return `Day ${timing.value + 1}`;
  }
  return `${timing.value} ${timing.unit}`;
}

