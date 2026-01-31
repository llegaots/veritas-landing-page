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
import { CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Settings } from 'lucide-react';

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
        values.timing = (selectedNode as SendSmsNode).timing || '';
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
        } else if (field === 'timing') {
          (updates as Partial<SendSmsNode>).timing = value;
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
      <div className="h-full p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center mx-auto mb-3">
            <Settings className="h-6 w-6 text-purple-600" />
          </div>
          <p className="text-sm text-gray-600 font-medium">Select a node</p>
          <p className="text-xs text-gray-500 mt-1">to edit its properties</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <Card className="h-full flex flex-col border-0 shadow-sm rounded-none">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100/50 px-4 py-3 border-b border-purple-100">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-purple-600" />
            <CardTitle className="text-base font-semibold text-gray-900">Node Properties</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-4 overflow-y-auto flex-1">
        <div>
          <Label className="text-xs font-medium text-gray-700">Node ID</Label>
          <Input 
            value={selectedNode.id} 
            disabled 
            className="mt-1 bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed" 
          />
        </div>

        <div>
          <Label className="text-xs font-medium text-gray-700">Type</Label>
          <Input 
            value={selectedNode.type} 
            disabled 
            className="mt-1 bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed capitalize" 
          />
        </div>

        {selectedNode.type === 'send_sms' && (
          <>
            <div>
              <Label htmlFor="content" className="text-xs font-medium text-gray-700">Message Content</Label>
              <Textarea
                id="content"
                value={localValues.content || ''}
                onChange={(e) => handleChange('content', e.target.value)}
                placeholder="Enter SMS message content..."
                className="mt-1 min-h-[120px] border-gray-200 hover:border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:ring-offset-0 rounded-lg transition-all duration-200 text-gray-900 cursor-text"
              />
              <p className="text-xs text-gray-500 mt-1.5">
                Use variables like <code className="bg-purple-50 text-purple-700 px-1 rounded">{'{{'}FirstName{'}}'}</code> or <code className="bg-purple-50 text-purple-700 px-1 rounded">{'{{'}CalendarLink{'}}'}</code>
              </p>
            </div>
            <div>
              <Label htmlFor="timing" className="text-xs font-medium text-gray-700">Timing</Label>
              <Input
                id="timing"
                value={localValues.timing || ''}
                onChange={(e) => handleChange('timing', e.target.value)}
                placeholder="e.g., Day 1, 2 hours, 30 minutes"
                className="mt-1 border-gray-200 hover:border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:ring-offset-0 rounded-lg transition-all duration-200 text-gray-900 cursor-text"
              />
              <p className="text-xs text-gray-500 mt-1.5">
                Examples: <code className="bg-purple-50 text-purple-700 px-1 rounded">Day 1</code>, <code className="bg-purple-50 text-purple-700 px-1 rounded">2 hours</code>, <code className="bg-purple-50 text-purple-700 px-1 rounded">30 minutes</code>
              </p>
            </div>
          </>
        )}

        {selectedNode.type === 'wait' && (
          <div>
            <Label htmlFor="duration" className="text-xs font-medium text-gray-700">Wait Duration</Label>
            <Input
              id="duration"
              value={localValues.duration || ''}
              onChange={(e) => handleChange('duration', e.target.value)}
              placeholder="e.g., 1 hour, 2 days, 30 minutes"
              className="mt-1 border-gray-200 hover:border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:ring-offset-0 rounded-lg transition-all duration-200 text-gray-900 cursor-text"
            />
            <p className="text-xs text-gray-500 mt-1.5">
              Examples: <code className="bg-purple-50 text-purple-700 px-1 rounded">1 hour</code>, <code className="bg-purple-50 text-purple-700 px-1 rounded">2 days</code>, <code className="bg-purple-50 text-purple-700 px-1 rounded">30 minutes</code>
            </p>
          </div>
        )}

        {selectedNode.type === 'condition' && (
          <>
            <div>
              <Label htmlFor="field" className="text-xs font-medium text-gray-700">Field</Label>
              <Input
                id="field"
                value={localValues.field || ''}
                onChange={(e) => handleChange('field', e.target.value)}
                placeholder="e.g., lead.source"
                className="mt-1 border-gray-200 hover:border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:ring-offset-0 rounded-lg transition-all duration-200 text-gray-900 cursor-text"
              />
            </div>

            <div>
              <Label htmlFor="operator" className="text-xs font-medium text-gray-700">Operator</Label>
              <Select
                value={localValues.operator || 'equals'}
                onValueChange={(value) => handleChange('operator', value)}
              >
                <SelectTrigger className="mt-1 border-gray-200 hover:border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:ring-offset-0 rounded-lg bg-white transition-all duration-200 cursor-pointer text-gray-900">
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
              <Label htmlFor="value" className="text-xs font-medium text-gray-700">Value</Label>
              <Input
                id="value"
                value={localValues.value || ''}
                onChange={(e) => handleChange('value', e.target.value)}
                placeholder="Comparison value"
                className="mt-1 border-gray-200 hover:border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:ring-offset-0 rounded-lg transition-all duration-200 text-gray-900 cursor-text"
              />
            </div>

            <div>
              <Label htmlFor="truePath" className="text-xs font-medium text-gray-700">True Path Node ID</Label>
              <Input
                id="truePath"
                value={localValues.truePath || ''}
                onChange={(e) => handleChange('truePath', e.target.value)}
                placeholder="Node ID for true branch"
                className="mt-1 border-gray-200 hover:border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:ring-offset-0 rounded-lg transition-all duration-200 text-gray-900 cursor-text"
              />
            </div>

            <div>
              <Label htmlFor="falsePath" className="text-xs font-medium text-gray-700">False Path Node ID</Label>
              <Input
                id="falsePath"
                value={localValues.falsePath || ''}
                onChange={(e) => handleChange('falsePath', e.target.value)}
                placeholder="Node ID for false branch"
                className="mt-1 border-gray-200 hover:border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:ring-offset-0 rounded-lg transition-all duration-200 text-gray-900 cursor-text"
              />
            </div>
          </>
        )}
        </CardContent>
      </Card>
    </div>
  );
}

