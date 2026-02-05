'use client';

import { NodeProps, Handle, Position } from '@xyflow/react';
import { CheckCircle } from 'lucide-react';

export function WorkflowEndNode(props: NodeProps) {
  return (
    <div className="w-80 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl border-2 border-gray-600 shadow-lg">
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!w-4 !h-4 !bg-gray-400 !border-2 !border-white !rounded-full hover:!bg-gray-500 !transition-colors" 
        style={{ width: '16px', height: '16px' }}
      />
      <div className="p-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <CheckCircle className="h-4 w-4 text-white" />
          </div>
          <div className="font-semibold text-sm text-white">End</div>
        </div>
        <div className="text-xs text-gray-200 mt-1">Sequence complete</div>
      </div>
    </div>
  );
}

