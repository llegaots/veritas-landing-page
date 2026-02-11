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
import { Calendar as CalendarIcon, Filter, X, ChevronDown, ChevronRight, Trash2, Mail } from 'lucide-react';
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
    created_at: string;
    context_jsonb: Record<string, any>;
    sequence_id?: string | null;
  };
}

interface TypeStats {
  total: number;
  sent: number;
  pending: number;
  failed: number;
  replied?: number;
}

interface Stats {
  sms?: TypeStats;
  email?: TypeStats;
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
  const [jobTypeFilter, setJobTypeFilter] = useState<'all' | 'sms' | 'email'>('all');
  const [sequenceFilter, setSequenceFilter] = useState<string>('');
  const [availableSources, setAvailableSources] = useState<string[]>([]);
  const [availableSequences, setAvailableSequences] = useState<{ id: string; name: string }[]>([]);
  const [pausingRuns, setPausingRuns] = useState<Set<string>>(new Set());
  const [deletingSequenceIds, setDeletingSequenceIds] = useState<Set<string>>(new Set());
  const [investorMessageFilter, setInvestorMessageFilter] = useState<Map<string, 'all' | 'email' | 'sms' | 'scheduled' | 'failed'>>(new Map());
  const [expandedMessageIds, setExpandedMessageIds] = useState<Set<string>>(new Set());

  const handleArchiveSequenceRun = async (runId: string, sequenceId: string) => {
    if (!confirm('Archive this sequence for this investor? It will be hidden from the list but all data will be preserved in the database.')) return;
    
    // Set loading state ONLY for this specific sequence/run combination
    const loadingKey = `${runId}-${sequenceId}`;
    setDeletingSequenceIds((prev) => new Set(prev).add(loadingKey));
    
    try {
      const res = await fetch(
        `/api/admin/sequence-runs/${runId}/archive?key=${encodeURIComponent(password)}`,
        { method: 'PATCH' }
      );
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to archive sequence run');
      }
      
      // Refresh data to get updated list (API will filter out archived runs)
      // This ensures we only hide the sequence for this specific investor
      await fetchData();
      
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to archive sequence run');
      // On error, refresh to get correct state
      await fetchData();
    } finally {
      // Clear loading state
      setDeletingSequenceIds((prev) => {
        const next = new Set(prev);
        next.delete(loadingKey);
        return next;
      });
    }
  };

  useEffect(() => {
    fetchData();
  }, [filter, startDate, endDate, sourceFilter, jobTypeFilter, sequenceFilter]);

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
      if (jobTypeFilter !== 'all') params.append('jobType', jobTypeFilter);
      if (sequenceFilter) params.append('sequenceId', sequenceFilter);

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
      if (data.availableSequences) {
        setAvailableSequences(data.availableSequences);
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
    setJobTypeFilter('all');
    setSequenceFilter('');
  };

  const hasActiveFilters = startDate || endDate || sourceFilter || jobTypeFilter !== 'all' || sequenceFilter;

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
  // Also filter out jobs from archived sequences (client-side backup filter)
  const jobsByInvestor = useMemo(() => {
    const grouped = new Map<string, { investorId: string | null; investorName: string | null; investorPhone: string | null; investorEmail: string | null; investorCreatedAt: string | null; jobs: MessageJob[] }>();
    
    // Use all jobs - API already filters out archived sequences
    // No client-side filtering needed - trust the API
    jobs.forEach(job => {
      // Use investor_id if available, otherwise use phone_number or email_address as fallback
      const investorId = job.sequence_runs?.investor_id?.toString() || null;
      const jobType = job.job_type || (job.phone_number ? 'sms' : 'email');
      const groupKey = investorId || job.phone_number || job.email_address || job.id;
      const investorName = job.investor_name || null;
      const investorPhone = job.investor_phone || job.phone_number || null;
      const investorEmail = job.investor_email || job.email_address || null;
      const investorCreatedAt = job.sequence_runs?.created_at || null;
      
      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, {
          investorId,
          investorName,
          investorPhone,
          investorEmail,
          investorCreatedAt,
          jobs: []
        });
      }
      grouped.get(groupKey)!.jobs.push(job);
    });
    
    return grouped;
  }, [jobs]);

  // Sort investors by most recent (when they were added - earliest sequence_run created_at)
  // Also filter by date range if provided
  const sortedInvestors = useMemo(() => {
    let filtered = Array.from(jobsByInvestor.entries());
    
    // Filter by date range (investor creation date)
    if (startDate || endDate) {
      filtered = filtered.filter(([_, investorData]) => {
        if (!investorData.investorCreatedAt) return false;
        const createdAt = parseAsUTC(investorData.investorCreatedAt);
        const start = startDate ? parseAsUTC(startDate) : null;
        const end = endDate ? parseAsUTC(endDate + 'T23:59:59') : null;
        
        if (start && createdAt < start) return false;
        if (end && createdAt > end) return false;
        return true;
      });
    }
    
    // Sort by most recent first (earliest sequence_run created_at for each investor)
    return filtered.sort((a, b) => {
      const aCreated = a[1].investorCreatedAt ? parseAsUTC(a[1].investorCreatedAt).getTime() : 0;
      const bCreated = b[1].investorCreatedAt ? parseAsUTC(b[1].investorCreatedAt).getTime() : 0;
      return bCreated - aCreated; // Most recent first
    });
  }, [jobsByInvestor, startDate, endDate]);

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
      return `${minutes}m`;
    }
    return `${secs}s`;
  };

  // New standardized status system (4 states)
  const getMessageStatus = (job: MessageJob): { status: 'sent' | 'scheduled' | 'sending' | 'failed'; isLate: boolean; lateBy?: string } => {
    if (job.error) {
      return { status: 'failed', isLate: false };
    }
    if (job.sent_at) {
      const isLate = job.timing_status === 'late';
      return { 
        status: 'sent', 
        isLate, 
        lateBy: isLate ? formatTiming(job) || undefined : undefined 
      };
    }
    if (job.provider_status === 'queued' || job.provider_status === 'sending') {
      return { status: 'sending', isLate: false };
    }
    return { status: 'scheduled', isLate: false };
  };

  const getJobType = (job: MessageJob): 'email' | 'sms' => {
    return (job.job_type || (job.phone_number ? 'sms' : 'email')) as 'email' | 'sms';
  };

  const toggleMessageExpansion = (jobId: string) => {
    const next = new Set(expandedMessageIds);
    if (next.has(jobId)) {
      next.delete(jobId);
    } else {
      next.add(jobId);
    }
    setExpandedMessageIds(next);
  };

  const convertTextToHtmlForPreview = (text: string): string => {
    // This should mirror the logic in lib/email/provider.ts for text-to-HTML conversion
    let textHtml = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    const paragraphs = textHtml.split(/\n{2,}/);
    const formattedParagraphs = paragraphs.map(para => {
      const trimmed = para.trim();
      if (!trimmed) return '';
      const withBreaks = trimmed.replace(/\n/g, '<br>');
      return `<p style="margin: 0 0 1em 0; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #333333;">${withBreaks}</p>`;
    }).filter(Boolean);

    return formattedParagraphs.join('\n');
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

              {/* Job Type Filter */}
              <Select value={jobTypeFilter} onValueChange={(v: 'all' | 'sms' | 'email') => setJobTypeFilter(v)}>
                <SelectTrigger className="w-36 border-gray-200 rounded-lg">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="sms">SMS Only</SelectItem>
                  <SelectItem value="email">Email Only</SelectItem>
                </SelectContent>
              </Select>

              {/* Sequence Filter */}
              <Select value={sequenceFilter || 'all'} onValueChange={(value) => setSequenceFilter(value === 'all' ? '' : value)}>
                <SelectTrigger className="w-52 border-gray-200 rounded-lg">
                  <SelectValue placeholder="All Sequences" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sequences</SelectItem>
                  {availableSequences.map((seq) => (
                    <SelectItem key={seq.id} value={seq.id}>
                      {seq.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

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

        {/* Stats Dashboard - Split by SMS and Email, static regardless of tab */}
        {stats && (
          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-700">SMS</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="bg-white border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="text-xs text-gray-500 mb-1">Total</div>
                  <div className="text-2xl font-bold text-gray-900">{stats.sms?.total ?? 0}</div>
                </CardContent>
              </Card>
              <Card className="bg-white border-0 shadow-sm border-l-4 border-l-green-500">
                <CardContent className="p-4">
                  <div className="text-xs text-gray-500 mb-1">Sent</div>
                  <div className="text-2xl font-bold text-green-600">{stats.sms?.sent ?? 0}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {(stats.sms?.total ?? 0) > 0 ? Math.round(((stats.sms?.sent ?? 0) / (stats.sms?.total ?? 1)) * 100) : 0}%
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white border-0 shadow-sm border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <div className="text-xs text-gray-500 mb-1">Pending</div>
                  <div className="text-2xl font-bold text-blue-600">{stats.sms?.pending ?? 0}</div>
                </CardContent>
              </Card>
              <Card className="bg-white border-0 shadow-sm border-l-4 border-l-red-500">
                <CardContent className="p-4">
                  <div className="text-xs text-gray-500 mb-1">Failed</div>
                  <div className="text-2xl font-bold text-red-600">{stats.sms?.failed ?? 0}</div>
                </CardContent>
              </Card>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Email</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="bg-white border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="text-xs text-gray-500 mb-1">Total</div>
                  <div className="text-2xl font-bold text-gray-900">{stats.email?.total ?? 0}</div>
                </CardContent>
              </Card>
              <Card className="bg-white border-0 shadow-sm border-l-4 border-l-green-500">
                <CardContent className="p-4">
                  <div className="text-xs text-gray-500 mb-1">Sent</div>
                  <div className="text-2xl font-bold text-green-600">{stats.email?.sent ?? 0}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {(stats.email?.total ?? 0) > 0 ? Math.round(((stats.email?.sent ?? 0) / (stats.email?.total ?? 1)) * 100) : 0}%
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white border-0 shadow-sm border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <div className="text-xs text-gray-500 mb-1">Pending</div>
                  <div className="text-2xl font-bold text-blue-600">{stats.email?.pending ?? 0}</div>
                </CardContent>
              </Card>
              <Card className="bg-white border-0 shadow-sm border-l-4 border-l-red-500">
                <CardContent className="p-4">
                  <div className="text-xs text-gray-500 mb-1">Failed</div>
                  <div className="text-2xl font-bold text-red-600">{stats.email?.failed ?? 0}</div>
                </CardContent>
              </Card>
            </div>
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

              // Calculate stats for this investor
              const sentCount = investorJobs.filter(j => j.sent_at).length;
              const pendingCount = investorJobs.filter(j => !j.sent_at && parseAsUTC(j.scheduled_for) > new Date()).length;
              const failedCount = investorJobs.filter(j => j.error).length;
              
              // Calculate channel-specific stats
              const emailJobs = investorJobs.filter(j => getJobType(j) === 'email');
              const smsJobs = investorJobs.filter(j => getJobType(j) === 'sms');
              const emailSent = emailJobs.filter(j => j.sent_at && !j.error).length;
              const emailFailed = emailJobs.filter(j => j.error).length;
              const smsSent = smsJobs.filter(j => j.sent_at && !j.error).length;
              const smsFailed = smsJobs.filter(j => j.error).length;
              const smsScheduled = smsJobs.filter(j => !j.sent_at && !j.error && parseAsUTC(j.scheduled_for) > new Date()).length;
              
              // Get investor-level message filter
              const messageFilter = investorMessageFilter.get(investorKey) || 'all';
              
              // Filter jobs based on investor-level filter
              let filteredJobs = sortedJobs;
              if (messageFilter === 'email') {
                filteredJobs = sortedJobs.filter(j => getJobType(j) === 'email');
              } else if (messageFilter === 'sms') {
                filteredJobs = sortedJobs.filter(j => getJobType(j) === 'sms');
              } else if (messageFilter === 'scheduled') {
                filteredJobs = sortedJobs.filter(j => !j.sent_at && !j.error && parseAsUTC(j.scheduled_for) > new Date());
              } else if (messageFilter === 'failed') {
                filteredJobs = sortedJobs.filter(j => j.error);
              }

              // Calculate sequence progress (sent / total)
              const progressSent = sentCount;
              const progressTotal = investorJobs.length;
              const progressPercent = progressTotal > 0 ? (progressSent / progressTotal) * 100 : 0;

              return (
                <Card 
                  key={investorKey} 
                  className="bg-white border-0 shadow-sm transition-all cursor-pointer hover:shadow-md"
                    onClick={() => toggleInvestor(investorKey)}
                  >
                  {/* Compact Investor Header */}
                  <CardHeader className="pb-3 cursor-pointer">
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: Name and Stats */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-3">
                          <CardTitle className="text-lg font-semibold">
                            {investorName || `Investor (${investorPhone || investorEmail || 'Unknown'})`}
                          </CardTitle>
                        </div>
                        
                        {/* Compact Stats Row */}
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                          <span><strong>{investorJobs.length}</strong> Messages</span>
                          <span><strong>{sentCount}</strong> Sent</span>
                          <span><strong>{pendingCount}</strong> Pending</span>
                          {failedCount > 0 && <span className="text-red-600"><strong>{failedCount}</strong> Failed</span>}
                        </div>
                        
                        {/* Contact Info Row */}
                        <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                          {investorPhone && <span>{investorPhone}</span>}
                          {investorEmail && <span>{investorEmail}</span>}
                          {sequences.length > 0 && (
                            <span>Sequences: {sequences.join(', ')}</span>
                          )}
                        </div>
                        
                        {/* Channel Status Chips - Only show if there's activity */}
                        {(emailSent > 0 || smsSent > 0) && (
                          <div className="flex items-center gap-2 mb-2">
                            {emailSent > 0 && (
                              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-medium">
                                <Mail className="h-3 w-3" />
                                Email: {emailSent} sent{emailFailed > 0 ? ` / ${emailFailed} failed` : ''}
                              </span>
                            )}
                            {smsSent > 0 && (
                              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200/60 font-medium">
                                <MessageSquare className="h-3 w-3" />
                                SMS: {smsSent} sent{smsFailed > 0 ? ` / ${smsFailed} failed` : ''}
                              </span>
                            )}
                          </div>
                        )}
                        
                        {/* Sequence Progress Bar */}
                        {progressTotal > 0 && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                              <span>Sequence Progress</span>
                              <span>{progressSent} / {progressTotal}</span>
                      </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-purple-600 h-2 rounded-full transition-all"
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Right: Sequence Controls */}
                      <div className="flex items-center gap-2 flex-wrap shrink-0">
                        {Array.from(sequenceControls.values()).map(({ sequenceId, sequenceName, runId, status }) => {
                          const isPaused = status === 'paused';
                          const isPausing = pausingRuns.has(runId);
                          const loadingKey = `${runId}-${sequenceId}`;
                          const isDeleting = deletingSequenceIds.has(loadingKey);
                          
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
                                className={`${isPaused ? "bg-green-600 hover:bg-green-700 text-white" : ""} shrink-0 cursor-pointer`}
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
                                  handleArchiveSequenceRun(runId, sequenceId);
                                }}
                                disabled={isDeleting}
                                className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 hover:text-red-700 shrink-0 cursor-pointer"
                                title="Archive this sequence for this investor (preserves data, hides from view)"
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
                          className="cursor-pointer"
                        >
                          {isExpanded ? 'Collapse' : 'Expand'}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  {isExpanded && (
                    <CardContent className="pt-0">
                      {/* Filter Controls */}
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {(['all', 'email', 'sms', 'scheduled', 'failed'] as const).map((f) => (
                            <button
                              key={f}
                              onClick={(e) => {
                                e.stopPropagation();
                                const next = new Map(investorMessageFilter);
                                next.set(investorKey, f);
                                setInvestorMessageFilter(next);
                              }}
                              className={`px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                                messageFilter === f
                                  ? 'bg-purple-100 text-purple-700 border border-purple-300'
                                  : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                              }`}
                            >
                              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                          ))}
                                      </div>
                        <div className="text-xs text-gray-500">
                          Showing {filteredJobs.length} of {sortedJobs.length} messages
                                    </div>
                                  </div>
                      
                      {/* Timeline View */}
                      <div className="relative pl-6 border-l-2 border-gray-200">
                        {filteredJobs.map((job, index) => {
                          const scheduled = parseAsUTC(job.scheduled_for);
                          const sent = job.sent_at ? parseAsUTC(job.sent_at) : null;
                          const messageStatus = getMessageStatus(job);
                          const jobType = getJobType(job);
                          const isExpanded = expandedMessageIds.has(job.id);
                          const timeStr = formatDateTimeEST(sent || scheduled);

                          return (
                            <div key={job.id} className="relative mb-4 last:mb-0">
                              {/* Timeline Dot */}
                              <div className="absolute -left-[21px] top-1">
                                {messageStatus.status === 'sent' ? (
                                  <div className="w-4 h-4 rounded-full bg-green-600 border-2 border-white shadow-sm" />
                                ) : messageStatus.status === 'failed' ? (
                                  <div className="w-4 h-4 rounded-full bg-red-600 border-2 border-white shadow-sm flex items-center justify-center">
                                    <XCircle className="h-2.5 w-2.5 text-white" />
                                  </div>
                                ) : (
                                  <div className="w-4 h-4 rounded-full border-2 border-gray-400 bg-white shadow-sm" />
                                )}
                              </div>
                              
                              {/* Timeline Content */}
                              <div className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                                <div className="p-3">
                                  {/* Header Row */}
                                  <div className="flex items-start justify-between gap-3 mb-2">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        {/* Channel Badge */}
                                        <span className={`text-xs px-2 py-0.5 rounded ${
                                          jobType === 'email' 
                                            ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                                            : 'bg-purple-50 text-purple-700 border border-purple-200'
                                        }`}>
                                          {jobType === 'email' ? '📧 EMAIL' : '💬 SMS'}
                                        </span>
                                        
                                        {/* Status */}
                                        <span className={`text-xs font-medium ${
                                          messageStatus.status === 'sent' ? 'text-green-700' :
                                          messageStatus.status === 'failed' ? 'text-red-700' :
                                          messageStatus.status === 'sending' ? 'text-yellow-700' :
                                          'text-gray-700'
                                        }`}>
                                          {messageStatus.status === 'sent' ? 'Sent' :
                                           messageStatus.status === 'failed' ? 'Failed' :
                                           messageStatus.status === 'sending' ? 'Sending' :
                                           'Scheduled'}
                                        </span>
                                        
                                        {/* Late Indicator */}
                                        {messageStatus.isLate && messageStatus.lateBy && (
                                          <span className="text-xs text-red-600 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                                            Late {messageStatus.lateBy}
                                          </span>
                                    )}
                                  </div>
                                      
                                      {/* Time - Show both scheduled and sent times */}
                                      <div className="text-xs text-gray-500 space-y-0.5">
                                        <div>
                                          Scheduled: {formatDateTimeEST(scheduled)}
                                        </div>
                                        {sent && (
                                          <div>
                                            Sent: {formatDateTimeEST(sent)}
                                          </div>
                                        )}
                                      </div>
                                      
                                      {/* Email Subject or SMS Preview */}
                                      {jobType === 'email' && job.email_subject && (
                                        <div className="text-sm text-gray-900 mt-1 font-medium">
                                          Subject: {job.email_subject}
                              </div>
                                      )}
                                      {jobType === 'sms' && job.message_text && (
                                        <div className="text-sm text-gray-700 mt-1 line-clamp-2">
                                          {job.message_text.substring(0, 100)}{job.message_text.length > 100 ? '...' : ''}
                                        </div>
                                      )}
                                    </div>
                                    
                                    {/* Expand/Collapse Button */}
                                  <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleMessageExpansion(job.id);
                                      }}
                                      className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                                    >
                                      {isExpanded ? (
                                        <ChevronDown className="h-4 w-4" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4" />
                                    )}
                                  </button>
                                  </div>
                                  
                                  {/* Provider Status (subtext) */}
                                  {job.provider_status && (
                                    <div className="text-xs text-gray-400 mt-1">
                                      Provider: {job.provider_status}
                                    </div>
                                  )}
                                  
                                  {/* Expanded Content */}
                                  {isExpanded && (
                                    <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
                                      {/* Email Content */}
                                      {jobType === 'email' && (
                                        <>
                                          {job.email_subject && (
                                      <div>
                                              <p className="text-xs font-medium text-gray-700 mb-1">Subject:</p>
                                              <p className="text-sm text-gray-900">{job.email_subject}</p>
                                      </div>
                                          )}
                                          {job.email_html && (
                                      <div>
                                              <p className="text-xs font-medium text-gray-700 mb-2">Content:</p>
                                              <div 
                                                className="text-sm text-gray-900 prose prose-sm max-w-none border border-gray-200 rounded p-3 bg-gray-50"
                                                dangerouslySetInnerHTML={{ __html: job.email_html }}
                                              />
                                        </div>
                                      )}
                                          {job.email_text && !job.email_html && (
                                            <div>
                                              <p className="text-xs font-medium text-gray-700 mb-2">Content:</p>
                                              <div 
                                                className="text-sm text-gray-900 border border-gray-200 rounded p-3 bg-gray-50"
                                                dangerouslySetInnerHTML={{ __html: convertTextToHtmlForPreview(job.email_text) }}
                                              />
                                    </div>
                                  )}
                                        </>
                                      )}
                                      
                                      {/* SMS Content */}
                                      {jobType === 'sms' && job.message_text && (
                                        <div>
                                          <p className="text-xs font-medium text-gray-700 mb-2">Message:</p>
                                          <div className="text-sm text-gray-900 whitespace-pre-wrap border border-gray-200 rounded p-3 bg-gray-50">
                                            {job.message_text}
                                          </div>
                                </div>
                              )}
                                      
                                      {/* Error */}
                              {job.error && (
                                        <div className="p-2 bg-red-50 border border-red-200 rounded">
                                  <p className="text-xs font-medium text-red-800 mb-1">Error:</p>
                                  <p className="text-xs text-red-700">{job.error}</p>
                                </div>
                              )}
                              
                                      {/* Replies */}
                              {job.has_replies && job.replies && job.replies.length > 0 && (
                                        <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                                  <div className="flex items-center gap-2 mb-2">
                                    <MessageSquare className="h-4 w-4 text-blue-600" />
                                            <p className="text-xs font-medium text-blue-800">
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
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Interactions Summary (Collapsible) */}
                      {allInteractions.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-gray-200">
                          <div className="flex items-center gap-2 mb-3">
                            <Activity className="h-4 w-4 text-purple-600" />
                            <h3 className="text-sm font-semibold text-gray-900">Interaction History</h3>
                          </div>
                          <div className="space-y-2">
                            {allInteractions.slice(0, 5).map((interaction) => {
                              const isStop = interaction.interaction_type === 'stop';
                              const isBooking = interaction.interaction_type === 'calendly_booking';
                              
                              return (
                                <div
                                  key={interaction.id}
                                  className={`p-2 rounded border text-xs ${
                                    isStop ? 'bg-red-50 border-red-200' :
                                    isBooking ? 'bg-purple-50 border-purple-200' :
                                    'bg-green-50 border-green-200'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    {isStop && <XCircle className="h-3 w-3 text-red-600" />}
                                    {isBooking && <CalendarIcon className="h-3 w-3 text-purple-600" />}
                                    {!isStop && !isBooking && <CheckCircle className="h-3 w-3 text-green-600" />}
                                    <span className="font-medium">
                                      {isStop ? 'STOP' : isBooking ? 'Booking' : 'Reply'}
                                    </span>
                                    <span className="text-gray-500">
                                      {formatDateTimeEST(interaction.created_at)}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
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
