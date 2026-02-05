'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  Connection,
  useNodesState,
  useEdgesState,
  NodeTypes,
  EdgeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useSequenceStore } from '@/lib/store/sequence-store';
import { workflowToGraph, GraphSpec } from '@/lib/sequences/adapters';
import { calculateElkLayout } from '@/lib/sequences/elk-layout';
import { WorkflowSpecV2 } from '@/lib/sequences/workflow-v2';
import { WorkflowTriggerNode } from './nodes/WorkflowTriggerNode';
import { WorkflowSendSmsNode } from './nodes/WorkflowSendSmsNode';
import { WorkflowSendEmailNode } from './nodes/WorkflowSendEmailNode';
import { WorkflowEndNode } from './nodes/WorkflowEndNode';

const nodeTypes: NodeTypes = {
  trigger: WorkflowTriggerNode,
  send_sms: WorkflowSendSmsNode,
  send_email: WorkflowSendEmailNode,
  wait: WorkflowSendSmsNode, // Reuse SMS node for wait
  end: WorkflowEndNode,
};

export function WorkflowDiagram() {
  const { spec, selectedNodeId, setSelectedNodeId, applyOps } = useSequenceStore();
  const [workflow, setWorkflow] = useState<WorkflowSpecV2 | null>(null);
  const [layoutPositions, setLayoutPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [isLayouting, setIsLayouting] = useState(false);
  const [lastStructureKey, setLastStructureKey] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [userPositions, setUserPositions] = useState<Record<string, { x: number; y: number }>>({});

  // Convert SequenceSpec to WorkflowSpecV2 (migration)
  useEffect(() => {
    if (!spec) {
      console.log('[WorkflowDiagram] No spec, clearing workflow');
      setWorkflow(null);
      return;
    }

    console.log('[WorkflowDiagram] Spec updated, nodes:', spec.nodes.length, 'edges:', spec.edges.length);
    console.log('[WorkflowDiagram] Node IDs:', spec.nodes.map(n => `${n.type}:${n.id}`));

    // Check if already V2
    if ((spec as any).specVersion === 2) {
      console.log('[WorkflowDiagram] Already V2, using directly');
      setWorkflow(spec as any as WorkflowSpecV2);
      return;
    }

    // Migrate from V1 to V2
    try {
      const { sequenceSpecToWorkflow } = require('@/lib/sequences/adapters');
      const migrated = sequenceSpecToWorkflow(spec);
      console.log('[WorkflowDiagram] Migrated to V2, steps:', migrated.steps.length);
      console.log('[WorkflowDiagram] Step IDs:', migrated.steps.map((s: any) => `${s.type}:${s.id}`));
      
      // Map positions from original node IDs to step IDs
      if (spec.ui?.positions) {
        const mappedPositions: Record<string, { x: number; y: number }> = {};
        migrated.steps.forEach((step: any) => {
          // Step IDs are like "step_send_sms_123" for node "send_sms_123"
          if (step.id.startsWith('step_')) {
            const originalNodeId = step.id.replace(/^step_/, '');
            if (spec.ui.positions[originalNodeId]) {
              mappedPositions[step.id] = spec.ui.positions[originalNodeId];
              // Also store in userPositions to preserve user-set positions
              setUserPositions(prev => ({ ...prev, [step.id]: spec.ui.positions[originalNodeId] }));
            }
          } else {
            // For "end" and other non-prefixed IDs, use as-is
            if (spec.ui.positions[step.id]) {
              mappedPositions[step.id] = spec.ui.positions[step.id];
              setUserPositions(prev => ({ ...prev, [step.id]: spec.ui.positions[step.id] }));
            }
          }
        });
        // Also keep trigger position
        if (spec.ui.positions['trigger']) {
          mappedPositions['trigger'] = spec.ui.positions['trigger'];
          setUserPositions(prev => ({ ...prev, 'trigger': spec.ui.positions['trigger'] }));
        }
        
        if (Object.keys(mappedPositions).length > 0) {
          setLayoutPositions(mappedPositions);
        }
      }
      
      setWorkflow(migrated);
    } catch (error) {
      console.error('[WorkflowDiagram] Migration failed:', error);
      setWorkflow(null);
    }
  }, [spec]);

  // Convert workflow to graph
  const graphSpec = useMemo<GraphSpec | null>(() => {
    if (!workflow) return null;
    // Pass original spec so workflowToGraph can include manually added edges
    return workflowToGraph(workflow, layoutPositions, spec ? { edges: spec.edges } : undefined);
  }, [workflow, layoutPositions, spec]);

  // Calculate layout when structure changes - but PRESERVE user-set positions
  useEffect(() => {
    if (!graphSpec || isLayouting || isDragging) return; // Don't recalculate during drag

    // Create a stable structure key from node IDs and edge connections
    const nodeIds = graphSpec.nodes.map(n => n.id).sort().join(',');
    const edgeKeys = graphSpec.edges.map(e => `${e.source}→${e.target}`).sort().join(',');
    const structureKey = `${nodeIds}|${edgeKeys}`;

    // Only recalculate if structure actually changed
    if (structureKey !== lastStructureKey) {
      console.log('[WorkflowDiagram] Structure changed, recalculating layout. Nodes:', graphSpec.nodes.length, 'Edges:', graphSpec.edges.length);
      setLastStructureKey(structureKey);
      setIsLayouting(true);
      
      // Use setTimeout to avoid blocking
      setTimeout(() => {
        calculateElkLayout(graphSpec)
          .then(positions => {
            console.log('[WorkflowDiagram] Layout calculated successfully, positions:', Object.keys(positions).length, 'for', graphSpec.nodes.length, 'nodes');
            // PRESERVE user-set positions, only use auto-layout for nodes without user positions
            const allPositions: Record<string, { x: number; y: number }> = { ...userPositions };
            graphSpec.nodes.forEach(node => {
              // Only assign auto-layout position if node doesn't have a user-set position
              if (!allPositions[node.id] && !userPositions[node.id]) {
                if (positions[node.id]) {
                  allPositions[node.id] = positions[node.id];
                } else {
                  console.warn('[WorkflowDiagram] Node missing position, using default:', node.id);
                  allPositions[node.id] = { x: 0, y: 0 };
                }
              }
            });
            setLayoutPositions(allPositions);
            setIsLayouting(false);
          })
          .catch(error => {
            console.error('[WorkflowDiagram] Layout calculation failed:', error);
            // Fallback: only assign positions to nodes that don't have user positions
            const fallbackPositions: Record<string, { x: number; y: number }> = { ...userPositions };
            graphSpec.nodes.forEach((node, idx) => {
              if (!fallbackPositions[node.id] && !userPositions[node.id]) {
                fallbackPositions[node.id] = { x: idx * 400, y: 100 };
              }
            });
            setLayoutPositions(fallbackPositions);
            setIsLayouting(false);
          });
      }, 0);
    }
  }, [graphSpec, isLayouting, lastStructureKey, userPositions, isDragging]);

  // Convert to React Flow format
  const { nodes: flowNodes, edges: flowEdges } = useMemo(() => {
    if (!graphSpec) {
      console.log('[WorkflowDiagram] No graphSpec, returning empty');
      return { nodes: [], edges: [] };
    }

    console.log('[WorkflowDiagram] Converting to React Flow format:', graphSpec.nodes.length, 'nodes,', graphSpec.edges.length, 'edges');
    console.log('[WorkflowDiagram] Available positions:', Object.keys(layoutPositions));
    console.log('[WorkflowDiagram] User positions:', Object.keys(userPositions));

    const nodes = graphSpec.nodes.map(node => {
      // Priority: userPositions > layoutPositions > node.position > fallback
      const pos = userPositions[node.id] || layoutPositions[node.id] || node.position || { x: 0, y: 0 };
      return {
        ...node,
        position: pos,
        draggable: true,
      };
    });
    const edges = graphSpec.edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      type: edge.type || 'smoothstep',
      animated: false,
      deletable: true,
      selectable: true,
      focusable: true,
      style: { 
        stroke: '#9333ea', 
        strokeWidth: 2.5,
        cursor: 'pointer',
      },
    }));

    console.log('[WorkflowDiagram] Converted to React Flow format:', nodes.length, 'nodes,', edges.length, 'edges');
    return { nodes, edges };
  }, [graphSpec, layoutPositions]);

  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges);

  // Track pending connections to prevent them from being overwritten
  const pendingConnectionsRef = useRef<Set<string>>(new Set());
  
  // Handle node deletions - remove from spec immediately
  const handleNodesChange = useCallback((changes: any[]) => {
    if (!spec) {
      onNodesChange(changes);
      return;
    }
    
    // Check for node deletions
    const deletions = changes.filter(c => c.type === 'remove' && c.id);
    if (deletions.length > 0) {
      const patches: any[] = [];
      
      for (const deletion of deletions) {
        const nodeId = deletion.id;
        // Convert step ID back to node ID if needed
        const actualNodeId = nodeId.startsWith('step_') 
          ? nodeId.replace(/^step_/, '')
          : nodeId;
        
        // Don't allow deleting trigger or end nodes
        if (actualNodeId === 'trigger' || actualNodeId === 'end') {
          console.warn('[WorkflowDiagram] Cannot delete trigger or end node');
          continue;
        }
        
        // Find node index in spec
        const nodeIndex = spec.nodes.findIndex(n => n.id === actualNodeId);
        if (nodeIndex !== -1) {
          patches.push({
            op: 'remove' as const,
            path: `/nodes/${nodeIndex}`,
          });
          console.log('[WorkflowDiagram] Removing node:', actualNodeId);
        }
        
        // Remove all edges connected to this node
        const edgesToRemove = spec.edges.filter(
          e => e.from === actualNodeId || e.to === actualNodeId
        );
        // Remove edges in reverse order to maintain indices
        edgesToRemove.sort((a, b) => {
          const aIndex = spec.edges.indexOf(a);
          const bIndex = spec.edges.indexOf(b);
          return bIndex - aIndex;
        });
        for (const edge of edgesToRemove) {
          const edgeIndex = spec.edges.indexOf(edge);
          if (edgeIndex !== -1) {
            patches.push({
              op: 'remove' as const,
              path: `/edges/${edgeIndex}`,
            });
            console.log('[WorkflowDiagram] Removing edge:', edge.from, '→', edge.to);
          }
        }
      }
      
      if (patches.length > 0) {
        console.log('[WorkflowDiagram] Applying', patches.length, 'deletion patches');
        applyOps(patches);
      }
    }
    
    // Apply other node changes (React Flow internal)
    onNodesChange(changes);
  }, [spec, applyOps, onNodesChange]);

  // Update when graph changes - but preserve positions during drag
  useEffect(() => {
    if (isDragging) {
      // Don't update positions during drag to prevent glitching
      return;
    }
    
    setNodes(flowNodes);
    // Only update edges if they're not pending connections
    setEdges((currentEdges) => {
      // Keep pending connections that aren't in flowEdges yet
      const pendingToKeep = currentEdges.filter(e => {
        const edgeKey = `${e.source}-${e.target}`;
        return pendingConnectionsRef.current.has(edgeKey) && 
               !flowEdges.some(fe => fe.source === e.source && fe.target === e.target);
      });
      
      // Merge: flowEdges (from spec) + pending connections not yet in spec
      const merged = [...flowEdges, ...pendingToKeep];
      
      // Remove duplicates
      const seen = new Set<string>();
      return merged.filter(e => {
        const key = `${e.source}-${e.target}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    });
  }, [flowNodes, flowEdges, setNodes, setEdges, isDragging]);

  // Handle edge changes (including deletion)
  // NOTE: We handle edge additions in onConnect, so we filter those out here
  const handleEdgesChange = useCallback((changes: any[]) => {
    if (!spec) {
      onEdgesChange(changes);
      return;
    }

    // Filter out edge additions - we handle those in onConnect
    const nonAdditions = changes.filter(c => c.type !== 'add');
    
    // Check for edge deletions
    const deletions = nonAdditions.filter(c => c.type === 'remove');
    if (deletions.length > 0) {
      const patches: any[] = [];
      
      for (const deletion of deletions) {
        const edge = deletion;
        // Convert step IDs back to node IDs
        const sourceNodeId = edge.source?.startsWith('step_') 
          ? edge.source.replace(/^step_/, '')
          : edge.source;
        const targetNodeId = edge.target?.startsWith('step_')
          ? edge.target.replace(/^step_/, '')
          : edge.target;
        
        if (sourceNodeId && targetNodeId) {
          const edgeIndex = spec.edges.findIndex(
            e => e.from === sourceNodeId && e.to === targetNodeId
          );
          
          if (edgeIndex !== -1) {
            patches.push({
              op: 'remove' as const,
              path: `/edges/${edgeIndex}`,
            });
            console.log('[WorkflowDiagram] Removing edge:', sourceNodeId, '→', targetNodeId);
          }
        }
      }
      
      if (patches.length > 0) {
        applyOps(patches);
      }
    }
    
    // Apply other edge changes (React Flow internal) - but NOT additions
    // Additions are handled by onConnect which updates the spec, then useEffect syncs
    onEdgesChange(nonAdditions);
  }, [spec, applyOps, onEdgesChange]);

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNodeId(node.id);
  }, [setSelectedNodeId]);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, [setSelectedNodeId]);

  // Handle edge click - select edge for deletion
  const onEdgeClick = useCallback((_: any, edge: Edge) => {
    console.log('[WorkflowDiagram] Edge clicked:', edge.id, edge.source, edge.target);
    // Update edges to show selection
    setEdges((eds) =>
      eds.map((e) =>
        e.id === edge.id
          ? { ...e, selected: true }
          : { ...e, selected: false }
      )
    );
  }, [setEdges]);

  // Handle edge deletion (when Delete/Backspace is pressed on selected edge)
  const onEdgesDelete = useCallback((deletedEdges: Edge[]) => {
    if (!spec) return;
    
    console.log('[WorkflowDiagram] Deleting edges:', deletedEdges);
    
    const patches: any[] = [];
    
    for (const edge of deletedEdges) {
      // Convert step IDs back to node IDs
      const sourceNodeId = edge.source?.startsWith('step_') 
        ? edge.source.replace(/^step_/, '')
        : edge.source;
      const targetNodeId = edge.target?.startsWith('step_')
        ? edge.target.replace(/^step_/, '')
        : edge.target;
      
      if (sourceNodeId && targetNodeId) {
        const edgeIndex = spec.edges.findIndex(
          e => e.from === sourceNodeId && e.to === targetNodeId
        );
        
        if (edgeIndex !== -1) {
          patches.push({
            op: 'remove' as const,
            path: `/edges/${edgeIndex}`,
          });
          console.log('[WorkflowDiagram] Removing edge:', sourceNodeId, '→', targetNodeId);
        }
      }
    }
    
    if (patches.length > 0) {
      applyOps(patches);
    }
  }, [spec, applyOps]);

  // Handle manual connections (drag and drop from handle to handle)
  const onConnect = useCallback((connection: Connection) => {
    if (!spec || !connection.source || !connection.target) {
      console.warn('[WorkflowDiagram] Invalid connection:', connection);
      return;
    }
    
    console.log('[WorkflowDiagram] Manual connection received:', connection);
    
    // Convert step IDs back to node IDs
    // Step IDs are like "step_send_sms_123" for node "send_sms_123"
    // Trigger and end nodes don't have the "step_" prefix
    const sourceNodeId = connection.source.startsWith('step_') 
      ? connection.source.replace(/^step_/, '')
      : connection.source;
    const targetNodeId = connection.target.startsWith('step_')
      ? connection.target.replace(/^step_/, '')
      : connection.target;
    
    console.log('[WorkflowDiagram] Creating edge:', sourceNodeId, '→', targetNodeId);
    
    // Get current spec state (might have changed)
    const currentSpec = useSequenceStore.getState().spec;
    if (!currentSpec) {
      console.error('[WorkflowDiagram] Spec is null, cannot create edge');
      return;
    }
    
    // Check if edge already exists
    const edgeExists = currentSpec.edges.some(
      e => e.from === sourceNodeId && e.to === targetNodeId
    );
    
    if (edgeExists) {
      console.log('[WorkflowDiagram] Edge already exists, skipping');
      return;
    }
    
    // IMPORTANT: Add edge to React Flow state immediately so it's visible
    // This prevents it from disappearing before the spec is updated
    const edgeKey = `${connection.source}-${connection.target}`;
    pendingConnectionsRef.current.add(edgeKey);
    
    const newEdge: Edge = {
      id: edgeKey,
      source: connection.source,
      target: connection.target,
      type: 'smoothstep',
      deletable: true,
      selectable: true,
      focusable: true,
      style: { 
        stroke: '#9333ea', 
        strokeWidth: 2.5,
        cursor: 'pointer',
      },
    };
    
    // PARALLEL CONNECTIONS: Allow multiple edges from the same source
    // Just add the new edge without removing existing ones
    setEdges(((eds: Edge[]) => {
      // Check if this exact edge already exists
      const exactDuplicate = eds.some(
        e => e.source === connection.source && e.target === connection.target
      );
      if (exactDuplicate) {
        console.log('[WorkflowDiagram] Exact duplicate edge, skipping');
        return eds;
      }
      // Add the new edge (keep all existing edges, including parallel ones)
      return [...eds, newEdge];
    }) as any);
    
    // Add the new edge to the spec (don't remove existing edges - allow parallel connections)
    const patches: any[] = [];
    
    // Add new edge
    patches.push({
      op: 'add' as const,
      path: '/edges/-',
      value: {
        from: sourceNodeId,
        to: targetNodeId,
      },
    });
    
    console.log('[WorkflowDiagram] Applying patches:', patches.length, 'operations');
    applyOps(patches);
    
    // Verify the edge was added and remove from pending once it's in the spec
    setTimeout(() => {
      const updatedSpec = useSequenceStore.getState().spec;
      if (updatedSpec) {
        const edgeAdded = updatedSpec.edges.some(
          e => e.from === sourceNodeId && e.to === targetNodeId
        );
        console.log('[WorkflowDiagram] Edge verification:', edgeAdded ? 'SUCCESS' : 'FAILED');
        
        // Remove from pending once it's in the spec
        if (edgeAdded) {
          pendingConnectionsRef.current.delete(edgeKey);
        }
      }
    }, 200);
  }, [spec, applyOps, setEdges]);

  // Handle drag start
  const onNodeDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  // Handle node position changes - save to spec when user drags
  const onNodeDragStop = useCallback((_: any, node: Node) => {
    setIsDragging(false);
    
    if (!workflow || !spec) return;
    
    // Convert step ID back to node ID for spec
    let nodeId = node.id;
    if (node.id.startsWith('step_')) {
      nodeId = node.id.replace(/^step_/, '');
    }
    
    // Update user positions immediately to prevent glitching
    setUserPositions(prev => ({ ...prev, [node.id]: node.position }));
    
    // Check if position path exists, use 'add' if not, 'replace' if it does
    const existingPosition = spec.ui?.positions?.[nodeId];
    const op = existingPosition ? 'replace' : 'add';
    
    // Update position in spec
    const patches = [{
      op: op as 'replace' | 'add',
      path: `/ui/positions/${nodeId}`,
      value: node.position,
    }];
    
    applyOps(patches);
    console.log('[WorkflowDiagram] Saved position for node:', nodeId, node.position, 'op:', op);
  }, [workflow, spec, applyOps]);

  if (!workflow || !graphSpec) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">No workflow loaded.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        onEdgeClick={onEdgeClick}
        onEdgesDelete={onEdgesDelete}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1.5 }}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: false,
          deletable: true,
          selectable: true,
          focusable: true,
          style: { 
            stroke: '#9333ea', 
            strokeWidth: 2.5,
            cursor: 'pointer',
          },
        }}
        deleteKeyCode={['Delete', 'Backspace']}
        edgesFocusable={true}
        minZoom={0.1}
        maxZoom={2}
      >
        <Background color="#e5e7eb" gap={20} size={1} />
        <Controls className="bg-white border border-gray-200 rounded-lg shadow-sm" />
        <MiniMap
          nodeColor={(node) => {
            if (node.type === 'trigger') return '#9333ea';
            if (node.type === 'send_sms') return '#9333ea';
            if (node.type === 'wait') return '#3b82f6';
            return '#6b7280';
          }}
          className="bg-white border border-gray-200 rounded-lg shadow-sm"
        />
      </ReactFlow>
    </div>
  );
}

