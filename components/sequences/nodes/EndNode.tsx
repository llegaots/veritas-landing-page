'use client';

import { Handle, Position, NodeProps } from '@xyflow/react';
import { CheckCircle } from 'lucide-react';

export function EndNode(props: NodeProps) {
  return (
    <div className="min-w-[200px] max-w-[240px] bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl border-2 border-gray-600 shadow-lg">
      <div className="p-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <CheckCircle className="h-4 w-4 text-white" />
          </div>
          <div className="font-semibold text-sm text-white">End</div>
        </div>
        <div className="text-xs text-gray-200 mt-1">Sequence complete</div>
        <Handle type="target" position={Position.Left} className="!bg-white !border-2 !border-gray-600 !w-3 !h-3" />
      </div>
    </div>
  );
}

