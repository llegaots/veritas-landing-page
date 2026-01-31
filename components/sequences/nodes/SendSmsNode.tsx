'use client';

import { Handle, Position, NodeProps } from '@xyflow/react';
import { X, MessageSquare } from 'lucide-react';
import { useSequenceStore } from '@/lib/store/sequence-store';
import { useCallback } from 'react';
import { createRemoveNodePatch } from '@/lib/sequences/patches';

export function SendSmsNode(props: NodeProps) {
  const { spec, applyOps, commitOpsToServer, setSelectedNodeId, selectedNodeId } = useSequenceStore();
  const node = props.data as any;
  const content = node?.content || '';
  const timing = node?.timing || '';
  const isSelected = selectedNodeId === props.id;

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!spec) return;
      
      const ops = createRemoveNodePatch(spec, props.id);
      if (ops.length > 0) {
        applyOps(ops);
        commitOpsToServer(ops, `Deleted node ${props.id}`);
        setSelectedNodeId(null);
      }
    },
    [spec, props.id, applyOps, commitOpsToServer, setSelectedNodeId]
  );

  const handleClick = useCallback(() => {
    setSelectedNodeId(props.id);
  }, [props.id, setSelectedNodeId]);

  // Truncate content for display
  const displayContent = content.length > 80 
    ? content.substring(0, 80) + '...' 
    : content;

  return (
    <div 
      className={`min-w-[260px] max-w-[300px] bg-white rounded-xl border-2 shadow-md transition-all duration-200 cursor-pointer ${
        isSelected 
          ? 'border-purple-500 shadow-lg ring-2 ring-purple-200' 
          : 'border-gray-200 hover:border-purple-300 hover:shadow-lg'
      }`}
      onClick={handleClick}
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
        
        <div className="text-xs text-gray-600 line-clamp-3 min-h-[48px]">
          {displayContent || (
            <span className="text-gray-400 italic">Click to add message content</span>
          )}
        </div>
        
        <Handle type="target" position={Position.Left} className="!bg-purple-500 !border-2 !border-white !w-3 !h-3" />
        <Handle type="source" position={Position.Right} className="!bg-purple-500 !border-2 !border-white !w-3 !h-3" />
      </div>
    </div>
  );
}

