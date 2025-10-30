'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function CommentsTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Comment Moderation</CardTitle>
        <CardDescription>Approve, reject, or delete comments</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          💬 Comment moderation coming soon. All comments require manual approval before appearing on the blog.
        </p>
      </CardContent>
    </Card>
  );
}

