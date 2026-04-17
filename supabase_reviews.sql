-- Run this in your Supabase SQL Editor
create table if not exists reviews (
  id uuid default gen_random_uuid() primary key,
  author_name text not null,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text not null,
  product_name text,
  approved boolean default true,
  source text default 'admin' check (source in ('admin', 'customer')),
  created_at timestamptz default now()
);

alter table reviews enable row level security;

create policy "Public can read approved reviews"
  on reviews for select using (approved = true);

create policy "Anyone can insert a review"
  on reviews for insert with check (true);

create policy "Service role full access"
  on reviews using (true);
