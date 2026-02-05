// Copilot streaming API route
import { NextRequest } from 'next/server';
import { createInitialState, updateStateWithUserMessage, AgentState } from '@/lib/agent/state';
import { runAgent } from '@/lib/agent/graph';
import { getActiveVersion, createSequenceVersion } from '@/lib/db';
import { SequenceSpec } from '@/lib/sequences/spec';
import { applyPatchesToSpec } from '@/lib/sequences/patches';

// Force Node.js runtime (not Edge)
export const runtime = 'nodejs';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'veritas2024admin';

// Helper to create streaming response
function createStreamResponse(stream: ReadableStream) {
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// Helper to create text chunk
function createTextChunk(text: string): string {
  return `data: ${JSON.stringify({ type: 'text', content: text })}\n\n`;
}

// Helper to create patches chunk
function createPatchesChunk(patches: any[]): string {
  return `data: ${JSON.stringify({ type: 'patches', patches })}\n\n`;
}

// Helper to create done chunk
function createDoneChunk(): string {
  return `data: ${JSON.stringify({ type: 'done' })}\n\n`;
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const { searchParams } = new URL(request.url);
    const password = searchParams.get('key') || request.headers.get('x-password');
    
    if (password !== ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const {
      message,
      sequenceId,
      specSnapshot,
      editContext,
      conversationId,
      conversationHistory, // Receive conversation history from client
    } = body;

    // Load existing spec if sequenceId provided
    let currentSpec: SequenceSpec | undefined = specSnapshot;
    if (sequenceId && !currentSpec) {
      const version = await getActiveVersion(sequenceId);
      if (version) {
        currentSpec = version.spec_jsonb;
      }
    }

    // Initialize agent state - use first message from history if available, otherwise use current message
    const goal = conversationHistory && conversationHistory.length > 0 
      ? conversationHistory[0].content 
      : message;
    const initialState = createInitialState(goal, currentSpec);
    
    // Restore conversation history if provided
    if (conversationHistory && conversationHistory.length > 0) {
      initialState.conversationHistory = conversationHistory.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      }));
      // Set goal from first message
      if (conversationHistory.length > 0) {
        initialState.goal = conversationHistory[0].content;
      }
      
      // Rebuild decisions from conversation history
      // This ensures we don't lose information between API calls
      for (let i = 1; i < conversationHistory.length; i++) {
        const prevMsg = conversationHistory[i - 1];
        const currMsg = conversationHistory[i];
        
        if (prevMsg.role === 'assistant' && currMsg.role === 'user') {
          // This is a question-answer pair, try to extract the answer
          const question = prevMsg.content.toLowerCase();
          const answer = currMsg.content;
          
          // Simple extraction logic (matches extractAnswer node)
          if (question.includes('how many message') || question.includes('number of message')) {
            const match = answer.match(/\d+/);
            if (match) {
              initialState.decisions.push({
                field: 'messageCount',
                value: parseInt(match[0], 10),
                reasoning: 'Extracted from conversation history',
              });
            }
          } else if (question.includes('trigger') || question.includes('what trigger')) {
            const answerLower = answer.toLowerCase();
            let triggerType = 'manual';
            if (answerLower.includes('new lead') || answerLower.includes('lead created')) {
              triggerType = 'lead.created';
            } else if (answerLower.includes('demo booked') || answerLower.includes('demo scheduled')) {
              triggerType = 'lead.demo_booked';
            } else if (answerLower.includes('investor matched')) {
              triggerType = 'investor.matched';
            }
            initialState.decisions.push({
              field: 'triggerType',
              value: triggerType,
              reasoning: 'Extracted from conversation history',
            });
          } else if (question.includes('tone') || question.includes('style')) {
            const toneLower = answer.toLowerCase();
            let tone: 'professional' | 'friendly' | 'casual' = 'professional';
            if (toneLower.includes('friendly')) tone = 'friendly';
            else if (toneLower.includes('casual')) tone = 'casual';
            initialState.decisions.push({
              field: 'tone',
              value: tone,
              reasoning: 'Extracted from conversation history',
            });
            initialState.tone = tone;
          }
        }
      }
      
      // Also check the first message for trigger type
      if (conversationHistory.length > 0) {
        const firstMsg = conversationHistory[0].content.toLowerCase();
        if (firstMsg.includes('new lead') || firstMsg.includes('lead created') || firstMsg.includes('trigger on new lead')) {
          const existing = initialState.decisions.find(d => d.field === 'triggerType');
          if (!existing) {
            initialState.decisions.push({
              field: 'triggerType',
              value: 'lead.created',
              reasoning: 'Extracted from initial goal',
            });
          }
        }
      }
    }
    
    if (editContext && editContext.length > 0) {
      // Apply recent manual edits to spec
      if (currentSpec) {
        currentSpec = applyPatchesToSpec(currentSpec, editContext);
        initialState.currentSpec = currentSpec;
      }
    }

    // Update state with user message
    const stateWithMessage = updateStateWithUserMessage(initialState, message);

    // Create streaming response
    const stream = new ReadableStream({
      start: async (controller: any) => {
        try {
          // Run agent (simplified - will stream responses)
          const finalState = await runAgent(stateWithMessage);

          // Stream assistant response
          if (finalState.conversationHistory.length > 1) {
            const lastMessage = finalState.conversationHistory[finalState.conversationHistory.length - 1];
            if (lastMessage.role === 'assistant') {
              // Stream word by word
              const words = lastMessage.content.split(' ');
              for (let i = 0; i < words.length; i++) {
                const chunk = i === 0 ? words[i] : ' ' + words[i];
                controller.enqueue(new TextEncoder().encode(createTextChunk(chunk)));
                // Small delay for streaming effect
                await new Promise((resolve) => setTimeout(resolve, 30));
              }
            }
          }

          // Apply patches to spec if we have both
          let finalSpec = finalState.currentSpec;
          if (finalSpec && finalState.patches.length > 0) {
            try {
              finalSpec = applyPatchesToSpec(finalSpec, finalState.patches);
            } catch (error) {
              console.error('Error applying patches:', error);
            }
          }

          // Send patches if any
          if (finalState.patches.length > 0) {
            console.log(`[copilot] Sending ${finalState.patches.length} patches to client`);
            console.log(`[copilot] Patches:`, JSON.stringify(finalState.patches.slice(0, 3), null, 2));
            controller.enqueue(new TextEncoder().encode(createPatchesChunk(finalState.patches)));
            
            // Also send the updated spec so client can initialize if needed
            if (finalSpec) {
              console.log(`[copilot] Sending updated spec with ${finalSpec.nodes.length} nodes, ${finalSpec.edges.length} edges`);
              controller.enqueue(new TextEncoder().encode(
                `data: ${JSON.stringify({ type: 'spec', spec: finalSpec })}\n\n`
              ));
            }
          } else {
            console.log('[copilot] No patches to send');
          }
          
          // Apply patches and save if sequenceId provided
          if (sequenceId && finalSpec) {
            try {
              finalSpec.metadata.updatedAt = new Date().toISOString();
              await createSequenceVersion(sequenceId, finalSpec, 'system');
            } catch (error) {
              console.error('Error saving sequence version:', error);
            }
          }

          // Send done
          const doneChunk = createDoneChunk();
          controller.enqueue(new TextEncoder().encode(doneChunk));
          controller.close();
        } catch (error) {
          console.error('Error in copilot stream:', error);
          controller.enqueue(
            new TextEncoder().encode(
              createTextChunk(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
            )
          );
          controller.close();
        }
      }
    });

    return createStreamResponse(stream);
  } catch (error) {
    console.error('Error in copilot API:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

