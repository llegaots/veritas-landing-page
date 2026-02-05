'use client';

import { NodeProps, Handle, Position } from '@xyflow/react';
import { Play } from 'lucide-react';
import { useSequenceStore } from '@/lib/store/sequence-store';

export function WorkflowTriggerNode(props: NodeProps) {
  const { spec, selectedNodeId, setSelectedNodeId } = useSequenceStore();
  const isSelected = selectedNodeId === props.id;
  
  // Get current trigger type
  const triggerType = spec?.trigger?.type || 'lead.created';
  const triggerLabels: Record<string, string> = {
    'lead.created': 'New Lead Created',
    'lead.demo_booked': 'Demo Booked',
    'investor.matched': 'Investor Matched',
    'manual': 'Manual',
  };
  const triggerLabel = triggerLabels[triggerType] || triggerType;
  const sourceFilter = spec?.trigger?.filters?.source;

  return (
    <div 
      className={`w-80 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl border-2 shadow-lg transition-all duration-200 cursor-pointer ${
        isSelected 
          ? 'border-purple-300 ring-4 ring-purple-200' 
          : 'border-purple-600 hover:border-purple-400'
      }`}
      onClick={() => setSelectedNodeId(props.id)}
    >
      <Handle 
        type="source" 
        position={Position.Right} 
        className="!w-4 !h-4 !bg-purple-400 !border-2 !border-white !rounded-full hover:!bg-purple-500 !transition-colors" 
        style={{ width: '16px', height: '16px' }}
      />
      <div className="p-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <Play className="h-4 w-4 text-white" />
          </div>
          <div className="font-semibold text-sm text-white">Trigger</div>
        </div>
        <div className="text-xs text-purple-100 mt-1">
          {triggerLabel}
        </div>
        {sourceFilter && (
          <div className="text-xs text-purple-200 mt-1 flex items-center gap-1">
            <span className="opacity-80">Only:</span>
            <span className="font-medium">{sourceFilter}</span>
          </div>
        )}
      </div>
    </div>
  );
}

