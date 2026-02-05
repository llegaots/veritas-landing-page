'use client';

import { useState } from 'react';
import { useSequenceStore } from '@/lib/store/sequence-store';
import { createAddNodePatch, createAddEdgePatch } from '@/lib/sequences/patches';
import { SendSmsNode } from '@/lib/sequences/spec';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, Mail, Plus } from 'lucide-react';

export function NodePalette() {
  const { spec, addSendSmsNode, addSendEmailNode, setSpec } = useSequenceStore();
  const [isOpen, setIsOpen] = useState(true);

  const handleAddNode = (type: 'send_sms' | 'send_email') => {
    if (!spec) {
      console.error('[NodePalette] No spec available, initializing empty spec');
      // Initialize empty spec if it doesn't exist
      const { createEmptySpec } = require('@/lib/sequences/spec');
      const emptySpec = createEmptySpec('New Sequence', 'user');
      setSpec(emptySpec);
      // Wait a bit for spec to be set, then try again
      setTimeout(() => {
        const updatedSpec = useSequenceStore.getState().spec;
        if (updatedSpec) {
          handleAddNode(type);
        } else {
          alert('Failed to initialize sequence. Please refresh the page.');
        }
      }, 100);
      return;
    }

    console.log('[NodePalette] Adding node:', type, 'to spec with', spec.nodes.length, 'nodes');
    
    // Use atomic store action
    const newId = type === 'send_sms' 
      ? addSendSmsNode()
      : addSendEmailNode();
    
    if (!newId) {
      console.error('[NodePalette] Failed to add node');
      alert('Failed to add node. Please check the console for errors.');
    } else {
      console.log('[NodePalette] Successfully added node:', newId);
    }
  };

  if (!spec) {
    return (
      <Card className="absolute top-4 left-4 z-10 w-64 bg-yellow-50 border-yellow-200 shadow-lg">
        <CardContent className="p-3">
          <p className="text-sm text-yellow-800">
            Please initialize a sequence first using the "Initialize" button in the left sidebar.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="absolute top-4 left-4 z-10 cursor-pointer border-gray-200 hover:bg-purple-50 hover:border-purple-300 transition-all duration-200"
        onClick={() => setIsOpen(true)}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Node
      </Button>
    );
  }

  return (
    <Card className="absolute top-4 left-4 z-10 w-48 bg-white border-gray-200 shadow-lg">
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-900">Add Node</h4>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 cursor-pointer hover:bg-gray-100"
            onClick={() => setIsOpen(false)}
          >
            ×
          </Button>
        </div>
        <div className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start cursor-pointer border-gray-200 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 transition-all duration-200"
            onClick={() => handleAddNode('send_sms')}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Send SMS
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start cursor-pointer border-gray-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all duration-200"
            onClick={() => handleAddNode('send_email')}
          >
            <Mail className="h-4 w-4 mr-2" />
            Send Email
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

