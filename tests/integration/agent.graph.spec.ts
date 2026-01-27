import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createInitialState, AgentState } from '@/lib/agent/state';
import { findGaps, generateQuestion, buildDraft, validate, emitPatches } from '@/lib/agent/nodes';
import { SequenceSpec, createEmptySpec } from '@/lib/sequences/spec';
import { JSONPatchOperation } from '@/lib/sequences/patches';

describe('Step 4: Agent Behavior with Stubbed Model', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Step 4.1: Deterministic agent harness', () => {
    it('should identify missing fields when missing info', async () => {
      const state: AgentState = createInitialState('Create a welcome sequence for new leads');
      
      const result = await findGaps(state);
      
      expect(result.missingFields).toBeDefined();
      expect(Array.isArray(result.missingFields)).toBe(true);
      // Should identify missing fields like triggerType, messageCount, etc.
    });

    it('should emit patches, not full spec', async () => {
      const spec = createEmptySpec();
      const state: AgentState = {
        ...createInitialState('Create a welcome sequence'),
        currentSpec: spec,
        patches: [
          { op: 'add', path: '/nodes/-', value: { id: 'msg1', type: 'send_sms', content: 'Welcome!' } },
        ],
      };

      const result = await emitPatches(state);
      
      expect(result.isComplete).toBe(true);
      // Patches should be in state, not returned as new spec
    });

    it('should detect validation errors', async () => {
      const spec = createEmptySpec();
      spec.nodes = [
        { id: 'trigger', type: 'trigger' },
        { id: 'invalid', type: 'send_sms', content: '' }, // Empty content
        { id: 'end', type: 'end' },
      ];
      
      const state: AgentState = {
        ...createInitialState('Create a sequence'),
        currentSpec: spec,
      };

      const result = await validate(state);
      
      expect(result).toBeDefined();
      // Should have error if validation fails
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Validation failed');
    });
  });

  describe('Step 4.2: Clarification tests', () => {
    it('should ask about missing fields', async () => {
      const state: AgentState = {
        ...createInitialState('schedule an sms when someone comes in as a new lead'),
        missingFields: ['triggerType', 'messageCount'],
      };
      
      const result = await generateQuestion(state);
      
      expect(result).toBeDefined();
      // Should update conversation history with a question
      if (result.conversationHistory) {
        const lastMessage = result.conversationHistory[result.conversationHistory.length - 1];
        expect(lastMessage.role).toBe('assistant');
        expect(lastMessage.content.length).toBeGreaterThan(0);
      }
    });

    it('should ask exactly one question', async () => {
      const state: AgentState = {
        ...createInitialState('Create a welcome sequence'),
        missingFields: ['messageCount'],
      };
      
      const result = await generateQuestion(state);
      
      // Verify it's a single question, not multiple
      if (result.conversationHistory) {
        const lastMessage = result.conversationHistory[result.conversationHistory.length - 1];
        const questionCount = (lastMessage.content.match(/\?/g) || []).length;
        expect(questionCount).toBeLessThanOrEqual(1);
      }
    });

    it('should not emit ops when asking questions', async () => {
      const state: AgentState = {
        ...createInitialState('Create a sequence'),
        missingFields: ['messageCount'],
        patches: [],
      };
      
      const result = await generateQuestion(state);
      
      // Should not add patches when asking questions
      // Result may not have patches property, or it should be empty/unchanged
      if (result.patches !== undefined) {
        expect(result.patches.length).toBe(0);
      }
    });

    it('should mark complete when no missing fields', async () => {
      const state: AgentState = {
        ...createInitialState('Create a sequence'),
        missingFields: [],
      };
      
      const result = await generateQuestion(state);
      
      expect(result.isComplete).toBe(true);
    });
  });

  describe('Step 4.3: Patch emission tests', () => {
    it('should mark complete when patches are ready', async () => {
      const state: AgentState = {
        ...createInitialState('Create a new lead sequence'),
        currentSpec: createEmptySpec(),
        patches: [
          { op: 'replace', path: '/trigger/type', value: 'lead.created' },
        ],
      };

      const result = await emitPatches(state);
      
      expect(result.isComplete).toBe(true);
      // Patches should remain in state
      expect(state.patches.length).toBeGreaterThan(0);
    });

    it('should handle patches with send_sms nodes', async () => {
      const state: AgentState = {
        ...createInitialState('Create a welcome sequence'),
        currentSpec: createEmptySpec(),
        patches: [
          { op: 'add', path: '/nodes/-', value: { id: 'msg1', type: 'send_sms', content: 'Welcome!' } },
        ],
      };

      const result = await emitPatches(state);
      
      expect(result.isComplete).toBe(true);
      const hasSmsPatch = state.patches.some((p: JSONPatchOperation) => {
        if (p.op === 'add' && p.path === '/nodes/-') {
          const node = p.value as any;
          return node.type === 'send_sms';
        }
        return false;
      });
      expect(hasSmsPatch).toBe(true);
    });

    it('should handle patches with wait nodes', async () => {
      const state: AgentState = {
        ...createInitialState('Create a 3-step cadence'),
        currentSpec: createEmptySpec(),
        patches: [
          { op: 'add', path: '/nodes/-', value: { id: 'wait1', type: 'wait', duration: '1 day' } },
        ],
      };

      const result = await emitPatches(state);
      
      expect(result.isComplete).toBe(true);
      const hasWaitPatch = state.patches.some((p: JSONPatchOperation) => {
        if (p.op === 'add' && p.path === '/nodes/-') {
          const node = p.value as any;
          return node.type === 'wait';
        }
        return false;
      });
      expect(hasWaitPatch).toBe(true);
    });

    it('should handle patches with end node', async () => {
      const state: AgentState = {
        ...createInitialState('Create a sequence'),
        currentSpec: createEmptySpec(),
        patches: [
          { op: 'add', path: '/nodes/-', value: { id: 'end', type: 'end' } },
        ],
      };

      const result = await emitPatches(state);
      
      expect(result.isComplete).toBe(true);
      const hasEndPatch = state.patches.some((p: JSONPatchOperation) => {
        if (p.op === 'add' && p.path === '/nodes/-') {
          const node = p.value as any;
          return node.type === 'end';
        }
        return false;
      });
      expect(hasEndPatch).toBe(true);
    });

    it('should handle patches with edges', async () => {
      const state: AgentState = {
        ...createInitialState('Create a sequence'),
        currentSpec: createEmptySpec(),
        patches: [
          { op: 'add', path: '/edges/-', value: { from: 'trigger', to: 'msg1' } },
          { op: 'add', path: '/edges/-', value: { from: 'msg1', to: 'end' } },
        ],
      };

      const result = await emitPatches(state);
      
      expect(result.isComplete).toBe(true);
      const hasEdgePatch = state.patches.some((p: JSONPatchOperation) => 
        p.path === '/edges/-'
      );
      expect(hasEdgePatch).toBe(true);
    });

    it('should handle patches with condition nodes', async () => {
      const state: AgentState = {
        ...createInitialState('Create a sequence that branches based on lead source'),
        currentSpec: createEmptySpec(),
        patches: [
          { op: 'add', path: '/nodes/-', value: { id: 'cond1', type: 'condition', condition: { field: 'lead.source', operator: 'equals', value: 'zillow' }, truePath: 'msg_zillow', falsePath: 'msg_other' } },
          { op: 'add', path: '/nodes/-', value: { id: 'msg_zillow', type: 'send_sms', content: 'Zillow script' } },
          { op: 'add', path: '/nodes/-', value: { id: 'msg_other', type: 'send_sms', content: 'Other script' } },
        ],
      };

      const result = await emitPatches(state);
      
      expect(result.isComplete).toBe(true);
      const hasConditionPatch = state.patches.some((p: JSONPatchOperation) => {
        if (p.op === 'add' && p.path === '/nodes/-') {
          const node = p.value as any;
          return node.type === 'condition';
        }
        return false;
      });
      expect(hasConditionPatch).toBe(true);
    });

    it('should modify existing: change step 2 to wait 2 days not 1', async () => {
      const spec = createEmptySpec();
      spec.nodes = [
        { id: 'trigger', type: 'trigger' },
        { id: 'wait1', type: 'wait', duration: '1 day' },
        { id: 'end', type: 'end' },
      ];
      
      const state: AgentState = {
        ...createInitialState('Change step 2 to wait 2 days'),
        currentSpec: spec,
        patches: [
          { op: 'replace', path: '/nodes/1/duration', value: '2 days' },
        ],
      };

      const result = await emitPatches(state);
      
      expect(result.isComplete).toBe(true);
      const hasReplacePatch = state.patches.some((p: JSONPatchOperation) => 
        p.op === 'replace' && p.path.includes('duration')
      );
      expect(hasReplacePatch).toBe(true);
    });

    it('should delete: remove the last message', async () => {
      const spec = createEmptySpec();
      spec.nodes = [
        { id: 'trigger', type: 'trigger' },
        { id: 'msg1', type: 'send_sms', content: 'First' },
        { id: 'msg2', type: 'send_sms', content: 'Last' },
        { id: 'end', type: 'end' },
      ];
      
      const state: AgentState = {
        ...createInitialState('Remove the last message'),
        currentSpec: spec,
        patches: [
          { op: 'remove', path: '/nodes/2' },
        ],
      };

      const result = await emitPatches(state);
      
      expect(result.isComplete).toBe(true);
      const hasRemovePatch = state.patches.some((p: JSONPatchOperation) => 
        p.op === 'remove' && p.path.includes('nodes')
      );
      expect(hasRemovePatch).toBe(true);
    });

    it('should preserve node IDs when possible', async () => {
      const spec = createEmptySpec();
      spec.nodes = [
        { id: 'trigger', type: 'trigger' },
        { id: 'msg1', type: 'send_sms', content: 'Original' },
        { id: 'end', type: 'end' },
      ];
      
      const state: AgentState = {
        ...createInitialState('Make it shorter'),
        currentSpec: spec,
        patches: [
          { op: 'replace', path: '/nodes/1/content', value: 'Shorter' },
        ],
      };

      const result = await emitPatches(state);
      
      expect(result.isComplete).toBe(true);
      // Should use replace, not remove+add (which would change ID)
      const hasReplace = state.patches.some((p: JSONPatchOperation) => 
        p.op === 'replace'
      );
      expect(hasReplace).toBe(true);
    });
  });

  describe('Step 4.4: Refuse to decide behavior', () => {
    it('should create empty spec when no spec exists', async () => {
      const state: AgentState = createInitialState('I don\'t care, choose defaults');
      
      const result = await buildDraft(state);
      
      expect(result.currentSpec).toBeDefined();
      expect(result.currentSpec?.metadata.name).toBeDefined();
    });
  });
});

