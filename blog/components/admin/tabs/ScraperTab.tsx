'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Eye } from 'lucide-react';

export function ScraperTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>LinkedIn Scraper</CardTitle>
          <CardDescription>
            Manage automated LinkedIn scraping (runs every Sunday 00:00 UTC)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              The scraper automatically pulls posts from{' '}
              <a
                href="https://www.linkedin.com/company/nordic-raven-solutions/posts/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Nordic Raven Solutions LinkedIn
              </a>
              {' '}and saves them as drafts for your review.
            </p>
            
            <div className="flex gap-2">
              <Button variant="outline">
                <Eye className="h-4 w-4 mr-2" />
                View Scraper Logs
              </Button>
              <Button variant="outline">
                <Play className="h-4 w-4 mr-2" />
                Run Scraper Now
              </Button>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-medium mb-2">Last Run</h3>
            <p className="text-sm text-muted-foreground">
              🤖 Scraper status coming soon. View logs, manually trigger runs, and skip scheduled executions.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

