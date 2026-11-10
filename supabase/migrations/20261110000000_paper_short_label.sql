-- Short exam code shown as a badge on each past-paper question, e.g. "BCS-41".
alter table public.examination_papers
  add column short_label text not null default '';
