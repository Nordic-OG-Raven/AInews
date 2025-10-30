'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function AnalyticsTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Analytics Dashboard</CardTitle>
        <CardDescription>View engagement metrics and statistics</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          📊 Analytics dashboard coming soon. Track page views, reactions, comments, and subscriber growth.
        </p>
      </CardContent>
    </Card>
  );
}

