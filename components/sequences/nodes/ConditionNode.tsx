'use client';

import { Handle, Position, NodeProps } from '@xyflow/react';
import { X, GitBranch } from 'lucide-react';
import { useSequenceStore } from '@/lib/store/sequence-store';
import { useCallback } from 'react';
import { createRemoveNodePatch } from '@/lib/sequences/patches';

export function ConditionNode(props: NodeProps) {
  const { spec, applyOps, commitOpsToServer, setSelectedNodeId, selectedNodeId } = useSequenceStore();
  const node = props.data as any;
  const condition = node?.condition || {};
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

  const conditionText = condition.field 
    ? `${condition.field} ${condition.operator || 'equals'} ${String(condition.value || '')}`
    : '';

  return (
    <div 
      className={`min-w-[220px] max-w-[260px] bg-white rounded-xl border-2 shadow-md transition-all duration-200 cursor-pointer ${
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
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
            <GitBranch className="h-4 w-4 text-white" />
          </div>
          <div className="font-semibold text-sm text-gray-900">Condition</div>
        </div>
        
        <div className="text-xs text-gray-600 mb-3 min-h-[32px]">
          {conditionText || (
            <span className="text-gray-400 italic">Set condition</span>
          )}
        </div>
        
        <div className="flex items-center justify-between text-xs font-medium">
          <span className="text-green-600 bg-green-50 px-2 py-1 rounded">True</span>
          <span className="text-red-600 bg-red-50 px-2 py-1 rounded">False</span>
        </div>
        
        <Handle type="target" position={Position.Left} className="!bg-orange-500 !border-2 !border-white !w-3 !h-3" />
        <Handle type="source" position={Position.Top} id="true" className="!bg-green-500 !border-2 !border-white !w-3 !h-3" style={{ top: '35%' }} />
        <Handle type="source" position={Position.Bottom} id="false" className="!bg-red-500 !border-2 !border-white !w-3 !h-3" style={{ bottom: '35%' }} />
      </div>
    </div>
  );
}

