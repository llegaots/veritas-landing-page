'use client';

import { Play } from 'lucide-react';

export function SimpleTriggerNode({ data }: { data: any }) {
  return (
    <div className="min-w-[200px] max-w-[240px] bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl border-2 border-purple-600 shadow-lg">
      <div className="p-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <Play className="h-4 w-4 text-white" />
          </div>
          <div className="font-semibold text-sm text-white">Trigger</div>
        </div>
        <div className="text-xs text-purple-100 mt-1">
          Start
        </div>
      </div>
    </div>
  );
}


