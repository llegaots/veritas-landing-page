'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useSequenceStore } from '@/lib/store/sequence-store';
import { SequenceDiagram } from '@/components/sequences/SequenceDiagram';
import { PropertiesPanel } from '@/components/sequences/PropertiesPanel';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Save, Loader2, MessageSquare, BarChart3 } from 'lucide-react';
import { SequenceSpec, createEmptySpec, SendSmsNode, WaitNode } from '@/lib/sequences/spec';
import { applyPatchesToSpec } from '@/lib/sequences/patches';

// Pre-defined Veritas SMS sequence based on the specification
function createVeritasSequence(): SequenceSpec {
  const spec = createEmptySpec('Veritas SMS Sequence', 'system');
  spec.trigger.type = 'lead.created';
  
  // Set default variables
  spec.variables = {
    PropertyName: 'Horizontal Parks',
    CalendarLink: 'https://calendly.com/alex-veritasequitypartners/15-minute-intro-call',
  };
  
  const patches = [
    // SMS 1: Day 0 – Immediate (1–3 min after form submit)
    {
      op: 'add' as const,
      path: '/nodes/-',
      value: {
        id: 'sms_1',
        type: 'send_sms',
        content: 'Hi {{FirstName}}, this is Alex with Veritas Equity Partners. You just requested info on the Horizontal Parks multifamily investment. If helpful, you can book a short Zoom to see if it\'s a fit (no obligation): {{CalendarLink}}\n\nIf you\'re no longer interested, all good — reply STOP anytime.',
      } as SendSmsNode,
    },
    {
      op: 'add' as const,
      path: '/ui/positions/sms_1',
      value: { x: 200, y: 100 },
    },
    {
      op: 'add' as const,
      path: '/edges/-',
      value: { from: 'trigger', to: 'sms_1' },
    },
    
    // Wait: 2 hours (for no response check)
    {
      op: 'add' as const,
      path: '/nodes/-',
      value: {
        id: 'wait_1',
        type: 'wait',
        duration: '2 hours',
      } as WaitNode,
    },
    {
      op: 'add' as const,
      path: '/ui/positions/wait_1',
      value: { x: 200, y: 250 },
    },
    {
      op: 'add' as const,
      path: '/edges/-',
      value: { from: 'sms_1', to: 'wait_1' },
    },
    
    // SMS 2: Day 0 – If no response (≈2 hours later)
    {
      op: 'add' as const,
      path: '/nodes/-',
      value: {
        id: 'sms_2',
        type: 'send_sms',
        content: 'For context, our strategy focuses on workforce-housing multifamily. Returns come from cash flow and operational improvements — not speculation. We don\'t guess, we do the math.',
      } as SendSmsNode,
    },
    {
      op: 'add' as const,
      path: '/ui/positions/sms_2',
      value: { x: 200, y: 400 },
    },
    {
      op: 'add' as const,
      path: '/edges/-',
      value: { from: 'wait_1', to: 'sms_2' },
    },
    
    // Wait: 4 more hours (total 6 hours from first SMS)
    {
      op: 'add' as const,
      path: '/nodes/-',
      value: {
        id: 'wait_2',
        type: 'wait',
        duration: '4 hours',
      } as WaitNode,
    },
    {
      op: 'add' as const,
      path: '/ui/positions/wait_2',
      value: { x: 200, y: 550 },
    },
    {
      op: 'add' as const,
      path: '/edges/-',
      value: { from: 'sms_2', to: 'wait_2' },
    },
    
    // SMS 3: Day 0 – If still no response (≈6 hours later)
    {
      op: 'add' as const,
      path: '/nodes/-',
      value: {
        id: 'sms_3',
        type: 'send_sms',
        content: 'Quick note — the Zoom isn\'t a pitch. It\'s just to walk through the deal, risks, and see if it aligns with what you\'re looking for. If useful, here\'s the link: {{CalendarLink}}',
      } as SendSmsNode,
    },
    {
      op: 'add' as const,
      path: '/ui/positions/sms_3',
      value: { x: 200, y: 700 },
    },
    {
      op: 'add' as const,
      path: '/edges/-',
      value: { from: 'wait_2', to: 'sms_3' },
    },
    
    // Wait: Until Day 1
    {
      op: 'add' as const,
      path: '/nodes/-',
      value: {
        id: 'wait_day1',
        type: 'wait',
        duration: '1 day',
      } as WaitNode,
    },
    {
      op: 'add' as const,
      path: '/ui/positions/wait_day1',
      value: { x: 200, y: 850 },
    },
    {
      op: 'add' as const,
      path: '/edges/-',
      value: { from: 'sms_3', to: 'wait_day1' },
    },
    
    // SMS 4: Day 1
    {
      op: 'add' as const,
      path: '/nodes/-',
      value: {
        id: 'sms_4',
        type: 'send_sms',
        content: 'Most people book the call just to confirm whether this makes sense before reviewing docs. If you want clarity first, you can grab a time here: {{CalendarLink}}',
      } as SendSmsNode,
    },
    {
      op: 'add' as const,
      path: '/ui/positions/sms_4',
      value: { x: 200, y: 1000 },
    },
    {
      op: 'add' as const,
      path: '/edges/-',
      value: { from: 'wait_day1', to: 'sms_4' },
    },
    
    // Wait: Until Day 2
    {
      op: 'add' as const,
      path: '/nodes/-',
      value: {
        id: 'wait_day2',
        type: 'wait',
        duration: '1 day',
      } as WaitNode,
    },
    {
      op: 'add' as const,
      path: '/ui/positions/wait_day2',
      value: { x: 200, y: 1150 },
    },
    {
      op: 'add' as const,
      path: '/edges/-',
      value: { from: 'sms_4', to: 'wait_day2' },
    },
    
    // SMS 5: Day 2
    {
      op: 'add' as const,
      path: '/nodes/-',
      value: {
        id: 'sms_5',
        type: 'send_sms',
        content: 'I want to be honest — there are real risks with this deal. If you want to understand each one and how we mitigate them, a quick 10-min call is the best place to do that.',
      } as SendSmsNode,
    },
    {
      op: 'add' as const,
      path: '/ui/positions/sms_5',
      value: { x: 200, y: 1300 },
    },
    {
      op: 'add' as const,
      path: '/edges/-',
      value: { from: 'wait_day2', to: 'sms_5' },
    },
    
    // Wait: Until Day 3
    {
      op: 'add' as const,
      path: '/nodes/-',
      value: {
        id: 'wait_day3',
        type: 'wait',
        duration: '1 day',
      } as WaitNode,
    },
    {
      op: 'add' as const,
      path: '/ui/positions/wait_day3',
      value: { x: 200, y: 1450 },
    },
    {
      op: 'add' as const,
      path: '/edges/-',
      value: { from: 'sms_5', to: 'wait_day3' },
    },
    
    // SMS 6: Day 3
    {
      op: 'add' as const,
      path: '/nodes/-',
      value: {
        id: 'sms_6',
        type: 'send_sms',
        content: 'This investment is structured for long-term, passive capital with a 5–7 year hold. If that fits what you\'re looking for, you can book here: {{CalendarLink}}',
      } as SendSmsNode,
    },
    {
      op: 'add' as const,
      path: '/ui/positions/sms_6',
      value: { x: 200, y: 1600 },
    },
    {
      op: 'add' as const,
      path: '/edges/-',
      value: { from: 'wait_day3', to: 'sms_6' },
    },
    
    // Wait: Until Day 4
    {
      op: 'add' as const,
      path: '/nodes/-',
      value: {
        id: 'wait_day4',
        type: 'wait',
        duration: '1 day',
      } as WaitNode,
    },
    {
      op: 'add' as const,
      path: '/ui/positions/wait_day4',
      value: { x: 200, y: 1750 },
    },
    {
      op: 'add' as const,
      path: '/edges/-',
      value: { from: 'sms_6', to: 'wait_day4' },
    },
    
    // SMS 7: Day 4
    {
      op: 'add' as const,
      path: '/nodes/-',
      value: {
        id: 'sms_7',
        type: 'send_sms',
        content: 'I can walk you through how deals like Horizontal Parks are structured, who they\'re a fit for, and what to expect as a passive investor. Is this something you\'d be interested in?',
      } as SendSmsNode,
    },
    {
      op: 'add' as const,
      path: '/ui/positions/sms_7',
      value: { x: 200, y: 1900 },
    },
    {
      op: 'add' as const,
      path: '/edges/-',
      value: { from: 'wait_day4', to: 'sms_7' },
    },
    
    // Wait: Until Day 9 (5 days)
    {
      op: 'add' as const,
      path: '/nodes/-',
      value: {
        id: 'wait_day9',
        type: 'wait',
        duration: '5 days',
      } as WaitNode,
    },
    {
      op: 'add' as const,
      path: '/ui/positions/wait_day9',
      value: { x: 200, y: 2050 },
    },
    {
      op: 'add' as const,
      path: '/edges/-',
      value: { from: 'sms_7', to: 'wait_day9' },
    },
    
    // SMS 8: Day 9
    {
      op: 'add' as const,
      path: '/nodes/-',
      value: {
        id: 'sms_8',
        type: 'send_sms',
        content: 'Hey {{FirstName}}, should I assume this opportunity isn\'t a fit right now, or would it make sense for a quick chat? Here\'s my link if helpful: {{CalendarLink}}',
      } as SendSmsNode,
    },
    {
      op: 'add' as const,
      path: '/ui/positions/sms_8',
      value: { x: 200, y: 2200 },
    },
    {
      op: 'add' as const,
      path: '/edges/-',
      value: { from: 'wait_day9', to: 'sms_8' },
    },
    
    // Wait: Until Day 13 (4 days)
    {
      op: 'add' as const,
      path: '/nodes/-',
      value: {
        id: 'wait_day13',
        type: 'wait',
        duration: '4 days',
      } as WaitNode,
    },
    {
      op: 'add' as const,
      path: '/ui/positions/wait_day13',
      value: { x: 200, y: 2350 },
    },
    {
      op: 'add' as const,
      path: '/edges/-',
      value: { from: 'sms_8', to: 'wait_day13' },
    },
    
    // SMS 9: Day 13
    {
      op: 'add' as const,
      path: '/nodes/-',
      value: {
        id: 'sms_9',
        type: 'send_sms',
        content: 'Quick heads up — we typically stop taking calls once allocation starts filling. The deal is currently ~86% subscribed. No pressure at all, just wanted to see if it makes sense to connect before it\'s fully allocated.',
      } as SendSmsNode,
    },
    {
      op: 'add' as const,
      path: '/ui/positions/sms_9',
      value: { x: 200, y: 2500 },
    },
    {
      op: 'add' as const,
      path: '/edges/-',
      value: { from: 'wait_day13', to: 'sms_9' },
    },
    
    // Wait: Until Day 20 (7 days)
    {
      op: 'add' as const,
      path: '/nodes/-',
      value: {
        id: 'wait_day20',
        type: 'wait',
        duration: '7 days',
      } as WaitNode,
    },
    {
      op: 'add' as const,
      path: '/ui/positions/wait_day20',
      value: { x: 200, y: 2650 },
    },
    {
      op: 'add' as const,
      path: '/edges/-',
      value: { from: 'sms_9', to: 'wait_day20' },
    },
    
    // SMS 10: Day 20 (Final touch)
    {
      op: 'add' as const,
      path: '/nodes/-',
      value: {
        id: 'sms_10',
        type: 'send_sms',
        content: 'Totally understand if now isn\'t the right time. Would it be okay if I kept you in the loop on future deals and checked back later this year?',
      } as SendSmsNode,
    },
    {
      op: 'add' as const,
      path: '/ui/positions/sms_10',
      value: { x: 200, y: 2800 },
    },
    {
      op: 'add' as const,
      path: '/edges/-',
      value: { from: 'wait_day20', to: 'sms_10' },
    },
    
    // Connect last SMS to end
    {
      op: 'remove' as const,
      path: '/edges/0', // Remove trigger -> end edge
    },
    {
      op: 'add' as const,
      path: '/edges/-',
      value: { from: 'sms_10', to: 'end' },
    },
    
    // Update end position
    {
      op: 'replace' as const,
      path: '/ui/positions/end',
      value: { x: 200, y: 2950 },
    },
  ];
  
  return applyPatchesToSpec(spec, patches);
}

function VeritasSequencePageContent() {
  const searchParams = useSearchParams();
  const { password, setPassword, sequenceId, spec, setSpec, isLoading } = useSequenceStore();
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const key = searchParams.get('key');
    if (key && key !== password) {
      setPassword(key);
    }
  }, [searchParams, setPassword, password]);

  // Initialize with Veritas sequence if not already loaded
  useEffect(() => {
    if (!initialized && password && !spec) {
      const veritasSpec = createVeritasSequence();
      setSpec(veritasSpec);
      setInitialized(true);
    }
  }, [password, spec, initialized, setSpec]);

  const handleSave = async () => {
    if (!spec || !password) return;

    setSaving(true);
    try {
      // Try to find existing Veritas sequence first
      const listResponse = await fetch(
        `/api/sequences?key=${encodeURIComponent(password)}`
      );
      
      let targetSequenceId = sequenceId;
      
      if (listResponse.ok) {
        const responseData = await listResponse.json();
        // Handle both { sequences: [...] } and [...] formats
        const sequences = Array.isArray(responseData) ? responseData : (responseData.sequences || []);
        
        if (Array.isArray(sequences)) {
          const veritasSeq = sequences.find((s: any) => 
            s.name?.toLowerCase().includes('veritas') || 
            s.name?.toLowerCase().includes('sms-veritas')
          );
          if (veritasSeq) {
            targetSequenceId = veritasSeq.id;
          }
        }
      }

      if (targetSequenceId) {
        // Update existing sequence
        const response = await fetch(
          `/api/sequences/${targetSequenceId}/versions?key=${encodeURIComponent(password)}`,
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
          const errorText = await response.text();
          console.error('Save error:', errorText);
          throw new Error(`Failed to save sequence: ${errorText}`);
        }
      } else {
        // Create new sequence
        const response = await fetch(
          `/api/sequences?key=${encodeURIComponent(password)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: 'Veritas SMS Sequence',
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Create error:', errorText);
          throw new Error(`Failed to create sequence: ${errorText}`);
        }

        const data = await response.json();
        if (!data.sequence || !data.sequence.id) {
          throw new Error('Invalid response from server');
        }
        
        // Create initial version
        const versionResponse = await fetch(
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

        if (!versionResponse.ok) {
          const errorText = await versionResponse.text();
          console.error('Version create error:', errorText);
          throw new Error(`Failed to create version: ${errorText}`);
        }
      }
      
      alert('Sequence saved successfully!');
    } catch (error) {
      console.error('Error saving sequence:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      alert(`Failed to save sequence: ${errorMessage.substring(0, 200)}`);
    } finally {
      setSaving(false);
    }
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
              SMS Sequence
            </h1>
          </div>
          <p className="text-gray-600 mb-6 text-center">
            Please provide a password to access the SMS sequence editor.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-font min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/30">
      {/* Modern Header matching Analytics page */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-sm">
        <div className="px-4 lg:px-8 py-4 max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-md">
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
                  Veritas SMS Sequence
                </h1>
                <p className="text-xs text-gray-500 mt-0.5">
                  10-message automated sequence for Horizontal Parks leads
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href={`/admin?key=${encodeURIComponent(password || 'veritas2024admin')}`}>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-gray-200 text-gray-700 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 transition-all duration-200 rounded-lg cursor-pointer"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Back to Analytics
                </Button>
              </Link>
              <Button 
                onClick={handleSave} 
                disabled={!spec || saving || isLoading}
                size="sm"
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-md hover:shadow-lg transition-all duration-200 rounded-lg cursor-pointer"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Sequence
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
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

export default function VeritasSequencePage() {
  return (
    <Suspense fallback={
      <div className="admin-font min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-md">
            <MessageSquare className="h-6 w-6 text-white animate-pulse" />
          </div>
          <p className="text-gray-600">Loading sequence editor...</p>
        </div>
      </div>
    }>
      <VeritasSequencePageContent />
    </Suspense>
  );
}

