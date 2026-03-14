-- Migration: Content intelligence database optimizations
-- Adds indexes, materialized views, and cleanup functions

-- =====================================================
-- 1. Additional indexes for common query patterns
-- =====================================================

-- Faster lookup for pending articles by source
CREATE INDEX IF NOT EXISTS idx_raw_articles_pending_source
  ON raw_articles (source_id, fetch_status)
  WHERE fetch_status = 'pending';

-- Faster lookup for normalized articles by source and date
CREATE INDEX IF NOT EXISTS idx_normalized_articles_source_date
  ON normalized_articles (source_id, created_at DESC);

-- Content hash index for deduplication
CREATE INDEX IF NOT EXISTS idx_normalized_articles_content_hash
  ON normalized_articles (content_hash);

-- Faster draft queries by review_status + updated_at
CREATE INDEX IF NOT EXISTS idx_editorial_drafts_review_updated
  ON editorial_drafts (review_status, updated_at DESC);

-- Job runs by name for monitoring
CREATE INDEX IF NOT EXISTS idx_job_runs_name_created
  ON job_runs (job_name, created_at DESC);

-- =====================================================
-- 2. Materialized view: pipeline daily stats
-- =====================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_pipeline_daily_stats AS
SELECT
  date_trunc('day', created_at)::date AS day,
  job_name,
  COUNT(*) AS total_runs,
  COUNT(*) FILTER (WHERE status = 'completed') AS successful,
  COUNT(*) FILTER (WHERE status = 'failed') AS failed,
  AVG(EXTRACT(EPOCH FROM (finished_at - started_at)) * 1000)
    FILTER (WHERE finished_at IS NOT NULL AND started_at IS NOT NULL)
    AS avg_duration_ms
FROM job_runs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY date_trunc('day', created_at)::date, job_name
ORDER BY day DESC, job_name;

-- Index for materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_pipeline_daily_stats
  ON mv_pipeline_daily_stats (day, job_name);

-- =====================================================
-- 3. Cleanup function: remove old processed data
-- =====================================================

-- Function to clean up old raw articles that have been processed
CREATE OR REPLACE FUNCTION cleanup_old_processed_articles(days_old integer DEFAULT 90)
RETURNS TABLE(deleted_raw integer, deleted_jobs integer) AS $$
DECLARE
  cutoff timestamptz := NOW() - (days_old || ' days')::interval;
  raw_count integer;
  job_count integer;
BEGIN
  -- Delete old raw articles that are processed or rejected
  DELETE FROM raw_articles
  WHERE fetch_status IN ('processed', 'rejected')
    AND created_at < cutoff
    AND id NOT IN (
      SELECT ra.id FROM raw_articles ra
      JOIN normalized_articles na ON na.raw_article_id = ra.id
    );
  GET DIAGNOSTICS raw_count = ROW_COUNT;

  -- Delete old completed/failed job runs
  DELETE FROM job_runs
  WHERE status IN ('completed', 'failed')
    AND created_at < cutoff;
  GET DIAGNOSTICS job_count = ROW_COUNT;

  RETURN QUERY SELECT raw_count, job_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. body_blocks column for editorial_drafts
-- =====================================================

ALTER TABLE editorial_drafts
  ADD COLUMN IF NOT EXISTS body_blocks jsonb;

COMMENT ON COLUMN editorial_drafts.body_blocks IS 'Rich content blocks (JSON array) for visual blog rendering';

-- =====================================================
-- 5. Refresh materialized view function
-- =====================================================

CREATE OR REPLACE FUNCTION refresh_pipeline_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_pipeline_daily_stats;
END;
$$ LANGUAGE plpgsql;
