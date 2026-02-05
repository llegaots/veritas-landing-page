// LangGraph workflow definition
// Simplified implementation - will be enhanced with proper LangGraph API
import { AgentState } from './state';
import {
  parseIntent,
  extractAnswer,
  findGaps,
  generateQuestion,
  buildDraft,
  writeCopy,
  validate,
  emitPatches,
} from './nodes';

// Simplified runner for the agent
// This is a sequential implementation - will be replaced with proper LangGraph when API is confirmed
export async function runAgent(initialState: AgentState): Promise<AgentState> {
  try {
    let state = initialState;

    // Step 0.5: Extract answer from user response (if this is a follow-up message)
    if (state.conversationHistory.length > 1) {
      const extractResult = await extractAnswer(state);
      state = { ...state, ...extractResult };
    }

    // Step 1: Parse intent (only on first message)
    if (state.conversationHistory.length === 1) {
      const intentResult = await parseIntent(state);
      state = { ...state, ...intentResult };
    }

    // Step 2: Find gaps
    const gapsResult = await findGaps(state);
    state = { ...state, ...gapsResult };

    // Step 3: Generate question if needed
    if (state.missingFields.length > 0) {
      const questionResult = await generateQuestion(state);
      state = { ...state, ...questionResult };
      // Return early to wait for user response
      return state;
    }

    // Step 4: Build draft
    const draftResult = await buildDraft(state);
    state = { ...state, ...draftResult };

    // Step 5: Write copy
    const copyResult = await writeCopy(state);
    state = { ...state, ...copyResult };

    // Step 6: Validate
    const validateResult = await validate(state);
    state = { ...state, ...validateResult };

    // Step 7: Emit patches
    const patchesResult = await emitPatches(state);
    state = { ...state, ...patchesResult };

    return state;
  } catch (error) {
    return {
      ...initialState,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

