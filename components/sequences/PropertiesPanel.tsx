'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSequenceStore } from '@/lib/store/sequence-store';
import { SequenceNode, SendSmsNode, WaitNode, ConditionNode } from '@/lib/sequences/spec';
import { JSONPatchOperation, createUpdateNodePatchWithIndex } from '@/lib/sequences/patches';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDebouncedCallback } from 'use-debounce';

export function PropertiesPanel() {
  const { spec, selectedNodeId, applyOps, commitOpsToServer } = useSequenceStore();
  const [localValues, setLocalValues] = useState<Record<string, any>>({});

  const selectedNode = selectedNodeId && spec
    ? spec.nodes.find((n) => n.id === selectedNodeId)
    : null;

  // Initialize local values when node selection changes
  useEffect(() => {
    if (selectedNode) {
      const values: Record<string, any> = {};
      
      if (selectedNode.type === 'send_sms') {
        values.content = (selectedNode as SendSmsNode).content || '';
      } else if (selectedNode.type === 'wait') {
        values.duration = (selectedNode as WaitNode).duration || '';
      } else if (selectedNode.type === 'condition') {
        const cond = (selectedNode as ConditionNode);
        values.field = cond.condition?.field || '';
        values.operator = cond.condition?.operator || 'equals';
        values.value = cond.condition?.value || '';
        values.truePath = cond.truePath || '';
        values.falsePath = cond.falsePath || '';
      }
      
      setLocalValues(values);
    } else {
      setLocalValues({});
    }
  }, [selectedNode, selectedNodeId]);

  // Debounced function to commit changes
  const debouncedCommit = useDebouncedCallback(
    (ops: JSONPatchOperation[]) => {
      if (ops.length > 0) {
        commitOpsToServer(ops, `Updated ${selectedNodeId}`);
      }
    },
    1000 // 1 second debounce
  );

  // Handle field changes
  const handleChange = useCallback(
    (field: string, value: any) => {
      if (!spec || !selectedNode) return;

      setLocalValues((prev) => ({ ...prev, [field]: value }));

      // Create patch operation
      const updates: Partial<SequenceNode> = {};
      
      if (selectedNode.type === 'send_sms') {
        if (field === 'content') {
          (updates as Partial<SendSmsNode>).content = value;
        }
      } else if (selectedNode.type === 'wait') {
        if (field === 'duration') {
          (updates as Partial<WaitNode>).duration = value;
        }
      } else if (selectedNode.type === 'condition') {
        if (field === 'field' || field === 'operator' || field === 'value') {
          const cond = (selectedNode as ConditionNode);
          (updates as Partial<ConditionNode>).condition = {
            ...cond.condition,
            [field]: value,
          };
        } else if (field === 'truePath' || field === 'falsePath') {
          (updates as Partial<ConditionNode>)[field] = value;
        }
      }

      const ops = createUpdateNodePatchWithIndex(spec, selectedNode.id, updates);
      
      // Apply immediately for instant feedback
      applyOps(ops);
      
      // Commit to server after debounce
      debouncedCommit(ops);
    },
    [spec, selectedNode, applyOps, debouncedCommit]
  );

  if (!selectedNode) {
    return (
      <div className="w-80 border-l p-4 bg-muted/50">
        <p className="text-sm text-muted-foreground">Select a node to edit its properties</p>
      </div>
    );
  }

  return (
    <div className="w-80 border-l p-4 bg-muted/50 overflow-y-auto">
      <h3 className="font-semibold mb-4">Node Properties</h3>
      
      <Card className="p-4 space-y-4">
        <div>
          <Label className="text-xs text-muted-foreground">Node ID</Label>
          <Input value={selectedNode.id} disabled className="mt-1" />
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Type</Label>
          <Input value={selectedNode.type} disabled className="mt-1" />
        </div>

        {selectedNode.type === 'send_sms' && (
          <div>
            <Label htmlFor="content">Message Content</Label>
            <Textarea
              id="content"
              value={localValues.content || ''}
              onChange={(e) => handleChange('content', e.target.value)}
              placeholder="Enter SMS message content..."
              className="mt-1 min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Use variables like {'{{'}lead.first_name{'}}'}
            </p>
          </div>
        )}

        {selectedNode.type === 'wait' && (
          <div>
            <Label htmlFor="duration">Wait Duration</Label>
            <Input
              id="duration"
              value={localValues.duration || ''}
              onChange={(e) => handleChange('duration', e.target.value)}
              placeholder="e.g., 1 hour, 2 days, 30 minutes"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Examples: "1 hour", "2 days", "30 minutes"
            </p>
          </div>
        )}

        {selectedNode.type === 'condition' && (
          <>
            <div>
              <Label htmlFor="field">Field</Label>
              <Input
                id="field"
                value={localValues.field || ''}
                onChange={(e) => handleChange('field', e.target.value)}
                placeholder="e.g., lead.source"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="operator">Operator</Label>
              <Select
                value={localValues.operator || 'equals'}
                onValueChange={(value) => handleChange('operator', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="equals">Equals</SelectItem>
                  <SelectItem value="not_equals">Not Equals</SelectItem>
                  <SelectItem value="contains">Contains</SelectItem>
                  <SelectItem value="greater_than">Greater Than</SelectItem>
                  <SelectItem value="less_than">Less Than</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="value">Value</Label>
              <Input
                id="value"
                value={localValues.value || ''}
                onChange={(e) => handleChange('value', e.target.value)}
                placeholder="Comparison value"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="truePath">True Path Node ID</Label>
              <Input
                id="truePath"
                value={localValues.truePath || ''}
                onChange={(e) => handleChange('truePath', e.target.value)}
                placeholder="Node ID for true branch"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="falsePath">False Path Node ID</Label>
              <Input
                id="falsePath"
                value={localValues.falsePath || ''}
                onChange={(e) => handleChange('falsePath', e.target.value)}
                placeholder="Node ID for false branch"
                className="mt-1"
              />
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

