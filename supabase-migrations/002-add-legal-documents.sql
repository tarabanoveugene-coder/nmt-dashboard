-- Legal documents (Terms of Service + Privacy Policy)
-- Editable via admin dashboard, fetched by the Flutter app at runtime.

create table if not exists legal_documents (
  id              text primary key,           -- 'terms_of_service' | 'privacy_policy'
  title           text not null,
  content         text not null default '',   -- markdown: # heading, ## subheading, - bullet, blank=paragraph break
  version         text not null default '1.0',
  last_updated    text not null default '',
  effective_date  text not null default '',
  updated_at      timestamptz not null default now(),
  updated_by      text
);

alter table legal_documents enable row level security;

drop policy if exists "public read legal" on legal_documents;
create policy "public read legal"
  on legal_documents for select
  using (true);

drop policy if exists "anon write legal" on legal_documents;
create policy "anon write legal"
  on legal_documents for all
  using (true) with check (true);

insert into legal_documents (id, title, version, last_updated, effective_date)
values
  ('terms_of_service',  'Умови використання',         '1.0', '17 квітня 2026 р.', '17 квітня 2026 р.'),
  ('privacy_policy',    'Політика конфіденційності',  '1.0', '17 квітня 2026 р.', '17 квітня 2026 р.')
on conflict (id) do nothing;
