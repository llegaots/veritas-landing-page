# SMS Sequence Builder - Architecture V2

## Overview

This document describes the new robust architecture for the SMS Sequence Builder, based on domain-driven design principles.

## Core Principles

1. **Domain Model First**: Workflow is a sequence model, not a graph
2. **Graph is a Projection**: Visual graph is derived from domain model
3. **Fixed Node Sizing**: Deterministic layout, no dynamic width calculations
4. **Command Pattern**: All edits go through commands with validation
5. **Separate Concerns**: Workflow state vs. layout state

## Architecture Layers

### Layer 1: Domain Model (`WorkflowSpecV2`)

**Location**: `lib/sequences/workflow-v2.ts`

The canonical representation of a workflow:

```typescript
interface WorkflowSpecV2 {
  specVersion: 2;
  trigger: Trigger;
  variables: Record<string, string>;
  steps: WorkflowStep[];  // Linear sequence with optional branches
  metadata: Metadata;
  layoutOverrides?: LayoutOverrides;  // Optional UI state
}
```

**Key Features**:
- Steps are stored as a sequence, not a graph
- Each step has explicit `next`, `ifTrue`, `ifFalse`, `onNoResponse` references
- Timing is structured: `{ value: number, unit: 'minutes' | 'hours' | 'days' }`
- Layout is optional and can be dropped without breaking workflow

**Validation**:
- Exactly one end step
- All step references must exist
- All steps must be reachable
- No cycles (unless explicitly allowed)

### Layer 2: Graph Projection

**Location**: `lib/sequences/adapters.ts`

Converts domain model → graph for visualization:

```typescript
workflowToGraph(workflow: WorkflowSpecV2): GraphSpec
```

- Each step becomes a node
- Edges are inferred from `next`, `ifTrue`, `ifFalse`
- Positions come from `layoutOverrides` or ELK layout
- Graph is purely for rendering, not source of truth

### Layer 3: React Flow UI

**Location**: `components/sequences/WorkflowDiagram.tsx`

Uses React Flow for:
- Drag & drop (handled by React Flow)
- Pan/zoom (built-in)
- Selection (built-in)
- Connection visualization (built-in)

**Fixed Node Sizing**:
- All nodes: 320px width (fixed)
- Content truncated to 2-4 lines
- Full editing in side panel

**Layout**: ELK (Eclipse Layout Kernel)
- More robust than Dagre
- Better edge routing
- Predictable spacing
- Runs only on structure changes

### Layer 4: Command Pattern

**Location**: `lib/sequences/commands.ts`

All edits go through commands:

```typescript
class AddStepCommand implements Command {
  execute(workflow): { forward: Patch[], inverse: Patch[], workflow }
  validate(workflow): { valid: boolean, errors: string[] }
}
```

**Commands**:
- `AddStepCommand` - Add new step
- `RemoveStepCommand` - Remove step
- `UpdateMessageCommand` - Update SMS content
- `UpdateTimingCommand` - Update timing
- `ConnectStepCommand` - Connect steps

**Benefits**:
- Invariant validation before execution
- Undo/redo via inverse patches
- Clear error messages
- Prevents invalid states

## Migration Path

### Phase 1: Domain Model (✅ Complete)

- Created `WorkflowSpecV2` interface
- Created adapters: `SequenceSpec → WorkflowSpecV2`
- Created graph projection: `WorkflowSpecV2 → GraphSpec`
- Added validation and invariants

### Phase 2: React Flow Integration (✅ Complete)

- Installed React Flow and ELK
- Replaced `SimpleFlowDiagram` with `WorkflowDiagram`
- Implemented fixed-width nodes (320px)
- Content truncation (2-4 lines)
- ELK layout on structure changes

### Phase 3: Command Layer (✅ Complete)

- Created command classes
- Added invariant checks
- Forward/inverse patches for undo
- Validation before execution

### Phase 4: UX Polish (🔄 In Progress)

- Side panel editor for full content
- Keyboard shortcuts
- Minimap + fitView
- Timeline view option

## Key Improvements

### 1. No More Position Drift

**Before**: `nodePositions` state vs `spec.ui.positions` → conflicts
**After**: Layout is optional override, workflow doesn't depend on it

### 2. Deterministic Layout

**Before**: Dynamic node widths (280-400px) → layout ripples
**After**: Fixed 320px width → stable layout

### 3. Robust Interactions

**Before**: Custom mouse events → bug farm
**After**: React Flow handles all interactions

### 4. Validated Edits

**Before**: Direct patches → invalid states possible
**After**: Commands validate before execution

### 5. Clear Separation

**Before**: UI metadata mixed with workflow logic
**After**: Workflow is pure, layout is separate

## File Structure

```
lib/sequences/
  ├── workflow-v2.ts          # Domain model (canonical)
  ├── adapters.ts              # SequenceSpec ↔ WorkflowSpecV2 ↔ GraphSpec
  ├── commands.ts              # Command pattern for edits
  ├── elk-layout.ts           # ELK layout calculation
  ├── compiler-v2.ts          # WorkflowSpecV2 → MessageJobs
  ├── spec.ts                 # Legacy SequenceSpec (for migration)
  └── patches.ts              # JSON Patch utilities

components/sequences/
  ├── WorkflowDiagram.tsx     # React Flow diagram
  ├── nodes/
  │   ├── WorkflowSendSmsNode.tsx
  │   ├── WorkflowConditionNode.tsx
  │   ├── WorkflowTriggerNode.tsx
  │   └── WorkflowEndNode.tsx
  └── NodePalette.tsx         # Add nodes (uses commands)
```

## Usage Example

```typescript
// Load existing sequence (auto-migrates)
const workflow = sequenceSpecToWorkflow(legacySpec);

// Add a step using command
const command = new AddStepCommand({
  id: 'step_1',
  type: 'send_sms',
  message: 'Hello {{FirstName}}!',
  timing: { value: 1, unit: 'hours' },
  next: 'end',
});

const { workflow: updated, ops, errors } = executeCommand(workflow, command);
if (errors.length === 0) {
  applyOps(ops);  // Update store
}

// Render graph
const graph = workflowToGraph(updated);
// Feed to React Flow
```

## Next Steps

1. Update NodePalette to use commands
2. Create side panel editor for full message editing
3. Add undo/redo stack
4. Implement timeline view
5. Add keyboard shortcuts
6. Migration script for existing sequences in database


