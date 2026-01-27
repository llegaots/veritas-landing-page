// Auto-layout using dagre for sequence diagrams
import dagre from 'dagre';
import { Node, Edge } from '@xyflow/react';
import { SequenceSpec } from './spec';
import { JSONPatchOperation } from './patches';

const NODE_WIDTH = 200;
const NODE_HEIGHT = 100;
const HORIZONTAL_SPACING = 250;
const VERTICAL_SPACING = 150;

/**
 * Calculate auto-layout positions for nodes using dagre
 */
export function calculateAutoLayout(spec: SequenceSpec): Record<string, { x: number; y: number }> {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: 'TB', nodesep: HORIZONTAL_SPACING, ranksep: VERTICAL_SPACING });

  // Add nodes
  for (const node of spec.nodes) {
    graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }

  // Add edges
  for (const edge of spec.edges) {
    graph.setEdge(edge.from, edge.to);
  }

  dagre.layout(graph);

  const positions: Record<string, { x: number; y: number }> = {};
  
  graph.nodes().forEach((nodeId) => {
    const node = graph.node(nodeId);
    positions[nodeId] = {
      x: node.x - NODE_WIDTH / 2,
      y: node.y - NODE_HEIGHT / 2,
    };
  });

  return positions;
}

/**
 * Generate JSON Patch operations to update UI positions with auto-layout
 */
export function generateAutoLayoutOps(spec: SequenceSpec): JSONPatchOperation[] {
  const newPositions = calculateAutoLayout(spec);
  const ops: JSONPatchOperation[] = [];

  for (const [nodeId, position] of Object.entries(newPositions)) {
    // Check if position changed significantly (more than 10px)
    const oldPosition = spec.ui.positions[nodeId];
    if (
      !oldPosition ||
      Math.abs(oldPosition.x - position.x) > 10 ||
      Math.abs(oldPosition.y - position.y) > 10
    ) {
      ops.push({
        op: 'replace',
        path: `/ui/positions/${nodeId}`,
        value: position,
      });
    }
  }

  // Add new positions for nodes that don't have positions yet
  for (const node of spec.nodes) {
    if (!spec.ui.positions[node.id] && newPositions[node.id]) {
      ops.push({
        op: 'add',
        path: `/ui/positions/${node.id}`,
        value: newPositions[node.id],
      });
    }
  }

  return ops;
}

