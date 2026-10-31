-- My Mistakes: one row per user and question, with its spaced-repetition state.

create table public.mistake_notebook (
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  wrong_count integer not null default 1 check (wrong_count > 0),
  last_wrong_at timestamptz not null default now(),
  interval_step integer not null default 0 check (interval_step >= 0),
  next_review_at timestamptz not null,
  resolved_at timestamptz,
  primary key (user_id, question_id)
);
create index mistake_notebook_due_idx on public.mistake_notebook (user_id, next_review_at)
  where resolved_at is null;

alter table public.mistake_notebook enable row level security;
create policy "own mistakes read" on public.mistake_notebook for select to authenticated
  using (user_id = auth.uid());

-- Bring in mistakes from attempts made before this table existed.
insert into public.mistake_notebook (user_id, question_id, wrong_count, last_wrong_at, next_review_at)
select a.user_id, q.question_id, count(*), max(a.submitted_at), max(a.submitted_at) + interval '1 day'
from public.attempt_questions q
join public.attempts a on a.id = q.attempt_id
where q.is_correct = false and a.status = 'submitted'
group by a.user_id, q.question_id;
