'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useSequenceStore } from '@/lib/store/sequence-store';
import { SequenceDiagram } from '@/components/sequences/SequenceDiagram';
import { PropertiesPanel } from '@/components/sequences/PropertiesPanel';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Save, Loader2 } from 'lucide-react';
import { SequenceSpec, createEmptySpec, SendSmsNode, WaitNode } from '@/lib/sequences/spec';
import { applyPatchesToSpec } from '@/lib/sequences/patches';

// Pre-defined Veritas SMS sequence based on the specification
function createVeritasSequence(): SequenceSpec {
  const spec = createEmptySpec('Veritas SMS Sequence', 'system');
  spec.trigger.type = 'lead.created';
  
  const patches = [
    // SMS 1: Day 0 immediate (1-3 min)
    {
      op: 'add' as const,
      path: '/nodes/-',
      value: {
        id: 'sms_1',
        type: 'send_sms',
        content: 'Hi {{FirstName}}, this is Alex with Veritas Equity Partners. You just requested info on the {{PropertyName}} multifamily investment opportunity. I\'d love to walk you through the deal and see if it aligns with your investment goals. Are you available for a quick 15-min call this week?',
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
    
    // SMS 2: Day 0 If no response (2 hours)
    {
      op: 'add' as const,
      path: '/nodes/-',
      value: {
        id: 'sms_2',
        type: 'send_sms',
        content: 'For context, our strategy focuses on workforce-housing multifamily. Returns are driven by cash flow and operational improvements. If you\'re interested in learning more, I can send you the deal memo and we can schedule a call.',
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
    
    // SMS 3: Day 0 If no response (6 hours)
    {
      op: 'add' as const,
      path: '/nodes/-',
      value: {
        id: 'sms_3',
        type: 'send_sms',
        content: 'Quick note here, the Zoom isn\'t a pitch. It\'s just to walkthrough the deal, risks and see if it aligns with what you\'re looking for. If it\'s not a fit, no worries at all. Would a quick call work?',
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
        content: 'Most people book the call just to confirm whether this makes sense before spending time reviewing docs. If you want clarity first, happy to jump on a quick call. Does that work?',
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
        content: 'I want to be honest, there are real risks with this deal. If you want to understand each specifically and how I mitigate them, just book a call. No pressure, just transparency.',
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
        content: 'This investment is structured for long-term, passive capital, with an expected hold period in the 5-7 year range. If that sounds like what you\'re looking for, let\'s chat.',
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
        content: 'I can walk you through how deals like {{PropertyName}} are structured, who they\'re a fit for, and what to expect as a passive investor. Interested in a quick call?',
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
        content: 'Hey {{FirstName}}, should I assume this opportunity isn\'t a fit for you right now or would it make sense for a quick chat? Here\'s my calendar if helpful: [link]',
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
        content: 'Quick heads up, we typically stop taking calls once allocation starts filling. The deal is currently 86% subscribed. No pressure, just wanted to give you a heads up in case you wanted to chat before then.',
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
    
    // SMS 10: Day 20
    {
      op: 'add' as const,
      path: '/nodes/-',
      value: {
        id: 'sms_10',
        type: 'send_sms',
        content: 'Totally understand if now isn\'t the right time. Would it be okay if I kept you in the loop on future deals and events and checked in periodically?',
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
      
      // Check if it's a missing table error
      if (errorMessage.includes("Could not find the table") || 
          errorMessage.includes("public.sequences") ||
          errorMessage.includes("schema cache")) {
        alert(
          '❌ DATABASE TABLES NOT FOUND!\n\n' +
          'You need to create the tables in Supabase first.\n\n' +
          'QUICK SETUP:\n' +
          '1. Open: https://supabase.com/dashboard\n' +
          '2. Select your project\n' +
          '3. Go to: SQL Editor (left sidebar)\n' +
          '4. Click: "New Query"\n' +
          '5. Open file: supabase-sequences-schema.sql (in project root)\n' +
          '6. Copy ALL contents (Cmd+A, Cmd+C)\n' +
          '7. Paste into Supabase SQL Editor\n' +
          '8. Click "Run" (or Cmd+Enter)\n' +
          '9. Wait for "Success"\n' +
          '10. Refresh this page\n\n' +
          'See SETUP_SEQUENCES.md for detailed instructions.'
        );
      } else {
        alert(`Failed to save sequence: ${errorMessage.substring(0, 200)}`);
      }
    } finally {
      setSaving(false);
    }
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
    <div className="admin-font h-screen flex flex-col">
      {/* Toolbar */}
      <div className="border-b p-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Veritas SMS Sequence</h1>
          <p className="text-sm text-muted-foreground mt-1">
            10-step automated SMS sequence for new leads. Click nodes to edit messages and timing.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/admin/sequences/list?key=${encodeURIComponent(password || 'veritas2024admin')}`}>
            <Button variant="outline" disabled={isLoading}>
              View All Sequences
            </Button>
          </Link>
          <Button onClick={handleSave} disabled={!spec || saving || isLoading}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Save Sequence
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
      <div className="container mx-auto p-8">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Loading...</p>
        </Card>
      </div>
    }>
      <VeritasSequencePageContent />
    </Suspense>
  );
}

