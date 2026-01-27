// Zustand store for sequence state management
import { create } from 'zustand';
import { SequenceSpec } from '../sequences/spec';
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

    try {
      // Client-side validation
      const updatedSpec = applyPatchesToSpec(spec, ops);
      // Validate the updated spec
      const { validateSequenceSpec } = require('../sequences/validation');
      const validation = validateSequenceSpec(updatedSpec);
      
      if (!validation.valid) {
        // If validation fails, force reload from server
        const { sequenceId, password } = get();
        if (sequenceId && password) {
          get().loadSpec(sequenceId, password);
        }
        set({
          error: `Validation failed: ${validation.errors.join(', ')}`,
        });
        return;
      }
      
      set({ spec: updatedSpec, pendingOps: [] });
    } catch (error) {
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
}));

