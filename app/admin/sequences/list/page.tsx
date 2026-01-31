'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Edit, Trash2, MessageSquare, BarChart3, Activity } from 'lucide-react';
import Link from 'next/link';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

interface Sequence {
  id: string;
  name: string;
  active_version_id: string | null;
  created_at: string;
  updated_at: string;
  status?: 'active' | 'draft' | 'archived'; // Status from active version
}

function SequencesListContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const password = searchParams.get('key') || 'veritas2024admin';
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSequences();
  }, []);

  const fetchSequences = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/sequences?key=${encodeURIComponent(password)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch sequences');
      }
      const data = await response.json();
      const sequencesList = Array.isArray(data) ? data : (data.sequences || []);
      
      // Fetch status for each sequence
      const sequencesWithStatus = await Promise.all(
        sequencesList.map(async (seq: Sequence) => {
          if (!seq.active_version_id) {
            return { ...seq, status: 'draft' as const };
          }
          try {
            const versionResponse = await fetch(
              `/api/sequences/${seq.id}/versions?key=${encodeURIComponent(password)}&versionId=${seq.active_version_id}`
            );
            if (versionResponse.ok) {
              const versionData = await versionResponse.json();
              const status = versionData.spec?.metadata?.status || 'draft';
              return { ...seq, status };
            }
          } catch (err) {
            console.error('Error fetching version status:', err);
          }
          return { ...seq, status: 'draft' as const };
        })
      );
      
      setSequences(sequencesWithStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sequences');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this sequence?')) return;
    
    try {
      const response = await fetch(
        `/api/sequences?key=${encodeURIComponent(password)}&id=${id}`,
        { method: 'DELETE' }
      );
      if (!response.ok) {
        throw new Error('Failed to delete sequence');
      }
      await fetchSequences(); // Refresh list
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete sequence');
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: 'active' | 'draft' | 'archived' | undefined) => {
    try {
      const response = await fetch(
        `/api/sequences/${id}/toggle-status?key=${encodeURIComponent(password)}`,
        { method: 'PATCH' }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to toggle status');
      }
      await fetchSequences(); // Refresh list
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to toggle sequence status');
    }
  };

  if (loading) {
    return (
      <div className="admin-font min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-md">
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          </div>
          <p className="text-gray-600">Loading sequences...</p>
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
              onClick={fetchSequences}
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
                    SMS Sequences
                  </h1>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {sequences.length} {sequences.length === 1 ? 'sequence' : 'sequences'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 lg:px-8 py-6">
      {sequences.length === 0 ? (
        <Card className="bg-white border-0 shadow-sm rounded-xl">
          <CardContent className="p-8 text-center">
            <p className="text-gray-600 mb-4">No sequences found.</p>
            <Link href={`/admin/sequences?key=${encodeURIComponent(password)}`} className="cursor-pointer">
              <Button className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-md hover:shadow-lg transition-all duration-200 rounded-lg cursor-pointer">
                Create Your First Sequence
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sequences.map((sequence) => (
            <Card 
              key={sequence.id} 
              className="bg-white border-0 shadow-sm rounded-xl hover:shadow-md transition-all duration-200 cursor-pointer"
              onDoubleClick={() => {
                window.location.href = `/admin/sequences?key=${encodeURIComponent(password)}&id=${sequence.id}`;
              }}
            >
              <CardHeader className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold text-gray-900">{sequence.name}</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      Created: {new Date(sequence.created_at).toLocaleDateString()}
                      {sequence.updated_at && (
                        <> • Updated: {new Date(sequence.updated_at).toLocaleDateString()}</>
                      )}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {sequence.status === 'active' ? (
                        <p className="text-xs text-green-600 font-medium">✓ Active</p>
                      ) : (
                        <p className="text-xs text-gray-500 font-medium">○ Draft</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {/* Toggle Switch */}
                    <div className="flex items-center gap-2 mr-2">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sequence.status === 'active'}
                          onChange={() => handleToggleStatus(sequence.id, (sequence.status || 'draft') as 'active' | 'draft' | 'archived')}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                      <span className="text-xs text-gray-600">
                        {sequence.status === 'active' ? 'Active' : 'Draft'}
                      </span>
                    </div>
                    <Link 
                      href={`/admin/sequences?key=${encodeURIComponent(password)}&id=${sequence.id}`}
                      className="cursor-pointer"
                    >
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="border-gray-200 text-gray-700 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 transition-all duration-200 rounded-lg cursor-pointer"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(sequence.id);
                      }}
                      className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-all duration-200 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
        </div>
      </div>
    </div>
  );
}

export default function SequencesListPage() {
  return (
    <Suspense fallback={
      <div className="admin-font min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-md">
            <MessageSquare className="h-6 w-6 text-white animate-pulse" />
          </div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <SequencesListContent />
    </Suspense>
  );
}

