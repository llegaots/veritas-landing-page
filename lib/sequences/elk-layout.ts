// ELK Layout for workflow graphs
// More robust than Dagre for layered layouts

import { GraphSpec } from './adapters';

// Use a simpler layout for now (can upgrade to ELK later)
// This creates a horizontal flow with proper spacing

const FIXED_NODE_WIDTH = 320;
const FIXED_NODE_HEIGHT = 120;

/**
 * Calculate layout using layered approach
 * Creates a horizontal flow with proper spacing
 */
export async function calculateElkLayout(graph: GraphSpec): Promise<Record<string, { x: number; y: number }>> {
  console.log('[ELK Layout] Calculating layout for', graph.nodes.length, 'nodes,', graph.edges.length, 'edges');
  console.log('[ELK Layout] Node IDs:', graph.nodes.map(n => n.id));
  
  // Build dependency graph to determine layers
  const nodeLayers = new Map<string, number>();
  const processed = new Set<string>();
  
  // Start with trigger (layer 0)
  const triggerNode = graph.nodes.find(n => n.id === 'trigger');
  if (triggerNode) {
    nodeLayers.set('trigger', 0);
    processed.add('trigger');
  }
  
  // BFS to assign layers
  const queue: string[] = triggerNode ? ['trigger'] : [];
  if (graph.nodes.length > 0 && !triggerNode) {
    // Start with first node if no trigger
    queue.push(graph.nodes[0].id);
    nodeLayers.set(graph.nodes[0].id, 0);
    processed.add(graph.nodes[0].id);
  }
  
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const currentLayer = nodeLayers.get(currentId) || 0;
    
    // Find outgoing edges
    const outgoing = graph.edges.filter(e => e.source === currentId);
    outgoing.forEach(edge => {
      if (!processed.has(edge.target)) {
        nodeLayers.set(edge.target, currentLayer + 1);
        processed.add(edge.target);
        queue.push(edge.target);
      } else {
        // If already processed, use max layer
        const existingLayer = nodeLayers.get(edge.target) || 0;
        nodeLayers.set(edge.target, Math.max(existingLayer, currentLayer + 1));
      }
    });
  }
  
  // Group nodes by layer
  const layers: string[][] = [];
  nodeLayers.forEach((layer, nodeId) => {
    if (!layers[layer]) {
      layers[layer] = [];
    }
    layers[layer].push(nodeId);
  });
  
  // Calculate positions
  const positions: Record<string, { x: number; y: number }> = {};
  const HORIZONTAL_SPACING = 450; // Increased spacing to prevent overlap
  const VERTICAL_SPACING = 200;
  const START_X = 100; // Start position for trigger
  const START_Y = 200; // Vertical center for trigger
  
  // Special handling for trigger and end nodes
  const endNode = graph.nodes.find(n => n.id === 'end');
  const maxLayer = layers.length > 0 ? layers.length - 1 : 0;
  
  // Position trigger at the start
  if (triggerNode) {
    positions['trigger'] = { x: START_X, y: START_Y };
  }
  
  // Position other nodes in layers
  layers.forEach((nodeIds, layerIndex) => {
    const x = START_X + (layerIndex + 1) * HORIZONTAL_SPACING; // Offset by 1 to leave space for trigger
    nodeIds.forEach((nodeId, indexInLayer) => {
      // Skip trigger (already positioned) and end (positioned separately)
      if (nodeId === 'trigger' || nodeId === 'end') return;
      
      const y = START_Y + (indexInLayer - (nodeIds.length - 1) / 2) * VERTICAL_SPACING;
      positions[nodeId] = { x, y };
    });
  });
  
  // Position end node at the far right, same Y as trigger to prevent overlap
  if (endNode) {
    positions['end'] = {
      x: START_X + (maxLayer + 2) * HORIZONTAL_SPACING, // Always on the right
      y: START_Y, // Same Y as trigger to keep it aligned
    };
  }
  
  // Ensure ALL nodes have positions (even if not reachable via edges)
  graph.nodes.forEach(node => {
    if (!positions[node.id]) {
      console.log('[ELK Layout] Node missing from layers, assigning default position:', node.id);
      // Assign to a default layer (after all processed layers)
      const nodesInMaxLayer = layers[maxLayer]?.length || 0;
      positions[node.id] = {
        x: START_X + (maxLayer + 1) * HORIZONTAL_SPACING,
        y: START_Y + nodesInMaxLayer * VERTICAL_SPACING,
      };
    }
  });
  
  console.log('[ELK Layout] Calculated positions for', Object.keys(positions).length, 'nodes');
  return positions;
}

/**
 * Fallback layout if ELK fails
 */
function fallbackLayout(graph: GraphSpec): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  const spacing = 400;
  
  // Simple horizontal layout
  graph.nodes.forEach((node, index) => {
    positions[node.id] = {
      x: index * spacing,
      y: 100,
    };
  });
  
  return positions;
}

