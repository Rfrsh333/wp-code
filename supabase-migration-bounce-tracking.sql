-- Add email bounce tracking column to inschrijvingen
-- Run this in Supabase SQL editor

ALTER TABLE inschrijvingen ADD COLUMN IF NOT EXISTS email_bounced boolean DEFAULT false;
