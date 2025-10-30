'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import type { Digest } from '@/lib/types';

export function DigestsTab() {
  const [digests, setDigests] = useState<Digest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'draft' | 'published'>('all');

  useEffect(() => {
    fetchDigests();
  }, [filter]);

  async function fetchDigests() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/digests?status=${filter}`);
      const data = await res.json();
      setDigests(data.digests || []);
    } catch (error) {
      console.error('Error fetching digests:', error);
    } finally {
      setLoading(false);
    }
  }

  async function togglePublish(id: string, currentStatus: string) {
    const newStatus = currentStatus === 'published' ? 'draft' : 'published';
    
    try {
      await fetch(`/api/admin/digests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchDigests();
    } catch (error) {
      console.error('Error updating digest:', error);
    }
  }

  async function deleteDigest(id: string) {
    if (!confirm('Are you sure you want to delete this digest?')) return;
    
    try {
      await fetch(`/api/admin/digests/${id}`, { method: 'DELETE' });
      fetchDigests();
    } catch (error) {
      console.error('Error deleting digest:', error);
    }
  }

  const filteredDigests = digests.filter(d => {
    if (filter === 'all') return true;
    return d.status === filter;
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Digest Management</CardTitle>
          <CardDescription>
            Review scraped LinkedIn posts and publish to the blog
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filter Buttons */}
          <div className="flex gap-2 mb-6">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All ({digests.length})
            </Button>
            <Button
              variant={filter === 'draft' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('draft')}
            >
              Drafts ({digests.filter(d => d.status === 'draft').length})
            </Button>
            <Button
              variant={filter === 'published' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('published')}
            >
              Published ({digests.filter(d => d.status === 'published').length})
            </Button>
          </div>

          {/* Digests List */}
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : filteredDigests.length === 0 ? (
            <p className="text-muted-foreground">No digests found</p>
          ) : (
            <div className="space-y-4">
              {filteredDigests.map((digest) => (
                <div
                  key={digest.id}
                  className="border rounded-lg p-4 flex items-start justify-between gap-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium">{digest.title}</h3>
                      <Badge variant={digest.status === 'published' ? 'default' : 'secondary'}>
                        {digest.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {digest.published_date} • {digest.content.length} articles • {digest.view_count} views
                    </p>
                    {digest.linkedin_post_url && (
                      <a
                        href={digest.linkedin_post_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        View on LinkedIn →
                      </a>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/digest/${digest.id}`, '_blank')}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => togglePublish(digest.id, digest.status)}
                    >
                      {digest.status === 'published' ? (
                        <XCircle className="h-4 w-4" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteDigest(digest.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

