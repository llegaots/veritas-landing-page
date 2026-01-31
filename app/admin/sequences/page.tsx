'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useSequenceStore } from '@/lib/store/sequence-store';
import { CopilotChat } from '@/components/sequences/CopilotChat';
import { WorkflowDiagram } from '@/components/sequences/WorkflowDiagram';
import { NodePalette } from '@/components/sequences/NodePalette';
import { NodePropertiesPanel } from '@/components/sequences/NodePropertiesPanel';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Save, Plus, Loader2, Bot, Hand, Settings, MessageSquare, BarChart3, ArrowLeft, Info, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { createEmptySpec } from '@/lib/sequences/spec';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

function SequencesPageContent() {
  const searchParams = useSearchParams();
  const { password, setPassword, sequenceId, loadSpec, spec, sendMessage, isLoading, setSpec, error, clearError, activeVersionId, selectedNodeId } = useSequenceStore();
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<'ai' | 'manual'>('manual'); // Default to manual
  const [sequenceName, setSequenceName] = useState('New Sequence');
  const [triggerType, setTriggerType] = useState<'lead.created' | 'lead.demo_booked' | 'investor.matched' | 'manual'>('lead.created');
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

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

  // Sync sequence name from spec when it loads
  useEffect(() => {
    if (spec?.metadata?.name) {
      setSequenceName(spec.metadata.name);
    }
  }, [spec?.metadata?.name]);

  // Initialize empty sequence when switching to manual mode (only if no sequence is loaded)
  // IMPORTANT: Only initialize if spec is completely null/empty, don't overwrite existing specs
  useEffect(() => {
    if (mode === 'manual' && !spec && !sequenceId) {
      const emptySpec = createEmptySpec(sequenceName, 'user');
      emptySpec.trigger.type = triggerType;
      setSpec(emptySpec);
    }
  }, [mode, sequenceId]); // Removed spec from deps to prevent overwriting

  // Trigger type is now edited in the trigger node itself via NodePropertiesPanel

  const handleSave = async () => {
    // Get the latest spec from the store (in case it was updated)
    const currentSpec = useSequenceStore.getState().spec;
    if (!currentSpec || !password) return;

    console.log('[Save] Saving spec with', currentSpec.nodes.length, 'nodes,', currentSpec.edges.length, 'edges');
    console.log('[Save] Node IDs:', currentSpec.nodes.map(n => `${n.type}:${n.id}`));
    console.log('[Save] Positions:', Object.keys(currentSpec.ui?.positions || {}));

    // VALIDATE BEFORE SAVING - show errors only when saving
    const { validateSequenceSpec } = require('@/lib/sequences/validation');
    const validation = validateSequenceSpec(currentSpec);
    
    if (!validation.valid) {
      const errorMessage = `Cannot save sequence: ${validation.errors.join(', ')}`;
      console.error('[Save] Validation failed:', validation.errors);
      alert(errorMessage);
      return; // Don't save if validation fails
    }
    
    if (validation.warnings.length > 0) {
      console.warn('[Save] Validation warnings:', validation.warnings);
      // Show warnings but allow saving
      const continueSave = confirm(
        `⚠️ Warnings:\n${validation.warnings.join('\n')}\n\nContinue saving anyway?`
      );
      if (!continueSave) {
        return;
      }
    }

    setSaving(true);
    try {
      if (sequenceId) {
        // Update sequence name in database if it changed
        const sequenceResponse = await fetch(
          `/api/sequences?id=${sequenceId}&key=${encodeURIComponent(password)}`
        );
        if (sequenceResponse.ok) {
          const sequenceData = await sequenceResponse.json();
          const currentDbName = sequenceData.sequence?.name;
          const newName = currentSpec.metadata?.name;
          
          if (currentDbName !== newName && newName) {
            // Update sequence name in database
            await fetch(
              `/api/sequences?id=${sequenceId}&key=${encodeURIComponent(password)}`,
              {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName }),
              }
            );
            console.log('[Save] Updated sequence name in database:', newName);
          }
        }
        
        // Update existing sequence
        const response = await fetch(
          `/api/sequences/${sequenceId}/versions?key=${encodeURIComponent(password)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              spec: currentSpec,
              created_by: 'user',
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[Save] Save failed:', errorText);
          throw new Error('Failed to save sequence');
        }
        
        const savedData = await response.json();
        console.log('[Save] ✅ Save successful!');
        console.log('[Save] Saved version ID:', savedData.id);
        console.log('[Save] Saved spec has', savedData.spec?.nodes?.length || 0, 'nodes');
        console.log('[Save] Saved node IDs:', savedData.spec?.nodes?.map((n: any) => `${n.type}:${n.id}`));
        console.log('[Save] Saved edges:', savedData.spec?.edges?.length || 0);
        console.log('[Save] Current spec in store has', currentSpec.nodes.length, 'nodes');
        
          // Update activeVersionId in store
          useSequenceStore.getState().activeVersionId = savedData.id;
          
          console.log('[Save] ✅ Sequence updated successfully!');
          console.log('[Save] Full saved data:', savedData);
          
          // Show success message with details
          alert(`✅ Sequence saved successfully!\n\nVersion: ${savedData.version_number || 'Latest'}\nVersion ID: ${savedData.id}\nNodes: ${savedData.spec?.nodes?.length || 0}\nEdges: ${savedData.spec?.edges?.length || 0}\n\nYou can reload the page to verify it was saved.`);
        
        // DON'T overwrite spec with server response - keep current spec that has the new node
        // The server response might be stale or cached
        console.log('[Save] Keeping current spec in store (not overwriting with server response)');
      } else {
        // Create new sequence
        const response = await fetch(
          `/api/sequences?key=${encodeURIComponent(password)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: currentSpec.metadata.name,
            }),
          }
        );

        if (!response.ok) {
          throw new Error('Failed to create sequence');
        }

        const data = await response.json();
        console.log('[Save] Created new sequence:', data.sequence.id);
        
        // Update store with sequence ID
        useSequenceStore.getState().sequenceId = data.sequence.id;
        
        // Create initial version
        const versionResponse = await fetch(
          `/api/sequences/${data.sequence.id}/versions?key=${encodeURIComponent(password)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              spec: currentSpec,
              created_by: 'user',
            }),
          }
        );
        
        if (versionResponse.ok) {
          const versionData = await versionResponse.json();
          console.log('[Save] ✅ New sequence created and saved!');
          console.log('[Save] Sequence ID:', data.sequence.id);
          console.log('[Save] Version ID:', versionData.id);
          console.log('[Save] Saved spec has', versionData.spec?.nodes?.length || 0, 'nodes');
          console.log('[Save] Saved node IDs:', versionData.spec?.nodes?.map((n: any) => `${n.type}:${n.id}`));
          console.log('[Save] Saved edges:', versionData.spec?.edges?.length || 0);
          
          // Update store with version ID
          useSequenceStore.getState().activeVersionId = versionData.id;
          
          // Update URL to include sequence ID for easy reload
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.set('id', data.sequence.id);
          window.history.replaceState({}, '', newUrl.toString());
          
          // Show success message
          alert(`✅ New sequence created and saved!\n\nSequence ID: ${data.sequence.id}\nVersion: ${versionData.version_number || '1'}\nNodes: ${versionData.spec?.nodes?.length || 0}\nEdges: ${versionData.spec?.edges?.length || 0}\n\nYou can reload the page to verify it was saved.`);
          console.log('[Save] Created version:', versionData.id);
          console.log('[Save] Version spec has', versionData.spec?.nodes?.length || 0, 'nodes');
          // Update store with saved spec to ensure it matches what was saved
          useSequenceStore.getState().setSpec(versionData.spec);
        }
      }
    } catch (error) {
      console.error('[Save] Error saving sequence:', error);
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
      <div className="admin-font min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full border border-purple-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
              SMS Sequence Builder
            </h1>
          </div>
          <p className="text-gray-600 mb-6 text-center">
            Please provide a password to access the sequence builder.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-font min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/30 flex">
      <AdminSidebar password={password || 'veritas2024admin'} />
      
      <div className="flex-1 ml-64 transition-all duration-300 flex flex-col">
        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 border-b border-red-200 p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-red-800 font-medium text-sm">Error: {error}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={clearError} className="cursor-pointer">
              ✕
            </Button>
          </div>
        )}
        
        {/* Modern Header matching Analytics page */}
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-sm">
          <div className="px-4 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-md">
                  <MessageSquare className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
                    SMS Sequence Builder
                  </h1>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {spec ? `${spec.nodes.length} nodes • ${spec.edges.length} connections` : 'Create automated SMS workflows'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Link href={`/admin/sequences/list?key=${encodeURIComponent(password || 'veritas2024admin')}`}>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="border-gray-200 text-gray-700 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 transition-all duration-200 rounded-lg cursor-pointer"
                  >
                  View All
                </Button>
              </Link>
              <Button 
                variant="outline" 
                onClick={handleNew} 
                disabled={isLoading}
                size="sm"
                className="border-gray-200 text-gray-700 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 transition-all duration-200 rounded-lg cursor-pointer"
              >
                <Plus className="h-4 w-4 mr-2" />
                New
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={!spec || saving || isLoading}
                size="sm"
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-md hover:shadow-lg transition-all duration-200 rounded-lg cursor-pointer"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save
              </Button>
            </div>
          </div>
        </div>

        {/* Secondary Toolbar - Sequence Settings */}
        <div className="px-4 lg:px-8 pb-3 border-t border-gray-100">
          <div className="flex items-center gap-4 pt-3">
          {/* Mode Toggle */}
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1 border border-gray-200">
            <Button
              variant={mode === 'manual' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMode('manual')}
                className={`gap-2 transition-all duration-200 cursor-pointer ${
                  mode === 'manual' 
                    ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-sm' 
                    : 'text-gray-700 hover:bg-white'
                }`}
            >
              <Hand className="h-4 w-4" />
              Manual
            </Button>
            <Button
              variant={mode === 'ai' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMode('ai')}
                className={`gap-2 transition-all duration-200 cursor-pointer ${
                  mode === 'ai' 
                    ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-sm' 
                    : 'text-gray-700 hover:bg-white'
                }`}
            >
              <Bot className="h-4 w-4" />
              AI Assistant
            </Button>
          </div>

          {/* Manual Mode Settings */}
          {mode === 'manual' && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                  <Label htmlFor="sequence-name" className="text-sm text-gray-700 font-medium">Name:</Label>
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
                    className="w-48 border-gray-200 hover:border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:ring-offset-0 rounded-lg transition-all duration-200 text-gray-900"
                  placeholder="Sequence name"
                />
              </div>
              </div>
          )}
        </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Panel Toggle Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLeftPanelOpen(!leftPanelOpen)}
          className={`absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-white border border-gray-200 shadow-md hover:bg-purple-50 hover:border-purple-300 transition-all duration-200 rounded-r-lg cursor-pointer ${
            leftPanelOpen ? 'translate-x-0' : 'translate-x-0'
          }`}
          style={{ left: leftPanelOpen ? '256px' : '0' }}
        >
          {leftPanelOpen ? (
            <ChevronLeft className="h-4 w-4 text-gray-600" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-600" />
          )}
        </Button>

        {/* Left: Chat (only in AI mode) or Stats (in manual mode) */}
        <div className={`${leftPanelOpen ? 'w-64' : 'w-0'} border-r border-gray-200 bg-white/50 backdrop-blur-sm flex flex-col transition-all duration-300 overflow-hidden`}>
          {mode === 'ai' ? (
            <div className="p-4 h-full">
            <CopilotChat />
            </div>
          ) : (
            <div className="p-4">
              {!spec ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center mx-auto mb-3">
                    <Plus className="h-6 w-6 text-purple-600" />
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Initialize a new sequence to get started
                </p>
                  <Button 
                    onClick={handleInitializeManual} 
                    className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-md hover:shadow-lg transition-all duration-200 rounded-lg cursor-pointer"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Initialize
                  </Button>
                </div>
              ) : (
                <Card className="bg-white border-0 shadow-sm rounded-xl">
                  <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100/50 px-4 py-3 border-b border-purple-100">
                    <h3 className="text-sm font-semibold text-gray-900">Sequence Stats</h3>
                  </CardHeader>
                  <CardContent className="p-4">
                  <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Nodes:</span>
                        <span className="font-semibold text-purple-600">{spec.nodes.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Connections:</span>
                        <span className="font-semibold text-purple-600">{spec.edges.length}</span>
                    </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Trigger:</span>
                        <span className="font-semibold text-purple-600 capitalize text-xs">{spec.trigger.type.replace('_', ' ')}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                )}
            </div>
          )}
        </div>

        {/* Center: Diagram */}
        <div className="flex-1 p-4 bg-gray-50/50 relative">
          <NodePalette />
          <WorkflowDiagram />
        </div>

        {/* Right: Properties Panel - Only show when node is selected */}
        {selectedNodeId && (
          <>
            {/* Right Panel Toggle Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRightPanelOpen(!rightPanelOpen)}
              className={`absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-white border border-gray-200 shadow-md hover:bg-purple-50 hover:border-purple-300 transition-all duration-200 rounded-l-lg cursor-pointer ${
                rightPanelOpen ? 'translate-x-0' : 'translate-x-0'
              }`}
              style={{ right: rightPanelOpen ? '320px' : '0' }}
            >
              {rightPanelOpen ? (
                <ChevronRight className="h-4 w-4 text-gray-600" />
              ) : (
                <ChevronLeft className="h-4 w-4 text-gray-600" />
              )}
            </Button>
            <div className={`${rightPanelOpen ? 'w-80' : 'w-0'} transition-all duration-300 overflow-hidden`}>
              <NodePropertiesPanel />
            </div>
          </>
        )}

      </div>
      </div>
    </div>
  );
}

export default function SequencesPage() {
  return (
    <Suspense fallback={
      <div className="admin-font min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-md">
            <MessageSquare className="h-6 w-6 text-white animate-pulse" />
          </div>
          <p className="text-gray-600">Loading sequence builder...</p>
        </div>
      </div>
    }>
      <SequencesPageContent />
    </Suspense>
  );
}
