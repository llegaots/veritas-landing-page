// SequenceSpec - Canonical workflow contract
// This is the single source of truth for SMS sequences

export type TriggerType = 'lead.created' | 'lead.demo_booked' | 'investor.matched' | 'manual';

export interface Trigger {
  type: TriggerType;
  filters?: Record<string, any>; // e.g., { source: 'facebook', intent_score_min: 5 }
}

export interface NodePosition {
  x: number;
  y: number;
}

export interface SequenceUI {
  positions: Record<string, NodePosition>; // nodeId -> position
  zoom: number;
  selectedNode?: string;
}

export interface SequenceMetadata {
  name: string;
  status: 'draft' | 'active' | 'archived';
  version: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Node Types
export interface BaseNode {
  id: string;
  type: string;
}

export interface TriggerNode extends BaseNode {
  type: 'trigger';
}

export interface SendSmsNode extends BaseNode {
  type: 'send_sms';
  content: string; // SMS message text with variable placeholders
  variables?: Record<string, string>; // Variable definitions for this node
  timing?: string; // Optional timing override (e.g., "2 hours", "Day 1")
}

export interface SendEmailNode extends BaseNode {
  type: 'send_email';
  subject: string; // Email subject line with variable placeholders
  html_content: string; // HTML email content with variable placeholders
  text_content?: string; // Plain text fallback (optional)
  variables?: Record<string, string>; // Variable definitions for this node
  timing?: string; // Optional timing override (e.g., "2 hours", "Day 1")
}

export interface WaitNode extends BaseNode {
  type: 'wait';
  duration: string; // e.g., "2 hours", "Day 1", "1 week", "3 days"
}

export interface ConditionNode extends BaseNode {
  type: 'condition';
  condition: {
    field: string; // e.g., "lead.source", "lead.intent_score"
    operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains';
    value: any;
  };
  truePath?: string; // nodeId to go to if condition is true
  falsePath?: string; // nodeId to go to if condition is false
}

export interface EndNode extends BaseNode {
  type: 'end';
}

export type SequenceNode = TriggerNode | SendSmsNode | SendEmailNode | WaitNode | ConditionNode | EndNode;

export interface SequenceEdge {
  from: string; // source nodeId
  to: string; // target nodeId
  label?: string; // optional label (e.g., "true", "false" for conditions)
}

// Main SequenceSpec interface
export interface SequenceSpec {
  trigger: Trigger;
  variables: Record<string, string>; // e.g., { firstName: '{{lead.first_name}}', source: '{{lead.source}}' }
  nodes: SequenceNode[];
  edges: SequenceEdge[];
  ui: SequenceUI;
  metadata: SequenceMetadata;
}

// Helper functions
export function createEmptySpec(name: string, createdBy: string = 'system'): SequenceSpec {
  const triggerNode: TriggerNode = { id: 'trigger', type: 'trigger' };
  const endNode: EndNode = { id: 'end', type: 'end' };
  
  return {
    trigger: { type: 'manual' },
    variables: {},
    nodes: [triggerNode, endNode],
    edges: [{ from: 'trigger', to: 'end' }],
    ui: {
      positions: {
        trigger: { x: 100, y: 100 },
        end: { x: 100, y: 300 },
      },
      zoom: 1,
    },
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

export function findNodeById(spec: SequenceSpec, nodeId: string): SequenceNode | undefined {
  return spec.nodes.find((n) => n.id === nodeId);
}

export function getNodeType(spec: SequenceSpec, nodeId: string): string | undefined {
  return findNodeById(spec, nodeId)?.type;
}

export function getOutgoingEdges(spec: SequenceSpec, nodeId: string): SequenceEdge[] {
  return spec.edges.filter((e) => e.from === nodeId);
}

export function getIncomingEdges(spec: SequenceSpec, nodeId: string): SequenceEdge[] {
  return spec.edges.filter((e) => e.to === nodeId);
}

