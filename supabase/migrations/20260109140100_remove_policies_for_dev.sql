-- =====================================================
-- Migration: Remove RLS Policies for Development & Add Nature Category
-- Created: 2026-01-09 14:01:00 UTC
-- =====================================================
--
-- Purpose:
--   - Remove all RLS policies from core tables for easier development
--   - Add 'nature' category to preference_category enum
--
-- WARNING: This migration removes security policies!
--   This is intended for DEVELOPMENT ONLY.
--   Before deploying to production, restore appropriate RLS policies.
--
-- Affected Tables:
--   - trip_notes (policies removed)
--   - itineraries (policies removed)
--   - ai_generation_jobs (policies removed)
--   - user_preferences (policies removed)
--
-- Affected Types:
--   - preference_category (added 'nature' value)
--
-- =====================================================

-- =====================================================
-- Section 1: Remove RLS Policies
-- =====================================================
-- IMPORTANT: These DROP POLICY commands remove security restrictions.
-- This makes development easier but exposes all data to all users.
-- Restore proper RLS policies before production deployment!

-- -----------------------------------------------------
-- Drop all policies for trip_notes
-- -----------------------------------------------------
drop policy if exists "Authenticated users can select their own trip notes" on trip_notes;
drop policy if exists "Authenticated users can insert their own trip notes" on trip_notes;
drop policy if exists "Authenticated users can update their own trip notes" on trip_notes;
drop policy if exists "Authenticated users can delete their own trip notes" on trip_notes;

-- -----------------------------------------------------
-- Drop all policies for itineraries
-- -----------------------------------------------------
drop policy if exists "Authenticated users can select their own itineraries" on itineraries;
drop policy if exists "Authenticated users can insert their own itineraries" on itineraries;
drop policy if exists "Authenticated users can update their own itineraries" on itineraries;
drop policy if exists "Authenticated users can delete their own itineraries" on itineraries;

-- -----------------------------------------------------
-- Drop all policies for ai_generation_jobs
-- -----------------------------------------------------
drop policy if exists "Authenticated users can select their own generation jobs" on ai_generation_jobs;
drop policy if exists "Authenticated users can insert their own generation jobs" on ai_generation_jobs;
drop policy if exists "Authenticated users can update their own generation jobs" on ai_generation_jobs;
drop policy if exists "Authenticated users can delete their own generation jobs" on ai_generation_jobs;

-- -----------------------------------------------------
-- Drop all policies for user_preferences
-- -----------------------------------------------------
drop policy if exists "Authenticated users can select their own preferences" on user_preferences;
drop policy if exists "Authenticated users can insert their own preferences" on user_preferences;
drop policy if exists "Authenticated users can update their own preferences" on user_preferences;
drop policy if exists "Authenticated users can delete their own preferences" on user_preferences;

-- =====================================================
-- Section 2: Extend preference_category Enum
-- =====================================================
-- Add 'nature' as a new category option for user preferences
-- Examples: "I enjoy national parks", "I love wildlife watching", "I prefer outdoor destinations"

alter type preference_category add value 'nature';

-- =====================================================
-- End of Migration
-- =====================================================

