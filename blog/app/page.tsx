import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Calendar, ThumbsUp, MessageCircle } from "lucide-react";
import Link from "next/link";

// TODO: Replace with actual data from Supabase
const MOCK_DIGESTS = [
  {
    id: "1",
    title: "ML Monday - Latest Advances in Neural Architecture",
    category: "ml_monday",
    published_date: "2025-10-27",
    excerpt: "Exploring breakthrough developments in transformer architectures and efficient training methods...",
    view_count: 234,
    thumbs_up_count: 18,
    comment_count: 5,
  },
  {
    id: "2",
    title: "Data Saturday - Time Series Analysis Techniques",
    category: "data_saturday",
    published_date: "2025-10-25",
    excerpt: "Advanced statistical methods for forecasting and anomaly detection in temporal data...",
    view_count: 189,
    thumbs_up_count: 14,
    comment_count: 3,
  },
  {
    id: "3",
    title: "Ethics Friday - AI Bias and Fairness in Production",
    category: "ethics_friday",
    published_date: "2025-10-24",
    excerpt: "Examining real-world cases of algorithmic bias and strategies for building fair ML systems...",
    view_count: 156,
    thumbs_up_count: 22,
    comment_count: 8,
  },
];

const CATEGORY_COLORS = {
  ml_monday: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  business_wednesday: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  ethics_friday: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  data_saturday: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
};

const CATEGORY_LABELS = {
  ml_monday: "ML Monday",
  business_wednesday: "Business Wednesday",
  ethics_friday: "Ethics Friday",
  data_saturday: "Data Saturday",
};

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-12">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          AI News, Curated by AI
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          High-quality AI/ML news digests filtered by a sophisticated multi-agent system. 
          Only the most relevant articles, delivered 4 times a week.
        </p>
        
        {/* Email Subscribe Form */}
        <div className="max-w-md mx-auto mb-8">
          <form className="flex gap-2">
            <Input 
              type="email" 
              placeholder="Enter your email" 
              className="flex-1"
            />
            <Button type="submit">Subscribe</Button>
          </form>
          <p className="text-sm text-muted-foreground mt-2">
            Join our mailing list for weekly digests. Unsubscribe anytime.
          </p>
        </div>

        {/* Category Badges */}
        <div className="flex flex-wrap justify-center gap-2">
          <Badge variant="outline" className="text-sm">ML Engineering</Badge>
          <Badge variant="outline" className="text-sm">Business & Industry</Badge>
          <Badge variant="outline" className="text-sm">Ethics & Policy</Badge>
          <Badge variant="outline" className="text-sm">Data Science</Badge>
        </div>
      </div>

      {/* Search Bar */}
      <div className="max-w-2xl mx-auto mb-12">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input 
            type="search" 
            placeholder="Search digests..." 
            className="pl-10"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        <Button variant="default" size="sm">All</Button>
        <Button variant="outline" size="sm">ML Monday</Button>
        <Button variant="outline" size="sm">Business Wednesday</Button>
        <Button variant="outline" size="sm">Ethics Friday</Button>
        <Button variant="outline" size="sm">Data Saturday</Button>
      </div>

      {/* Digest Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {MOCK_DIGESTS.map((digest) => (
          <Link key={digest.id} href={`/digest/${digest.id}`}>
            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Badge 
                    className={CATEGORY_COLORS[digest.category as keyof typeof CATEGORY_COLORS]}
                    variant="secondary"
                  >
                    {CATEGORY_LABELS[digest.category as keyof typeof CATEGORY_LABELS]}
                  </Badge>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {new Date(digest.published_date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                </div>
                <CardTitle className="text-lg">{digest.title}</CardTitle>
                <CardDescription>{digest.excerpt}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <ThumbsUp className="h-4 w-4" />
                    <span>{digest.thumbs_up_count}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageCircle className="h-4 w-4" />
                    <span>{digest.comment_count}</span>
                  </div>
                  <div className="ml-auto">
                    {digest.view_count} views
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Load More */}
      <div className="text-center mt-12">
        <Button variant="outline" size="lg">
          Load More Digests
        </Button>
      </div>
    </div>
  );
}
