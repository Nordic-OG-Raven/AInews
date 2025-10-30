export type DigestCategory = 'ml_monday' | 'tech_tuesday' | 'web_wednesday' | 'thought_thursday' | 'fun_friday';

export interface Article {
  title: string;
  url: string;
  summary: string;
  source: string;
}

export interface Digest {
  id: string;
  title: string;
  category: DigestCategory;
  published_date: string;
  articles: Article[];
  view_count: number;
  status: 'draft' | 'published';
  created_at: string;
  updated_at: string;
  thumbs_up?: number;
  middle_finger?: number;
  comment_count?: number;
}

export interface Comment {
  id: string;
  digest_id: string;
  parent_comment_id: string | null;
  author_name: string;
  author_email_hash: string;
  author_website: string | null;
  content: string;
  approved: boolean;
  created_at: string;
}

export interface Reaction {
  id: string;
  digest_id: string;
  reaction_type: 'thumbs_up' | 'middle_finger';
  ip_hash: string;
  created_at: string;
}

