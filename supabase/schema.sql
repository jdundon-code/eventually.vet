-- ============================================================================
-- EVENTUALLY.VET — Supabase Database Schema
-- Run this in the Supabase SQL Editor to set up your project
-- ============================================================================

-- Enable Row Level Security on all tables
-- Users can only access their own data

-- ============================================================================
-- BACKUPS TABLE
-- Stores encrypted data snapshots for each user
-- ============================================================================
CREATE TABLE IF NOT EXISTS backups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  encrypted_data TEXT NOT NULL,
  data_hash TEXT NOT NULL,
  record_count INTEGER DEFAULT 0,
  attachment_count INTEGER DEFAULT 0,
  backup_version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own backups"
  ON backups FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- BUDDY LETTERS TABLE
-- Tracks buddy letter requests and their status
-- ============================================================================
CREATE TABLE IF NOT EXISTS buddy_letters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  encrypted_data TEXT NOT NULL, -- Encrypted letter metadata
  status TEXT NOT NULL DEFAULT 'draft', -- draft, sent, received, attached
  buddy_email TEXT, -- Not encrypted (needed for sending)
  condition_id TEXT, -- Reference to local condition ID
  sent_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE buddy_letters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own buddy letters"
  ON buddy_letters FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- VA CONTENT UPDATES TABLE
-- Stores VA regulation updates pushed by admin
-- ============================================================================
CREATE TABLE IF NOT EXISTS va_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_type TEXT NOT NULL, -- 'presumptive', 'regulation', 'news', 'rating_criteria'
  title TEXT NOT NULL,
  content JSONB NOT NULL,
  effective_date DATE,
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- VA content is public read (no RLS needed for reads)
ALTER TABLE va_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read VA content"
  ON va_content FOR SELECT
  USING (true);

CREATE POLICY "Only service role can modify VA content"
  ON va_content FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================

-- Create the attachments bucket (encrypted files)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('attachments', 'attachments', false, 52428800) -- 50MB limit per file
ON CONFLICT (id) DO NOTHING;

-- Storage policy: users can only access their own folder
CREATE POLICY "Users can manage their attachments"
  ON storage.objects FOR ALL
  USING (bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER backups_updated_at
  BEFORE UPDATE ON backups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER buddy_letters_updated_at
  BEFORE UPDATE ON buddy_letters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_backups_user ON backups(user_id);
CREATE INDEX IF NOT EXISTS idx_buddy_letters_user ON buddy_letters(user_id);
CREATE INDEX IF NOT EXISTS idx_buddy_letters_status ON buddy_letters(user_id, status);
CREATE INDEX IF NOT EXISTS idx_va_content_type ON va_content(content_type, is_active);
CREATE INDEX IF NOT EXISTS idx_va_content_date ON va_content(effective_date DESC);



-- ============================================================================
-- RESOURCES TABLE
-- Directory of VA claim assistance providers
-- ============================================================================
CREATE TABLE IF NOT EXISTS resources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- vso, attorney, claims_agent, va_facility, vet_center, nonprofit, online_service, support_group, other
  cost_type TEXT NOT NULL, -- free, paid, contingency, sliding_scale
  cost_details TEXT,
  description TEXT NOT NULL,
  services TEXT[] DEFAULT '{}',
  address TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  phone TEXT,
  email TEXT,
  website TEXT,
  accredited_by_va BOOLEAN DEFAULT FALSE,
  specialties TEXT[] DEFAULT '{}',
  average_rating DOUBLE PRECISION DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  is_national BOOLEAN DEFAULT FALSE,
  operating_hours TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

-- Resources are public read
CREATE POLICY "Anyone can read resources"
  ON resources FOR SELECT
  USING (true);

CREATE POLICY "Only service role can modify resources"
  ON resources FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- RESOURCE REVIEWS TABLE
-- Veteran ratings and comments on resources
-- ============================================================================
CREATE TABLE IF NOT EXISTS resource_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL, -- Can be auth.uid() or anonymous ID
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  comment TEXT NOT NULL,
  helpful BOOLEAN,
  claim_outcome TEXT, -- approved, denied, pending, increased, not_applicable
  service_used TEXT,
  display_name TEXT, -- Optional: "Army Veteran", "Navy Retiree", etc.
  is_flagged BOOLEAN DEFAULT FALSE, -- For moderation
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE resource_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read reviews
CREATE POLICY "Anyone can read reviews"
  ON resource_reviews FOR SELECT
  USING (true);

-- Authenticated users can create reviews
CREATE POLICY "Authenticated users can create reviews"
  ON resource_reviews FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Users can only update/delete their own reviews
CREATE POLICY "Users can manage own reviews"
  ON resource_reviews FOR UPDATE
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own reviews"
  ON resource_reviews FOR DELETE
  USING (auth.uid()::text = user_id);

-- ============================================================================
-- INDEXES FOR RESOURCES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_resources_type ON resources(type);
CREATE INDEX IF NOT EXISTS idx_resources_state ON resources(state);
CREATE INDEX IF NOT EXISTS idx_resources_cost ON resources(cost_type);
CREATE INDEX IF NOT EXISTS idx_resources_rating ON resources(average_rating DESC);
CREATE INDEX IF NOT EXISTS idx_resources_national ON resources(is_national) WHERE is_national = TRUE;
CREATE INDEX IF NOT EXISTS idx_reviews_resource ON resource_reviews(resource_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON resource_reviews(resource_id, rating);

-- Trigger for resources updated_at
CREATE TRIGGER resources_updated_at
  BEFORE UPDATE ON resources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
