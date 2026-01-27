'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useSequenceStore } from '@/lib/store/sequence-store';
import { CopilotChat } from '@/components/sequences/CopilotChat';
import { SequenceDiagram } from '@/components/sequences/SequenceDiagram';
import { PropertiesPanel } from '@/components/sequences/PropertiesPanel';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Save, Plus, Loader2, Bot, Hand, Settings } from 'lucide-react';
import { createEmptySpec } from '@/lib/sequences/spec';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

function SequencesPageContent() {
  const searchParams = useSearchParams();
  const { password, setPassword, sequenceId, loadSpec, spec, sendMessage, isLoading, setSpec, error, clearError } = useSequenceStore();
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<'ai' | 'manual'>('manual'); // Default to manual
  const [sequenceName, setSequenceName] = useState('New Sequence');
  const [triggerType, setTriggerType] = useState<'lead.created' | 'lead.demo_booked' | 'investor.matched' | 'manual'>('lead.created');

  useEffect(() => {
    const key = searchParams.get('key');
    const id = searchParams.get('id');
    
    if (key && key !== password) {
      setPassword(key);
    }
    
    // Load sequence if ID is provided
    if (id && password && id !== sequenceId) {
      loadSpec(id, password).catch((error) => {
        console.error('Failed to load sequence:', error);
        alert(`Failed to load sequence: ${error instanceof Error ? error.message : 'Unknown error'}`);
      });
    }
  }, [searchParams, setPassword, password, loadSpec, sequenceId]);

  // Initialize empty sequence when switching to manual mode (only if no sequence is loaded)
  useEffect(() => {
    if (mode === 'manual' && !spec && !sequenceId) {
      const emptySpec = createEmptySpec(sequenceName, 'user');
      emptySpec.trigger.type = triggerType;
      setSpec(emptySpec);
    }
  }, [mode, spec, sequenceName, triggerType, setSpec, sequenceId]);

  // Update trigger type when it changes
  useEffect(() => {
    if (spec && mode === 'manual') {
      const patches = [{
        op: 'replace' as const,
        path: '/trigger/type',
        value: triggerType,
      }];
      useSequenceStore.getState().applyOps(patches);
    }
  }, [triggerType, mode]);

  const handleSave = async () => {
    if (!spec || !password) return;

    setSaving(true);
    try {
      if (sequenceId) {
        // Update existing sequence
        const response = await fetch(
          `/api/sequences/${sequenceId}/versions?key=${encodeURIComponent(password)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              spec: spec,
              created_by: 'user',
            }),
          }
        );

        if (!response.ok) {
          throw new Error('Failed to save sequence');
        }
      } else {
        // Create new sequence
        const response = await fetch(
          `/api/sequences?key=${encodeURIComponent(password)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: spec.metadata.name,
            }),
          }
        );

        if (!response.ok) {
          throw new Error('Failed to create sequence');
        }

        const data = await response.json();
        // Create initial version
        await fetch(
          `/api/sequences/${data.sequence.id}/versions?key=${encodeURIComponent(password)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              spec: spec,
              created_by: 'user',
            }),
          }
        );
      }
    } catch (error) {
      console.error('Error saving sequence:', error);
      alert('Failed to save sequence');
    } finally {
      setSaving(false);
    }
  };

  const handleNew = () => {
    useSequenceStore.getState().reset();
    setSequenceName('New Sequence');
    setTriggerType('lead.created');
    // Will auto-initialize via useEffect
  };

  const handleInitializeManual = () => {
    const emptySpec = createEmptySpec(sequenceName, 'user');
    emptySpec.trigger.type = triggerType;
    setSpec(emptySpec);
  };

  if (!password) {
    return (
      <div className="container mx-auto p-8">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Please provide a password to access sequences.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-red-800 font-medium">Error: {error}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={clearError}>
            ✕
          </Button>
        </div>
      )}
      
      {/* Toolbar */}
      <div className="border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">SMS Sequences</h1>
          
          {/* Mode Toggle */}
          <div className="flex items-center gap-2 border rounded-lg p-1">
            <Button
              variant={mode === 'manual' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMode('manual')}
              className="gap-2"
            >
              <Hand className="h-4 w-4" />
              Manual
            </Button>
            <Button
              variant={mode === 'ai' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMode('ai')}
              className="gap-2"
            >
              <Bot className="h-4 w-4" />
              AI Assistant
            </Button>
          </div>

          {/* Manual Mode Settings */}
          {mode === 'manual' && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="sequence-name" className="text-sm">Name:</Label>
                <Input
                  id="sequence-name"
                  value={sequenceName}
                  onChange={(e) => {
                    setSequenceName(e.target.value);
                    if (spec) {
                      const patches = [{
                        op: 'replace' as const,
                        path: '/metadata/name',
                        value: e.target.value,
                      }];
                      useSequenceStore.getState().applyOps(patches);
                    }
                  }}
                  className="w-48"
                  placeholder="Sequence name"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="trigger-type" className="text-sm">Trigger:</Label>
                <Select value={triggerType} onValueChange={(value: any) => setTriggerType(value)}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead.created">New Lead Created</SelectItem>
                    <SelectItem value="lead.demo_booked">Demo Booked</SelectItem>
                    <SelectItem value="investor.matched">Investor Matched</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex gap-2">
          <Link href={`/admin/sequences/list?key=${encodeURIComponent(password || 'veritas2024admin')}`}>
            <Button variant="outline" disabled={isLoading}>
              View All
            </Button>
          </Link>
          <Button variant="outline" onClick={handleNew} disabled={isLoading}>
            <Plus className="h-4 w-4 mr-2" />
            New
          </Button>
          <Button onClick={handleSave} disabled={!spec || saving || isLoading}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Chat (only in AI mode) or Instructions (in manual mode) */}
        <div className="w-96 border-r p-4 flex flex-col">
          {mode === 'ai' ? (
            <CopilotChat />
          ) : (
            <div className="space-y-4">
              <Card className="p-4">
                <h3 className="font-semibold mb-2">Manual Builder</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Build your sequence manually by adding nodes from the palette.
                </p>
                
                {!spec && (
                  <Button onClick={handleInitializeManual} className="w-full">
                    Initialize Sequence
                  </Button>
                )}
                
                {spec && (
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong>Steps:</strong>
                      <ol className="list-decimal list-inside mt-2 space-y-1 text-muted-foreground">
                        <li>Click "Add Node" button (top-left) to add SMS, Wait, or Condition nodes</li>
                        <li>Click on nodes to select and edit their properties</li>
                        <li>Drag nodes to reposition them</li>
                        <li>Connect nodes by dragging from one node's handle to another</li>
                        <li>Click the X button on nodes to delete them</li>
                        <li>Select edges and press Delete to remove connections</li>
                      </ol>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t">
                      <strong>Current Sequence:</strong>
                      <div className="mt-2 text-muted-foreground">
                        <div>Nodes: {spec.nodes.length}</div>
                        <div>Edges: {spec.edges.length}</div>
                        <div>Trigger: {spec.trigger.type}</div>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>

        {/* Center: Diagram */}
        <div className="flex-1 p-4">
          <SequenceDiagram />
        </div>

        {/* Right: Properties Panel */}
        <PropertiesPanel />
      </div>
    </div>
  );
}

export default function SequencesPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto p-8">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Loading...</p>
        </Card>
      </div>
    }>
      <SequencesPageContent />
    </Suspense>
  );
}
