'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function SubscribersTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscriber Management</CardTitle>
        <CardDescription>View and manage email subscribers</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          📧 Subscriber management coming soon. View, export, and manage your email list.
        </p>
      </CardContent>
    </Card>
  );
}

