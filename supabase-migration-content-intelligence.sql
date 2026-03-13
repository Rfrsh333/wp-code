create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'content_source_type') then
    create type public.content_source_type as enum ('rss', 'scrape', 'manual');
  end if;
  if not exists (select 1 from pg_type where typname = 'content_trust_level') then
    create type public.content_trust_level as enum ('low', 'medium', 'high', 'verified');
  end if;
  if not exists (select 1 from pg_type where typname = 'content_fetch_frequency') then
    create type public.content_fetch_frequency as enum ('hourly', 'every_6_hours', 'daily', 'weekly');
  end if;
  if not exists (select 1 from pg_type where typname = 'content_job_status') then
    create type public.content_job_status as enum ('queued', 'running', 'completed', 'failed', 'dead_letter');
  end if;
  if not exists (select 1 from pg_type where typname = 'content_processing_status') then
    create type public.content_processing_status as enum ('pending', 'processed', 'rejected', 'error');
  end if;
  if not exists (select 1 from pg_type where typname = 'content_review_status') then
    create type public.content_review_status as enum ('draft', 'needs_review', 'approved', 'rejected', 'published');
  end if;
  if not exists (select 1 from pg_type where typname = 'content_impact_level') then
    create type public.content_impact_level as enum ('low', 'medium', 'high');
  end if;
  if not exists (select 1 from pg_type where typname = 'content_urgency_level') then
    create type public.content_urgency_level as enum ('low', 'medium', 'high', 'critical');
  end if;
  if not exists (select 1 from pg_type where typname = 'content_image_status') then
    create type public.content_image_status as enum ('queued', 'prompt_ready', 'generating', 'branding', 'completed', 'failed');
  end if;
  if not exists (select 1 from pg_type where typname = 'content_entity_type') then
    create type public.content_entity_type as enum ('article', 'cluster', 'draft', 'image');
  end if;
end $$;

create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source_type public.content_source_type not null,
  source_url text not null,
  rss_url text,
  category_focus text[] not null default '{}',
  region text,
  trust_level public.content_trust_level not null default 'medium',
  is_active boolean not null default true,
  fetch_frequency public.content_fetch_frequency not null default 'daily',
  rule_profile text,
  last_fetched_at timestamptz,
  last_error_at timestamptz,
  last_error_message text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.source_rules (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.sources(id) on delete cascade,
  name text not null,
  description text,
  priority integer not null default 50,
  is_active boolean not null default true,
  conditions jsonb not null default '[]'::jsonb,
  actions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.raw_articles (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources(id) on delete cascade,
  external_id text,
  source_url text not null,
  canonical_url text,
  title text,
  author text,
  published_at timestamptz,
  excerpt text,
  raw_html text,
  raw_text text,
  language text,
  hash text,
  fetch_status public.content_processing_status not null default 'pending',
  fetch_error text,
  provenance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.normalized_articles (
  id uuid primary key default gen_random_uuid(),
  raw_article_id uuid not null unique references public.raw_articles(id) on delete cascade,
  source_id uuid not null references public.sources(id) on delete cascade,
  title text not null,
  canonical_url text not null,
  source_name text not null,
  published_at timestamptz,
  author text,
  excerpt text,
  cleaned_text text not null,
  language text,
  content_hash text not null,
  tag_suggestions text[] not null default '{}',
  provenance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.article_analysis (
  id uuid primary key default gen_random_uuid(),
  normalized_article_id uuid not null unique references public.normalized_articles(id) on delete cascade,
  is_relevant boolean not null default false,
  is_noise boolean not null default false,
  primary_audience text,
  secondary_audience text[] not null default '{}',
  category text,
  subtopics text[] not null default '{}',
  content_type text,
  impact_level public.content_impact_level not null default 'low',
  urgency_level public.content_urgency_level not null default 'low',
  confidence_score integer not null default 0 check (confidence_score between 0 and 100),
  business_relevance_score integer not null default 0 check (business_relevance_score between 0 and 100),
  worker_relevance_score integer not null default 0 check (worker_relevance_score between 0 and 100),
  novelty_score integer not null default 0 check (novelty_score between 0 and 100),
  source_authority_score integer not null default 0 check (source_authority_score between 0 and 100),
  business_implications text[] not null default '{}',
  worker_implications text[] not null default '{}',
  recommended_actions text[] not null default '{}',
  fact_check_flags text[] not null default '{}',
  summary text,
  ai_model text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.article_tags (
  id uuid primary key default gen_random_uuid(),
  normalized_article_id uuid not null references public.normalized_articles(id) on delete cascade,
  tag text not null,
  origin text not null default 'rule',
  created_at timestamptz not null default timezone('utc', now()),
  unique(normalized_article_id, tag)
);

create table if not exists public.duplicate_groups (
  id uuid primary key default gen_random_uuid(),
  canonical_url text,
  primary_normalized_article_id uuid references public.normalized_articles(id) on delete set null,
  similarity_score integer not null default 100 check (similarity_score between 0 and 100),
  reason text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.duplicate_group_articles (
  id uuid primary key default gen_random_uuid(),
  duplicate_group_id uuid not null references public.duplicate_groups(id) on delete cascade,
  normalized_article_id uuid not null references public.normalized_articles(id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  unique(duplicate_group_id, normalized_article_id)
);

create table if not exists public.content_clusters (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  theme_title text not null,
  summary text,
  time_window_start timestamptz,
  time_window_end timestamptz,
  trend_score integer not null default 0 check (trend_score between 0 and 100),
  business_relevance_score integer not null default 0 check (business_relevance_score between 0 and 100),
  worker_relevance_score integer not null default 0 check (worker_relevance_score between 0 and 100),
  editorial_potential_score integer not null default 0 check (editorial_potential_score between 0 and 100),
  suggested_angles text[] not null default '{}',
  suggested_headlines text[] not null default '{}',
  meta_description_ideas text[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.cluster_articles (
  id uuid primary key default gen_random_uuid(),
  cluster_id uuid not null references public.content_clusters(id) on delete cascade,
  normalized_article_id uuid not null references public.normalized_articles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique(cluster_id, normalized_article_id)
);

create table if not exists public.editorial_drafts (
  id uuid primary key default gen_random_uuid(),
  cluster_id uuid references public.content_clusters(id) on delete set null,
  draft_type text not null,
  review_status public.content_review_status not null default 'draft',
  primary_audience text,
  secondary_audience text[] not null default '{}',
  title text not null,
  slug text not null unique,
  excerpt text not null,
  body_markdown text not null,
  key_takeaways text[] not null default '{}',
  impact_summary text,
  action_steps text[] not null default '{}',
  source_list jsonb not null default '[]'::jsonb,
  seo_title text,
  meta_description text,
  review_notes text,
  fact_check_flags text[] not null default '{}',
  image_prompt_suggestion text,
  visual_direction text,
  hero_image_id uuid,
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.editorial_draft_sources (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.editorial_drafts(id) on delete cascade,
  normalized_article_id uuid not null references public.normalized_articles(id) on delete cascade,
  source_order integer not null default 0,
  citation_label text,
  created_at timestamptz not null default timezone('utc', now()),
  unique(draft_id, normalized_article_id)
);

create table if not exists public.generated_images (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.editorial_drafts(id) on delete cascade,
  status public.content_image_status not null default 'queued',
  prompt text not null,
  alt_text text,
  storage_path_original text,
  storage_path_branded text,
  width integer,
  height integer,
  generation_model text,
  error_message text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.editorial_drafts
  add constraint editorial_drafts_hero_image_fk
  foreign key (hero_image_id) references public.generated_images(id) on delete set null;

create table if not exists public.publish_queue (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null unique references public.editorial_drafts(id) on delete cascade,
  scheduled_for timestamptz,
  status public.content_review_status not null default 'draft',
  notes text,
  published_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.job_runs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  job_key text,
  status public.content_job_status not null default 'queued',
  payload jsonb not null default '{}'::jsonb,
  result jsonb,
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.review_events (
  id uuid primary key default gen_random_uuid(),
  entity_type public.content_entity_type not null,
  entity_id uuid not null,
  event_type text not null,
  actor_email text,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists sources_active_frequency_idx on public.sources (is_active, fetch_frequency);
create index if not exists source_rules_source_idx on public.source_rules (source_id, is_active, priority desc);
create unique index if not exists raw_articles_source_hash_idx on public.raw_articles (source_id, hash) where hash is not null;
create index if not exists raw_articles_canonical_idx on public.raw_articles (canonical_url);
create unique index if not exists normalized_articles_canonical_hash_idx on public.normalized_articles (canonical_url, content_hash);
create index if not exists article_analysis_relevance_idx on public.article_analysis (is_relevant, impact_level, urgency_level);
create index if not exists article_tags_tag_idx on public.article_tags (tag);
create index if not exists duplicate_group_articles_group_idx on public.duplicate_group_articles (duplicate_group_id);
create index if not exists content_clusters_scores_idx on public.content_clusters (trend_score desc, editorial_potential_score desc);
create index if not exists cluster_articles_cluster_idx on public.cluster_articles (cluster_id);
create index if not exists editorial_drafts_status_idx on public.editorial_drafts (review_status, published_at desc);
create index if not exists editorial_drafts_audience_idx on public.editorial_drafts (primary_audience, review_status);
create index if not exists editorial_draft_sources_draft_idx on public.editorial_draft_sources (draft_id, source_order);
create index if not exists generated_images_draft_status_idx on public.generated_images (draft_id, status);
create index if not exists publish_queue_status_schedule_idx on public.publish_queue (status, scheduled_for);
create index if not exists job_runs_status_created_idx on public.job_runs (status, created_at desc);
create index if not exists review_events_entity_idx on public.review_events (entity_type, entity_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_sources_updated_at on public.sources;
create trigger set_sources_updated_at before update on public.sources for each row execute function public.set_updated_at();
drop trigger if exists set_source_rules_updated_at on public.source_rules;
create trigger set_source_rules_updated_at before update on public.source_rules for each row execute function public.set_updated_at();
drop trigger if exists set_raw_articles_updated_at on public.raw_articles;
create trigger set_raw_articles_updated_at before update on public.raw_articles for each row execute function public.set_updated_at();
drop trigger if exists set_normalized_articles_updated_at on public.normalized_articles;
create trigger set_normalized_articles_updated_at before update on public.normalized_articles for each row execute function public.set_updated_at();
drop trigger if exists set_article_analysis_updated_at on public.article_analysis;
create trigger set_article_analysis_updated_at before update on public.article_analysis for each row execute function public.set_updated_at();
drop trigger if exists set_duplicate_groups_updated_at on public.duplicate_groups;
create trigger set_duplicate_groups_updated_at before update on public.duplicate_groups for each row execute function public.set_updated_at();
drop trigger if exists set_content_clusters_updated_at on public.content_clusters;
create trigger set_content_clusters_updated_at before update on public.content_clusters for each row execute function public.set_updated_at();
drop trigger if exists set_editorial_drafts_updated_at on public.editorial_drafts;
create trigger set_editorial_drafts_updated_at before update on public.editorial_drafts for each row execute function public.set_updated_at();
drop trigger if exists set_generated_images_updated_at on public.generated_images;
create trigger set_generated_images_updated_at before update on public.generated_images for each row execute function public.set_updated_at();
drop trigger if exists set_publish_queue_updated_at on public.publish_queue;
create trigger set_publish_queue_updated_at before update on public.publish_queue for each row execute function public.set_updated_at();

alter table public.sources enable row level security;
alter table public.source_rules enable row level security;
alter table public.raw_articles enable row level security;
alter table public.normalized_articles enable row level security;
alter table public.article_analysis enable row level security;
alter table public.article_tags enable row level security;
alter table public.duplicate_groups enable row level security;
alter table public.duplicate_group_articles enable row level security;
alter table public.content_clusters enable row level security;
alter table public.cluster_articles enable row level security;
alter table public.editorial_drafts enable row level security;
alter table public.editorial_draft_sources enable row level security;
alter table public.generated_images enable row level security;
alter table public.publish_queue enable row level security;
alter table public.job_runs enable row level security;
alter table public.review_events enable row level security;

drop policy if exists "public can read published editorial drafts" on public.editorial_drafts;
create policy "public can read published editorial drafts"
  on public.editorial_drafts
  for select
  using (review_status = 'published');

drop policy if exists "public can read published draft citations" on public.editorial_draft_sources;
create policy "public can read published draft citations"
  on public.editorial_draft_sources
  for select
  using (
    exists (
      select 1
      from public.editorial_drafts d
      where d.id = editorial_draft_sources.draft_id
        and d.review_status = 'published'
    )
  );

drop policy if exists "service role manages sources" on public.sources;
create policy "service role manages sources"
  on public.sources
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role manages content intelligence tables" on public.source_rules;
create policy "service role manages content intelligence tables"
  on public.source_rules
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role manages raw articles" on public.raw_articles;
create policy "service role manages raw articles"
  on public.raw_articles
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role manages normalized articles" on public.normalized_articles;
create policy "service role manages normalized articles"
  on public.normalized_articles
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role manages article analysis" on public.article_analysis;
create policy "service role manages article analysis"
  on public.article_analysis
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role manages article tags" on public.article_tags;
create policy "service role manages article tags"
  on public.article_tags
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role manages duplicate groups" on public.duplicate_groups;
create policy "service role manages duplicate groups"
  on public.duplicate_groups
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role manages duplicate group articles" on public.duplicate_group_articles;
create policy "service role manages duplicate group articles"
  on public.duplicate_group_articles
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role manages content clusters" on public.content_clusters;
create policy "service role manages content clusters"
  on public.content_clusters
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role manages cluster articles" on public.cluster_articles;
create policy "service role manages cluster articles"
  on public.cluster_articles
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role manages editorial drafts" on public.editorial_drafts;
create policy "service role manages editorial drafts"
  on public.editorial_drafts
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role manages editorial draft sources" on public.editorial_draft_sources;
create policy "service role manages editorial draft sources"
  on public.editorial_draft_sources
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role manages generated images" on public.generated_images;
create policy "service role manages generated images"
  on public.generated_images
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role manages publish queue" on public.publish_queue;
create policy "service role manages publish queue"
  on public.publish_queue
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role manages job runs" on public.job_runs;
create policy "service role manages job runs"
  on public.job_runs
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role manages review events" on public.review_events;
create policy "service role manages review events"
  on public.review_events
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

insert into storage.buckets (id, name, public)
select 'editorial-images', 'editorial-images', false
where not exists (
  select 1 from storage.buckets where id = 'editorial-images'
);
