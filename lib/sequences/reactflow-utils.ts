// Utilities for converting between SequenceSpec and React Flow format
import { Node, Edge as ReactFlowEdge, Connection } from '@xyflow/react';
import { SequenceSpec, SequenceNode, SequenceEdge } from './spec';
import { JSONPatchOperation, createAddEdgePatch, createUpdateNodePositionPatch, findNodeIndex, findEdgeIndex } from './patches';

/**
 * Convert SequenceSpec to React Flow nodes and edges
 */
export function specToReactFlow(spec: SequenceSpec): { nodes: Node[]; edges: ReactFlowEdge[] } {
  const nodes: Node[] = spec.nodes.map((node) => {
    const position = spec.ui.positions[node.id] || { x: 0, y: 0 };
    return {
      id: node.id,
      type: node.type,
      position,
      data: node as unknown as Record<string, unknown>,
    };
  });

  const edges: ReactFlowEdge[] = spec.edges.map((edge, index) => ({
    id: `edge-${index}-${edge.from}-${edge.to}`,
    source: edge.from,
    target: edge.to,
    label: edge.label,
    type: 'smoothstep',
    deletable: true,
    focusable: true,
    selectable: true,
    style: { 
      strokeWidth: 3,
      cursor: 'pointer',
    },
  }));

  return { nodes, edges };
}

/**
 * Convert React Flow changes to JSON Patch operations
 */
export function reactFlowChangeToOps(
  spec: SequenceSpec,
  changes: {
    positionChanges?: Array<{ nodeId: string; position: { x: number; y: number } }>;
    newConnection?: Connection;
    deletedNode?: string;
    deletedEdge?: { from: string; to: string };
  }
): JSONPatchOperation[] {
  const ops: JSONPatchOperation[] = [];

  // Handle position changes
  if (changes.positionChanges) {
    for (const change of changes.positionChanges) {
      ops.push(...createUpdateNodePositionPatch(change.nodeId, change.position));
    }
  }

  // Handle new connection
  if (changes.newConnection && changes.newConnection.source && changes.newConnection.target) {
    const edge: SequenceEdge = {
      from: changes.newConnection.source,
      to: changes.newConnection.target,
      label: (changes.newConnection as any).label,
    };
    ops.push(...createAddEdgePatch(edge.from, edge.to, edge.label));
  }

  // Handle deleted node
  if (changes.deletedNode) {
    const nodeIndex = findNodeIndex(spec, changes.deletedNode);
    if (nodeIndex !== -1) {
      ops.push({
        op: 'remove',
        path: `/nodes/${nodeIndex}`,
      });
      
      // Remove position
      if (spec.ui.positions[changes.deletedNode]) {
        ops.push({
          op: 'remove',
          path: `/ui/positions/${changes.deletedNode}`,
        });
      }
      
      // Remove connected edges
      const edgesToRemove = spec.edges.filter(
        (e) => e.from === changes.deletedNode || e.to === changes.deletedNode
      );
      for (const edge of edgesToRemove) {
        const edgeIndex = findEdgeIndex(spec, edge.from, edge.to);
        if (edgeIndex !== -1) {
          ops.push({
            op: 'remove',
            path: `/edges/${edgeIndex}`,
          });
        }
      }
    }
  }

  // Handle deleted edge
  if (changes.deletedEdge) {
    const edgeIndex = findEdgeIndex(spec, changes.deletedEdge.from, changes.deletedEdge.to);
    if (edgeIndex !== -1) {
      ops.push({
        op: 'remove',
        path: `/edges/${edgeIndex}`,
      });
    }
  }

  return ops;
}

