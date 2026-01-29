'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface Sequence {
  id: string;
  name: string;
  active_version_id: string | null;
  created_at: string;
  updated_at: string;
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
      setSequences(sequencesList);
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

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <Card className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading sequences...</p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-8">
        <Card className="p-8 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchSequences}>Retry</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="admin-font container mx-auto p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">SMS Sequences</h1>
          <p className="text-muted-foreground mt-2">
            Manage your automated SMS sequences
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/admin/sequences?key=${encodeURIComponent(password)}`}>
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Builder
            </Button>
          </Link>
          <Link href={`/admin/sequences/jobs?key=${encodeURIComponent(password)}`}>
            <Button variant="outline">
              View Jobs
            </Button>
          </Link>
          <Link href={`/admin/sms-veritas?key=${encodeURIComponent(password)}`}>
            <Button>
              Veritas Sequence
            </Button>
          </Link>
        </div>
      </div>

      {sequences.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground mb-4">No sequences found.</p>
            <Link href={`/admin/sequences?key=${encodeURIComponent(password)}`}>
              <Button>Create Your First Sequence</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sequences.map((sequence) => (
            <Card key={sequence.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{sequence.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Created: {new Date(sequence.created_at).toLocaleDateString()}
                      {sequence.updated_at && (
                        <> • Updated: {new Date(sequence.updated_at).toLocaleDateString()}</>
                      )}
                    </p>
                    {sequence.active_version_id && (
                      <p className="text-xs text-green-600 mt-1">✓ Active Version</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/admin/sequences?key=${encodeURIComponent(password)}&id=${sequence.id}`}>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(sequence.id)}
                      className="text-red-600 hover:text-red-700"
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

      <div className="mt-8 p-4 bg-muted rounded-lg">
        <h3 className="font-semibold mb-2">💡 How to Verify in Supabase:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
          <li>Open Supabase Dashboard → Table Editor</li>
          <li>Check the <code className="bg-background px-1 rounded">sequences</code> table - you should see your sequence</li>
          <li>Check the <code className="bg-background px-1 rounded">sequence_versions</code> table - you should see the version with the full spec</li>
          <li>The <code className="bg-background px-1 rounded">spec_jsonb</code> column contains the full sequence definition</li>
        </ol>
      </div>
    </div>
  );
}

export default function SequencesListPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto p-8">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Loading...</p>
        </Card>
      </div>
    }>
      <SequencesListContent />
    </Suspense>
  );
}

