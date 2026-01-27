'use client';

import { useCallback, useMemo, useEffect, useRef } from 'react';
import { ReactFlow, Background, Controls, MiniMap, Node, Edge, Connection, useNodesState, useEdgesState } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useSequenceStore } from '@/lib/store/sequence-store';
import { specToReactFlow, reactFlowChangeToOps } from '@/lib/sequences/reactflow-utils';
import { generateAutoLayoutOps } from '@/lib/sequences/auto-layout';
import { JSONPatchOperation } from '@/lib/sequences/patches';
import { TriggerNode } from './nodes/TriggerNode';
import { SendSmsNode } from './nodes/SendSmsNode';
import { WaitNode } from './nodes/WaitNode';
import { ConditionNode } from './nodes/ConditionNode';
import { EndNode } from './nodes/EndNode';
import { NodePalette } from './NodePalette';

const nodeTypes: Record<string, React.ComponentType<any>> = {
  trigger: TriggerNode as React.ComponentType<any>,
  send_sms: SendSmsNode as React.ComponentType<any>,
  wait: WaitNode as React.ComponentType<any>,
  condition: ConditionNode as React.ComponentType<any>,
  end: EndNode as React.ComponentType<any>,
};

export function SequenceDiagram() {
  const { spec, applyOps, commitOpsToServer, selectedNodeId, setSelectedNodeId } = useSequenceStore();
  const lastSpecRef = useRef<typeof spec>(null);
  const autoLayoutTriggered = useRef(false);

  // Convert spec to React Flow format
  const { nodes: flowNodes, edges: flowEdges } = useMemo(() => {
    if (!spec) return { nodes: [], edges: [] };
    return specToReactFlow(spec);
  }, [spec]);

  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges);

  // Update React Flow when spec changes
  useEffect(() => {
    if (spec) {
      const { nodes: newNodes, edges: newEdges } = specToReactFlow(spec);
      setNodes(newNodes);
      setEdges(newEdges);
      
      // Trigger auto-layout on structural changes (nodes/edges count changed)
      const structuralChanged = 
        lastSpecRef.current === null ||
        lastSpecRef.current.nodes.length !== spec.nodes.length ||
        lastSpecRef.current.edges.length !== spec.edges.length;
      
      if (structuralChanged && !autoLayoutTriggered.current) {
        autoLayoutTriggered.current = true;
        // Run auto-layout after a short delay to allow React Flow to update
        setTimeout(() => {
          if (spec) {
            const layoutOps = generateAutoLayoutOps(spec);
            if (layoutOps.length > 0) {
              applyOps(layoutOps);
            }
            autoLayoutTriggered.current = false;
          }
        }, 100);
      }
      
      lastSpecRef.current = spec;
    }
  }, [spec, setNodes, setEdges, applyOps]);

  // Handle node position changes
  const onNodeDragStop = useCallback(
    (_: any, node: Node) => {
      if (!spec) return;
      
      const ops = reactFlowChangeToOps(spec, {
        positionChanges: [{ nodeId: node.id, position: node.position }],
      });
      
      if (ops.length > 0) {
        applyOps(ops);
        // Commit to server after a debounce
        setTimeout(() => {
          commitOpsToServer(ops, `Moved node ${node.id}`);
        }, 500);
      }
    },
    [spec, applyOps, commitOpsToServer]
  );

  // Handle edge connections
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!spec || !connection.source || !connection.target) return;

      const ops = reactFlowChangeToOps(spec, {
        newConnection: connection,
      });
      
      if (ops.length > 0) {
        applyOps(ops);
        commitOpsToServer(ops, `Connected ${connection.source} to ${connection.target}`);
      }
    },
    [spec, applyOps, commitOpsToServer]
  );

  // Handle node selection
  const onNodeClick = useCallback(
    (_: any, node: Node) => {
      setSelectedNodeId(node.id);
    },
    [setSelectedNodeId]
  );

  // Handle pane click (deselect)
  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, [setSelectedNodeId]);

  // Handle edge deletion
  const onEdgesDelete = useCallback(
    (deletedEdges: Edge[]) => {
      if (!spec) return;
      
      console.log('[SequenceDiagram] Deleting edges:', deletedEdges);
      
      // Apply patches for each deleted edge
      const allOps: JSONPatchOperation[] = [];
      for (const edge of deletedEdges) {
        // Find edge by matching source and target
        const edgeIndex = spec.edges.findIndex(e => {
          // Handle both edge.id format and direct from/to matching
          const edgeId = `${e.from}-${e.to}`;
          const reactFlowId = edge.id || `${edge.source}-${edge.target}`;
          return edgeId === reactFlowId || (e.from === edge.source && e.to === edge.target);
        });
        
        if (edgeIndex !== -1) {
          allOps.push({
            op: 'remove',
            path: `/edges/${edgeIndex}`,
          });
          console.log(`[SequenceDiagram] Found edge at index ${edgeIndex}, will remove`);
        } else {
          console.warn(`[SequenceDiagram] Could not find edge to delete:`, edge);
        }
      }
      
      if (allOps.length > 0) {
        console.log(`[SequenceDiagram] Applying ${allOps.length} edge deletion patches`);
        applyOps(allOps);
        commitOpsToServer(allOps, 'Deleted edge(s)');
      } else {
        console.warn('[SequenceDiagram] No edges found to delete');
      }
    },
    [spec, applyOps, commitOpsToServer]
  );

  // Handle node deletion (via keyboard or context menu)
  const onNodesDelete = useCallback(
    (deletedNodes: Node[]) => {
      if (!spec) return;
      
      const ops = deletedNodes.flatMap((node) =>
        reactFlowChangeToOps(spec, {
          deletedNode: node.id,
        })
      );
      
      if (ops.length > 0) {
        applyOps(ops);
        commitOpsToServer(ops, 'Deleted node(s)');
      }
    },
    [spec, applyOps, commitOpsToServer]
  );

  if (!spec) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted">
        <p className="text-muted-foreground">No sequence loaded. Start a conversation to build one.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <NodePalette />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onEdgesDelete={onEdgesDelete}
        onNodesDelete={onNodesDelete}
        onEdgeClick={(_, edge) => {
          // Select edge when clicked - makes it easier to delete
          console.log('[SequenceDiagram] Edge clicked:', edge.id, edge.source, edge.target);
          setEdges((eds) =>
            eds.map((e) =>
              e.id === edge.id
                ? { ...e, selected: true }
                : { ...e, selected: false }
            )
          );
        }}
        nodeTypes={nodeTypes}
        fitView
        deleteKeyCode={['Delete', 'Backspace']}
        edgesFocusable={true}
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}

