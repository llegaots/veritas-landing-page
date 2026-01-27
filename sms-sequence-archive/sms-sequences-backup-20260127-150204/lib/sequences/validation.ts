// Validation schemas and business rules for SequenceSpec
import { z } from 'zod';
import { SequenceSpec, SequenceNode, SequenceEdge } from './spec';

// Zod schemas
export const TriggerSchema = z.object({
  type: z.enum(['lead.created', 'lead.demo_booked', 'investor.matched', 'manual']),
  filters: z.record(z.string(), z.any()).optional(),
});

export const NodePositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const SequenceUISchema = z.object({
  positions: z.record(z.string(), NodePositionSchema),
  zoom: z.number().min(0.1).max(5),
  selectedNode: z.string().optional(),
});

export const SequenceMetadataSchema = z.object({
  name: z.string().min(1).max(200),
  status: z.enum(['draft', 'active', 'archived']),
  version: z.number().int().positive(),
  createdBy: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Node schemas
export const TriggerNodeSchema = z.object({
  id: z.string(),
  type: z.literal('trigger'),
});

export const SendSmsNodeSchema = z.object({
  id: z.string(),
  type: z.literal('send_sms'),
  content: z.string().min(1).max(1600), // SMS max length
  variables: z.record(z.string(), z.string()).optional(),
  timing: z.string().optional(),
});

export const WaitNodeSchema = z.object({
  id: z.string(),
  type: z.literal('wait'),
  duration: z.string().regex(/^\d+\s*(hour|hours|day|days|week|weeks|minute|minutes)$/i, {
    message: 'Duration must be in format like "2 hours", "1 day", "3 weeks"',
  }),
});

export const ConditionNodeSchema = z.object({
  id: z.string(),
  type: z.literal('condition'),
  condition: z.object({
    field: z.string(),
    operator: z.enum(['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'not_contains']),
    value: z.any(),
  }),
  truePath: z.string().optional(),
  falsePath: z.string().optional(),
});

export const EndNodeSchema = z.object({
  id: z.string(),
  type: z.literal('end'),
});

export const SequenceNodeSchema = z.discriminatedUnion('type', [
  TriggerNodeSchema,
  SendSmsNodeSchema,
  WaitNodeSchema,
  ConditionNodeSchema,
  EndNodeSchema,
]);

export const SequenceEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  label: z.string().optional(),
});

export const SequenceSpecSchema = z.object({
  trigger: TriggerSchema,
  variables: z.record(z.string(), z.string()),
  nodes: z.array(SequenceNodeSchema).min(2), // At least trigger + end
  edges: z.array(SequenceEdgeSchema),
  ui: SequenceUISchema,
  metadata: SequenceMetadataSchema,
});

// Validation result
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// Schema validation
export function validateSchema(spec: SequenceSpec): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    SequenceSpecSchema.parse(spec);
  } catch (error) {
    if (error instanceof z.ZodError) {
      errors.push(...error.issues.map((e) => `${e.path.join('.')}: ${e.message}`));
    } else {
      errors.push(`Schema validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// Business rule validation
export function validateBusinessRules(spec: SequenceSpec): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Must have exactly one trigger node
  const triggerNodes = spec.nodes.filter((n) => n.type === 'trigger');
  if (triggerNodes.length === 0) {
    errors.push('Sequence must have exactly one trigger node');
  } else if (triggerNodes.length > 1) {
    errors.push('Sequence must have exactly one trigger node');
  }

  // Must have exactly one end node
  const endNodes = spec.nodes.filter((n) => n.type === 'end');
  if (endNodes.length === 0) {
    errors.push('Sequence must have exactly one end node');
  } else if (endNodes.length > 1) {
    errors.push('Sequence must have exactly one end node');
  }

  // All nodes must be reachable from trigger
  const triggerNode = triggerNodes[0];
  if (triggerNode) {
    const reachable = new Set<string>(['trigger']);
    const queue: string[] = ['trigger'];
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      const outgoing = spec.edges.filter((e) => e.from === current);
      for (const edge of outgoing) {
        if (!reachable.has(edge.to)) {
          reachable.add(edge.to);
          queue.push(edge.to);
        }
      }
    }

    const unreachable = spec.nodes.filter((n) => !reachable.has(n.id));
    if (unreachable.length > 0) {
      errors.push(`Unreachable nodes: ${unreachable.map((n) => n.id).join(', ')}`);
    }
  }

  // All edges must reference valid nodes
  const nodeIds = new Set(spec.nodes.map((n) => n.id));
  for (const edge of spec.edges) {
    if (!nodeIds.has(edge.from)) {
      errors.push(`Edge references non-existent source node: ${edge.from}`);
    }
    if (!nodeIds.has(edge.to)) {
      errors.push(`Edge references non-existent target node: ${edge.to}`);
    }
  }

  // SMS nodes must have content
  const smsNodes = spec.nodes.filter((n) => n.type === 'send_sms') as Array<{ id: string; content: string }>;
  for (const node of smsNodes) {
    if (!node.content || node.content.trim().length === 0) {
      errors.push(`SMS node ${node.id} must have content`);
    }
    if (node.content.length > 1600) {
      warnings.push(`SMS node ${node.id} content exceeds 1600 characters (may be split into multiple messages)`);
    }
  }

  // Wait nodes must have valid duration
  const waitNodes = spec.nodes.filter((n) => n.type === 'wait') as Array<{ id: string; duration: string }>;
  for (const node of waitNodes) {
    if (!node.duration || node.duration.trim().length === 0) {
      errors.push(`Wait node ${node.id} must have a duration`);
    }
  }

  // Condition nodes must have valid paths
  const conditionNodes = spec.nodes.filter((n) => n.type === 'condition') as Array<{
    id: string;
    truePath?: string;
    falsePath?: string;
  }>;
  for (const node of conditionNodes) {
    if (!node.truePath && !node.falsePath) {
      warnings.push(`Condition node ${node.id} has no paths defined`);
    }
    if (node.truePath && !nodeIds.has(node.truePath)) {
      errors.push(`Condition node ${node.id} truePath references non-existent node: ${node.truePath}`);
    }
    if (node.falsePath && !nodeIds.has(node.falsePath)) {
      errors.push(`Condition node ${node.id} falsePath references non-existent node: ${node.falsePath}`);
    }
  }

  // Check for cycles (with max depth to prevent infinite loops)
  const maxDepth = 50;
  function checkCycle(startNodeId: string): boolean {
    const visited = new Set<string>();
    const depth: Record<string, number> = {};
    const queue: Array<{ nodeId: string; depth: number }> = [{ nodeId: startNodeId, depth: 0 }];

    while (queue.length > 0) {
      const { nodeId, depth: currentDepth } = queue.shift()!;
      
      if (currentDepth > maxDepth) {
        return true; // Cycle detected (too deep)
      }

      if (visited.has(nodeId)) {
        if (depth[nodeId] !== currentDepth) {
          return true; // Cycle detected
        }
        continue;
      }

      visited.add(nodeId);
      depth[nodeId] = currentDepth;

      const outgoing = spec.edges.filter((e) => e.from === nodeId);
      for (const edge of outgoing) {
        queue.push({ nodeId: edge.to, depth: currentDepth + 1 });
      }
    }

    return false;
  }

  if (triggerNode && checkCycle(triggerNode.id)) {
    warnings.push('Sequence contains cycles - ensure they are intentional and have exit conditions');
  }

  // Check for opt-out language (business rule)
  const allSmsContent = smsNodes.map((n) => n.content.toLowerCase()).join(' ');
  const optOutKeywords = ['stop', 'unsubscribe', 'opt-out', 'opt out', 'cancel'];
  const hasOptOut = optOutKeywords.some((keyword) => allSmsContent.includes(keyword));
  if (!hasOptOut && smsNodes.length > 0) {
    warnings.push('Consider including opt-out language in at least one message (e.g., "Reply STOP to unsubscribe")');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// Full validation (schema + business rules)
export function validateSequenceSpec(spec: SequenceSpec): ValidationResult {
  const schemaResult = validateSchema(spec);
  const businessResult = validateBusinessRules(spec);

  return {
    valid: schemaResult.valid && businessResult.valid,
    errors: [...schemaResult.errors, ...businessResult.errors],
    warnings: [...schemaResult.warnings, ...businessResult.warnings],
  };
}

