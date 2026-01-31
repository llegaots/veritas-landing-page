'use client';

import { NodeProps, Handle, Position } from '@xyflow/react';
import { X, Mail } from 'lucide-react';
import { useSequenceStore } from '@/lib/store/sequence-store';
import { SendEmailNode } from '@/lib/sequences/spec';
import { timingToString } from '@/lib/sequences/adapters';

export function WorkflowSendEmailNode(props: NodeProps) {
  const { selectedNodeId, setSelectedNodeId } = useSequenceStore();
  const node = props.data as unknown as SendEmailNode;
  const isSelected = selectedNodeId === props.id;

  // Truncate subject for display
  const subject = node.subject || '';
  const maxLength = 60;
  const displaySubject = subject.length > maxLength 
    ? subject.substring(0, maxLength) + '...' 
    : subject;

  return (
    <div
      className={`w-80 bg-white rounded-xl border-2 shadow-md transition-all duration-200 cursor-pointer ${
        isSelected 
          ? 'border-blue-500 shadow-lg ring-2 ring-blue-200' 
          : 'border-gray-200 hover:border-blue-300 hover:shadow-lg'
      }`}
      onClick={() => setSelectedNodeId(props.id)}
    >
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
            {node.timing && (
              <div className="text-xs text-blue-600 font-medium mt-0.5">
                {node.timing}
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
          {node.html_content && (
            <div className="text-xs text-gray-500 mt-2">
              HTML content ({node.html_content.length} chars)
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

