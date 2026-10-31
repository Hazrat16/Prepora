-- Core schema for Stage 1: learning, questions, attempts.

create type lesson_level as enum ('beginner', 'intermediate', 'advanced');
create type question_collection as enum ('previous_year', 'model', 'practice');
create type question_difficulty as enum ('easy', 'medium', 'hard');
create type attempt_mode as enum ('practice', 'mock');
create type attempt_status as enum ('in_progress', 'submitted');

create function public.set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Users

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  daily_question_target integer not null default 20 check (daily_question_target between 1 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Academic content

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_bn text not null,
  name_en text not null,
  description_bn text not null default '',
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.topics (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects (id) on delete cascade,
  slug text not null,
  name_bn text not null,
  name_en text not null default '',
  group_name text not null default '',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (subject_id, slug)
);
create index topics_subject_idx on public.topics (subject_id, position);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics (id) on delete cascade,
  level lesson_level not null default 'beginner',
  title text not null,
  summary text not null default '',
  sections jsonb not null default '[]',
  estimated_minutes integer not null default 15 check (estimated_minutes > 0),
  is_ai_written boolean not null default true,
  is_published boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (topic_id, level)
);

create table public.lesson_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

-- Questions. Correct answers sit in their own table that users cannot read.

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  external_id text not null unique,
  topic_id uuid not null references public.topics (id) on delete restrict,
  collection question_collection not null default 'practice',
  difficulty question_difficulty not null default 'easy',
  language text not null default 'bn' check (language in ('bn', 'en', 'mixed')),
  text text not null,
  source_label text not null default '',
  tags text[] not null default '{}',
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);
create index questions_topic_idx on public.questions (topic_id);
create index questions_filter_idx on public.questions (collection, difficulty) where is_published;

create table public.question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  position integer not null,
  text text not null,
  unique (question_id, position)
);

create table public.question_answers (
  question_id uuid primary key references public.questions (id) on delete cascade,
  correct_option_id uuid not null references public.question_options (id) on delete restrict,
  explanation_bn text not null default ''
);

create table public.bookmarks (
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

create table public.question_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  message text not null check (char_length(message) between 3 and 1000),
  created_at timestamptz not null default now()
);

-- Mock exam templates. Nothing about an exam's shape is hardcoded in the app.

create table public.mock_exams (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  duration_minutes integer not null check (duration_minutes > 0),
  pass_marks numeric(6, 2),
  source_note text not null default '',
  is_published boolean not null default true,
  position integer not null default 0
);

create table public.mock_exam_sections (
  id uuid primary key default gen_random_uuid(),
  mock_exam_id uuid not null references public.mock_exams (id) on delete cascade,
  name text not null,
  subject_slugs text[] not null,
  question_count integer not null check (question_count > 0),
  marks_per_question numeric(5, 2) not null default 1 check (marks_per_question > 0),
  negative_marks numeric(5, 2) not null default 0 check (negative_marks >= 0),
  position integer not null default 0,
  unique (mock_exam_id, position)
);

-- Attempts. Practice and mock exams share one engine and one pair of tables.

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mode attempt_mode not null,
  mock_exam_id uuid references public.mock_exams (id) on delete set null,
  title text not null,
  status attempt_status not null default 'in_progress',
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  submitted_at timestamptz,
  auto_submitted boolean not null default false,
  total_questions integer not null default 0,
  correct_count integer not null default 0,
  incorrect_count integer not null default 0,
  unanswered_count integer not null default 0,
  score numeric(7, 2) not null default 0,
  max_score numeric(7, 2) not null default 0
);
create index attempts_user_idx on public.attempts (user_id, started_at desc);

create table public.attempt_questions (
  attempt_id uuid not null references public.attempts (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete restrict,
  position integer not null,
  section_name text not null default '',
  marks numeric(5, 2) not null default 1,
  negative_marks numeric(5, 2) not null default 0,
  selected_option_id uuid references public.question_options (id) on delete set null,
  marked_for_review boolean not null default false,
  is_correct boolean,
  answered_at timestamptz,
  primary key (attempt_id, question_id),
  unique (attempt_id, position)
);
create index attempt_questions_question_idx on public.attempt_questions (question_id);

-- Row Level Security. Attempts are written only by server code after it checks
-- the owner and the deadline, so users get read access and nothing more.

alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.topics enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.questions enable row level security;
alter table public.question_options enable row level security;
alter table public.question_answers enable row level security;
alter table public.bookmarks enable row level security;
alter table public.question_reports enable row level security;
alter table public.mock_exams enable row level security;
alter table public.mock_exam_sections enable row level security;
alter table public.attempts enable row level security;
alter table public.attempt_questions enable row level security;

create policy "own profile read" on public.profiles for select to authenticated
  using (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "content read" on public.subjects for select to authenticated using (true);
create policy "content read" on public.topics for select to authenticated using (true);
create policy "content read" on public.lessons for select to authenticated using (is_published);
create policy "content read" on public.questions for select to authenticated using (is_published);
create policy "content read" on public.question_options for select to authenticated
  using (exists (select 1 from public.questions q where q.id = question_id and q.is_published));
create policy "content read" on public.mock_exams for select to authenticated using (is_published);
create policy "content read" on public.mock_exam_sections for select to authenticated using (true);

create policy "own progress read" on public.lesson_progress for select to authenticated
  using (user_id = auth.uid());
create policy "own progress add" on public.lesson_progress for insert to authenticated
  with check (user_id = auth.uid());
create policy "own progress remove" on public.lesson_progress for delete to authenticated
  using (user_id = auth.uid());

create policy "own bookmarks read" on public.bookmarks for select to authenticated
  using (user_id = auth.uid());
create policy "own bookmarks add" on public.bookmarks for insert to authenticated
  with check (user_id = auth.uid());
create policy "own bookmarks remove" on public.bookmarks for delete to authenticated
  using (user_id = auth.uid());

create policy "own reports read" on public.question_reports for select to authenticated
  using (user_id = auth.uid());
create policy "own reports add" on public.question_reports for insert to authenticated
  with check (user_id = auth.uid());

create policy "own attempts read" on public.attempts for select to authenticated
  using (user_id = auth.uid());
create policy "own attempt questions read" on public.attempt_questions for select to authenticated
  using (exists (select 1 from public.attempts a where a.id = attempt_id and a.user_id = auth.uid()));

-- question_answers has no policy on purpose: only the service role can read it.
