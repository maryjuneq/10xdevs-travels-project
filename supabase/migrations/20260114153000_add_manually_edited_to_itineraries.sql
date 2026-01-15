-- 2026-01-14 15:30:00
-- Migration: add manually_edited flag to itineraries
-- This flag indicates the itinerary was manually edited by the user after AI generation.

ALTER TABLE itineraries
  ADD COLUMN IF NOT EXISTS manually_edited BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN itineraries.manually_edited IS
  'Indicates that the user manually edited the itinerary after AI generation';
