// Timeline calculation for sequence nodes
// Calculates cumulative timing from the start to show "HOUR 1", "DAY 2", etc.

import { SequenceSpec, SequenceNode } from './spec';
import { parseTimingString } from './adapters';
import { Timing } from './workflow-v2';

export interface TimelineInfo {
  label: string; // "HOUR 1", "DAY 2", etc.
  cumulativeHours: number;
  cumulativeDays: number;
}

/**
 * Calculate timeline information for a node in the sequence
 * Returns the cumulative time from the start of the sequence
 */
export function calculateTimeline(
  spec: SequenceSpec,
  nodeId: string
): TimelineInfo | null {
  // Find the node
  const node = spec.nodes.find(n => n.id === nodeId);
  if (!node) return null;

  // Start from trigger and walk the path to this node
  const triggerNode = spec.nodes.find(n => n.type === 'trigger');
  if (!triggerNode) return null;

  // If this is the trigger, it's at the start
  if (nodeId === triggerNode.id) {
    return {
      label: 'START',
      cumulativeHours: 0,
      cumulativeDays: 0,
    };
  }

  // Find path from trigger to this node
  const path = findPath(spec, triggerNode.id, nodeId);
  if (!path || path.length === 0) return null;

  // Calculate cumulative timing along the path
  let totalMinutes = 0;
  
  for (let i = 1; i < path.length; i++) {
    const currentNodeId = path[i];
    const currentNode = spec.nodes.find(n => n.id === currentNodeId);
    if (!currentNode) continue;

    // Get timing from the node
    let timing: Timing | null = null;
    
    if (currentNode.type === 'send_sms' && (currentNode as any).timing) {
      timing = parseTimingString((currentNode as any).timing);
    } else if (currentNode.type === 'send_email' && (currentNode as any).timing) {
      timing = parseTimingString((currentNode as any).timing);
    } else if (currentNode.type === 'wait' && (currentNode as any).duration) {
      timing = parseTimingString((currentNode as any).duration);
    }

    // Add timing to total (convert to minutes)
    if (timing) {
      if (timing.unit === 'minutes') {
        totalMinutes += timing.value;
      } else if (timing.unit === 'hours') {
        totalMinutes += timing.value * 60;
      } else if (timing.unit === 'days') {
        totalMinutes += timing.value * 24 * 60;
      }
    }

    // If we've reached the target node, stop
    if (currentNodeId === nodeId) {
      break;
    }
  }

  // Convert to hours and days
  const totalHours = totalMinutes / 60;
  const totalDays = totalHours / 24;

  // Generate label
  let label: string;
  if (totalDays >= 1) {
    const dayNumber = Math.floor(totalDays) + 1; // Day 1, Day 2, etc.
    label = `DAY ${dayNumber}`;
  } else if (totalHours >= 1) {
    const hourNumber = Math.floor(totalHours) + 1; // HOUR 1, HOUR 2, etc.
    label = `HOUR ${hourNumber}`;
  } else {
    // Less than 1 hour - show minutes
    const minuteNumber = Math.floor(totalMinutes) + 1;
    label = `MIN ${minuteNumber}`;
  }

  return {
    label,
    cumulativeHours: totalHours,
    cumulativeDays: totalDays,
  };
}

/**
 * Find the shortest path from startNodeId to targetNodeId
 * Returns array of node IDs in order
 */
function findPath(
  spec: SequenceSpec,
  startNodeId: string,
  targetNodeId: string
): string[] | null {
  if (startNodeId === targetNodeId) {
    return [startNodeId];
  }

  // BFS to find path
  const queue: { nodeId: string; path: string[] }[] = [
    { nodeId: startNodeId, path: [startNodeId] },
  ];
  const visited = new Set<string>([startNodeId]);

  while (queue.length > 0) {
    const { nodeId, path } = queue.shift()!;

    // Find outgoing edges
    const outgoingEdges = spec.edges.filter(e => e.from === nodeId);
    
    for (const edge of outgoingEdges) {
      if (edge.to === targetNodeId) {
        return [...path, targetNodeId];
      }

      if (!visited.has(edge.to)) {
        visited.add(edge.to);
        queue.push({
          nodeId: edge.to,
          path: [...path, edge.to],
        });
      }
    }
  }

  return null;
}

