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
  const isDraggingRef = useRef(false);
  const isUpdatingFromSpecRef = useRef(false);
  const lastNodeCountRef = useRef(0);
  const lastEdgeCountRef = useRef(0);
  const lastNodeIdsRef = useRef<string[]>([]);
  const lastEdgeIdsRef = useRef<string[]>([]);

  // Convert spec to React Flow format - only when structure changes
  const { nodes: flowNodes, edges: flowEdges } = useMemo(() => {
    if (!spec) return { nodes: [], edges: [] };
    return specToReactFlow(spec);
  }, [spec]);

  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges);

  // Initialize node/edge counts and IDs on first load
  useEffect(() => {
    if (spec && lastNodeCountRef.current === 0) {
      lastNodeCountRef.current = spec.nodes.length;
      lastEdgeCountRef.current = spec.edges.length;
      lastNodeIdsRef.current = spec.nodes.map(n => n.id);
      lastEdgeIdsRef.current = spec.edges.map(e => `${e.from}-${e.to}`);
    }
  }, [spec]);

  // Track last positions to detect when they change from auto-layout
  const lastPositionsRef = useRef<Record<string, { x: number; y: number }>>({});

  // Update React Flow when spec changes - but only for structural changes
  useEffect(() => {
    if (!spec) return;
    
    // Don't update during drag
    if (isDraggingRef.current) {
      return;
    }
    
    const nodeIds = spec.nodes.map(n => n.id).sort().join(',');
    const edgeIds = spec.edges.map(e => `${e.from}-${e.to}`).sort().join(',');
    
    const nodeCountChanged = lastNodeCountRef.current !== spec.nodes.length;
    const edgeCountChanged = lastEdgeCountRef.current !== spec.edges.length;
    const nodeIdsChanged = lastNodeIdsRef.current.join(',') !== nodeIds;
    const edgeIdsChanged = lastEdgeIdsRef.current.join(',') !== edgeIds;
    const structuralChanged = nodeCountChanged || edgeCountChanged || nodeIdsChanged || edgeIdsChanged;
    
    // Check if positions changed (from auto-layout)
    const positionsChanged = spec.nodes.some(node => {
      const specPos = spec.ui.positions[node.id];
      const lastPos = lastPositionsRef.current[node.id];
      if (!specPos) return false;
      if (!lastPos) return true;
      return Math.abs(specPos.x - lastPos.x) > 1 || Math.abs(specPos.y - lastPos.y) > 1;
    });
    
    // Update React Flow if structure changed OR positions changed (from auto-layout)
    if (structuralChanged || (positionsChanged && !isUpdatingFromSpecRef.current)) {
      isUpdatingFromSpecRef.current = true;
      const { nodes: newNodes, edges: newEdges } = specToReactFlow(spec);
      setNodes(newNodes);
      setEdges(newEdges);
      
      // Update last positions
      spec.nodes.forEach(node => {
        const pos = spec.ui.positions[node.id];
        if (pos) {
          lastPositionsRef.current[node.id] = { ...pos };
        }
      });
      
      if (structuralChanged) {
        lastNodeCountRef.current = spec.nodes.length;
        lastEdgeCountRef.current = spec.edges.length;
        lastNodeIdsRef.current = spec.nodes.map(n => n.id);
        lastEdgeIdsRef.current = spec.edges.map(e => `${e.from}-${e.to}`);
        
        // Only run auto-layout if structure changed
        if (!autoLayoutTriggered.current) {
          autoLayoutTriggered.current = true;
          
          // Run auto-layout after a delay to allow React Flow to update
          setTimeout(() => {
            if (spec && !isDraggingRef.current) {
              const layoutOps = generateAutoLayoutOps(spec);
              if (layoutOps.length > 0) {
                applyOps(layoutOps);
              }
              autoLayoutTriggered.current = false;
            }
          }, 300);
        }
      }
      
      setTimeout(() => {
        isUpdatingFromSpecRef.current = false;
      }, 100);
    }
    
    lastSpecRef.current = spec;
  }, [spec, setNodes, setEdges, applyOps]);

  // Handle node drag start
  const onNodeDragStart = useCallback(() => {
    isDraggingRef.current = true;
  }, []);

  // Handle node position changes during drag
  const onNodeDrag = useCallback((_: any, node: Node) => {
    // Update local state immediately for smooth dragging
    setNodes((nds) =>
      nds.map((n) =>
        n.id === node.id ? { ...n, position: node.position } : n
      )
    );
  }, [setNodes]);

  // Handle node position changes when drag stops
  const onNodeDragStop = useCallback(
    (_: any, node: Node) => {
      if (!spec) return;
      
      // Update the position in spec immediately
      const ops = reactFlowChangeToOps(spec, {
        positionChanges: [{ nodeId: node.id, position: node.position }],
      });
      
      if (ops.length > 0) {
        // Apply ops but don't trigger React Flow update
        isUpdatingFromSpecRef.current = true;
        applyOps(ops);
        
        // Commit to server after a debounce
        setTimeout(() => {
          commitOpsToServer(ops, `Moved node ${node.id}`);
        }, 500);
        
        // Reset flag after a delay to allow spec to update
        setTimeout(() => {
          isDraggingRef.current = false;
          isUpdatingFromSpecRef.current = false;
        }, 100);
      } else {
        isDraggingRef.current = false;
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
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
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
        fitViewOptions={{
          padding: 0.2,
          maxZoom: 1.5,
        }}
        deleteKeyCode={['Delete', 'Backspace']}
        edgesFocusable={true}
        // Use horizontal layout for better space utilization
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        // Better edge styling
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: false,
          style: {
            strokeWidth: 2.5,
            stroke: '#9333ea', // Purple color
          },
        }}
      >
        <Background 
          color="#e5e7eb" 
          gap={20} 
          size={1}
        />
        <Controls 
          className="bg-white border border-gray-200 rounded-lg shadow-sm"
        />
        <MiniMap 
          nodeColor={(node) => {
            if (node.type === 'trigger') return '#9333ea';
            if (node.type === 'send_sms') return '#9333ea';
            if (node.type === 'wait') return '#3b82f6';
            if (node.type === 'condition') return '#f97316';
            return '#6b7280';
          }}
          className="bg-white border border-gray-200 rounded-lg shadow-sm"
        />
      </ReactFlow>
    </div>
  );
}

