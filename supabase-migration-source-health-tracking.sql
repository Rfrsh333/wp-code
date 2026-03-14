-- Migration: Source health tracking
-- Adds health status, consecutive error count, fetch timing, and articles found tracking to sources table

-- Add health_status column with default 'healthy'
ALTER TABLE sources
  ADD COLUMN IF NOT EXISTS health_status text NOT NULL DEFAULT 'healthy';

-- Add consecutive_error_count to track failures
ALTER TABLE sources
  ADD COLUMN IF NOT EXISTS consecutive_error_count integer NOT NULL DEFAULT 0;

-- Add avg_fetch_time_ms to track performance
ALTER TABLE sources
  ADD COLUMN IF NOT EXISTS avg_fetch_time_ms integer;

-- Add articles_found_last_run to track yield per source
ALTER TABLE sources
  ADD COLUMN IF NOT EXISTS articles_found_last_run integer;

-- Add check constraint for health_status values
ALTER TABLE sources
  ADD CONSTRAINT sources_health_status_check
  CHECK (health_status IN ('healthy', 'degraded', 'failing', 'dead'));

-- Index for filtering out dead sources efficiently
CREATE INDEX IF NOT EXISTS idx_sources_health_status ON sources (health_status)
  WHERE is_active = true;

COMMENT ON COLUMN sources.health_status IS 'Source health: healthy (0 errors), degraded (1-2), failing (3-5), dead (6+)';
COMMENT ON COLUMN sources.consecutive_error_count IS 'Number of consecutive fetch failures';
COMMENT ON COLUMN sources.avg_fetch_time_ms IS 'Last fetch duration in milliseconds';
COMMENT ON COLUMN sources.articles_found_last_run IS 'Number of articles discovered in last successful fetch';
