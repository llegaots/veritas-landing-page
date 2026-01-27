// Debug endpoint to test sequence creation and compilation
import { NextRequest, NextResponse } from 'next/server';
import { createEmptySpec } from '@/lib/sequences/spec';
import { compileSequenceToJobs } from '@/lib/sequences/compiler';
import { applyPatchesToSpec } from '@/lib/sequences/patches';

export async function GET(request: NextRequest) {
  try {
    // Create a simple test sequence
    const spec = createEmptySpec('Test Sequence', 'debug');
    spec.trigger.type = 'lead.created';
    
    // Add 2 SMS nodes manually
    const patches = [
      {
        op: 'add',
        path: '/nodes/-',
        value: { id: 'sms_1', type: 'send_sms', content: 'Welcome! Thanks for your interest.' },
      },
      {
        op: 'add',
        path: '/ui/positions/sms_1',
        value: { x: 200, y: 100 },
      },
      {
        op: 'add',
        path: '/edges/-',
        value: { from: 'trigger', to: 'sms_1' },
      },
      {
        op: 'add',
        path: '/nodes/-',
        value: { id: 'wait_1', type: 'wait', duration: '1 hour' },
      },
      {
        op: 'add',
        path: '/ui/positions/wait_1',
        value: { x: 200, y: 250 },
      },
      {
        op: 'add',
        path: '/edges/-',
        value: { from: 'sms_1', to: 'wait_1' },
      },
      {
        op: 'add',
        path: '/nodes/-',
        value: { id: 'sms_2', type: 'send_sms', content: 'Follow-up: Ready to learn more?' },
      },
      {
        op: 'add',
        path: '/ui/positions/sms_2',
        value: { x: 200, y: 400 },
      },
      {
        op: 'add',
        path: '/edges/-',
        value: { from: 'wait_1', to: 'sms_2' },
      },
      {
        op: 'remove',
        path: '/edges/0', // Remove trigger -> end edge
      },
      {
        op: 'add',
        path: '/edges/-',
        value: { from: 'sms_2', to: 'end' },
      },
    ];
    
    const updatedSpec = applyPatchesToSpec(spec, patches);
    
    // Compile to jobs
    const jobs = compileSequenceToJobs(updatedSpec, 'test-run-123', {
      lead_id: 'test-lead-123',
      phone: '+1234567890',
      first_name: 'John',
    });
    
    return NextResponse.json({
      success: true,
      spec: {
        nodes: updatedSpec.nodes.length,
        edges: updatedSpec.edges.length,
        trigger: updatedSpec.trigger.type,
      },
      jobs: jobs.map(j => ({
        node_id: j.node_id,
        message: j.message_text,
        scheduled_for: j.scheduled_for,
      })),
      message: `Created ${updatedSpec.nodes.length} nodes, ${updatedSpec.edges.length} edges, ${jobs.length} jobs`,
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}

