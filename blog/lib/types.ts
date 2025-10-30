export type DigestCategory = 'ml_monday' | 'business_wednesday' | 'ethics_friday' | 'data_saturday'

export interface Digest {
  id: string
  title: string
  category: DigestCategory
  published_date: string
  content: Article[]
  status: 'draft' | 'published'
  view_count: number
  linkedin_post_url?: string
  created_at: string
  updated_at: string
  thumbs_up_count?: number
  middle_finger_count?: number
  comment_count?: number
}

export interface Article {
  title: string
  summary: string
  url: string
  source?: string
  published_date?: string
  novelty_score?: number
  applicability_score?: number
  significance_score?: number
}

export interface Comment {
  id: string
  digest_id: string
  parent_comment_id?: string
  author_name: string
  author_email_hash: string
  author_website?: string
  content: string
  approved: boolean
  created_at: string
  edited_at?: string
  replies?: Comment[]
}

export interface Reaction {
  id: string
  digest_id: string
  reaction_type: 'thumbs_up' | 'middle_finger'
  ip_hash: string
  created_at: string
}

export interface Subscriber {
  id: string
  email: string
  verified: boolean
  categories: string[]
  frequency: 'every' | 'weekly' | 'monthly'
  verification_token?: string
  unsubscribe_token: string
  subscribed_at: string
  unsubscribed_at?: string
}

export interface ScraperRun {
  id: string
  status: 'success' | 'failed' | 'skipped'
  posts_scraped?: number
  error_message?: string
  run_at: string
}

