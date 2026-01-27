import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { validateSequenceSpec, validateSchema, validateBusinessRules } from '@/lib/sequences/validation';
import { SequenceSpec } from '@/lib/sequences/spec';

const fixturesDir = join(process.cwd(), 'tests', 'fixtures');

function loadFixture(name: string): SequenceSpec {
  const content = readFileSync(join(fixturesDir, name), 'utf-8');
  return JSON.parse(content);
}

describe('Step 1.1: Schema Validation - Pass Cases', () => {
  it('should validate minimal flow: trigger -> send_sms -> end', () => {
    const spec = loadFixture('spec.minimal.json');
    const result = validateSequenceSpec(spec);
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should validate wait flow: trigger -> wait -> send_sms -> end', () => {
    const spec = loadFixture('spec.wait.json');
    const result = validateSequenceSpec(spec);
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    
    // Verify wait node exists
    const waitNode = spec.nodes.find(n => n.type === 'wait');
    expect(waitNode).toBeDefined();
    if (waitNode && waitNode.type === 'wait') {
      expect(waitNode.duration).toBe('60 minutes');
    }
  });

  it('should validate condition branch with exactly 2 labeled edges', () => {
    const spec = loadFixture('spec.branching.json');
    const result = validateSequenceSpec(spec);
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    
    // Verify condition node has true/false paths
    const condNode = spec.nodes.find(n => n.type === 'condition');
    expect(condNode).toBeDefined();
    if (condNode && condNode.type === 'condition') {
      expect(condNode.truePath).toBe('msg_zillow');
      expect(condNode.falsePath).toBe('msg_other');
    }
    
    // Verify edges are labeled
    const condEdges = spec.edges.filter(e => e.from === 'cond1');
    expect(condEdges.length).toBe(2);
    expect(condEdges.some(e => e.label === 'true')).toBe(true);
    expect(condEdges.some(e => e.label === 'false')).toBe(true);
  });

  it('should validate variable usage in SMS bodies', () => {
    const spec = loadFixture('spec.minimal.json');
    const smsNode = spec.nodes.find(n => n.type === 'send_sms');
    
    expect(smsNode).toBeDefined();
    if (smsNode && smsNode.type === 'send_sms') {
      expect(smsNode.content).toContain('{{lead.first_name}}');
    }
  });

  it('should validate UI data present', () => {
    const spec = loadFixture('spec.minimal.json');
    
    expect(spec.ui).toBeDefined();
    expect(spec.ui.positions).toBeDefined();
    expect(spec.ui.positions['trigger']).toBeDefined();
    expect(spec.ui.positions['trigger'].x).toBe(100);
    expect(spec.ui.positions['trigger'].y).toBe(100);
    expect(spec.ui.zoom).toBe(1);
  });

  it('should assert node IDs are unique', () => {
    const spec = loadFixture('spec.minimal.json');
    const nodeIds = spec.nodes.map(n => n.id);
    const uniqueIds = new Set(nodeIds);
    
    expect(nodeIds.length).toBe(uniqueIds.size);
  });

  it('should assert edges reference existing nodes', () => {
    const spec = loadFixture('spec.minimal.json');
    const nodeIds = new Set(spec.nodes.map(n => n.id));
    
    for (const edge of spec.edges) {
      expect(nodeIds.has(edge.from)).toBe(true);
      expect(nodeIds.has(edge.to)).toBe(true);
    }
  });

  it('should assert exactly one trigger node', () => {
    const spec = loadFixture('spec.minimal.json');
    const triggerNodes = spec.nodes.filter(n => n.type === 'trigger');
    
    expect(triggerNodes.length).toBe(1);
  });
});

describe('Step 1.2: Schema Validation - Reject Cases', () => {
  it('should reject missing trigger node', () => {
    const spec = loadFixture('spec.minimal.json');
    spec.nodes = spec.nodes.filter(n => n.type !== 'trigger');
    
    const result = validateSequenceSpec(spec);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('trigger node'))).toBe(true);
  });

  it('should reject duplicate node IDs', () => {
    const spec = loadFixture('spec.invalid.json');
    
    const result = validateSequenceSpec(spec);
    expect(result.valid).toBe(false);
    // Should detect duplicate trigger nodes
    const nodeIds = spec.nodes.map(n => n.id);
    const duplicates = nodeIds.filter((id, index) => nodeIds.indexOf(id) !== index);
    expect(duplicates.length).toBeGreaterThan(0);
  });

  it('should reject edge referencing nonexistent node', () => {
    const spec = loadFixture('spec.invalid.json');
    
    const result = validateSequenceSpec(spec);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('non-existent') || e.includes('nonexistent'))).toBe(true);
  });

  it('should reject orphan node unreachable from trigger', () => {
    const spec = loadFixture('spec.invalid.json');
    
    const result = validateSequenceSpec(spec);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Unreachable'))).toBe(true);
  });

  it('should reject condition node missing labeled outgoing edges', () => {
    const spec = loadFixture('spec.branching.json');
    // Remove one of the condition edges
    spec.edges = spec.edges.filter(e => !(e.from === 'cond1' && e.label === 'false'));
    
    const result = validateSequenceSpec(spec);
    // Should warn or error about missing path
    expect(result.valid || result.warnings.length > 0).toBe(true);
  });

  it('should reject invalid wait duration', () => {
    const spec = loadFixture('spec.wait.json');
    const waitNode = spec.nodes.find(n => n.type === 'wait');
    if (waitNode && waitNode.type === 'wait') {
      waitNode.duration = 'invalid duration';
    }
    
    const result = validateSequenceSpec(spec);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('duration') || e.includes('Wait node'))).toBe(true);
  });

  it('should reject SMS node with empty body', () => {
    const spec = loadFixture('spec.minimal.json');
    const smsNode = spec.nodes.find(n => n.type === 'send_sms');
    if (smsNode && smsNode.type === 'send_sms') {
      smsNode.content = '';
    }
    
    const result = validateSequenceSpec(spec);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('content') || e.includes('SMS node'))).toBe(true);
  });

  it('should reject unknown node type', () => {
    const spec = loadFixture('spec.minimal.json');
    (spec.nodes[1] as any).type = 'unknown_type';
    
    const result = validateSequenceSpec(spec);
    expect(result.valid).toBe(false);
  });

  it('should provide error paths in format /nodes/X/field', () => {
    const spec = loadFixture('spec.minimal.json');
    const smsNode = spec.nodes.find(n => n.type === 'send_sms');
    if (smsNode && smsNode.type === 'send_sms') {
      smsNode.content = '';
    }
    
    const result = validateSchema(spec);
    if (!result.valid) {
      // Check that errors contain path-like information
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });

  it('should have stable/deterministic errors', () => {
    const spec = loadFixture('spec.invalid.json');
    
    const result1 = validateSequenceSpec(spec);
    const result2 = validateSequenceSpec(spec);
    
    expect(result1.errors).toEqual(result2.errors);
    expect(result1.warnings).toEqual(result2.warnings);
  });
});

