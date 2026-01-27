'use client';

import { useState } from 'react';
import { useSequenceStore } from '@/lib/store/sequence-store';
import { createAddNodePatch, createAddEdgePatch } from '@/lib/sequences/patches';
import { SendSmsNode, WaitNode, ConditionNode } from '@/lib/sequences/spec';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, Clock, GitBranch, Plus } from 'lucide-react';

export function NodePalette() {
  const { spec, applyOps, commitOpsToServer, selectedNodeId } = useSequenceStore();
  const [isOpen, setIsOpen] = useState(true);

  const handleAddNode = (type: 'send_sms' | 'wait' | 'condition') => {
    if (!spec) return;

    const nodeId = `${type}_${Date.now()}`;
    const position = { x: 400, y: 300 };

    let newNode: SendSmsNode | WaitNode | ConditionNode;
    
    if (type === 'send_sms') {
      newNode = {
        id: nodeId,
        type: 'send_sms',
        content: '',
      };
    } else if (type === 'wait') {
      newNode = {
        id: nodeId,
        type: 'wait',
        duration: '1 hour',
      };
    } else {
      newNode = {
        id: nodeId,
        type: 'condition',
        condition: {
          field: '',
          operator: 'equals',
          value: '',
        },
      };
    }

    const patches = createAddNodePatch(nodeId, newNode, position);
    
    // If a node is selected, connect it to the new node
    if (selectedNodeId && selectedNodeId !== 'end') {
      // Find the end node to disconnect it
      const endNode = spec.nodes.find(n => n.type === 'end');
      if (endNode) {
        // Remove edge from selected node to end (if exists)
        const edgeToEnd = spec.edges.find(e => e.from === selectedNodeId && e.to === endNode.id);
        if (edgeToEnd) {
          const edgeIndex = spec.edges.findIndex(e => e.from === selectedNodeId && e.to === endNode.id);
          patches.push({
            op: 'remove',
            path: `/edges/${edgeIndex}`,
          });
        }
        
        // Add edge from selected node to new node
        const edgePatches1 = createAddEdgePatch(selectedNodeId, nodeId);
        patches.push(...edgePatches1);
        
        // Add edge from new node to end
        const edgePatches2 = createAddEdgePatch(nodeId, endNode.id);
        patches.push(...edgePatches2);
      }
    } else {
      // If no node selected, find the last node before end and connect there
      const endNode = spec.nodes.find(n => n.type === 'end');
      if (endNode) {
        // Find edge going to end
        const edgeToEnd = spec.edges.find(e => e.to === endNode.id);
        if (edgeToEnd) {
          // Remove edge to end
          const edgeIndex = spec.edges.findIndex(e => e.from === edgeToEnd.from && e.to === endNode.id);
          patches.push({
            op: 'remove',
            path: `/edges/${edgeIndex}`,
          });
          
          // Connect previous node to new node
          patches.push(...createAddEdgePatch(edgeToEnd.from, nodeId));
        }
        
        // Connect new node to end
        patches.push(...createAddEdgePatch(nodeId, endNode.id));
      } else {
        // Fallback: connect to trigger
        const triggerNode = spec.nodes.find(n => n.type === 'trigger');
        if (triggerNode) {
          patches.push(...createAddEdgePatch(triggerNode.id, nodeId));
        }
      }
    }

    if (patches.length > 0) {
      applyOps(patches);
      commitOpsToServer(patches, `Added ${type} node`);
    }
  };

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="absolute top-4 left-4 z-10"
        onClick={() => setIsOpen(true)}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Node
      </Button>
    );
  }

  return (
    <Card className="absolute top-4 left-4 z-10 w-48">
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold">Add Node</h4>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setIsOpen(false)}
          >
            ×
          </Button>
        </div>
        <div className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => handleAddNode('send_sms')}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Send SMS
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => handleAddNode('wait')}
          >
            <Clock className="h-4 w-4 mr-2" />
            Wait
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => handleAddNode('condition')}
          >
            <GitBranch className="h-4 w-4 mr-2" />
            Condition
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

