'use client';

import { useEffect, useState, Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  RefreshCw, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  MessageSquare,
  BarChart3,
  Activity,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Send,
  Timer,
  Users,
  Calendar,
  Pause,
  Play
} from 'lucide-react';
import { formatDistanceToNow, format, differenceInSeconds, differenceInMinutes } from 'date-fns';
import { formatDateTimeEST, formatDateOnlyEST, parseAsUTC } from '@/lib/admin/format';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Calendar as CalendarIcon, Filter, X, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

interface SMSReply {
  id: string;
  message_job_id: string;
  phone_number: string;
  message_body: string;
  from_number: string;
  received_at: string;
  provider_message_id: string | null;
  provider_status: string | null;
  investor_id: number | null;
}

interface MessageJob {
  id: string;
  run_id: string;
  node_id: string;
  job_type?: 'sms' | 'email'; // Type of job
  phone_number?: string | null; // For SMS jobs
  message_text?: string | null; // For SMS jobs
  email_address?: string | null; // For email jobs
  email_subject?: string | null; // For email jobs
  email_html?: string | null; // For email jobs
  email_text?: string | null; // For email jobs (plain text fallback)
  scheduled_for: string;
  sent_at: string | null;
  provider_status: string | null;
  error: string | null;
  sequence_name?: string;
  version_number?: number;
  investor_name?: string | null;
  investor_phone?: string | null;
  investor_email?: string | null;
  investor_intent_score?: number;
  timing_accuracy_ms?: number | null;
  timing_status?: 'on-time' | 'early' | 'late' | 'overdue' | 'pending';
  is_anomaly?: boolean;
  replies?: SMSReply[];
  has_replies?: boolean;
  reply_count?: number;
  interactions?: Array<{
    id: string;
    interaction_type: 'reply' | 'stop' | 'calendly_booking';
    message_body?: string | null;
    intent_score_change: number;
    created_at: string;
    metadata?: Record<string, any>;
  }>;
  interaction_count?: number;
  sequence_runs?: {
    lead_id: string;
    investor_id: number | null;
    status: string;
    started_at: string;
    context_jsonb: Record<string, any>;
    sequence_id?: string | null;
  };
}

interface Stats {
  total: number;
  sent: number;
  pending: number;
  overdue: number;
  failed: number;
  anomalies: number;
  on_time: number;
  late: number;
  replied?: number;
}

function MessageJobsContent() {
  const searchParams = useSearchParams();
  const password = searchParams.get('key') || 'veritas2024admin';
  const [jobs, setJobs] = useState<MessageJob[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [runsCount, setRunsCount] = useState<number>(0);
  const [investorsCount, setInvestorsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'sent' | 'failed' | 'replied'>('all');
  const [expandedInvestors, setExpandedInvestors] = useState<Set<string>>(new Set());
  const [expandedEmailPreviews, setExpandedEmailPreviews] = useState<Set<string>>(new Set());
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [availableSources, setAvailableSources] = useState<string[]>([]);
  const [pausingRuns, setPausingRuns] = useState<Set<string>>(new Set());
  const [deletingSequenceIds, setDeletingSequenceIds] = useState<Set<string>>(new Set());

  const handleDeleteSequence = async (sequenceId: string) => {
    if (!confirm('Delete this sequence? This will remove it and all its message jobs.')) return;
    setDeletingSequenceIds((prev) => new Set(prev).add(sequenceId));
    try {
      const res = await fetch(
        `/api/sequences?key=${encodeURIComponent(password)}&id=${sequenceId}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error('Failed to delete');
      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete sequence');
    } finally {
      setDeletingSequenceIds((prev) => {
        const next = new Set(prev);
        next.delete(sequenceId);
        return next;
      });
    }
  };

  useEffect(() => {
    fetchData();
  }, [filter, startDate, endDate, sourceFilter]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        key: password,
        filter: filter,
        limit: '2000',
      });

      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (sourceFilter) params.append('source', sourceFilter);

      const response = await fetch(`/api/admin/message-jobs?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch message jobs');
      }

      const data = await response.json();
      setJobs(Array.isArray(data.jobs) ? data.jobs : []);
      setStats(data.stats || null);
      setRunsCount(data.runs || 0);
      setInvestorsCount(data.investors || 0);
      if (data.availableSources) {
        setAvailableSources(data.availableSources);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setSourceFilter('');
  };

  const hasActiveFilters = startDate || endDate || sourceFilter;

  const pauseSequenceRun = async (runId: string) => {
    setPausingRuns(prev => new Set(prev).add(runId));
    try {
      const response = await fetch(`/api/admin/sequence-runs/${runId}/pause?key=${encodeURIComponent(password)}`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to pause sequence run');
      }
      
      // Refresh data to show updated status
      await fetchData();
    } catch (err) {
      console.error('Error pausing sequence run:', err);
      alert(err instanceof Error ? err.message : 'Failed to pause sequence run');
    } finally {
      setPausingRuns(prev => {
        const next = new Set(prev);
        next.delete(runId);
        return next;
      });
    }
  };

  const resumeSequenceRun = async (runId: string) => {
    setPausingRuns(prev => new Set(prev).add(runId));
    try {
      const response = await fetch(`/api/admin/sequence-runs/${runId}/resume?key=${encodeURIComponent(password)}`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to resume sequence run');
      }
      
      // Refresh data to show updated status
      await fetchData();
    } catch (err) {
      console.error('Error resuming sequence run:', err);
      alert(err instanceof Error ? err.message : 'Failed to resume sequence run');
    } finally {
      setPausingRuns(prev => {
        const next = new Set(prev);
        next.delete(runId);
        return next;
      });
    }
  };

  // Group jobs by investor (or phone number if no investor)
  const jobsByInvestor = useMemo(() => {
    const grouped = new Map<string, { investorId: string | null; investorName: string | null; investorPhone: string | null; investorEmail: string | null; jobs: MessageJob[] }>();
    
    jobs.forEach(job => {
      // Use investor_id if available, otherwise use phone_number or email_address as fallback
      const investorId = job.sequence_runs?.investor_id?.toString() || null;
      const jobType = job.job_type || (job.phone_number ? 'sms' : 'email');
      const groupKey = investorId || job.phone_number || job.email_address || job.id;
      const investorName = job.investor_name || null;
      const investorPhone = job.investor_phone || job.phone_number || null;
      const investorEmail = job.investor_email || job.email_address || null;
      
      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, {
          investorId,
          investorName,
          investorPhone,
          investorEmail,
          jobs: []
        });
      }
      grouped.get(groupKey)!.jobs.push(job);
    });
    
    return grouped;
  }, [jobs]);

  // Sort investors by most recent message
  const sortedInvestors = useMemo(() => {
    return Array.from(jobsByInvestor.entries()).sort((a, b) => {
      const aLatest = Math.max(...a[1].jobs.map(j => parseAsUTC(j.scheduled_for).getTime()));
      const bLatest = Math.max(...b[1].jobs.map(j => parseAsUTC(j.scheduled_for).getTime()));
      return bLatest - aLatest;
    });
  }, [jobsByInvestor]);

  const toggleInvestor = (investorKey: string) => {
    const newExpanded = new Set(expandedInvestors);
    if (newExpanded.has(investorKey)) {
      newExpanded.delete(investorKey);
    } else {
      newExpanded.add(investorKey);
    }
    setExpandedInvestors(newExpanded);
  };

  const toggleEmailPreview = (jobId: string) => {
    const next = new Set(expandedEmailPreviews);
    if (next.has(jobId)) {
      next.delete(jobId);
    } else {
      next.add(jobId);
    }
    setExpandedEmailPreviews(next);
  };

  const formatTiming = (job: MessageJob) => {
    if (!job.timing_accuracy_ms && job.timing_accuracy_ms !== 0) return null;
    const seconds = Math.abs(job.timing_accuracy_ms) / 1000;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const getStatusBadge = (job: MessageJob) => {
    if (job.error) {
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          Failed
        </Badge>
      );
    }
    if (job.sent_at) {
      if (job.timing_status === 'on-time') {
        return (
          <Badge variant="default" className="bg-green-600 gap-1">
            <CheckCircle className="h-3 w-3" />
            Sent (On Time)
          </Badge>
        );
      } else if (job.timing_status === 'late') {
        return (
          <Badge variant="default" className="bg-orange-600 gap-1">
            <AlertCircle className="h-3 w-3" />
            Sent (Late: {formatTiming(job)})
          </Badge>
        );
      } else if (job.timing_status === 'early') {
        return (
          <Badge variant="default" className="bg-blue-600 gap-1">
            <Clock className="h-3 w-3" />
            Sent (Early: {formatTiming(job)})
          </Badge>
        );
      }
      return (
        <Badge variant="default" className="bg-green-600 gap-1">
          <CheckCircle className="h-3 w-3" />
          Sent
        </Badge>
      );
    }
    if (job.timing_status === 'overdue') {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Overdue
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1">
        <Clock className="h-3 w-3" />
        Pending
      </Badge>
    );
  };

  if (loading && jobs.length === 0) {
    return (
      <div className="admin-font min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-md">
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          </div>
          <p className="text-gray-600">Loading message jobs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-font min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/30 flex items-center justify-center p-4">
        <Card className="bg-white border-0 shadow-xl rounded-xl p-8 max-w-md w-full">
          <CardContent className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button 
              onClick={fetchData}
              className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-md hover:shadow-lg transition-all duration-200 rounded-lg cursor-pointer"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="admin-font min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/30 flex">
      <AdminSidebar password={password} />
      
      <div className="flex-1 ml-64 transition-all duration-300">
        {/* Modern Header */}
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-sm">
          <div className="px-4 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-md">
                  <Activity className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
                    SMS Message Logs
                  </h1>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Monitor delivery, timing, and content
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={fetchData}
                  disabled={loading}
                  className="border-gray-200 text-gray-700 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 transition-all duration-200 rounded-lg cursor-pointer"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 lg:px-8 py-6">
        {/* Filters */}
        <Card className="bg-white border-0 shadow-sm mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Filters:</span>
              </div>
              
              {/* Date Range */}
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-gray-500" />
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-40 border-gray-200 rounded-lg"
                  placeholder="Start date"
                />
                <span className="text-gray-400">to</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-40 border-gray-200 rounded-lg"
                  placeholder="End date"
                />
              </div>

              {/* Source Filter */}
              <Select value={sourceFilter || 'all'} onValueChange={(value) => setSourceFilter(value === 'all' ? '' : value)}>
                <SelectTrigger className="w-48 border-gray-200 rounded-lg">
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {availableSources.map((source) => (
                    <SelectItem key={source} value={source}>
                      {source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats Dashboard */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="text-xs text-gray-500 mb-1">Total</div>
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              </CardContent>
            </Card>
            <Card className="bg-white border-0 shadow-sm border-l-4 border-l-green-500">
              <CardContent className="p-4">
                <div className="text-xs text-gray-500 mb-1">Sent</div>
                <div className="text-2xl font-bold text-green-600">{stats.sent}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {stats.total > 0 ? Math.round((stats.sent / stats.total) * 100) : 0}%
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white border-0 shadow-sm border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="text-xs text-gray-500 mb-1">Pending</div>
                <div className="text-2xl font-bold text-blue-600">{stats.pending}</div>
              </CardContent>
            </Card>
            <Card className="bg-white border-0 shadow-sm border-l-4 border-l-red-500">
              <CardContent className="p-4">
                <div className="text-xs text-gray-500 mb-1">Failed</div>
                <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="mb-4 flex gap-2 border-b border-gray-200">
          {(['all', 'pending', 'sent', 'failed', 'replied'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 font-medium capitalize transition-colors ${
                filter === f
                  ? 'border-b-2 border-purple-600 text-purple-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {f === 'replied' ? '💬 Replied' : f}
              {stats && (
                <span className="ml-2 text-xs">
                  ({f === 'all' ? stats.total : 
                    f === 'pending' ? stats.pending : 
                    f === 'sent' ? stats.sent : 
                    f === 'failed' ? stats.failed :
                    stats.replied || 0})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Jobs List - Grouped by Investor */}
        {sortedInvestors.length === 0 ? (
          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-8 text-center">
              <p className="text-gray-600">No message jobs found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sortedInvestors.map(([investorKey, investorData]) => {
              const isExpanded = expandedInvestors.has(investorKey);
              const { investorName, investorPhone, investorEmail, jobs: investorJobs } = investorData;
              const hasAnomalies = investorJobs.some(j => j.is_anomaly);
              // Sort jobs by scheduled_for time (ascending - earliest first)
              // Also sort by run_id to group jobs from the same sequence run together
              const sortedJobs = [...investorJobs].sort((a, b) => {
                // First sort by scheduled_for time
                const timeDiff = parseAsUTC(a.scheduled_for).getTime() - parseAsUTC(b.scheduled_for).getTime();
                if (timeDiff !== 0) return timeDiff;
                // If same time, sort by run_id to keep jobs from same run together
                return a.run_id.localeCompare(b.run_id);
              });
              
              // Get unique sequences for this investor
              const sequences = Array.from(new Set(investorJobs.map(j => j.sequence_name).filter(Boolean)));
              
              // Group by sequence_id: one Pause/Resume/Delete per sequence (investor may be in multiple sequences)
              const sequenceControls = new Map<string, { sequenceId: string; sequenceName: string; runId: string; status: string }>();
              investorJobs.forEach(job => {
                const seqId = job.sequence_runs?.sequence_id;
                const runId = job.run_id;
                const seqName = job.sequence_name || 'Unknown';
                const status = job.sequence_runs?.status || 'active';
                if (!seqId || !runId) return;
                const existing = sequenceControls.get(seqId);
                // Prefer active/paused runs over completed for Pause/Resume controls
                const isActionable = status === 'active' || status === 'paused';
                const existingActionable = existing && (existing.status === 'active' || existing.status === 'paused');
                if (!existing || (isActionable && !existingActionable)) {
                  sequenceControls.set(seqId, { sequenceId: seqId, sequenceName: seqName, runId, status });
                }
              });
              
              // Get intent score and interactions from first job (all jobs have same investor data)
              const firstJob = investorJobs[0];
              const intentScore = firstJob?.investor_intent_score || 0;
              const allInteractions = investorJobs
                .flatMap(j => j.interactions || [])
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
              
              // Count interaction types
              const replyCount = allInteractions.filter(i => i.interaction_type === 'reply').length;
              const stopCount = allInteractions.filter(i => i.interaction_type === 'stop').length;
              const bookingCount = allInteractions.filter(i => i.interaction_type === 'calendly_booking').length;

              return (
                <Card 
                  key={investorKey} 
                  className={`bg-white border-0 shadow-sm transition-all ${
                    hasAnomalies ? 'border-l-4 border-l-orange-500' : ''
                  }`}
                >
                  <CardHeader 
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleInvestor(investorKey)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-lg">
                            {investorName || `Investor (${investorPhone || investorEmail || 'Unknown'})`}
                          </CardTitle>
                          {intentScore > 0 && (
                            <Badge 
                              variant="outline" 
                              className={`gap-1 ${
                                intentScore >= 15 ? 'border-green-500 text-green-700 bg-green-50' :
                                intentScore >= 5 ? 'border-blue-500 text-blue-700 bg-blue-50' :
                                intentScore > 0 ? 'border-yellow-500 text-yellow-700 bg-yellow-50' :
                                'border-gray-500 text-gray-700 bg-gray-50'
                              }`}
                            >
                              <TrendingUp className="h-3 w-3" />
                              Intent: {intentScore.toFixed(1)}
                            </Badge>
                          )}
                          {hasAnomalies && (
                            <Badge variant="destructive" className="gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Issues Detected
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 space-y-1">
                          {investorName && (
                            <p><strong>Name:</strong> {investorName}</p>
                          )}
                          {investorPhone && (
                            <p><strong>Phone:</strong> {investorPhone}</p>
                          )}
                          {investorEmail && (
                            <p><strong>Email:</strong> {investorEmail}</p>
                          )}
                          {!investorPhone && !investorEmail && (
                            <p className="text-gray-400 italic">No contact info</p>
                          )}
                          <p><strong>Messages:</strong> {investorJobs.length} total</p>
                          {sequences.length > 0 && (
                            <p><strong>Sequences:</strong> {sequences.join(', ')}</p>
                          )}
                          <p>
                            <strong>Status:</strong>{' '}
                            {investorJobs.filter(j => j.sent_at).length} sent,{' '}
                            {investorJobs.filter(j => !j.sent_at && parseAsUTC(j.scheduled_for) > new Date()).length} pending,{' '}
                            {investorJobs.filter(j => j.error).length} failed
                            {investorJobs.filter(j => j.has_replies).length > 0 && (
                              <> • <span className="text-blue-600 font-medium">{investorJobs.filter(j => j.has_replies).length} with replies</span></>
                            )}
                          </p>
                          {(replyCount > 0 || stopCount > 0 || bookingCount > 0) && (
                            <p>
                              <strong>Interactions:</strong>{' '}
                              {replyCount > 0 && <span className="text-green-600 font-medium">✓ {replyCount} reply{replyCount !== 1 ? 'ies' : ''}</span>}
                              {stopCount > 0 && <span className="text-red-600 font-medium ml-2">✗ {stopCount} STOP</span>}
                              {bookingCount > 0 && <span className="text-purple-600 font-medium ml-2">📅 {bookingCount} booking{bookingCount !== 1 ? 's' : ''}</span>}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        {/* One Pause/Resume + Delete per unique sequence (investor may be in multiple) */}
                        {Array.from(sequenceControls.values()).map(({ sequenceId, sequenceName, runId, status }) => {
                          const isPaused = status === 'paused';
                          const isPausing = pausingRuns.has(runId);
                          const isDeleting = deletingSequenceIds.has(sequenceId);
                          
                          return (
                            <div
                              key={sequenceId}
                              className="flex items-center gap-2 px-2 py-1 rounded-lg border border-gray-200 bg-gray-50/50"
                            >
                              <span className="text-xs font-medium text-gray-600 truncate max-w-[120px]" title={sequenceName}>
                                {sequenceName}
                              </span>
                              <Button
                                variant={isPaused ? "default" : "outline"}
                                size="sm"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (isPaused) {
                                    await resumeSequenceRun(runId);
                                  } else {
                                    await pauseSequenceRun(runId);
                                  }
                                }}
                                disabled={isPausing}
                                className={isPaused ? "bg-green-600 hover:bg-green-700 text-white shrink-0" : "shrink-0"}
                              >
                                {isPausing ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                ) : isPaused ? (
                                  <Play className="h-4 w-4 mr-1" />
                                ) : (
                                  <Pause className="h-4 w-4 mr-1" />
                                )}
                                {isPaused ? 'Resume' : 'Pause'}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSequence(sequenceId);
                                }}
                                disabled={isDeleting}
                                className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 hover:text-red-700 shrink-0"
                              >
                                {isDeleting ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          );
                        })}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleInvestor(investorKey);
                          }}
                        >
                          {isExpanded ? 'Collapse' : 'Expand'}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  {isExpanded && (
                    <CardContent className="pt-0">
                      {/* Interactions Summary */}
                      {allInteractions.length > 0 && (
                        <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-3">
                            <Activity className="h-5 w-5 text-purple-600" />
                            <h3 className="text-sm font-semibold text-gray-900">Interaction History</h3>
                          </div>
                          <div className="space-y-2">
                            {allInteractions.slice(0, 10).map((interaction) => {
                              const isPositive = interaction.intent_score_change > 0;
                              const isStop = interaction.interaction_type === 'stop';
                              const isBooking = interaction.interaction_type === 'calendly_booking';
                              
                              return (
                                <div
                                  key={interaction.id}
                                  className={`p-3 rounded-lg border ${
                                    isStop ? 'bg-red-50 border-red-200' :
                                    isBooking ? 'bg-purple-50 border-purple-200' :
                                    'bg-green-50 border-green-200'
                                  }`}
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        {isStop && <XCircle className="h-4 w-4 text-red-600" />}
                                        {isBooking && <CalendarIcon className="h-4 w-4 text-purple-600" />}
                                        {!isStop && !isBooking && <CheckCircle className="h-4 w-4 text-green-600" />}
                                        <span className="text-sm font-medium text-gray-900 capitalize">
                                          {isStop ? 'STOP Request' : 
                                           isBooking ? 'Calendly Booking' : 
                                           'SMS Reply'}
                                        </span>
                                        <Badge 
                                          variant="outline" 
                                          className={`text-xs ${
                                            isPositive ? 'border-green-500 text-green-700' : 'border-red-500 text-red-700'
                                          }`}
                                        >
                                          {isPositive ? '+' : ''}{interaction.intent_score_change.toFixed(1)} intent
                                        </Badge>
                                      </div>
                                      {interaction.message_body && (
                                        <p className="text-sm text-gray-700 mt-1">{interaction.message_body}</p>
                                      )}
                                      {isBooking && interaction.metadata?.name && (
                                        <p className="text-sm text-gray-700 mt-1">
                                          <strong>Booked by:</strong> {interaction.metadata.name}
                                          {interaction.metadata.start_time && (
                                            <> • <strong>Date:</strong> {formatDateTimeEST(interaction.metadata.start_time)}</>
                                          )}
                                        </p>
                                      )}
                                      <p className="text-xs text-gray-500 mt-1">
                                        {formatDateTimeEST(interaction.created_at)}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          {allInteractions.length > 10 && (
                            <p className="text-xs text-gray-500 mt-2 text-center">
                              Showing 10 of {allInteractions.length} interactions
                            </p>
                          )}
                        </div>
                      )}
                      
                      <div className="space-y-3">
                        {sortedJobs.map((job) => {
                          const sequenceName = job.sequence_name || 'Unknown Sequence';
                          const scheduled = parseAsUTC(job.scheduled_for);
                          const sent = job.sent_at ? parseAsUTC(job.sent_at) : null;
                          const isOverdue = !sent && scheduled <= new Date();

                          return (
                            <div
                              key={job.id}
                              className={`p-4 rounded-lg border ${
                                job.error ? 'bg-red-50 border-red-200' :
                                isOverdue ? 'bg-orange-50 border-orange-200' :
                                job.timing_status === 'late' ? 'bg-yellow-50 border-yellow-200' :
                                'bg-gray-50 border-gray-200'
                              }`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    {getStatusBadge(job)}
                                    <Badge 
                                      variant="outline" 
                                      className={`text-xs ${
                                        (job.job_type || (job.phone_number ? 'sms' : 'email')) === 'email'
                                          ? 'border-blue-500 text-blue-700 bg-blue-50'
                                          : 'border-purple-500 text-purple-700 bg-purple-50'
                                      }`}
                                    >
                                      {(job.job_type || (job.phone_number ? 'sms' : 'email')) === 'email' ? '📧 Email' : '💬 SMS'}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                      {sequenceName}
                                    </Badge>
                                  </div>
                                  <div className="text-xs text-gray-500 space-y-1">
                                    <p>
                                      <strong>Scheduled:</strong>{' '}
                                      {formatDateTimeEST(scheduled)}
                                    </p>
                                    {sent && (
                                      <p>
                                        <strong>Sent:</strong>{' '}
                                        {formatDateTimeEST(sent)}
                                        {job.timing_accuracy_ms !== null && (
                                          <span className={`ml-2 ${
                                            job.timing_status === 'on-time' ? 'text-green-600' :
                                            job.timing_status === 'late' ? 'text-orange-600' :
                                            'text-blue-600'
                                          }`}>
                                            ({job.timing_status === 'late' ? '+' : ''}{formatTiming(job)})
                                          </span>
                                        )}
                                      </p>
                                    )}
                                    {!sent && isOverdue && (
                                      <p className="text-orange-600 font-medium">
                                        Overdue by {formatDistanceToNow(scheduled)}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {/* Message Content - SMS or Email */}
                              {job.job_type === 'email' ? (
                                <div className="mt-3">
                                  <button
                                    type="button"
                                    onClick={() => toggleEmailPreview(job.id)}
                                    className="flex items-center gap-2 w-full text-left p-3 bg-white rounded border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                                  >
                                    {expandedEmailPreviews.has(job.id) ? (
                                      <ChevronDown className="h-4 w-4 text-gray-500 shrink-0" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 text-gray-500 shrink-0" />
                                    )}
                                    <span className="text-sm font-medium text-gray-700">Email preview</span>
                                    {!expandedEmailPreviews.has(job.id) && job.email_subject && (
                                      <span className="text-sm text-gray-500 truncate"> — {job.email_subject}</span>
                                    )}
                                  </button>
                                  {expandedEmailPreviews.has(job.id) && (
                                    <div className="mt-2 space-y-3 p-3 bg-white rounded border border-gray-200 border-t-0">
                                      <div>
                                        <p className="text-sm font-medium text-gray-700 mb-1">Subject:</p>
                                        <p className="text-sm text-gray-900">
                                          {job.email_subject || <span className="text-gray-400 italic">No subject</span>}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium text-gray-700 mb-1">HTML Content:</p>
                                        <div 
                                          className="text-sm text-gray-900 prose prose-sm max-w-none"
                                          dangerouslySetInnerHTML={{ __html: job.email_html || '' }}
                                        />
                                        {job.email_html && (
                                          <p className="text-xs text-gray-400 mt-2">
                                            {job.email_html.length} characters (HTML)
                                          </p>
                                        )}
                                      </div>
                                      {job.email_text && (
                                        <div className="p-3 bg-gray-50 rounded border border-gray-200">
                                          <p className="text-sm font-medium text-gray-700 mb-1">Plain Text:</p>
                                          <p className="text-sm text-gray-900 whitespace-pre-wrap">
                                            {job.email_text}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="mt-3 p-3 bg-white rounded border border-gray-200">
                                  <p className="text-sm font-medium text-gray-700 mb-1">Message:</p>
                                  <p className="text-sm text-gray-900 whitespace-pre-wrap">
                                    {job.message_text || <span className="text-gray-400 italic">No message</span>}
                                  </p>
                                  {job.message_text && (
                                    <p className="text-xs text-gray-400 mt-2">
                                      {job.message_text.length} characters
                                    </p>
                                  )}
                                </div>
                              )}
                              {job.error && (
                                <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded">
                                  <p className="text-xs font-medium text-red-800 mb-1">Error:</p>
                                  <p className="text-xs text-red-700">{job.error}</p>
                                </div>
                              )}
                              {job.provider_status && (
                                <div className="mt-2 text-xs text-gray-500">
                                  <strong>Provider Status:</strong> {job.provider_status}
                                </div>
                              )}
                              
                              {/* Replies Section */}
                              {job.has_replies && job.replies && job.replies.length > 0 && (
                                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                  <div className="flex items-center gap-2 mb-2">
                                    <MessageSquare className="h-4 w-4 text-blue-600" />
                                    <p className="text-sm font-medium text-blue-800">
                                      Replies ({job.reply_count})
                                    </p>
                                  </div>
                                  <div className="space-y-2">
                                    {job.replies.map((reply: SMSReply) => (
                                      <div key={reply.id} className="bg-white p-2 rounded border border-blue-100">
                                        <p className="text-sm text-gray-900">{reply.message_body}</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                          {formatDateTimeEST(reply.received_at)}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

function MessageJobsPage() {
  return (
    <Suspense fallback={
      <div className="admin-font min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-md">
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          </div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <MessageJobsContent />
    </Suspense>
  );
}

export default MessageJobsPage;
