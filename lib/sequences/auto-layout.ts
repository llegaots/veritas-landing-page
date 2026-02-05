// Auto-layout using dagre for sequence diagrams
import dagre from 'dagre';
import { Node, Edge } from '@xyflow/react';
import { SequenceSpec } from './spec';
import { JSONPatchOperation } from './patches';

// Dynamic node sizing based on content
const NODE_WIDTH = 280; // Increased for better readability
const NODE_HEIGHT = 120; // Increased for SMS nodes with content
const HORIZONTAL_SPACING = 400; // More space between nodes to prevent overlaps
const VERTICAL_SPACING = 250; // More vertical space for branches

/**
 * Calculate auto-layout positions for nodes using dagre
 */
export function calculateAutoLayout(spec: SequenceSpec): Record<string, { x: number; y: number }> {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  
  // Use horizontal layout (left-to-right) instead of top-to-bottom
  // This prevents long vertical scrolling
  graph.setGraph({ 
    rankdir: 'LR', // Left to Right instead of TB (Top to Bottom)
    nodesep: VERTICAL_SPACING, // Vertical spacing between nodes at same level
    ranksep: HORIZONTAL_SPACING, // Horizontal spacing between levels
    align: 'UL', // Align nodes to upper left
  });

  // Add nodes with dynamic sizing
  for (const node of spec.nodes) {
    let width = NODE_WIDTH;
    let height = NODE_HEIGHT;
    
    // Adjust size based on node type and content
    if (node.type === 'send_sms') {
      const content = (node as any).content || '';
      // Estimate height based on content length
      const lines = Math.max(1, Math.ceil(content.length / 40));
      height = Math.max(120, Math.min(200, 80 + lines * 25));
    } else if (node.type === 'condition') {
      height = 140; // Conditions need more space
    } else if (node.type === 'wait') {
      height = 100; // Wait nodes are smaller
    }
    
    graph.setNode(node.id, { width, height });
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
      x: node.x - node.width / 2,
      y: node.y - node.height / 2,
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

