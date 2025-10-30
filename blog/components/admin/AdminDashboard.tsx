'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { DigestsTab } from './tabs/DigestsTab';
import { CommentsTab } from './tabs/CommentsTab';
import { SubscribersTab } from './tabs/SubscribersTab';
import { AnalyticsTab } from './tabs/AnalyticsTab';
import { ScraperTab } from './tabs/ScraperTab';

export function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await fetch('/api/admin/logout', { method: 'POST' });
    router.refresh();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Button variant="outline" onClick={handleLogout} disabled={loading}>
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>

      <Tabs defaultValue="digests" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="digests">Digests</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
          <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="scraper">Scraper</TabsTrigger>
        </TabsList>

        <TabsContent value="digests">
          <DigestsTab />
        </TabsContent>

        <TabsContent value="comments">
          <CommentsTab />
        </TabsContent>

        <TabsContent value="subscribers">
          <SubscribersTab />
        </TabsContent>

        <TabsContent value="analytics">
          <AnalyticsTab />
        </TabsContent>

        <TabsContent value="scraper">
          <ScraperTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

