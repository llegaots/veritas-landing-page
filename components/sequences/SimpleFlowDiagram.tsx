'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import { useSequenceStore } from '@/lib/store/sequence-store';
import { SequenceSpec } from '@/lib/sequences/spec';
import { reactFlowChangeToOps } from '@/lib/sequences/reactflow-utils';
import { generateAutoLayoutOps } from '@/lib/sequences/auto-layout';
import { SimpleTriggerNode } from './nodes/SimpleTriggerNode';
import { SimpleSendSmsNode } from './nodes/SimpleSendSmsNode';
import { SimpleConditionNode } from './nodes/SimpleConditionNode';
import { SimpleEndNode } from './nodes/SimpleEndNode';

interface DraggingNode {
  nodeId: string;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
}

export function SimpleFlowDiagram() {
  const { spec, applyOps, commitOpsToServer, selectedNodeId, setSelectedNodeId } = useSequenceStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<DraggingNode | null>(null);
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const autoLayoutTriggered = useRef(false);

  const lastNodeIdsRef = useRef<string>('');
  const lastEdgeIdsRef = useRef<string>('');
  const initializedRef = useRef(false);

  // Initialize positions from spec - only once or when structure changes
  useEffect(() => {
    if (!spec) return;
    
    const nodeIds = spec.nodes.map(n => n.id).sort().join(',');
    const edgeIds = spec.edges.map(e => `${e.from}-${e.to}`).sort().join(',');
    const structureChanged = nodeIds !== lastNodeIdsRef.current || edgeIds !== lastEdgeIdsRef.current;
    
    if (structureChanged || !initializedRef.current) {
      initializedRef.current = true;
      lastNodeIdsRef.current = nodeIds;
      lastEdgeIdsRef.current = edgeIds;
      
      const positions: Record<string, { x: number; y: number }> = {};
      spec.nodes.forEach(node => {
        const pos = spec.ui?.positions?.[node.id];
        if (pos) {
          positions[node.id] = { ...pos };
        } else {
          // Default position if not set
          positions[node.id] = { x: 100, y: 100 };
        }
      });
      setNodePositions(positions);

      // Run auto-layout on first load if positions are missing or overlapping
      const hasAllPositions = spec.nodes.every(node => spec.ui?.positions?.[node.id]);
      
      if (!autoLayoutTriggered.current && (!hasAllPositions || structureChanged)) {
        // Check if nodes are overlapping (all at 0,0 or same position)
        const uniquePositions = new Set(
          spec.nodes.map(node => {
            const pos = spec.ui?.positions?.[node.id] || { x: 0, y: 0 };
            return `${pos.x},${pos.y}`;
          })
        );
        
        if (uniquePositions.size < spec.nodes.length || !hasAllPositions) {
          autoLayoutTriggered.current = true;
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
      }
    }
  }, [spec, applyOps]);

  // Update positions when spec.ui.positions changes (but not during drag)
  const positionsStringRef = useRef<string>('');
  useEffect(() => {
    if (!spec || dragging) return;
    
    // Create a string representation of positions to detect changes
    const positionsString = JSON.stringify(spec.ui?.positions || {});
    if (positionsString === positionsStringRef.current) return;
    positionsStringRef.current = positionsString;
    
    // Update positions from spec, preserving existing positions if not in spec
    setNodePositions(prev => {
      const newPositions: Record<string, { x: number; y: number }> = {};
      spec.nodes.forEach(node => {
        const pos = spec.ui?.positions?.[node.id];
        if (pos) {
          newPositions[node.id] = { ...pos };
        } else if (prev[node.id]) {
          newPositions[node.id] = prev[node.id];
        } else {
          newPositions[node.id] = { x: 100, y: 100 };
        }
      });
      return newPositions;
    });
  }, [spec, dragging]);

  const handleMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const currentPos = nodePositions[nodeId] || { x: 0, y: 0 };
    
    setDragging({
      nodeId,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: e.clientX - rect.left - currentPos.x,
      offsetY: e.clientY - rect.top - currentPos.y,
    });
    
    setSelectedNodeId(nodeId);
    e.preventDefault();
  }, [nodePositions, setSelectedNodeId]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const newX = e.clientX - rect.left - dragging.offsetX;
    const newY = e.clientY - rect.top - dragging.offsetY;
    
    setNodePositions(prev => ({
      ...prev,
      [dragging.nodeId]: { x: newX, y: newY },
    }));
  }, [dragging]);

  const handleMouseUp = useCallback(() => {
    if (!dragging || !spec) return;
    
    const finalPos = nodePositions[dragging.nodeId];
    if (finalPos) {
      const ops = reactFlowChangeToOps(spec, {
        positionChanges: [{ nodeId: dragging.nodeId, position: finalPos }],
      });
      
      if (ops.length > 0) {
        applyOps(ops);
        setTimeout(() => {
          commitOpsToServer(ops, `Moved node ${dragging.nodeId}`);
        }, 300);
      }
    }
    
    setDragging(null);
  }, [dragging, nodePositions, spec, applyOps, commitOpsToServer]);

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);

  if (!spec) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted">
        <p className="text-muted-foreground">No sequence loaded.</p>
      </div>
    );
  }

  // Calculate connection lines
  const connections = spec.edges.map(edge => {
    const fromPos = nodePositions[edge.from] || { x: 0, y: 0 };
    const toPos = nodePositions[edge.to] || { x: 0, y: 0 };
    
    // Node dimensions (approximate)
    const fromNode = spec.nodes.find(n => n.id === edge.from);
    let fromWidth = 200;
    if (fromNode?.type === 'send_sms') {
      // Calculate width based on content length
      const content = (fromNode as any).content || '';
      fromWidth = Math.max(280, Math.min(400, 280 + Math.ceil(content.length / 30) * 20));
    } else if (fromNode?.type === 'condition') {
      fromWidth = 240;
    }
    const toWidth = 200;
    const nodeHeight = 120;
    
    return {
      from: edge.from,
      to: edge.to,
      fromX: fromPos.x + fromWidth, // Right side of node
      fromY: fromPos.y + nodeHeight / 2,  // Middle of node
      toX: toPos.x,            // Left side of node
      toY: toPos.y + nodeHeight / 2,       // Middle of node
    };
  });

  // Calculate container dimensions based on node positions
  const minWidth = Math.max(800, ...Object.values(nodePositions).map(p => p.x + 300));
  const minHeight = Math.max(600, ...Object.values(nodePositions).map(p => p.y + 200));

  return (
    <div 
      ref={containerRef}
      className="w-full h-full relative overflow-auto bg-gray-50"
      style={{ 
        cursor: dragging ? 'grabbing' : 'default',
        minWidth: `${minWidth}px`,
        minHeight: `${minHeight}px`,
      }}
      onClick={(e) => {
        if (e.target === containerRef.current) {
          setSelectedNodeId(null);
        }
      }}
    >
      {/* Connection lines */}
      <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
        {connections.map((conn, idx) => {
          const dx = conn.toX - conn.fromX;
          const controlX1 = conn.fromX + Math.max(50, dx * 0.5);
          const controlX2 = conn.toX - Math.max(50, dx * 0.5);
          // Smooth step curve
          const path = `M ${conn.fromX} ${conn.fromY} C ${controlX1} ${conn.fromY}, ${controlX2} ${conn.toY}, ${conn.toX} ${conn.toY}`;
          
          return (
            <path
              key={`${conn.from}-${conn.to}-${idx}`}
              d={path}
              stroke="#9333ea"
              strokeWidth="2.5"
              fill="none"
              markerEnd="url(#arrowhead)"
            />
          );
        })}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 10 3, 0 6" fill="#9333ea" />
          </marker>
        </defs>
      </svg>

      {/* Nodes */}
      {spec.nodes.map(node => {
        const pos = nodePositions[node.id] || { x: 0, y: 0 };
        const isSelected = selectedNodeId === node.id;
        const isDraggingNode = dragging?.nodeId === node.id;
        
        return (
          <div
            key={node.id}
            className="absolute"
            style={{
              left: `${pos.x}px`,
              top: `${pos.y}px`,
              cursor: isDraggingNode ? 'grabbing' : 'grab',
              zIndex: isDraggingNode ? 1000 : isSelected ? 100 : 10,
            }}
            onMouseDown={(e) => handleMouseDown(e, node.id)}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedNodeId(node.id);
            }}
          >
            {node.type === 'trigger' && (
              <SimpleTriggerNode data={node} />
            )}
            {node.type === 'send_sms' && (
              <SimpleSendSmsNode data={node} nodeId={node.id} isSelected={isSelected} />
            )}
            {node.type === 'condition' && (
              <SimpleConditionNode data={node} nodeId={node.id} isSelected={isSelected} />
            )}
            {node.type === 'end' && (
              <SimpleEndNode data={node} />
            )}
          </div>
        );
      })}
    </div>
  );
}

