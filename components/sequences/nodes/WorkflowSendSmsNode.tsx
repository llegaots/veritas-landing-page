'use client';

import { NodeProps, Handle, Position } from '@xyflow/react';
import { X, MessageSquare } from 'lucide-react';
import { useSequenceStore } from '@/lib/store/sequence-store';
import { SendSmsStep } from '@/lib/sequences/workflow-v2';
import { timingToString } from '@/lib/sequences/adapters';
import { calculateTimeline } from '@/lib/sequences/timeline';

export function WorkflowSendSmsNode(props: NodeProps) {
  const { selectedNodeId, setSelectedNodeId, spec } = useSequenceStore();
  const step = props.data as SendSmsStep;
  const isSelected = selectedNodeId === props.id;

  // Calculate timeline label
  const timelineInfo = spec ? calculateTimeline(spec, props.id) : null;

  // Truncate message for display (2-4 lines)
  const message = step.message || '';
  const maxLength = 120; // ~2-3 lines
  const displayMessage = message.length > maxLength 
    ? message.substring(0, maxLength) + '...' 
    : message;

  return (
    <div
      className={`w-80 bg-white rounded-xl border-2 shadow-md transition-all duration-200 cursor-pointer relative ${
        isSelected 
          ? 'border-purple-500 shadow-lg ring-2 ring-purple-200' 
          : 'border-gray-200 hover:border-purple-300 hover:shadow-lg'
      }`}
      onClick={() => setSelectedNodeId(props.id)}
    >
      {/* Timeline label - top right */}
      {timelineInfo && timelineInfo.label !== 'START' && (
        <div className="absolute -top-3 -right-3 bg-gradient-to-br from-purple-600 to-purple-700 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg border-2 border-white z-10">
          {timelineInfo.label}
        </div>
      )}
      
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!w-4 !h-4 !bg-purple-400 !border-2 !border-white !rounded-full hover:!bg-purple-500 !transition-colors" 
        style={{ width: '16px', height: '16px' }}
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        className="!w-4 !h-4 !bg-purple-400 !border-2 !border-white !rounded-full hover:!bg-purple-500 !transition-colors" 
        style={{ width: '16px', height: '16px' }}
      />
      <div className="p-4 relative">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <MessageSquare className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm text-gray-900">Send SMS</div>
            {step.timing && (
              <div className="text-xs text-purple-600 font-medium mt-0.5">
                After {timingToString(step.timing)}
              </div>
            )}
          </div>
        </div>
        
        <div className="text-sm text-gray-700 line-clamp-3 min-h-[60px]">
          {displayMessage || (
            <span className="text-gray-400 italic">No message content</span>
          )}
        </div>
      </div>
    </div>
  );
}

