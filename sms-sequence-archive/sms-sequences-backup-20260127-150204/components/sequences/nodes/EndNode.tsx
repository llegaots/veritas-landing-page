'use client';

import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card, CardContent } from '@/components/ui/card';

export function EndNode(props: NodeProps) {
  return (
    <Card className="min-w-[200px]">
      <CardContent className="p-4">
        <div className="font-semibold text-sm mb-2">End</div>
        <div className="text-xs text-muted-foreground">Sequence complete</div>
        <Handle type="target" position={Position.Top} />
      </CardContent>
    </Card>
  );
}

