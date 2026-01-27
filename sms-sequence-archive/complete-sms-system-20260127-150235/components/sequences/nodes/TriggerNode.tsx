'use client';

import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card, CardContent } from '@/components/ui/card';

export function TriggerNode(props: NodeProps) {
  // Data contains the full node object from spec
  return (
    <Card className="min-w-[200px]">
      <CardContent className="p-4">
        <div className="font-semibold text-sm mb-2">Trigger</div>
        <div className="text-xs text-muted-foreground">
          Start
        </div>
        <Handle type="source" position={Position.Bottom} />
      </CardContent>
    </Card>
  );
}

