'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface MessageJob {
  id: string;
  run_id: string;
  node_id: string;
  phone_number: string;
  message_text: string;
  scheduled_for: string;
  sent_at: string | null;
  provider_status: string | null;
  error: string | null;
}

interface SequenceRun {
  id: string;
  sequence_version_id: string;
  lead_id: string;
  status: string;
  started_at: string;
  context_jsonb: Record<string, any>;
}

function MessageJobsContent() {
  const searchParams = useSearchParams();
  const password = searchParams.get('key') || 'veritas2024admin';
  const [jobs, setJobs] = useState<MessageJob[]>([]);
  const [runs, setRuns] = useState<SequenceRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'sent' | 'failed'>('all');

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [jobsRes, runsRes] = await Promise.all([
        fetch(`/api/admin/message-jobs?key=${encodeURIComponent(password)}&filter=${filter}`),
        fetch(`/api/admin/sequence-runs?key=${encodeURIComponent(password)}`),
      ]);

      if (!jobsRes.ok) {
        throw new Error('Failed to fetch message jobs');
      }
      if (!runsRes.ok) {
        throw new Error('Failed to fetch sequence runs');
      }

      const jobsData = await jobsRes.json();
      const runsData = await runsRes.json();

      setJobs(Array.isArray(jobsData) ? jobsData : (jobsData.jobs || []));
      setRuns(Array.isArray(runsData) ? runsData : (runsData.runs || []));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const getJobStatus = (job: MessageJob) => {
    if (job.error) return 'failed';
    if (job.sent_at) return 'sent';
    if (new Date(job.scheduled_for) <= new Date()) return 'due';
    return 'pending';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'due':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getRunForJob = (runId: string) => {
    return runs.find((r) => r.id === runId);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <Card className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading message jobs...</p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-8">
        <Card className="p-8 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchData}>Retry</Button>
        </Card>
      </div>
    );
  }

  const filteredJobs = filter === 'all' 
    ? jobs 
    : jobs.filter((job) => {
        const status = getJobStatus(job);
        return filter === 'pending' ? status === 'pending' || status === 'due'
          : filter === status;
      });

  return (
    <div className="admin-font container mx-auto p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Message Jobs</h1>
          <p className="text-muted-foreground mt-2">
            View scheduled and sent SMS messages
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/admin/sequences/list?key=${encodeURIComponent(password)}`}>
            <Button variant="outline">
              Back to Sequences
            </Button>
          </Link>
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mb-4 flex gap-2 border-b">
        {(['all', 'pending', 'sent', 'failed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 font-medium capitalize ${
              filter === f
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {f} ({f === 'all' ? jobs.length : jobs.filter((j) => {
              const s = getJobStatus(j);
              return f === 'pending' ? s === 'pending' || s === 'due' : s === f;
            }).length})
          </button>
        ))}
      </div>

      {filteredJobs.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No message jobs found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredJobs.map((job) => {
            const status = getJobStatus(job);
            const run = getRunForJob(job.run_id);
            const scheduledDate = new Date(job.scheduled_for);
            const isOverdue = scheduledDate < new Date() && !job.sent_at;

            return (
              <Card key={job.id} className={isOverdue ? 'border-orange-500' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(status)}
                        <CardTitle className="text-lg capitalize">{status}</CardTitle>
                        {isOverdue && (
                          <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                            Overdue
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>
                          <strong>To:</strong> {job.phone_number}
                        </p>
                        <p>
                          <strong>Scheduled:</strong>{' '}
                          {format(scheduledDate, 'PPpp')} (
                          {formatDistanceToNow(scheduledDate, { addSuffix: true })})
                        </p>
                        {job.sent_at && (
                          <p>
                            <strong>Sent:</strong>{' '}
                            {format(new Date(job.sent_at), 'PPpp')}
                          </p>
                        )}
                        {job.provider_status && (
                          <p>
                            <strong>Provider Status:</strong> {job.provider_status}
                          </p>
                        )}
                        {run && (
                          <p>
                            <strong>Run ID:</strong> {run.id.substring(0, 8)}...
                            {' '}
                            <strong>Lead:</strong> {run.lead_id}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-sm font-medium mb-1">Message:</p>
                    <p className="text-sm whitespace-pre-wrap">{job.message_text}</p>
                  </div>
                  {job.error && (
                    <div className="mt-3 bg-red-50 border border-red-200 p-3 rounded-lg">
                      <p className="text-sm font-medium text-red-800 mb-1">Error:</p>
                      <p className="text-sm text-red-700">{job.error}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="mt-8 p-4 bg-muted rounded-lg">
        <h3 className="font-semibold mb-2">💡 How to Test:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
          <li>Use mock provider: Set <code className="bg-background px-1 rounded">SMS_PROVIDER=mock</code> in .env.local</li>
          <li>Trigger a test lead: POST to <code className="bg-background px-1 rounded">/api/events/lead.created</code> with test data</li>
          <li>Manually run cron: GET <code className="bg-background px-1 rounded">/api/cron/send-due-messages</code> (in dev mode)</li>
          <li>Check Supabase: View <code className="bg-background px-1 rounded">message_jobs</code> table for all scheduled messages</li>
        </ol>
      </div>
    </div>
  );
}

export default function MessageJobsPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto p-8">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Loading...</p>
        </Card>
      </div>
    }>
      <MessageJobsContent />
    </Suspense>
  );
}

