-- Backgammon Rush migration matching supabase/schema.sql
-- Use this if you prefer a migration-based Supabase setup instead of the quick one-file schema import.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  username text not null,
  city text not null default 'Almaty',
  avatar_url text,
  level integer not null default 1,
  rating integer not null default 1200,
  wins integer not null default 0,
  losses integer not null default 0,
  favorite_vibe_room text,
  subscription_status text not null default 'free' check (subscription_status in ('free', 'trial', 'pro', 'expired')),
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  pro_until timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.matches (
  id text primary key,
  mode text not null check (mode in ('quick', 'bot', 'ranked', 'friend', 'tournament')),
  player_white_id uuid references public.profiles(id) on delete set null,
  player_black_id uuid references public.profiles(id) on delete set null,
  bot_personality text check (bot_personality in ('Chill', 'Tactical', 'Aggressive')),
  room_id text,
  status text not null default 'waiting' check (status in ('waiting', 'active', 'finished')),
  winner_id uuid references public.profiles(id) on delete set null,
  ended_early boolean not null default false,
  forfeit_by text check (forfeit_by in ('white', 'black')),
  rating_delta integer not null default 0,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists public.moves (
  id text primary key,
  match_id text not null references public.matches(id) on delete cascade,
  player text not null check (player in ('white', 'black')),
  from_point text not null,
  to_point text not null,
  die integer not null check (die between 1 and 6),
  hit boolean not null default false,
  borne_off boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.leaderboard_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  display_name text not null,
  city text not null default 'Almaty',
  rating integer not null default 1200,
  wins integer not null default 0,
  streak integer not null default 0,
  rank integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.statistics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  matches_played integer not null default 0,
  quick_wins integer not null default 0,
  best_streak integer not null default 0,
  average_move_quality numeric(4, 2) not null default 0,
  favorite_mode text not null default 'quick' check (favorite_mode in ('quick', 'bot', 'ranked', 'friend', 'tournament'))
);

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null,
  unlocked_at timestamptz
);

create table if not exists public.rooms (
  id text primary key,
  created_by uuid not null references public.profiles(id) on delete cascade,
  player_white_id uuid references public.profiles(id) on delete set null,
  player_black_id uuid references public.profiles(id) on delete set null,
  status text not null default 'waiting' check (status in ('waiting', 'active', 'finished')),
  snapshot jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.purchases (
  id text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan text not null check (plan in ('pro', 'pro-trial', 'tournament-pack')),
  amount integer not null default 0,
  currency text not null default 'USD',
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'trial')),
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.matches enable row level security;
alter table public.moves enable row level security;
alter table public.leaderboard_entries enable row level security;
alter table public.statistics enable row level security;
alter table public.achievements enable row level security;
alter table public.rooms enable row level security;
alter table public.purchases enable row level security;

drop policy if exists "Profiles are readable" on public.profiles;
drop policy if exists "Profiles are insertable by owner" on public.profiles;
drop policy if exists "Profiles are editable by owner" on public.profiles;
drop policy if exists "Public leaderboard is readable" on public.leaderboard_entries;
drop policy if exists "Owner leaderboard is writable" on public.leaderboard_entries;
drop policy if exists "Statistics are readable" on public.statistics;
drop policy if exists "Statistics are writable by owner" on public.statistics;
drop policy if exists "Achievements are readable" on public.achievements;
drop policy if exists "Achievements are writable by owner" on public.achievements;
drop policy if exists "Matches readable by participants" on public.matches;
drop policy if exists "Matches writable by participants" on public.matches;
drop policy if exists "Moves readable by participants" on public.moves;
drop policy if exists "Moves writable by participants" on public.moves;
drop policy if exists "Rooms readable by participants" on public.rooms;
drop policy if exists "Rooms writable by creator" on public.rooms;
drop policy if exists "Purchases readable by owner" on public.purchases;
drop policy if exists "Purchases writable by owner" on public.purchases;

create policy "Profiles are readable" on public.profiles
  for select using (true);

create policy "Profiles are insertable by owner" on public.profiles
  for insert with check (auth.uid() = id);

create policy "Profiles are editable by owner" on public.profiles
  for update using (auth.uid() = id);

create policy "Public leaderboard is readable" on public.leaderboard_entries
  for select using (true);

create policy "Owner leaderboard is writable" on public.leaderboard_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Statistics are readable" on public.statistics
  for select using (true);

create policy "Statistics are writable by owner" on public.statistics
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Achievements are readable" on public.achievements
  for select using (true);

create policy "Achievements are writable by owner" on public.achievements
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Matches readable by participants" on public.matches
  for select using (auth.uid() = player_white_id or auth.uid() = player_black_id);

create policy "Matches writable by participants" on public.matches
  for insert with check (auth.uid() = player_white_id or auth.uid() = player_black_id);

create policy "Matches update by participants" on public.matches
  for update using (auth.uid() = player_white_id or auth.uid() = player_black_id);

create policy "Moves readable by participants" on public.moves
  for select using (
    exists (
      select 1 from public.matches m
      where m.id = moves.match_id
        and (m.player_white_id = auth.uid() or m.player_black_id = auth.uid())
    )
  );

create policy "Moves writable by participants" on public.moves
  for insert with check (
    exists (
      select 1 from public.matches m
      where m.id = moves.match_id
        and (m.player_white_id = auth.uid() or m.player_black_id = auth.uid())
    )
  );

create policy "Rooms readable by participants" on public.rooms
  for select using (
    created_by = auth.uid() or player_white_id = auth.uid() or player_black_id = auth.uid()
  );

create policy "Rooms writable by creator" on public.rooms
  for insert with check (created_by = auth.uid());

create policy "Rooms update by creator" on public.rooms
  for update using (created_by = auth.uid());

create policy "Purchases readable by owner" on public.purchases
  for select using (auth.uid() = user_id);

create policy "Purchases writable by owner" on public.purchases
  for insert with check (auth.uid() = user_id);

create policy "Purchases updatable by owner" on public.purchases
  for update using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (
    id,
    email,
    username,
    city,
    avatar_url,
    level,
    rating,
    wins,
    losses,
    favorite_vibe_room,
    subscription_status,
    trial_started_at,
    trial_ends_at,
    pro_until
  )
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1), 'Player'),
    coalesce(new.raw_user_meta_data->>'city', 'Almaty'),
    new.raw_user_meta_data->>'avatar_url',
    1,
    1200,
    0,
    0,
    coalesce(new.raw_user_meta_data->>'favorite_vibe_room', 'grass-picnic'),
    coalesce(new.raw_user_meta_data->>'subscription_status', 'free'),
    null,
    null,
    null
  )
  on conflict (id) do update
    set email = excluded.email,
        username = excluded.username,
        city = excluded.city,
        avatar_url = excluded.avatar_url,
        favorite_vibe_room = excluded.favorite_vibe_room,
        subscription_status = excluded.subscription_status,
        trial_started_at = excluded.trial_started_at,
        trial_ends_at = excluded.trial_ends_at,
        pro_until = excluded.pro_until;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists update_leaderboard_updated_at on public.leaderboard_entries;
create trigger update_leaderboard_updated_at
  before update on public.leaderboard_entries
  for each row execute function public.update_updated_at_column();

drop trigger if exists update_rooms_updated_at on public.rooms;
create trigger update_rooms_updated_at
  before update on public.rooms
  for each row execute function public.update_updated_at_column();
