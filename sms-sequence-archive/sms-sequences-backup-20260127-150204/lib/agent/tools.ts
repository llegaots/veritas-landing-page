// LangGraph tools for the agent
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { SequenceSpec } from '../sequences/spec';
import { applyPatchesToSpec, JSONPatchOperation } from '../sequences/patches';
import { validateSequenceSpec } from '../sequences/validation';
import { createEmptySpec } from '../sequences/spec';

// Tool: Apply patches to spec
export const applyPatchTool = tool(
  async (input: { spec: SequenceSpec; patches: JSONPatchOperation[] }) => {
    try {
      const updatedSpec = applyPatchesToSpec(input.spec, input.patches);
      return {
        success: true,
        spec: updatedSpec,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
  {
    name: 'apply_patch',
    description: 'Apply JSON Patch operations to a sequence spec. Use this to modify the sequence structure.',
    schema: z.object({
      spec: z.any() as z.ZodType<any>, // SequenceSpec
      patches: z.array(z.any()) as z.ZodType<any>, // JSONPatchOperation[]
    }),
  }
);

// Tool: Validate spec
export const validateSpecTool = tool(
  async (input: { spec: SequenceSpec }) => {
    const result = validateSequenceSpec(input.spec);
    return {
      valid: result.valid,
      errors: result.errors,
      warnings: result.warnings,
    };
  },
  {
    name: 'validate_spec',
    description: 'Validate a sequence spec against schema and business rules. Returns validation errors and warnings.',
    schema: z.object({
      spec: z.any() as z.ZodType<any>, // SequenceSpec
    }),
  }
);

// Tool: Suggest nodes
export const suggestNodesTool = tool(
  async (input: { goal: string; answers: Record<string, any> }) => {
    // This is a placeholder - in practice, this would use AI to suggest nodes
    // For now, return a simple suggestion based on common patterns
    const suggestions: Array<{ type: string; description: string }> = [];

    if (input.goal.toLowerCase().includes('welcome') || input.goal.toLowerCase().includes('onboard')) {
      suggestions.push({
        type: 'send_sms',
        description: 'Welcome message introducing the service',
      });
      suggestions.push({
        type: 'wait',
        description: 'Wait 1 day before follow-up',
      });
      suggestions.push({
        type: 'send_sms',
        description: 'Follow-up message with more information',
      });
    }

    if (input.goal.toLowerCase().includes('nurture') || input.goal.toLowerCase().includes('follow')) {
      suggestions.push({
        type: 'send_sms',
        description: 'Initial contact message',
      });
      suggestions.push({
        type: 'wait',
        description: 'Wait 2-3 days',
      });
      suggestions.push({
        type: 'send_sms',
        description: 'Value-add message',
      });
    }

    return {
      suggestions,
    };
  },
  {
    name: 'suggest_nodes',
    description: 'Suggest sequence nodes based on the goal and collected answers. Returns node type suggestions.',
    schema: z.object({
      goal: z.string(),
      answers: z.record(z.string(), z.any()),
    }),
  }
);

// Tool: Rewrite copy
export const rewriteCopyTool = tool(
  async (input: { nodeId: string; currentContent: string; styleGuidance: string; tone?: string }) => {
    // This is a placeholder - in practice, this would use AI to rewrite the message
    // For now, return the current content with a note
    return {
      rewritten: input.currentContent,
      note: 'Copy rewriting would be handled by AI in production',
    };
  },
  {
    name: 'rewrite_copy',
    description: 'Rewrite SMS message content for a specific node with new style guidance and tone.',
    schema: z.object({
      nodeId: z.string(),
      currentContent: z.string(),
      styleGuidance: z.string(),
      tone: z.enum(['professional', 'friendly', 'casual']).optional(),
    }),
  }
);

// Tool: Create empty spec
export const createEmptySpecTool = tool(
  async (input: { name: string; createdBy?: string }) => {
    const spec = createEmptySpec(input.name, input.createdBy || 'system');
    return {
      spec,
    };
  },
  {
    name: 'create_empty_spec',
    description: 'Create a new empty sequence spec with trigger and end nodes.',
    schema: z.object({
      name: z.string(),
      createdBy: z.string().optional(),
    }),
  }
);

// Export all tools
export const agentTools = [
  applyPatchTool,
  validateSpecTool,
  suggestNodesTool,
  rewriteCopyTool,
  createEmptySpecTool,
];

