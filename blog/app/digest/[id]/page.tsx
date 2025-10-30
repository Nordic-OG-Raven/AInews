import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Calendar, ExternalLink, ArrowLeft, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { getDigestById } from '@/lib/db/digests';
import { getCommentsByDigestId } from '@/lib/db/comments';
import type { DigestCategory } from '@/lib/types';

const CATEGORY_COLORS: Record<DigestCategory, string> = {
  ml_monday: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  business_wednesday: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  ethics_friday: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  data_saturday: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
};

const CATEGORY_LABELS: Record<DigestCategory, string> = {
  ml_monday: "ML Monday",
  business_wednesday: "Business Wednesday",
  ethics_friday: "Ethics Friday",
  data_saturday: "Data Saturday",
};

export default async function DigestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const digest = await getDigestById(id);

  if (!digest) {
    notFound();
  }

  const comments = await getCommentsByDigestId(id);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Back Button */}
      <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" />
        Back to all digests
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Badge className={CATEGORY_COLORS[digest.category]} variant="secondary">
            {CATEGORY_LABELS[digest.category]}
          </Badge>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {new Date(digest.published_date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
          <span className="text-sm text-muted-foreground">
            {digest.view_count} views
          </span>
        </div>

        <h1 className="text-4xl font-bold mb-4">{digest.title}</h1>

        {/* Reactions */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1">
              <ThumbsUp className="h-4 w-4" />
              {digest.thumbs_up_count || 0}
            </Button>
            <Button variant="outline" size="sm" className="gap-1">
              <ThumbsDown className="h-4 w-4" />
              {digest.middle_finger_count || 0}
            </Button>
          </div>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex gap-2">
            <Button variant="ghost" size="sm">Share</Button>
          </div>
        </div>
      </div>

      {/* Articles */}
      <div className="space-y-6 mb-12">
        {digest.content.map((article, index) => (
          <Card key={index}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl font-bold text-muted-foreground">
                      {index + 1}
                    </span>
                    <CardTitle className="text-xl">{article.title}</CardTitle>
                  </div>
                  {article.source && (
                    <p className="text-sm text-muted-foreground">
                      Source: {article.source}
                    </p>
                  )}
                </div>
                <Link
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0"
                >
                  <Button variant="outline" size="sm" className="gap-1">
                    <ExternalLink className="h-4 w-4" />
                    Read
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{article.summary}</p>
              
              {/* Quality Scores */}
              {(article.novelty_score || article.applicability_score || article.significance_score) && (
                <div className="mt-4 flex gap-4 text-sm">
                  {article.novelty_score && (
                    <div>
                      <span className="text-muted-foreground">Novelty:</span>{' '}
                      <span className="font-medium">{article.novelty_score}/10</span>
                    </div>
                  )}
                  {article.applicability_score && (
                    <div>
                      <span className="text-muted-foreground">Applicability:</span>{' '}
                      <span className="font-medium">{article.applicability_score}/10</span>
                    </div>
                  )}
                  {article.significance_score && (
                    <div>
                      <span className="text-muted-foreground">Significance:</span>{' '}
                      <span className="font-medium">{article.significance_score}/10</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* LinkedIn Post Link */}
      {digest.linkedin_post_url && (
        <div className="mb-8">
          <Link
            href={digest.linkedin_post_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline inline-flex items-center gap-1"
          >
            View original post on LinkedIn
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Comments Section */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-6">
          Comments ({digest.comment_count || 0})
        </h2>
        
        {comments.length === 0 ? (
          <p className="text-muted-foreground">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          <div className="space-y-6">
            {comments.map((comment) => (
              <div key={comment.id} className="border-l-2 border-border pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium">{comment.author_name}</span>
                  <span className="text-sm text-muted-foreground">
                    {new Date(comment.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-muted-foreground mb-2">{comment.content}</p>
                
                {/* Replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="mt-4 ml-6 space-y-4">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="border-l-2 border-border pl-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium">{reply.author_name}</span>
                          <span className="text-sm text-muted-foreground">
                            {new Date(reply.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-muted-foreground">{reply.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* TODO: Add comment form */}
        <div className="mt-8 p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            💬 Comment functionality coming soon! All comments require moderation.
          </p>
        </div>
      </div>
    </div>
  );
}

