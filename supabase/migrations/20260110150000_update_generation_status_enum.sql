-- Migration: Update generation_status enum and preference_category enum
-- Timestamp: 2026-01-10 15:00 UTC

begin;

-- 1. Rename existing enum and create the new trimmed enum
alter type generation_status rename to generation_status_old;
create type generation_status as enum ('succeeded', 'failed');

-- 2. Update any non-terminal statuses to a terminal value before casting
update ai_generation_jobs
set    status = 'failed'
where  status in ('queued', 'running');

-- 3. Alter column to use new enum
alter table ai_generation_jobs
  alter column status type generation_status
  using status::text::generation_status;

-- 4. Drop the old enum
drop type generation_status_old;

commit;
