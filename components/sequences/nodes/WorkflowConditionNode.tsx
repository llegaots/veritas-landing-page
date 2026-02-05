'use client';

import { NodeProps, Handle, Position } from '@xyflow/react';
import { GitBranch } from 'lucide-react';
import { useSequenceStore } from '@/lib/store/sequence-store';
import { ConditionStep } from '@/lib/sequences/workflow-v2';

export function WorkflowConditionNode(props: NodeProps) {
  const { selectedNodeId, setSelectedNodeId } = useSequenceStore();
  const step = props.data as ConditionStep;
  const isSelected = selectedNodeId === props.id;

  const conditionText = step.condition.field 
    ? `${step.condition.field} ${step.condition.operator || 'equals'} ${String(step.condition.value || '')}`
    : 'Set condition';

  return (
    <div
      className={`w-80 bg-white rounded-xl border-2 shadow-md transition-all duration-200 cursor-pointer ${
        isSelected 
          ? 'border-purple-500 shadow-lg ring-2 ring-purple-200' 
          : 'border-gray-200 hover:border-purple-300 hover:shadow-lg'
      }`}
      onClick={() => setSelectedNodeId(props.id)}
    >
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!w-4 !h-4 !bg-orange-400 !border-2 !border-white !rounded-full hover:!bg-orange-500 !transition-colors" 
        style={{ width: '16px', height: '16px' }}
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        id="true" 
        className="!w-4 !h-4 !bg-green-400 !border-2 !border-white !rounded-full hover:!bg-green-500 !transition-colors !top-1/3" 
        style={{ width: '16px', height: '16px' }}
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        id="false" 
        className="!w-4 !h-4 !bg-red-400 !border-2 !border-white !rounded-full hover:!bg-red-500 !transition-colors !top-2/3" 
        style={{ width: '16px', height: '16px' }}
      />
      <div className="p-4 relative">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center flex-shrink-0">
            <GitBranch className="h-4 w-4 text-white" />
          </div>
          <div className="font-semibold text-sm text-gray-900">Condition</div>
        </div>
        
        <div className="text-xs text-gray-600 mb-3 min-h-[32px]">
          {conditionText}
        </div>
        
        <div className="flex items-center justify-between text-xs font-medium">
          <span className="text-green-600 bg-green-50 px-2 py-1 rounded">True</span>
          <span className="text-red-600 bg-red-50 px-2 py-1 rounded">False</span>
        </div>
      </div>
    </div>
  );
}

