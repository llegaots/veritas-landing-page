// JSON Patch operations for sequence edits
// RFC 6902 compliant patch format
import { applyPatch, type Operation as JSONPatchOperation } from 'fast-json-patch';
import { SequenceSpec } from './spec';

export type { Operation as JSONPatchOperation } from 'fast-json-patch';

// Apply patches to a spec
export function applyPatchesToSpec(spec: SequenceSpec, patches: JSONPatchOperation[]): SequenceSpec {
  try {
    const result = applyPatch(spec, patches, false, false);
    if (!result || result.length === 0 || !result[result.length - 1]) {
      throw new Error('Failed to apply patches');
    }
    // fast-json-patch returns array of results, last one has the final newDocument
    const lastResult = result[result.length - 1];
    // The result can be either the document directly or an object with newDocument property
    const finalDoc = (lastResult as any).newDocument || lastResult;
    if (!finalDoc || !finalDoc.nodes) {
      throw new Error('Patch application resulted in invalid spec structure');
    }
    return finalDoc as SequenceSpec;
  } catch (error) {
    throw new Error(`Patch application failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper functions to create common patch operations
export function createAddNodePatch(nodeId: string, node: SequenceSpec['nodes'][0], position?: { x: number; y: number }): JSONPatchOperation[] {
  const patches: JSONPatchOperation[] = [
    {
      op: 'add',
      path: `/nodes/-`,
      value: node,
    },
  ];

  if (position) {
    patches.push({
      op: 'add',
      path: `/ui/positions/${nodeId}`,
      value: position,
    });
  }

  return patches;
}

export function createRemoveNodePatch(spec: SequenceSpec, nodeId: string): JSONPatchOperation[] {
  const patches: JSONPatchOperation[] = [];
  const nodeIndex = findNodeIndex(spec, nodeId);
  
  if (nodeIndex === -1) {
    return patches; // Node doesn't exist
  }

  // Remove the node
  patches.push({
    op: 'remove',
    path: `/nodes/${nodeIndex}`,
  });

  // Remove position
  if (spec.ui.positions[nodeId]) {
    patches.push({
      op: 'remove',
      path: `/ui/positions/${nodeId}`,
    });
  }

  // Remove all edges connected to this node
  const edgesToRemove: number[] = [];
  spec.edges.forEach((edge, index) => {
    if (edge.from === nodeId || edge.to === nodeId) {
      edgesToRemove.push(index);
    }
  });

  // Remove edges in reverse order to maintain correct indices
  edgesToRemove.reverse().forEach((edgeIndex) => {
    patches.push({
      op: 'remove',
      path: `/edges/${edgeIndex}`,
    });
  });

  return patches;
}

export function createUpdateNodePatch(nodeId: string, updates: Partial<SequenceSpec['nodes'][0]>): JSONPatchOperation[] {
  const nodeIndex = 0; // Would need to find actual index
  const patches: JSONPatchOperation[] = [];

  for (const [key, value] of Object.entries(updates)) {
    if (key !== 'id' && key !== 'type') {
      patches.push({
        op: 'replace',
        path: `/nodes/${nodeIndex}/${key}`,
        value,
      });
    }
  }

  return patches;
}

export function createAddEdgePatch(from: string, to: string, label?: string): JSONPatchOperation[] {
  return [
    {
      op: 'add',
      path: `/edges/-`,
      value: { from, to, ...(label && { label }) },
    },
  ];
}

export function createRemoveEdgePatch(from: string, to: string): JSONPatchOperation[] {
  // Would need to find edge index
  return [
    {
      op: 'remove',
      path: `/edges/0`, // Simplified - would need actual index
    },
  ];
}

export function createUpdateNodePositionPatch(nodeId: string, position: { x: number; y: number }): JSONPatchOperation[] {
  return [
    {
      op: 'replace',
      path: `/ui/positions/${nodeId}`,
      value: position,
    },
  ];
}

export function createUpdateMetadataPatch(updates: Partial<SequenceSpec['metadata']>): JSONPatchOperation[] {
  const patches: JSONPatchOperation[] = [];

  for (const [key, value] of Object.entries(updates)) {
    patches.push({
      op: 'replace',
      path: `/metadata/${key}`,
      value,
    });
  }

  return patches;
}

// Helper to find node index in array (for patch paths)
export function findNodeIndex(spec: SequenceSpec, nodeId: string): number {
  return spec.nodes.findIndex((n) => n.id === nodeId);
}

// Helper to find edge index in array (for patch paths)
export function findEdgeIndex(spec: SequenceSpec, from: string, to: string): number {
  return spec.edges.findIndex((e) => e.from === from && e.to === to);
}

// More accurate patch creators using indices
export function createUpdateNodePatchWithIndex(spec: SequenceSpec, nodeId: string, updates: Partial<SequenceSpec['nodes'][0]>): JSONPatchOperation[] {
  const nodeIndex = findNodeIndex(spec, nodeId);
  if (nodeIndex === -1) {
    throw new Error(`Node ${nodeId} not found`);
  }

  const patches: JSONPatchOperation[] = [];

  for (const [key, value] of Object.entries(updates)) {
    if (key !== 'id' && key !== 'type') {
      patches.push({
        op: 'replace',
        path: `/nodes/${nodeIndex}/${key}`,
        value,
      });
    }
  }

  return patches;
}

export function createRemoveEdgePatchWithIndex(spec: SequenceSpec, from: string, to: string): JSONPatchOperation[] {
  const edgeIndex = findEdgeIndex(spec, from, to);
  if (edgeIndex === -1) {
    throw new Error(`Edge from ${from} to ${to} not found`);
  }

  return [
    {
      op: 'remove',
      path: `/edges/${edgeIndex}`,
    },
  ];
}

