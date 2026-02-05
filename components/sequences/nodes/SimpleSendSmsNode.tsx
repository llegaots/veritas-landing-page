'use client';

import { X, MessageSquare } from 'lucide-react';
import { useSequenceStore } from '@/lib/store/sequence-store';
import { useCallback } from 'react';
import { createRemoveNodePatch } from '@/lib/sequences/patches';

export function SimpleSendSmsNode({ data, nodeId, isSelected }: { data: any; nodeId: string; isSelected: boolean }) {
  const { spec, applyOps, commitOpsToServer, setSelectedNodeId } = useSequenceStore();
  const content = data?.content || '';
  const timing = data?.timing || '';

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!spec) return;
      
      const ops = createRemoveNodePatch(spec, nodeId);
      if (ops.length > 0) {
        applyOps(ops);
        commitOpsToServer(ops, `Deleted node ${nodeId}`);
        setSelectedNodeId(null);
      }
    },
    [spec, nodeId, applyOps, commitOpsToServer, setSelectedNodeId]
  );

  return (
    <div 
      className={`min-w-[280px] max-w-[400px] bg-white rounded-xl border-2 shadow-md transition-all duration-200 cursor-pointer ${
        isSelected 
          ? 'border-purple-500 shadow-lg ring-2 ring-purple-200' 
          : 'border-gray-200 hover:border-purple-300 hover:shadow-lg'
      }`}
    >
      <div className="p-4 relative">
        <button
          onClick={handleDelete}
          className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors cursor-pointer z-10"
          title="Delete node"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
            <MessageSquare className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-sm text-gray-900">Send SMS</div>
            {timing && (
              <div className="text-xs text-purple-600 font-medium mt-0.5">{timing}</div>
            )}
          </div>
        </div>
        
        <div className="text-sm text-gray-700 whitespace-pre-wrap break-words">
          {content || (
            <span className="text-gray-400 italic">No message content</span>
          )}
        </div>
      </div>
    </div>
  );
}

