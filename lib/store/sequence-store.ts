// Zustand store for sequence state management
import { create } from 'zustand';
import { SequenceSpec, SendSmsNode, SendEmailNode } from '../sequences/spec';
import { JSONPatchOperation, applyPatchesToSpec } from '../sequences/patches';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  patches?: JSONPatchOperation[];
}

interface SequenceStore {
  // State
  spec: SequenceSpec | null;
  activeVersionId: string | null;
  pendingOps: JSONPatchOperation[];
  selectedNodeId: string | null;
  isLoading: boolean;
  error: string | null;
  conversationHistory: ChatMessage[];
  sequenceId: string | null;
  password: string | null;

  // Actions
  setPassword: (password: string) => void;
  loadSpec: (sequenceId: string, password: string) => Promise<void>;
  applyOps: (ops: JSONPatchOperation[]) => void;
  commitOpsToServer: (ops: JSONPatchOperation[], userMessage?: string) => Promise<void>;
  setSelectedNodeId: (nodeId: string | null) => void;
  addManualEdit: (op: JSONPatchOperation) => void;
  sendMessage: (text: string) => Promise<void>;
  setCurrentSpec: (spec: SequenceSpec | null) => void;
  setSpec: (spec: SequenceSpec | null) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;
  addSendSmsNode: (afterNodeId?: string) => string | null; // Returns new node ID or null
  addSendEmailNode: (afterNodeId?: string) => string | null; // Returns new node ID or null
  
  // Legacy aliases for backward compatibility
  currentSpec: SequenceSpec | null;
  loadSequence: (id: string, password: string) => Promise<void>;
  applyPatches: (patches: JSONPatchOperation[]) => void;
}

export const useSequenceStore = create<SequenceStore>((set, get) => ({
  // Initial state
  spec: null,
  activeVersionId: null,
  pendingOps: [],
  selectedNodeId: null,
  isLoading: false,
  error: null,
  conversationHistory: [],
  sequenceId: null,
  password: null,
  
  // Legacy aliases
  get currentSpec() {
    return get().spec;
  },

  // Actions
  setPassword: (password: string) => {
    set({ password });
  },

  loadSpec: async (sequenceId: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/sequences?key=${encodeURIComponent(password)}&id=${sequenceId}`);
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to load sequence';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      const data = await response.json();
      
      if (!data.version || !data.version.spec) {
        throw new Error('Sequence has no active version. Please create a version first.');
      }
      
      const spec = data.version.spec;
      set({
        spec,
        activeVersionId: data.version.id || null,
        sequenceId,
        password,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load sequence';
      set({
        error: errorMessage,
        isLoading: false,
      });
      throw error; // Re-throw so caller can handle it
    }
  },
  
  // Legacy alias
  loadSequence: async (id: string, password: string) => {
    return get().loadSpec(id, password);
  },

  applyOps: (ops: JSONPatchOperation[]) => {
    let { spec } = get();
    
    // If no spec exists, create an empty one first
    if (!spec) {
      const { createEmptySpec } = require('../sequences/spec');
      spec = createEmptySpec('New Sequence', 'user');
      set({ spec });
    }
    
    // Ensure spec is not null before applying patches
    if (!spec) {
      console.error('Failed to create empty spec');
      return;
    }
    
    try {
      console.log('[Store] applyOps: Applying', ops.length, 'patches to spec with', spec.nodes.length, 'nodes');
      console.log('[Store] applyOps: Patches:', JSON.stringify(ops, null, 2));
      
      // Client-side validation
      let updatedSpec = applyPatchesToSpec(spec, ops);
      
      console.log('[Store] applyOps: After patch application, nodes:', updatedSpec.nodes.length, 'edges:', updatedSpec.edges.length);
      
      // Ensure all required fields exist
      if (!updatedSpec.variables) {
        updatedSpec = { ...updatedSpec, variables: {} };
      }
      if (!updatedSpec.ui) {
        updatedSpec = { ...updatedSpec, ui: { positions: {}, zoom: 1 } };
      }
      if (!updatedSpec.ui.positions) {
        updatedSpec = { ...updatedSpec, ui: { ...updatedSpec.ui, positions: {} } };
      }
      if (typeof updatedSpec.ui.zoom !== 'number') {
        updatedSpec = { ...updatedSpec, ui: { ...updatedSpec.ui, zoom: 1 } };
      }
      if (!updatedSpec.metadata) {
        const existingName = (updatedSpec as any).metadata?.name;
        updatedSpec = {
          ...updatedSpec,
          metadata: {
            name: existingName || 'New Sequence',
            status: 'draft',
            version: 1,
            createdBy: 'user',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        };
      }
      
      // Ensure there's always an end node
      const hasEndNode = updatedSpec.nodes.some(n => n.type === 'end');
      if (!hasEndNode) {
        const endNode = { id: 'end', type: 'end' as const };
        updatedSpec = {
          ...updatedSpec,
          nodes: [...updatedSpec.nodes, endNode],
          ui: {
            ...updatedSpec.ui,
            positions: {
              ...updatedSpec.ui.positions,
              end: updatedSpec.ui.positions?.end || { x: 500, y: 100 },
            },
          },
        };
        // Add edge to end if there are nodes without connections
        const nodesWithOutgoing = new Set(updatedSpec.edges.map(e => e.from));
        const nodesNeedingEnd = updatedSpec.nodes
          .filter(n => n.type !== 'end' && n.type !== 'trigger' && !nodesWithOutgoing.has(n.id));
        if (nodesNeedingEnd.length > 0) {
          updatedSpec = {
            ...updatedSpec,
            edges: [...updatedSpec.edges, { from: nodesNeedingEnd[0].id, to: 'end' }],
          };
        } else if (updatedSpec.edges.length === 0) {
          // If no edges, connect trigger to end
          const triggerNode = updatedSpec.nodes.find(n => n.type === 'trigger');
          if (triggerNode) {
            updatedSpec = {
              ...updatedSpec,
              edges: [{ from: triggerNode.id, to: 'end' }],
            };
          }
        }
      }
      
      // Only validate if sequence is active - don't validate drafts during editing
      const isDraft = updatedSpec.metadata?.status === 'draft' || updatedSpec.metadata?.status === undefined;
      
      // For draft sequences, skip validation entirely - user is still building
      // Validation will only happen when trying to activate the sequence
      if (isDraft) {
        // Always allow changes for draft sequences - no validation needed
        console.log('[Store] applyOps: Draft sequence - skipping validation, allowing changes');
        set({ 
          spec: updatedSpec, 
          pendingOps: [],
          error: null, // Never show errors for draft sequences
        });
        return;
      }
      
      // Only validate active sequences
      const { validateSequenceSpec } = require('../sequences/validation');
      const validation = validateSequenceSpec(updatedSpec);
      
      console.log('[Store] applyOps: Active sequence validation:', {
        valid: validation.valid,
        errors: validation.errors,
        warnings: validation.warnings,
        finalNodes: updatedSpec.nodes.length,
        finalEdges: updatedSpec.edges.length,
      });
      
      // For active sequences, show errors but still allow changes (user might be fixing issues)
      if (!validation.valid) {
        console.warn('[Store] applyOps: Active sequence has validation errors:', validation.errors);
        // Show error but still apply changes (user might be fixing the issues)
        set({
          error: `Validation failed: ${validation.errors.join(', ')}`,
          spec: updatedSpec,
          pendingOps: [],
        });
        return;
      }
      
      // Validation passed for active sequence
      console.log('[Store] applyOps: Active sequence validation passed');
      set({ 
        spec: updatedSpec, 
        pendingOps: [],
        error: null,
      });
    } catch (error) {
      console.error('[Store] applyOps: Error applying patches:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to apply patches',
      });
    }
  },
  
  // Legacy alias
  applyPatches: (patches: JSONPatchOperation[]) => {
    return get().applyOps(patches);
  },
  
  commitOpsToServer: async (ops: JSONPatchOperation[], userMessage?: string) => {
    const { spec, sequenceId, password } = get();
    if (!password) {
      set({ error: 'Password not set' });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const response = await fetch(
        `/api/copilot?key=${encodeURIComponent(password)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userMessage || 'Apply manual edits',
            sequenceId: sequenceId || undefined,
            specSnapshot: spec || undefined,
            editContext: ops,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to commit operations');
      }

      // Stream response and apply patches
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';
      let receivedPatches: JSONPatchOperation[] = [];

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'text') {
                  assistantMessage += data.content;
                } else if (data.type === 'patches') {
                  receivedPatches = data.patches;
                } else if (data.type === 'spec') {
                  // Update spec directly if provided
                  set({ spec: data.spec });
                } else if (data.type === 'done') {
                  if (receivedPatches.length > 0) {
                    get().applyOps(receivedPatches);
                  }
                  if (data.newVersionId) {
                    set({ activeVersionId: data.newVersionId });
                  }
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }
      }

      set({ isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to commit operations',
        isLoading: false,
      });
    }
  },
  
  setSelectedNodeId: (nodeId: string | null) => {
    set({ selectedNodeId: nodeId });
  },

  addManualEdit: (op: JSONPatchOperation) => {
    set((state) => ({
      pendingOps: [...state.pendingOps, op],
    }));
  },

  sendMessage: async (text: string) => {
    const { currentSpec, sequenceId, password, pendingOps } = get();
    if (!password) {
      set({ error: 'Password not set' });
      return;
    }

    set({ isLoading: true, error: null });

    // Add user message to history
    set((state) => ({
      conversationHistory: [...state.conversationHistory, { role: 'user', content: text }],
    }));

    try {
      const { conversationHistory } = get();
      const response = await fetch(
        `/api/copilot?key=${encodeURIComponent(password)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            sequenceId: sequenceId || undefined,
            specSnapshot: currentSpec || undefined,
            editContext: pendingOps.length > 0 ? pendingOps : undefined,
            conversationHistory: conversationHistory, // Send full conversation history
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Stream response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';
      let receivedPatches: JSONPatchOperation[] = [];

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'text') {
                  assistantMessage += data.content;
                  // Update last message in history
                  set((state) => {
                    const newHistory = [...state.conversationHistory];
                    const lastMsg = newHistory[newHistory.length - 1];
                    if (lastMsg && lastMsg.role === 'assistant') {
                      lastMsg.content = assistantMessage;
                    } else {
                      newHistory.push({ role: 'assistant', content: assistantMessage });
                    }
                    return { conversationHistory: newHistory };
                  });
                } else if (data.type === 'patches') {
                  receivedPatches = data.patches;
                  console.log('[store] Received patches:', receivedPatches.length);
                } else if (data.type === 'spec') {
                  // Update spec directly if provided
                  console.log('[store] Received spec update:', data.spec?.nodes?.length, 'nodes');
                  set({ spec: data.spec });
                } else if (data.type === 'done') {
                  // Apply patches if any
                  if (receivedPatches.length > 0) {
                    console.log('[store] Applying', receivedPatches.length, 'patches');
                    get().applyPatches(receivedPatches);
                  } else if (data.spec) {
                    // If no patches but spec provided, use spec directly
                    console.log('[store] Using spec directly (no patches)');
                    set({ spec: data.spec });
                  }
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }
      }

      set({ isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to send message',
        isLoading: false,
      });
    }
  },

  setCurrentSpec: (spec: SequenceSpec | null) => {
    set({ spec });
  },
  
  setSpec: (spec: SequenceSpec | null) => {
    set({ spec });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  clearError: () => {
    set({ error: null });
  },

  reset: () => {
    set({
      spec: null,
      activeVersionId: null,
      pendingOps: [],
      selectedNodeId: null,
      isLoading: false,
      error: null,
      conversationHistory: [],
      sequenceId: null,
    });
  },

  addSendSmsNode: (afterNodeId?: string) => {
    const { spec } = get();
    if (!spec) {
      console.error('[Store] Cannot add node: no spec');
      return null;
    }

    const endNode = spec.nodes.find(n => n.type === 'end');
    if (!endNode) {
      console.error('[Store] Cannot add node: no end node');
      return null;
    }

    // Create new node
    const newId = `send_sms_${Date.now()}`;
    const newNode: SendSmsNode = {
      id: newId,
      type: 'send_sms',
      content: '',
      timing: '',
    };

    // Place new node in the center of the canvas (same position for all new nodes)
    // User can drag it to wherever they want
    const newPosition = { 
      x: 400, // Center horizontally
      y: 300  // Center vertically
    };

    // Build atomic patches: add node + position ONLY (NO automatic connections)
    const patches: JSONPatchOperation[] = [];

    // 1. Add node
    patches.push({
      op: 'add',
      path: '/nodes/-',
      value: newNode,
    });

    // 2. Add position - ensure ui and positions exist
    if (!spec.ui) {
      patches.push({
        op: 'add',
        path: '/ui',
        value: { positions: {}, zoom: 1 },
      });
    }
    if (!spec.ui?.positions) {
      patches.push({
        op: 'add',
        path: '/ui/positions',
        value: {},
      });
    }
    patches.push({
      op: 'add',
      path: `/ui/positions/${newId}`,
      value: newPosition,
    });

    // DON'T add any edges - node appears disconnected, user connects manually

    console.log('[Store] Adding SMS node (disconnected):', {
      newId,
      position: newPosition,
      patches: patches.length,
      specNodesBefore: spec.nodes.length,
    });

    // Apply patches
    get().applyOps(patches);
    
    // Verify the node was added
    const updatedSpec = get().spec;
    if (updatedSpec) {
      const nodeExists = updatedSpec.nodes.some(n => n.id === newId);
      const positionExists = updatedSpec.ui.positions?.[newId];
      const allNodeIds = updatedSpec.nodes.map(n => `${n.type}:${n.id}`);
      const allEdges = updatedSpec.edges.map(e => `${e.from}→${e.to}`);
      console.log('[Store] After adding node:', {
        nodeExists,
        positionExists,
        totalNodes: updatedSpec.nodes.length,
        totalEdges: updatedSpec.edges.length,
        allNodeIds,
        allEdges,
        newNodePosition: updatedSpec.ui.positions?.[newId],
      });
    } else {
      console.error('[Store] Spec is null after applying patches!');
    }

    // DON'T commit to server here - user will click "Save" button to persist
    // commitOpsToServer goes through /api/copilot which is for AI assistant, not manual edits

    // Select the new node
    set({ selectedNodeId: newId });

    return newId;
  },

  addSendEmailNode: (afterNodeId?: string) => {
    const { spec } = get();
    if (!spec) {
      console.error('[Store] Cannot add node: no spec');
      return null;
    }

    const endNode = spec.nodes.find(n => n.type === 'end');
    if (!endNode) {
      console.error('[Store] Cannot add node: no end node');
      return null;
    }

    // Create new node
    const newId = `send_email_${Date.now()}`;
    const newNode: SendEmailNode = {
      id: newId,
      type: 'send_email',
      subject: '',
      email_type: 'text', // Default to plain text for new nodes
      html_content: '',
      timing: '',
    };

    // Place new node in the center of the canvas
    const newPosition = { 
      x: 400,
      y: 300
    };

    // Build atomic patches: add node + position ONLY (NO automatic connections)
    const patches: JSONPatchOperation[] = [];

    // 1. Add node
    patches.push({
      op: 'add',
      path: '/nodes/-',
      value: newNode,
    });

    // 2. Add position - ensure ui and positions exist
    if (!spec.ui) {
      patches.push({
        op: 'add',
        path: '/ui',
        value: { positions: {}, zoom: 1 },
      });
    }
    if (!spec.ui?.positions) {
      patches.push({
        op: 'add',
        path: '/ui/positions',
        value: {},
      });
    }
    patches.push({
      op: 'add',
      path: `/ui/positions/${newId}`,
      value: newPosition,
    });

    console.log('[Store] Adding Email node (disconnected):', {
      newId,
      position: newPosition,
      patches: patches.length,
      specNodesBefore: spec.nodes.length,
    });

    // Apply patches
    get().applyOps(patches);
    
    // Verify the node was added
    const updatedSpec = get().spec;
    if (updatedSpec) {
      const nodeExists = updatedSpec.nodes.some(n => n.id === newId);
      const positionExists = updatedSpec.ui.positions?.[newId];
      console.log('[Store] After adding email node:', {
        nodeExists,
        positionExists,
        totalNodes: updatedSpec.nodes.length,
      });
    }

    // Select the new node
    set({ selectedNodeId: newId });

    return newId;
  },
}));

