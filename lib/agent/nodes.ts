// LangGraph node implementations
import { ChatOpenAI } from '@langchain/openai';
import { AgentState, updateStateWithAssistantResponse, addDecision, addPatches, markComplete } from './state';
import { SequenceSpec, createEmptySpec, SendSmsNode, WaitNode } from '../sequences/spec';
import { JSONPatchOperation, createAddNodePatch, createAddEdgePatch, findNodeIndex, applyPatchesToSpec } from '../sequences/patches';
import { validateSequenceSpec } from '../sequences/validation';
import { getAvailableVariables } from './context';

// Initialize model only if API key is available
let model: ChatOpenAI | null = null;
if (process.env.OPENAI_API_KEY) {
  try {
    model = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0.7,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
  } catch (error) {
    console.error('Failed to initialize ChatOpenAI:', error);
  }
}

// Node 1: Parse Intent
export async function parseIntent(state: AgentState): Promise<Partial<AgentState>> {
  if (!model) {
    // Fallback if model not initialized
    return {
      decisions: [
        ...state.decisions,
        { field: 'triggerType', value: 'manual', reasoning: 'Model not initialized, using default' },
      ],
    };
  }

  const systemPrompt = `You are an AI assistant helping to build SMS sequences. 
Parse the user's intent and extract:
1. Trigger type (lead.created, lead.demo_booked, investor.matched, or manual)
2. Initial requirements (timing, message count, tone, etc.)

Respond with JSON: { triggerType, requirements: {...} }`;

  try {
    const response = await model.invoke([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: state.goal },
    ]);

    try {
      const content = typeof response.content === 'string' ? response.content : String(response.content);
      
      // Try to extract JSON from response (might be wrapped in markdown)
      let jsonStr = content.trim();
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```\n?/g, '').trim();
      }
      
      const parsed = JSON.parse(jsonStr);
      
      return {
        decisions: [
          ...state.decisions,
          { field: 'triggerType', value: parsed.triggerType || 'manual', reasoning: 'Parsed from user intent' },
        ],
      };
    } catch (parseError) {
      // If JSON parsing fails, try to extract trigger type from text
      const content = typeof response.content === 'string' ? response.content : String(response.content);
      const lowerContent = content.toLowerCase();
      let triggerType = 'manual';
      
      if (lowerContent.includes('lead.created') || lowerContent.includes('new lead')) {
        triggerType = 'lead.created';
      } else if (lowerContent.includes('demo_booked') || lowerContent.includes('demo booked')) {
        triggerType = 'lead.demo_booked';
      } else if (lowerContent.includes('investor.matched') || lowerContent.includes('investor matched')) {
        triggerType = 'investor.matched';
      }
      
      return {
        decisions: [
          ...state.decisions,
          { field: 'triggerType', value: triggerType, reasoning: 'Extracted from text response' },
        ],
      };
    }
  } catch (modelError) {
    // Model invocation failed
    console.error('Model invocation error:', modelError);
    return {
      decisions: [
        ...state.decisions,
        { field: 'triggerType', value: 'manual', reasoning: 'Model error, using default' },
      ],
    };
  }
}

// Node 1.5: Extract Answer from User Response
export async function extractAnswer(state: AgentState): Promise<Partial<AgentState>> {
  // If this is the first message (goal), skip extraction
  if (state.conversationHistory.length <= 1) {
    return {};
  }

  // Get the last assistant message (the question) and last user message (the answer)
  const lastAssistantMsg = state.conversationHistory
    .slice()
    .reverse()
    .find((msg) => msg.role === 'assistant');
  const lastUserMsg = state.lastUserMsg;

  if (!lastAssistantMsg || !lastUserMsg) {
    return {};
  }

  // Determine what field we were asking about based on the question
  const question = lastAssistantMsg.content.toLowerCase();
  let fieldToExtract: string | null = null;

  if (question.includes('how many message') || question.includes('number of message')) {
    fieldToExtract = 'messageCount';
  } else if (question.includes('when') || question.includes('timing') || question.includes('interval')) {
    fieldToExtract = 'timing';
  } else if (question.includes('tone') || question.includes('style')) {
    fieldToExtract = 'tone';
  } else if (question.includes('target') || question.includes('audience') || question.includes('who')) {
    fieldToExtract = 'targetAudience';
  } else if (question.includes('trigger') || question.includes('when should this start') || question.includes('what trigger')) {
    fieldToExtract = 'triggerType';
  }

  if (!fieldToExtract) {
    // If we can't determine the field from the question, try to extract from the user's message directly
    // This handles cases where the user provides info without being asked
    const userMsgLower = lastUserMsg.toLowerCase();
    if (userMsgLower.includes('new lead') || userMsgLower.includes('lead.created') || userMsgLower.includes('trigger on new lead')) {
      fieldToExtract = 'triggerType';
    } else if (userMsgLower.match(/\d+\s*(message|sms|text)/i)) {
      fieldToExtract = 'messageCount';
    }
  }

  if (!fieldToExtract) {
    return {};
  }

  // Use LLM to extract structured answer
  if (!model) {
    // Simple fallback extraction
    if (fieldToExtract === 'messageCount') {
      const match = lastUserMsg.match(/\d+/);
      if (match) {
        const updatedState = addDecision(state, 'messageCount', parseInt(match[0], 10), 'Extracted from user response');
        return {
          decisions: updatedState.decisions,
        };
      }
    } else if (fieldToExtract === 'triggerType') {
      // Fallback trigger extraction
      const msgLower = lastUserMsg.toLowerCase();
      let triggerType = 'manual';
      if (msgLower.includes('new lead') || msgLower.includes('lead created')) {
        triggerType = 'lead.created';
      } else if (msgLower.includes('demo booked') || msgLower.includes('demo scheduled')) {
        triggerType = 'lead.demo_booked';
      } else if (msgLower.includes('investor matched')) {
        triggerType = 'investor.matched';
      }
      const updatedState = addDecision(state, 'triggerType', triggerType, 'Extracted from user response (fallback)');
      return {
        decisions: updatedState.decisions,
      };
    }
    return {};
  }

  const systemPrompt = `Extract structured information from the user's answer to a question.

Question asked: ${lastAssistantMsg.content}
User's answer: ${lastUserMsg}

Field to extract: ${fieldToExtract}

Extract the value and return JSON: { field: "${fieldToExtract}", value: <extracted_value> }

For messageCount: extract a number (e.g., "1 message" → 1, "three" → 3)
For timing: extract timing info (e.g., "1 hour" → "1h", "2 days" → "2d", "immediately" → "0h")
For tone: extract tone (professional, friendly, casual)
For targetAudience: extract audience description
For triggerType: map to one of these exact values:
  - "new lead", "lead created", "when lead is created" → "lead.created"
  - "demo booked", "demo scheduled" → "lead.demo_booked"
  - "investor matched" → "investor.matched"
  - "manual" or anything else → "manual"
  
Return the exact trigger type string (e.g., "lead.created")`;

  try {
    const response = await model.invoke([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Extract the ${fieldToExtract} from: "${lastUserMsg}"` },
    ]);

    const content = typeof response.content === 'string' ? response.content : String(response.content);
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```\n?/g, '').trim();
    }

    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.field && parsed.value !== undefined) {
        // Handle special cases
        let value = parsed.value;
        if (fieldToExtract === 'messageCount' && typeof value === 'string') {
          const numMatch = value.match(/\d+/);
          if (numMatch) value = parseInt(numMatch[0], 10);
        }
        if (fieldToExtract === 'tone') {
          const toneLower = String(value).toLowerCase();
          if (toneLower.includes('professional')) value = 'professional';
          else if (toneLower.includes('friendly')) value = 'friendly';
          else if (toneLower.includes('casual')) value = 'casual';
        }
        if (fieldToExtract === 'triggerType') {
          const triggerLower = String(value).toLowerCase();
          if (triggerLower.includes('new lead') || triggerLower.includes('lead.created') || triggerLower.includes('lead created')) {
            value = 'lead.created';
          } else if (triggerLower.includes('demo_booked') || triggerLower.includes('demo booked') || triggerLower.includes('demo scheduled')) {
            value = 'lead.demo_booked';
          } else if (triggerLower.includes('investor.matched') || triggerLower.includes('investor matched')) {
            value = 'investor.matched';
          } else {
            value = 'manual';
          }
        }

        const updatedState = addDecision(state, parsed.field, value, 'Extracted from user response');
        return {
          decisions: updatedState.decisions,
        };
      }
    } catch (parseError) {
      // Fallback: try simple extraction
      if (fieldToExtract === 'messageCount') {
        const match = lastUserMsg.match(/\d+/);
        if (match) {
          const updatedState = addDecision(state, 'messageCount', parseInt(match[0], 10), 'Extracted from user response (fallback)');
          return {
            decisions: updatedState.decisions,
          };
        }
      }
    }
  } catch (error) {
    console.error('Error extracting answer:', error);
    // Fallback extraction
    if (fieldToExtract === 'messageCount') {
      const match = lastUserMsg.match(/\d+/);
      if (match) {
        const updatedState = addDecision(state, 'messageCount', parseInt(match[0], 10), 'Extracted from user response (fallback)');
        return {
          decisions: updatedState.decisions,
        };
      }
    }
  }

  return {};
}

// Node 2: Find Gaps
export async function findGaps(state: AgentState): Promise<Partial<AgentState>> {
  const missing: string[] = [];
  const decisions = state.decisions.reduce((acc, d) => {
    acc[d.field] = d.value;
    return acc;
  }, {} as Record<string, any>);

  // Update tone from decisions if present
  if (decisions.tone && !state.tone) {
    state.tone = decisions.tone as 'professional' | 'friendly' | 'casual';
  }

  // Only require essential fields to build a sequence
  // We can build with just triggerType and messageCount
  if (!decisions.triggerType) {
    missing.push('triggerType');
  }
  if (!decisions.messageCount && !decisions.messages) {
    missing.push('messageCount');
  }
  
  // Ask about message content AFTER nodes are built
  // Don't require it before buildDraft runs - we'll ask after nodes exist
  // This allows the sequence to be built first, then we can ask about content
  
  // Optional fields (we'll use defaults if not provided)
  // timing, tone, targetAudience are nice-to-have but not required

  return {
    missingFields: missing,
    ...(decisions.tone ? { tone: decisions.tone as 'professional' | 'friendly' | 'casual' } : {}),
  };
}

// Node 3: Generate Question
export async function generateQuestion(state: AgentState): Promise<Partial<AgentState>> {
  if (state.missingFields.length === 0) {
    return {
      isComplete: true,
    };
  }

  if (!model) {
    // Fallback question
    const nextField = state.missingFields[0];
    const question = `What ${nextField} would you like for this sequence?`;
    return {
      ...updateStateWithAssistantResponse(state, question),
    };
  }

  const nextField = state.missingFields[0];
  let systemPrompt = `You are an AI assistant building SMS sequences. 
The user wants to: ${state.goal}

You need to ask about: ${nextField}

Ask ONE clear, specific question. Be conversational and helpful.`;

  // Special handling for messageContent
  if (nextField === 'messageContent') {
    const messageCount = state.decisions.find(d => d.field === 'messageCount')?.value || 1;
    systemPrompt = `You are an AI assistant building SMS sequences.
The user wants to: ${state.goal}
They want ${messageCount} message(s) in the sequence.

Ask them what they want the message(s) to say. If there are multiple messages, ask about each one or ask for the general messaging approach.`;
  }

  try {
    const response = await model.invoke([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: state.lastUserMsg },
      ...state.conversationHistory.slice(1).map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    ]);

    const question = typeof response.content === 'string' ? response.content : String(response.content);

    return {
      ...updateStateWithAssistantResponse(state, question),
    };
  } catch (error) {
    console.error('Error generating question:', error);
    const question = `What ${nextField} would you like for this sequence?`;
    return {
      ...updateStateWithAssistantResponse(state, question),
    };
  }
}

// Node 4: Build Draft
export async function buildDraft(state: AgentState): Promise<Partial<AgentState>> {
  // Get decisions
  const decisions = state.decisions.reduce((acc, d) => {
    acc[d.field] = d.value;
    return acc;
  }, {} as Record<string, any>);

  // Create or get spec
  let spec = state.currentSpec;
  if (!spec) {
    spec = createEmptySpec(state.goal, 'system');
  }

  // Build nodes and edges based on decisions
  const patches: JSONPatchOperation[] = [];
  
  // Update trigger if we have triggerType decision
  if (decisions.triggerType) {
    patches.push({
      op: 'replace',
      path: '/trigger/type',
      value: decisions.triggerType,
    });
  }

  // Check if we already have SMS nodes - if so, we might be updating, not creating
  const existingSmsNodes = spec.nodes.filter(n => n.type === 'send_sms');
  const shouldRebuild = existingSmsNodes.length === 0 || existingSmsNodes.length !== (decisions.messageCount || 1);
  
  if (shouldRebuild) {
    // Remove existing SMS and wait nodes (keep trigger and end)
    const nodesToRemove = spec.nodes.filter(n => n.type === 'send_sms' || n.type === 'wait');
    for (const node of nodesToRemove) {
      const nodeIndex = spec.nodes.findIndex(n => n.id === node.id);
      if (nodeIndex !== -1) {
        patches.push({
          op: 'remove',
          path: `/nodes/${nodeIndex}`,
        });
        patches.push({
          op: 'remove',
          path: `/ui/positions/${node.id}`,
        });
      }
    }
    
    // Remove edges connected to removed nodes
    const nodeIdsToRemove = new Set(nodesToRemove.map(n => n.id));
    const edgesToRemove = spec.edges.filter(e => nodeIdsToRemove.has(e.from) || nodeIdsToRemove.has(e.to));
    for (let i = spec.edges.length - 1; i >= 0; i--) {
      if (edgesToRemove.some(e => e.from === spec.edges[i].from && e.to === spec.edges[i].to)) {
        patches.push({
          op: 'remove',
          path: `/edges/${i}`,
        });
      }
    }
  }

  // Get message count (default to 1 if not specified)
  const messageCount = decisions.messageCount || 1;
  
  // Build the sequence: trigger -> sms -> wait -> sms -> ... -> end
  let currentNodeId = 'trigger';
  let xPos = 200;
  let yPos = 100;

  for (let i = 0; i < messageCount; i++) {
    // Create SMS node
    const smsNodeId = `sms_${i + 1}`;
    const smsNode: SendSmsNode = {
      id: smsNodeId,
      type: 'send_sms',
      content: '', // Will be filled by writeCopy
    };
    
    patches.push({
      op: 'add',
      path: '/nodes/-',
      value: smsNode,
    });
    
    patches.push({
      op: 'add',
      path: `/ui/positions/${smsNodeId}`,
      value: { x: xPos, y: yPos },
    });

    // Add edge from current node to SMS node
    patches.push({
      op: 'add',
      path: '/edges/-',
      value: { from: currentNodeId, to: smsNodeId },
    });

    yPos += 150; // Move down for next node
    
    // If not the last message, add a wait node
    if (i < messageCount - 1) {
      const waitNodeId = `wait_${i + 1}`;
      const waitDuration = decisions.timing || '24 hours'; // Default wait
      const waitNode: WaitNode = {
        id: waitNodeId,
        type: 'wait',
        duration: waitDuration,
      };
      
      patches.push({
        op: 'add',
        path: '/nodes/-',
        value: waitNode,
      });
      
      patches.push({
        op: 'add',
        path: `/ui/positions/${waitNodeId}`,
        value: { x: xPos, y: yPos },
      });

      // Add edge from SMS to wait
      patches.push({
        op: 'add',
        path: '/edges/-',
        value: { from: smsNodeId, to: waitNodeId },
      });

      currentNodeId = waitNodeId;
      yPos += 150; // Move down for next SMS node
    } else {
      // Last message, connect to end
      patches.push({
        op: 'add',
        path: '/edges/-',
        value: { from: smsNodeId, to: 'end' },
      });
    }
  }

  // Update end node position
  patches.push({
    op: 'replace',
    path: '/ui/positions/end',
    value: { x: xPos, y: yPos + 100 },
  });

  // Apply patches to spec so writeCopy can see the new nodes
  let updatedSpec = spec;
  if (patches.length > 0) {
    try {
      updatedSpec = applyPatchesToSpec(spec, patches);
      console.log(`[buildDraft] Created ${messageCount} SMS node(s) with ${messageCount - 1} wait node(s). Total patches: ${patches.length}`);
      console.log(`[buildDraft] Updated spec has ${updatedSpec.nodes.length} nodes, ${updatedSpec.edges.length} edges`);
    } catch (error) {
      console.error('[buildDraft] Error applying patches:', error);
      // Continue with original spec if patch application fails
    }
  } else {
    console.log('[buildDraft] No patches generated - messageCount:', messageCount, 'decisions:', decisions);
  }

  return {
    currentSpec: updatedSpec,
    ...addPatches(state, patches),
  };
}

// Node 5: Write Copy
export async function writeCopy(state: AgentState): Promise<Partial<AgentState>> {
  if (!state.currentSpec) {
    return {};
  }

  if (!model) {
    // Skip if model not available
    return {};
  }

  const smsNodes = state.currentSpec.nodes.filter((n) => n.type === 'send_sms');
  const patches: JSONPatchOperation[] = [];

  // First, check if user provided message content in decisions
  const messageContentDecision = state.decisions.find(d => d.field === 'messageContent');
  let extractedMessage: string | null = messageContentDecision?.value || null;
  
  // If not in decisions, check conversation history for user-provided messages
  if (!extractedMessage) {
    for (let i = state.conversationHistory.length - 1; i >= 0; i--) {
      const msg = state.conversationHistory[i];
      if (msg.role === 'user') {
        // Look for user-provided message content
        const content = msg.content;
        // Check if it looks like an SMS message (not a question/answer)
        if (content && !content.includes('?') && content.length > 10 && content.length < 200) {
          // Skip if it's just a number or trigger type
          if (!/^\d+$/.test(content.trim()) && 
              !content.toLowerCase().includes('trigger') &&
              !content.toLowerCase().includes('lead') &&
              !content.toLowerCase().includes('message')) {
            // Extract message if it's quoted
            const quotedMatch = content.match(/["']([^"']{10,160})["']/);
            if (quotedMatch) {
              extractedMessage = quotedMatch[1];
              break;
            }
            // Or use the content directly if it looks like a message
            if (content.length > 10 && content.length < 160) {
              extractedMessage = content.trim();
              break;
            }
          }
        }
      }
    }
  }

  for (const node of smsNodes) {
    if (node.type === 'send_sms' && (!node.content || node.content.trim().length === 0)) {
      let content = '';
      
      // Use extracted message if available, otherwise generate
      if (extractedMessage) {
        content = extractedMessage;
      } else if (model) {
        const messageNum = idx + 1;
        const systemPrompt = `Write a professional SMS message for a sequence.
Goal: ${state.goal}
Tone: ${state.tone || 'professional'}
Context: ${JSON.stringify(state.decisions)}
Message number: ${messageNum} of ${messageCount}

Write a concise SMS message (max 160 characters). Include variable placeholders like {{lead.first_name}} if needed.
${messageNum > 1 ? 'This is a follow-up message, so make it different from the first one.' : ''}`;

        try {
          const response = await model.invoke([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Write message ${messageNum} for the sequence` },
          ]);

          content = typeof response.content === 'string' ? response.content : String(response.content);
          content = content.trim();
          
          // Clean up if it's wrapped in quotes or markdown
          content = content.replace(/^["']|["']$/g, '').trim();
          if (content.startsWith('```')) {
            content = content.replace(/```[a-z]*\n?/g, '').replace(/```/g, '').trim();
          }
        } catch (error) {
          console.error(`Error writing copy for node ${node.id}:`, error);
          content = idx === 0 
            ? 'Welcome! Thanks for your interest.' 
            : 'Follow-up message.'; // Fallback
        }
      } else {
        content = idx === 0 
          ? 'Welcome! Thanks for your interest.' 
          : 'Follow-up message.'; // Fallback if no model
      }
      
      const nodeIndex = findNodeIndex(state.currentSpec, node.id);
      if (nodeIndex !== -1 && content) {
        patches.push({
          op: 'replace',
          path: `/nodes/${nodeIndex}/content`,
          value: content,
        });
      }
    }
  }

  if (patches.length > 0) {
    return addPatches(state, patches);
  }

  return {};
}

// Node 6: Validate
export async function validate(state: AgentState): Promise<Partial<AgentState>> {
  if (!state.currentSpec) {
    return {};
  }

  const result = validateSequenceSpec(state.currentSpec);
  
  if (!result.valid) {
    return {
      error: `Validation failed: ${result.errors.join(', ')}`,
    };
  }

  return {};
}

// Node 7: Emit Patches
export async function emitPatches(state: AgentState): Promise<Partial<AgentState>> {
  // Patches are already in state.patches
  // This node just ensures they're ready
  return markComplete(state);
}

// Conditional edge: Should continue asking questions?
export function shouldContinue(state: AgentState): string {
  if (state.isComplete) {
    return 'done';
  }
  if (state.missingFields.length > 0) {
    return 'ask';
  }
  if (state.currentSpec && state.patches.length > 0) {
    return 'build';
  }
  return 'ask';
}

// Conditional edge: Should validate?
export function shouldValidate(state: AgentState): string {
  if (state.currentSpec && state.patches.length > 0) {
    return 'validate';
  }
  return 'skip';
}

