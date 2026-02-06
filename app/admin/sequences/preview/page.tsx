'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  RefreshCw,
  MessageSquare,
  Mail,
  Clock,
  Zap,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Database,
  GitBranch,
  Play,
} from 'lucide-react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { formatDateTimeEST } from '@/lib/admin/format';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DebugData {
  ok: boolean;
  error?: string;
  tables: Record<string, number>;
  sequences: Array<{ id: string; name: string; active_version_id: string | null }>;
  activeSequences: Array<{
    id: string;
    name: string;
    status: string;
    triggerType: string;
    nodes: number;
    filters?: Record<string, unknown>;
  }>;
  recentEvents: Array<{ id: string; type: string; created_at: string; processing_status?: string }>;
  recentRuns: Array<{ id: string; lead_id: string; status: string; created_at: string }>;
  recentJobs: Array<{
    id: string;
    job_type: string;
    phone_number?: string;
    scheduled_for: string;
    sent_at: string | null;
    error: string | null;
  }>;
  recentInvestors: Array<{ id: number; investor_name: string; phone_number?: string; status?: string; source?: string }>;
  flow: { triggerUrl: string; webhookUrl: string; expectedFlow: string[] };
  checklist: {
    sequencesExist: boolean;
    hasActiveSequence: boolean;
    hasRuns: boolean;
    hasJobs: boolean;
    hasRecentEvents: boolean;
    hasRecentInvestors: boolean;
  };
}

interface PreviewJob {
  run_id: string;
  node_id: string;
  job_type: 'sms' | 'email';
  message_text?: string;
  email_subject?: string;
  scheduled_for: string;
}

function DebugContent() {
  const searchParams = useSearchParams();
  const password = searchParams.get('key') || 'veritas2024admin';
  const [debugData, setDebugData] = useState<DebugData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sequences, setSequences] = useState<{ id: string; name: string }[]>([]);
  const [selectedSequenceId, setSelectedSequenceId] = useState<string>('');
  const [previewResult, setPreviewResult] = useState<{
    jobs: PreviewJob[];
    sequenceName: string;
    summary: { total: number; sms: number; email: number };
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testPhone, setTestPhone] = useState('+15551234567');

  const fetchDebug = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/debug-sms-flow?key=${encodeURIComponent(password)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch');
      setDebugData(data);
      if (data.sequences?.length > 0) {
        setSequences(data.sequences);
        if (!selectedSequenceId) setSelectedSequenceId(data.sequences[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load debug data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebug();
  }, []);

  const runPreview = async () => {
    if (!selectedSequenceId) return;
    setPreviewLoading(true);
    setPreviewResult(null);
    try {
      const res = await fetch(
        `/api/admin/sequence-preview?key=${encodeURIComponent(password)}&sequenceId=${selectedSequenceId}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Preview failed');
      setPreviewResult(data);
    } catch {
      setPreviewResult(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const runTestLead = async () => {
    setTestLoading(true);
    try {
      const res = await fetch(`/api/admin/test-lead?key=${encodeURIComponent(password)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: testPhone, lead_id: `debug_${Date.now()}` }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Test failed');
      alert('Test lead sent. Refresh debug to see new runs/jobs.');
      await fetchDebug();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Test failed');
    } finally {
      setTestLoading(false);
    }
  };

  const Check = ({ ok }: { ok: boolean }) =>
    ok ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-600" />;

  return (
    <div className="admin-font min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/30 flex">
      <AdminSidebar password={password} />
      <div className="flex-1 ml-64 transition-all duration-300">
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-sm">
          <div className="px-4 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-amber-600 to-orange-700 bg-clip-text text-transparent">
                    SMS Flow Debug
                  </h1>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Database state, flow logic, and diagnostics
                  </p>
                </div>
              </div>
              <Button onClick={fetchDebug} disabled={loading} variant="outline" size="sm">
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        <div className="px-4 lg:px-8 py-6 space-y-6">
          {error && (
            <Card className="bg-red-50 border-red-200">
              <CardContent className="py-4">
                <p className="text-red-700 font-medium">{error}</p>
              </CardContent>
            </Card>
          )}

          {loading && !debugData && (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
            </div>
          )}

          {debugData && (
            <>
              {/* Checklist */}
              <Card className="bg-white border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <GitBranch className="h-4 w-4" />
                    Flow checklist
                  </CardTitle>
                  <p className="text-sm text-gray-500">
                    What must be true for message_jobs to appear
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50">
                      <Check ok={debugData.checklist.sequencesExist} />
                      <span className="text-sm">Sequences exist</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50">
                      <Check ok={debugData.checklist.hasActiveSequence} />
                      <span className="text-sm">Active sequence (lead.created)</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50">
                      <Check ok={debugData.checklist.hasRecentInvestors} />
                      <span className="text-sm">Investors in DB</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50">
                      <Check ok={debugData.checklist.hasRuns} />
                      <span className="text-sm">Sequence runs created</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50">
                      <Check ok={debugData.checklist.hasJobs} />
                      <span className="text-sm">Message jobs created</span>
                    </div>
                  </div>
                  {!debugData.checklist.hasJobs && (
                    <p className="mt-3 text-sm text-amber-700 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      If runs/jobs are 0: ensure the Supabase trigger on investors INSERT calls{' '}
                      <code className="text-xs bg-gray-100 px-1 rounded">{debugData.flow.triggerUrl}</code>
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Database tables */}
              <Card className="bg-white border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Database tables
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(debugData.tables || {}).map(([table, count]) => (
                      <Badge
                        key={table}
                        variant={count === 0 ? 'outline' : 'default'}
                        className={count === 0 ? 'border-amber-300 text-amber-800' : ''}
                      >
                        {table}: {count}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Active sequences */}
              <Card className="bg-white border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Active sequences</CardTitle>
                  <p className="text-sm text-gray-500">
                    Sequences with active_version_id and spec.status = active
                  </p>
                </CardHeader>
                <CardContent>
                  {debugData.activeSequences?.length === 0 ? (
                    <p className="text-gray-500">No active sequences. Toggle status to Active in Sequence Builder.</p>
                  ) : (
                    <div className="space-y-2">
                      {debugData.activeSequences?.map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center gap-3 p-3 rounded-lg border bg-gray-50"
                        >
                          <Badge
                            variant={s.status === 'active' ? 'default' : 'outline'}
                            className={s.status === 'active' ? 'bg-green-600' : ''}
                          >
                            {s.status}
                          </Badge>
                          <span className="font-medium">{s.name}</span>
                          <span className="text-sm text-gray-500">Trigger: {s.triggerType}</span>
                          <span className="text-sm text-gray-500">{s.nodes} nodes</span>
                          {s.filters && Object.keys(s.filters).length > 0 && (
                            <span className="text-xs text-amber-600">Filters: {JSON.stringify(s.filters)}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Test lead */}
              <Card className="bg-white border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Play className="h-4 w-4" />
                    Test lead creation
                  </CardTitle>
                  <p className="text-sm text-gray-500">
                    Calls lead.created directly. Creates run + jobs if sequence is active.
                  </p>
                </CardHeader>
                <CardContent className="flex flex-wrap items-end gap-3">
                  <div className="space-y-1">
                    <Label className="text-sm">Phone</Label>
                    <Input
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      className="w-40"
                      placeholder="+15551234567"
                    />
                  </div>
                  <Button onClick={runTestLead} disabled={testLoading}>
                    {testLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Send test lead
                  </Button>
                </CardContent>
              </Card>

              {/* Recent data */}
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="bg-white border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-sm">Recent runs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {debugData.recentRuns?.length === 0 ? (
                      <p className="text-gray-500 text-sm">No runs</p>
                    ) : (
                      <div className="space-y-1 text-sm">
                        {debugData.recentRuns?.slice(0, 5).map((r) => (
                          <div key={r.id} className="flex justify-between">
                            <span className="truncate">{r.lead_id}</span>
                            <Badge variant="outline" className="text-xs">{r.status}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card className="bg-white border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-sm">Recent message_jobs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {debugData.recentJobs?.length === 0 ? (
                      <p className="text-gray-500 text-sm">No jobs</p>
                    ) : (
                      <div className="space-y-2 text-sm">
                        {debugData.recentJobs?.slice(0, 5).map((j) => (
                          <div key={j.id} className="flex justify-between items-center">
                            <span>{j.job_type} → {j.phone_number || '—'}</span>
                            <span className="text-xs text-gray-500">
                              {j.sent_at ? 'Sent' : j.error ? 'Failed' : 'Pending'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Sequence preview (compiler test) */}
              <Card className="bg-white border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Compiler preview</CardTitle>
                  <p className="text-sm text-gray-500">
                    What jobs would be created for a sequence (dry run)
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="space-y-1 min-w-[180px]">
                      <Label className="text-sm">Sequence</Label>
                      <Select value={selectedSequenceId} onValueChange={setSelectedSequenceId}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {sequences.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={runPreview} disabled={previewLoading || !selectedSequenceId}>
                      {previewLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Run preview
                    </Button>
                  </div>
                  {previewResult && (
                    <div className="mt-4 space-y-2">
                      <p className="text-sm text-gray-600">
                        {previewResult.sequenceName}: {previewResult.summary.total} jobs ({previewResult.summary.sms} SMS, {previewResult.summary.email} email)
                      </p>
                      {previewResult.jobs.length > 0 && (
                        <div className="space-y-2">
                          {previewResult.jobs.map((job, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-3 p-2 rounded bg-gray-50 text-sm"
                            >
                              <Badge variant="outline" className="shrink-0">
                                {job.job_type === 'sms' ? <MessageSquare className="h-3 w-3 mr-1" /> : <Mail className="h-3 w-3 mr-1" />}
                                {job.job_type}
                              </Badge>
                              <span className="text-gray-600">{formatDateTimeEST(job.scheduled_for)}</span>
                              <span className="truncate text-gray-500">
                                {job.job_type === 'sms' ? job.message_text?.slice(0, 50) : job.email_subject}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SequencePreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="admin-font min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
        </div>
      }
    >
      <DebugContent />
    </Suspense>
  );
}
