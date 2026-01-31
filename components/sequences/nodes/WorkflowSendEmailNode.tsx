'use client';

import { NodeProps, Handle, Position } from '@xyflow/react';
import { X, Mail } from 'lucide-react';
import { useSequenceStore } from '@/lib/store/sequence-store';
import { SendEmailNode } from '@/lib/sequences/spec';
import { SendEmailStep } from '@/lib/sequences/workflow-v2';
import { timingToString, parseTimingString } from '@/lib/sequences/adapters';
import { calculateTimeline } from '@/lib/sequences/timeline';

export function WorkflowSendEmailNode(props: NodeProps) {
  const { selectedNodeId, setSelectedNodeId, spec } = useSequenceStore();
  // Data can be either SendEmailNode (from SequenceSpec) or SendEmailStep (from WorkflowSpecV2)
  const node = props.data as unknown as SendEmailNode | SendEmailStep;
  const isSelected = selectedNodeId === props.id;

  // Calculate timeline label
  // Convert step ID (step_send_email_123) back to node ID (send_email_123) for timeline calculation
  const nodeIdForTimeline = props.id.startsWith('step_') 
    ? props.id.replace(/^step_/, '')
    : props.id;
  const timelineInfo = spec ? calculateTimeline(spec, nodeIdForTimeline) : null;
  
  // Debug logging
  if (spec && !timelineInfo) {
    console.log('[WorkflowSendEmailNode] Timeline calculation returned null for:', {
      stepId: props.id,
      nodeId: nodeIdForTimeline,
      specNodes: spec.nodes.map(n => n.id),
    });
  }

  // Truncate subject for display
  const subject = ('subject' in node ? node.subject : '') || '';
  const maxLength = 60;
  const displaySubject = subject.length > maxLength 
    ? subject.substring(0, maxLength) + '...' 
    : subject;

  // Handle timing - can be string (SendEmailNode) or Timing object (SendEmailStep)
  let timingDisplay: string | null = null;
  if ('timing' in node && node.timing) {
    if (typeof node.timing === 'string') {
      // It's a string, parse it first
      const timingObj = parseTimingString(node.timing);
      timingDisplay = timingToString(timingObj);
    } else {
      // It's already a Timing object
      timingDisplay = timingToString(node.timing);
    }
  }

  return (
    <div
      className={`w-80 bg-white rounded-xl border-2 shadow-md transition-all duration-200 cursor-pointer relative ${
        isSelected 
          ? 'border-blue-500 shadow-lg ring-2 ring-blue-200' 
          : 'border-gray-200 hover:border-blue-300 hover:shadow-lg'
      }`}
      onClick={() => setSelectedNodeId(props.id)}
    >
      {/* Timeline label - top right */}
      {timelineInfo && timelineInfo.label !== 'START' && (
        <div className="absolute -top-3 -right-3 bg-gradient-to-br from-blue-600 to-blue-700 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg border-2 border-white z-10">
          {timelineInfo.label}
        </div>
      )}
      
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!w-4 !h-4 !bg-blue-400 !border-2 !border-white !rounded-full hover:!bg-blue-500 !transition-colors" 
        style={{ width: '16px', height: '16px' }}
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        className="!w-4 !h-4 !bg-blue-400 !border-2 !border-white !rounded-full hover:!bg-blue-500 !transition-colors" 
        style={{ width: '16px', height: '16px' }}
      />
      <div className="p-4 relative">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
            <Mail className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm text-gray-900">Send Email</div>
            {timingDisplay && (
              <div className="text-xs text-blue-600 font-medium mt-0.5">
                After {timingDisplay}
              </div>
            )}
          </div>
        </div>
        
        <div className="text-sm text-gray-700">
          <div className="font-medium mb-1">Subject:</div>
          <div className="line-clamp-2 min-h-[40px]">
            {displaySubject || (
              <span className="text-gray-400 italic">No subject</span>
            )}
          </div>
          {('html_content' in node ? node.html_content : '') && (
            <div className="text-xs text-gray-500 mt-2">
              HTML content ({('html_content' in node ? node.html_content : '').length} chars)
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

