-- AI News Digest Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Digests table
CREATE TABLE digests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('ml_monday', 'business_wednesday', 'ethics_friday', 'data_saturday')),
  published_date DATE NOT NULL,
  content JSONB NOT NULL, -- Array of articles with {title, summary, url, source, scores}
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  view_count INTEGER DEFAULT 0,
  linkedin_post_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments table
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  digest_id UUID NOT NULL REFERENCES digests(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_email_hash TEXT NOT NULL,
  author_website TEXT,
  content TEXT NOT NULL,
  approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  edited_at TIMESTAMPTZ
);

-- Reactions table
CREATE TABLE reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  digest_id UUID NOT NULL REFERENCES digests(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('thumbs_up', 'middle_finger')),
  ip_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(digest_id, ip_hash)
);

-- Subscribers table
CREATE TABLE subscribers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  categories TEXT[] DEFAULT ARRAY['all'],
  frequency TEXT DEFAULT 'weekly' CHECK (frequency IN ('every', 'weekly', 'monthly')),
  verification_token TEXT,
  unsubscribe_token TEXT UNIQUE DEFAULT uuid_generate_v4()::text,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ
);

-- Scraper runs (audit log)
CREATE TABLE scraper_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
  posts_scraped INTEGER,
  error_message TEXT,
  run_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_digests_published_date ON digests(published_date DESC) WHERE status = 'published';
CREATE INDEX idx_digests_category ON digests(category) WHERE status = 'published';
CREATE INDEX idx_comments_digest_id ON comments(digest_id);
CREATE INDEX idx_comments_approved ON comments(approved);
CREATE INDEX idx_reactions_digest_id ON reactions(digest_id);
CREATE INDEX idx_subscribers_email ON subscribers(email);
CREATE INDEX idx_scraper_runs_run_at ON scraper_runs(run_at DESC);

-- Full-text search on digests
ALTER TABLE digests ADD COLUMN search_vector tsvector;
CREATE INDEX idx_digests_search ON digests USING GIN(search_vector);

CREATE OR REPLACE FUNCTION digests_search_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.content::text,'')), 'B');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER digests_search_update BEFORE INSERT OR UPDATE
  ON digests FOR EACH ROW EXECUTE FUNCTION digests_search_trigger();

-- Row Level Security (RLS)
ALTER TABLE digests ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraper_runs ENABLE ROW LEVEL SECURITY;

-- Public can read published digests
CREATE POLICY "Anyone can view published digests"
  ON digests FOR SELECT
  USING (status = 'published');

-- Public can read approved comments
CREATE POLICY "Anyone can view approved comments"
  ON comments FOR SELECT
  USING (approved = true);

-- Public can insert comments (will be moderated)
CREATE POLICY "Anyone can create comments"
  ON comments FOR INSERT
  WITH CHECK (true);

-- Public can view reaction counts (not individual reactions)
CREATE POLICY "Anyone can view reactions"
  ON reactions FOR SELECT
  USING (true);

-- Public can insert reactions
CREATE POLICY "Anyone can create reactions"
  ON reactions FOR INSERT
  WITH CHECK (true);

-- Public can insert subscribers
CREATE POLICY "Anyone can subscribe"
  ON subscribers FOR INSERT
  WITH CHECK (true);

-- Subscribers can update their own record (for verification/unsubscribe)
CREATE POLICY "Subscribers can update themselves"
  ON subscribers FOR UPDATE
  USING (true);

-- Views for easy querying
CREATE OR REPLACE VIEW digests_with_counts AS
SELECT 
  d.*,
  (SELECT COUNT(*) FROM reactions WHERE digest_id = d.id AND reaction_type = 'thumbs_up') as thumbs_up_count,
  (SELECT COUNT(*) FROM reactions WHERE digest_id = d.id AND reaction_type = 'middle_finger') as middle_finger_count,
  (SELECT COUNT(*) FROM comments WHERE digest_id = d.id AND approved = true) as comment_count
FROM digests d;

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_view_count(digest_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE digests SET view_count = view_count + 1 WHERE id = digest_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

