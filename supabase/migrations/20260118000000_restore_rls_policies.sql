-- =====================================================
-- Migration: Restore RLS Policies for Production
-- Created: 2026-01-18 00:00:00 UTC
-- =====================================================
--
-- Purpose:
--   - Restore Row Level Security (RLS) policies on core tables
--   - Ensure users can only access their own data
--   - Prepare application for production deployment
--
-- Security: This migration adds proper authentication and authorization
--   Each user can only access their own trip notes, itineraries, jobs, and preferences
--
-- Affected Tables:
--   - trip_notes (policies restored)
--   - itineraries (policies restored)
--   - ai_generation_jobs (policies restored)
--   - user_preferences (policies restored)
--
-- =====================================================

-- =====================================================
-- Section 1: Trip Notes Policies
-- =====================================================
-- Users can only view, create, update, and delete their own trip notes

create policy "Authenticated users can select their own trip notes"
  on trip_notes
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Authenticated users can insert their own trip notes"
  on trip_notes
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Authenticated users can update their own trip notes"
  on trip_notes
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Authenticated users can delete their own trip notes"
  on trip_notes
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- =====================================================
-- Section 2: Itineraries Policies
-- =====================================================
-- Users can only view, create, update, and delete their own itineraries

create policy "Authenticated users can select their own itineraries"
  on itineraries
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Authenticated users can insert their own itineraries"
  on itineraries
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Authenticated users can update their own itineraries"
  on itineraries
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Authenticated users can delete their own itineraries"
  on itineraries
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- =====================================================
-- Section 3: AI Generation Jobs Policies
-- =====================================================
-- Users can only view, create, update, and delete their own generation jobs

create policy "Authenticated users can select their own generation jobs"
  on ai_generation_jobs
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Authenticated users can insert their own generation jobs"
  on ai_generation_jobs
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Authenticated users can update their own generation jobs"
  on ai_generation_jobs
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Authenticated users can delete their own generation jobs"
  on ai_generation_jobs
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- =====================================================
-- Section 4: User Preferences Policies
-- =====================================================
-- Users can only view, create, update, and delete their own preferences

create policy "Authenticated users can select their own preferences"
  on user_preferences
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Authenticated users can insert their own preferences"
  on user_preferences
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Authenticated users can update their own preferences"
  on user_preferences
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Authenticated users can delete their own preferences"
  on user_preferences
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- =====================================================
-- End of Migration
-- =====================================================
-- All RLS policies have been restored
-- Users can now only access their own data
-- =====================================================
