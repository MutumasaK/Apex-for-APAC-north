-- AI Coach beta video submission storage and feedback schema.
-- Run in Supabase SQL editor. The ai-coach-videos bucket remains private.

create extension if not exists "pgcrypto";

create table if not exists public.ai_coach_teams (
  id uuid primary key default gen_random_uuid(),
  team_name text not null unique,
  discord_channel_id text,
  contact_discord_id text,
  memo text,
  created_at timestamptz default now()
);

create table if not exists public.ai_coach_video_submissions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.ai_coach_teams(id) on delete set null,
  team_name text not null,
  user_name text not null,
  discord_id text not null,
  email text not null,
  rank_tier text,
  map_name text,
  team_comp text,
  scene_type text,
  focus_points text,
  description text not null,
  consent_accepted boolean not null default false,
  video_path text unique,
  video_url text,
  submission_type text not null default 'file',
  source_platform text,
  target_timestamps text,
  ai_video_notes text,
  ai_video_notes_status text default 'not_started',
  ai_video_notes_generated_at timestamptz,
  admin_video_memo text,
  original_filename text,
  mime_type text,
  file_size_bytes bigint,
  status text not null default 'submitted',
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_coach_feedback_reports (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.ai_coach_video_submissions(id) on delete cascade,
  summary text not null,
  good_points text,
  problems text,
  improvements text,
  igl_calls text,
  next_checklist text,
  coach_notes text,
  category text,
  issue_tags text[] default '{}',
  priority text,
  team_action_items text,
  visibility text not null default 'customer',
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (submission_id)
);

-- Migration guard for earlier beta schemas that used team_id as a text path key.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'ai_coach_video_submissions'
      and column_name = 'team_id'
      and data_type <> 'uuid'
  ) then
    alter table public.ai_coach_video_submissions
      rename column team_id to legacy_team_key;
  end if;
end $$;

alter table public.ai_coach_video_submissions
  add column if not exists team_id uuid references public.ai_coach_teams(id) on delete set null;

alter table public.ai_coach_video_submissions
  add column if not exists video_path text,
  add column if not exists video_url text,
  add column if not exists submission_type text not null default 'file',
  add column if not exists source_platform text,
  add column if not exists target_timestamps text,
  add column if not exists ai_video_notes text,
  add column if not exists ai_video_notes_status text default 'not_started',
  add column if not exists ai_video_notes_generated_at timestamptz,
  add column if not exists admin_video_memo text;

update public.ai_coach_video_submissions
set target_timestamps = '既存提出のため未入力（管理者が確認して追記）'
where lower(coalesce(submission_type, '')) = 'url'
  and (
    target_timestamps is null
    or btrim(target_timestamps) = ''
  );

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ai_coach_video_submissions_url_requires_timestamps'
  ) then
    alter table public.ai_coach_video_submissions
    add constraint ai_coach_video_submissions_url_requires_timestamps
    check (
      lower(coalesce(submission_type, '')) <> 'url'
      or (
        target_timestamps is not null
        and length(btrim(target_timestamps)) > 0
      )
    );
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'ai_coach_video_submissions'
      and column_name = 'storage_path'
  ) then
    update public.ai_coach_video_submissions
    set video_path = coalesce(video_path, storage_path);

    alter table public.ai_coach_video_submissions
      drop column storage_path;
  end if;
end $$;

alter table public.ai_coach_video_submissions
  drop column if exists storage_bucket,
  drop column if exists submission_method,
  drop column if exists submission_metod;

create unique index if not exists ai_coach_video_submissions_video_path_key
  on public.ai_coach_video_submissions(video_path)
  where video_path is not null;

insert into public.ai_coach_teams (team_name)
select distinct team_name
from public.ai_coach_video_submissions
where team_name is not null and btrim(team_name) <> ''
on conflict (team_name) do nothing;

update public.ai_coach_video_submissions submissions
set team_id = teams.id
from public.ai_coach_teams teams
where submissions.team_id is null
  and submissions.team_name = teams.team_name;

create index if not exists idx_ai_coach_video_submissions_team_id
  on public.ai_coach_video_submissions(team_id);

create index if not exists ai_coach_video_submissions_created_at_idx
  on public.ai_coach_video_submissions(created_at desc);

alter table public.ai_coach_feedback_reports
  add column if not exists category text,
  add column if not exists issue_tags text[] default '{}',
  add column if not exists priority text,
  add column if not exists team_action_items text,
  add column if not exists problems text,
  add column if not exists coach_notes text,
  add column if not exists visibility text not null default 'customer';

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'ai_coach_feedback_reports'
      and column_name = 'issues'
  ) then
    update public.ai_coach_feedback_reports
    set problems = coalesce(problems, issues);
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'ai_coach_feedback_reports'
      and column_name = 'checklist'
  ) then
    update public.ai_coach_feedback_reports
    set next_checklist = coalesce(next_checklist, checklist);

    alter table public.ai_coach_feedback_reports
      drop column checklist;
  end if;
end $$;

notify pgrst, 'reload schema';

alter table public.ai_coach_teams enable row level security;
alter table public.ai_coach_video_submissions enable row level security;
alter table public.ai_coach_feedback_reports enable row level security;

grant select, insert, update, delete on public.ai_coach_teams to service_role;
grant select, insert, update, delete on public.ai_coach_video_submissions to service_role;
grant select, insert, update, delete on public.ai_coach_feedback_reports to service_role;

drop policy if exists "service role manages ai coach teams" on public.ai_coach_teams;
create policy "service role manages ai coach teams"
  on public.ai_coach_teams
  to service_role
  for all
  using (true)
  with check (true);

drop policy if exists "service role manages ai coach submissions" on public.ai_coach_video_submissions;
create policy "service role manages ai coach submissions"
  on public.ai_coach_video_submissions
  to service_role
  for all
  using (true)
  with check (true);

drop policy if exists "service role manages ai coach feedback reports" on public.ai_coach_feedback_reports;
create policy "service role manages ai coach feedback reports"
  on public.ai_coach_feedback_reports
  to service_role
  for all
  using (true)
  with check (true);

insert into storage.buckets (id, name, public)
values ('ai-coach-videos', 'ai-coach-videos', false)
on conflict (id) do update set public = false;

drop policy if exists "service role manages ai coach videos" on storage.objects;
create policy "service role manages ai coach videos"
  on storage.objects
  for all
  using (bucket_id = 'ai-coach-videos')
  with check (bucket_id = 'ai-coach-videos');

-- Requested additive SQL for team-based analysis.
create table if not exists public.ai_coach_teams (
  id uuid primary key default gen_random_uuid(),
  team_name text not null unique,
  discord_channel_id text,
  contact_discord_id text,
  memo text,
  created_at timestamptz default now()
);

alter table public.ai_coach_video_submissions
add column if not exists team_id uuid references public.ai_coach_teams(id) on delete set null;

alter table public.ai_coach_video_submissions
add column if not exists video_path text,
add column if not exists video_url text,
add column if not exists submission_type text not null default 'file',
add column if not exists source_platform text,
add column if not exists ai_video_notes text,
add column if not exists ai_video_notes_status text default 'not_started',
add column if not exists ai_video_notes_generated_at timestamptz,
add column if not exists admin_video_memo text,
add column if not exists target_timestamps text;

update public.ai_coach_video_submissions
set target_timestamps = '既存提出のため未入力（管理者が確認して追記）'
where lower(coalesce(submission_type, '')) = 'url'
  and (
    target_timestamps is null
    or btrim(target_timestamps) = ''
  );

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ai_coach_video_submissions_url_requires_timestamps'
  ) then
    alter table public.ai_coach_video_submissions
    add constraint ai_coach_video_submissions_url_requires_timestamps
    check (
      lower(coalesce(submission_type, '')) <> 'url'
      or (
        target_timestamps is not null
        and length(btrim(target_timestamps)) > 0
      )
    );
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'ai_coach_video_submissions'
      and column_name = 'storage_path'
  ) then
    update public.ai_coach_video_submissions
    set video_path = coalesce(video_path, storage_path);

    alter table public.ai_coach_video_submissions
      drop column storage_path;
  end if;
end $$;

notify pgrst, 'reload schema';

alter table public.ai_coach_video_submissions
drop column if exists storage_bucket,
drop column if exists submission_method,
drop column if exists submission_metod;

create unique index if not exists ai_coach_video_submissions_video_path_key
on public.ai_coach_video_submissions(video_path)
where video_path is not null;

create index if not exists idx_ai_coach_video_submissions_team_id
on public.ai_coach_video_submissions(team_id);

alter table public.ai_coach_feedback_reports
add column if not exists category text,
add column if not exists issue_tags text[] default '{}',
add column if not exists priority text,
add column if not exists team_action_items text,
add column if not exists problems text,
add column if not exists coach_notes text,
add column if not exists visibility text not null default 'customer';

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'ai_coach_feedback_reports'
      and column_name = 'issues'
  ) then
    update public.ai_coach_feedback_reports
    set problems = coalesce(problems, issues);
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'ai_coach_feedback_reports'
      and column_name = 'checklist'
  ) then
    update public.ai_coach_feedback_reports
    set next_checklist = coalesce(next_checklist, checklist);

    alter table public.ai_coach_feedback_reports
      drop column checklist;
  end if;
end $$;
