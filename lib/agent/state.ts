// Agent state interface for LangGraph
import { SequenceSpec } from '../sequences/spec';
import { JSONPatchOperation } from '../sequences/patches';

export interface AgentState {
  goal: string; // User's intent/request
  currentSpec: SequenceSpec | null; // Current sequence spec being edited
  missingFields: string[]; // Fields that still need to be collected
  decisions: Array<{ field: string; value: any; reasoning: string }>; // Decisions made so far
  tone: 'professional' | 'friendly' | 'casual' | null; // Message tone preference
  constraints: string[]; // Constraints (e.g., "no sends after 9pm", "max 5 messages")
  lastUserMsg: string; // Last user message
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>; // Full conversation
  patches: JSONPatchOperation[]; // Patches to apply to spec
  isComplete: boolean; // Whether the agent has finished gathering info and building
  error?: string; // Any error that occurred
}

export function createInitialState(goal: string, existingSpec?: SequenceSpec): AgentState {
  return {
    goal,
    currentSpec: existingSpec || null,
    missingFields: [],
    decisions: [],
    tone: null,
    constraints: [],
    lastUserMsg: goal,
    conversationHistory: [
      { role: 'user', content: goal },
    ],
    patches: [],
    isComplete: false,
  };
}

export function updateStateWithUserMessage(state: AgentState, message: string): AgentState {
  return {
    ...state,
    lastUserMsg: message,
    conversationHistory: [
      ...state.conversationHistory,
      { role: 'user', content: message },
    ],
  };
}

export function updateStateWithAssistantResponse(state: AgentState, response: string): AgentState {
  return {
    ...state,
    conversationHistory: [
      ...state.conversationHistory,
      { role: 'assistant', content: response },
    ],
  };
}

export function addDecision(state: AgentState, field: string, value: any, reasoning: string): AgentState {
  return {
    ...state,
    decisions: [
      ...state.decisions.filter((d) => d.field !== field), // Remove existing decision for this field
      { field, value, reasoning },
    ],
  };
}

export function addPatches(state: AgentState, patches: JSONPatchOperation[]): AgentState {
  return {
    ...state,
    patches: [...state.patches, ...patches],
  };
}

export function markComplete(state: AgentState): AgentState {
  return {
    ...state,
    isComplete: true,
  };
}

