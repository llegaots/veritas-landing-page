'use client';

import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card, CardContent } from '@/components/ui/card';
import { X } from 'lucide-react';
import { useSequenceStore } from '@/lib/store/sequence-store';
import { useCallback } from 'react';
import { createRemoveNodePatch } from '@/lib/sequences/patches';

export function WaitNode(props: NodeProps) {
  const { spec, applyOps, commitOpsToServer, setSelectedNodeId } = useSequenceStore();
  const node = props.data as any;
  const duration = node?.duration || '';

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

  return (
    <Card 
      className="min-w-[200px] cursor-pointer hover:shadow-lg transition-shadow"
      onClick={handleClick}
    >
      <CardContent className="p-4 relative">
        <button
          onClick={handleDelete}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          title="Delete node"
        >
          <X className="h-3 w-3" />
        </button>
        
        <div className="font-semibold text-sm mb-2 text-primary">Wait</div>
        <div className="text-sm text-foreground">
          {duration || (
            <span className="text-muted-foreground italic">Click to set duration</span>
          )}
        </div>
        <Handle type="target" position={Position.Top} />
        <Handle type="source" position={Position.Bottom} />
      </CardContent>
    </Card>
  );
}

