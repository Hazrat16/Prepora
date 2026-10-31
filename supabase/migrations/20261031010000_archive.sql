-- Historical archive: real exam papers and how far each question is verified.

create type verification_status as enum (
  'verified_official', 'verified_secondary', 'unverified', 'needs_review'
);

alter table public.questions
  add column verification_status verification_status,
  add column original_text text,
  add column source_url text not null default '',
  add constraint previous_year_has_status
    check (collection <> 'previous_year' or verification_status is not null);

create table public.examination_papers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  exam_type text not null default 'primary',
  year integer not null,
  exam_date date,
  phase text not null default '',
  region text not null default '',
  full_marks numeric(6, 2),
  duration_minutes integer check (duration_minutes > 0),
  negative_marks numeric(5, 2) not null default 0 check (negative_marks >= 0),
  is_complete boolean not null default false,
  source_name text not null,
  source_url text not null default '',
  collected_on date not null default current_date,
  created_at timestamptz not null default now()
);
create index examination_papers_year_idx on public.examination_papers (year desc);

create table public.examination_paper_questions (
  paper_id uuid not null references public.examination_papers (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  position integer not null,
  primary key (paper_id, question_id),
  unique (paper_id, position)
);
create index examination_paper_questions_question_idx on public.examination_paper_questions (question_id);

alter table public.examination_papers enable row level security;
alter table public.examination_paper_questions enable row level security;

create policy "content read" on public.examination_papers for select to authenticated using (true);
create policy "content read" on public.examination_paper_questions for select to authenticated using (true);
