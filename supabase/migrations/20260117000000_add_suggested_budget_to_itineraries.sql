-- Migration: Add suggested_budget column to itineraries table
-- Description: Adds a column to store the AI-suggested budget as a string (e.g., "5000 USD")
-- Date: 2026-01-17

ALTER TABLE itineraries
ADD COLUMN suggested_budget TEXT;

-- Add comment for documentation
COMMENT ON COLUMN itineraries.suggested_budget IS 'AI-suggested budget for the trip as a string with currency (e.g., "5000 USD")';
