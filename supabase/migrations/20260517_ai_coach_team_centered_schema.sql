-- AI Coach beta: additive team_id centered schema.
-- This migration does not delete, rename, or migrate data from the existing
-- ai_coach_video_submissions / ai_coach_feedback_reports beta tables.
-- Existing beta tables can be backfilled into this schema later with an
-- explicit, reviewed data migration.

create extension if not exists "pgcrypto";

create table if not exists public.ai_coach_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text,
  discord_id text,
  discord_user_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_coach_teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  team_name text,
  owner_user_id uuid references public.ai_coach_users(id) on delete set null,
  plan text not null default 'free',
  plan_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Compatibility columns for earlier beta code that used team_name / plan_name.
alter table public.ai_coach_teams
  add column if not exists name text,
  add column if not exists team_name text,
  add column if not exists owner_user_id uuid references public.ai_coach_users(id) on delete set null,
  add column if not exists plan text not null default 'free',
  add column if not exists plan_name text,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'ai_coach_teams'
      and column_name = 'team_name'
  ) then
    execute 'update public.ai_coach_teams set name = coalesce(name, team_name) where name is null';
  end if;
end $$;

create unique index if not exists ai_coach_teams_name_unique
  on public.ai_coach_teams (lower(name))
  where name is not null and btrim(name) <> '';

create table if not exists public.ai_coach_team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.ai_coach_teams(id) on delete cascade,
  user_id uuid not null references public.ai_coach_users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  unique (team_id, user_id)
);

create table if not exists public.ai_coach_submissions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.ai_coach_teams(id) on delete cascade,
  submitted_by_user_id uuid references public.ai_coach_users(id) on delete set null,
  submitter_name text not null,
  email text not null,
  discord_id text,
  rank_tier text not null,
  map_name text not null,
  team_comp text not null,
  scene_type text not null,
  focus_points text not null,
  description text not null,
  video_url text,
  video_file_url text,
  timestamps text not null,
  share_with_teammates boolean not null default true,
  status text not null default 'submitted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_coach_submissions_video_required
    check (
      nullif(btrim(coalesce(video_url, '')), '') is not null
      or nullif(btrim(coalesce(video_file_url, '')), '') is not null
    ),
  constraint ai_coach_submissions_timestamps_required
    check (nullif(btrim(timestamps), '') is not null)
);

create table if not exists public.ai_coach_analysis_reports (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.ai_coach_submissions(id) on delete cascade,
  team_id uuid not null references public.ai_coach_teams(id) on delete cascade,
  report_status text not null default 'pending',
  summary text,
  good_points text,
  problems text,
  improvements text,
  igl_call_examples text,
  checklist jsonb not null default '[]'::jsonb,
  team_trends text,
  raw_ai_response jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (submission_id)
);

create table if not exists public.ai_coach_feedback_share_links (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.ai_coach_analysis_reports(id) on delete cascade,
  team_id uuid not null references public.ai_coach_teams(id) on delete cascade,
  share_token text unique not null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (report_id)
);

create table if not exists public.ai_coach_notifications (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.ai_coach_analysis_reports(id) on delete set null,
  team_id uuid references public.ai_coach_teams(id) on delete set null,
  notification_type text not null default 'feedback_ready',
  channel text not null,
  destination text not null,
  status text not null default 'pending',
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  constraint ai_coach_notifications_channel_check
    check (channel in ('email', 'discord')),
  constraint ai_coach_notifications_type_check
    check (notification_type in ('feedback_ready', 'payment_confirmed', 'plan_changed', 'cancellation_confirmed'))
);

create index if not exists ai_coach_submissions_team_id_created_at_idx
  on public.ai_coach_submissions(team_id, created_at desc);

create index if not exists ai_coach_analysis_reports_team_id_created_at_idx
  on public.ai_coach_analysis_reports(team_id, created_at desc);

create index if not exists ai_coach_notifications_team_id_created_at_idx
  on public.ai_coach_notifications(team_id, created_at desc);

alter table public.ai_coach_users enable row level security;
alter table public.ai_coach_teams enable row level security;
alter table public.ai_coach_team_members enable row level security;
alter table public.ai_coach_submissions enable row level security;
alter table public.ai_coach_analysis_reports enable row level security;
alter table public.ai_coach_feedback_share_links enable row level security;
alter table public.ai_coach_notifications enable row level security;

grant select, insert, update, delete on public.ai_coach_users to service_role;
grant select, insert, update, delete on public.ai_coach_teams to service_role;
grant select, insert, update, delete on public.ai_coach_team_members to service_role;
grant select, insert, update, delete on public.ai_coach_submissions to service_role;
grant select, insert, update, delete on public.ai_coach_analysis_reports to service_role;
grant select, insert, update, delete on public.ai_coach_feedback_share_links to service_role;
grant select, insert, update, delete on public.ai_coach_notifications to service_role;

drop policy if exists "service role manages ai coach users" on public.ai_coach_users;
create policy "service role manages ai coach users"
  on public.ai_coach_users for all to service_role using (true) with check (true);

drop policy if exists "service role manages ai coach team members" on public.ai_coach_team_members;
create policy "service role manages ai coach team members"
  on public.ai_coach_team_members for all to service_role using (true) with check (true);

drop policy if exists "service role manages ai coach submissions v2" on public.ai_coach_submissions;
create policy "service role manages ai coach submissions v2"
  on public.ai_coach_submissions for all to service_role using (true) with check (true);

drop policy if exists "service role manages ai coach analysis reports" on public.ai_coach_analysis_reports;
create policy "service role manages ai coach analysis reports"
  on public.ai_coach_analysis_reports for all to service_role using (true) with check (true);

drop policy if exists "service role manages ai coach share links" on public.ai_coach_feedback_share_links;
create policy "service role manages ai coach share links"
  on public.ai_coach_feedback_share_links for all to service_role using (true) with check (true);

drop policy if exists "service role manages ai coach notifications" on public.ai_coach_notifications;
create policy "service role manages ai coach notifications"
  on public.ai_coach_notifications for all to service_role using (true) with check (true);

insert into storage.buckets (id, name, public)
values ('ai-coach-videos', 'ai-coach-videos', false)
on conflict (id) do update set public = false;

drop policy if exists "service role manages ai coach videos v2" on storage.objects;
create policy "service role manages ai coach videos v2"
  on storage.objects
  for all
  to service_role
  using (bucket_id = 'ai-coach-videos')
  with check (bucket_id = 'ai-coach-videos');

notify pgrst, 'reload schema';
