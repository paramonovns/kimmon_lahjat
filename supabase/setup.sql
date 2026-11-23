-- Run once in your chosen Supabase project's SQL Editor.
-- Isolated from the project's other tables and auth settings.
-- Anonymous capability tokens: 256 random bits, only their SHA-256 hashes persist.
-- No login or changes to Supabase Auth configuration are needed.
begin;

create schema if not exists kimmo_private;
revoke all on schema kimmo_private from public;
grant usage on schema kimmo_private to anon, authenticated;

create table kimmo_private.reservations_2026 (
  gift_id integer primary key check (gift_id between 7 and 15),
  owner_hash text not null check (owner_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now()
);
alter table kimmo_private.reservations_2026 enable row level security;
revoke all on table kimmo_private.reservations_2026 from public, anon, authenticated;

-- SECURITY DEFINER is intentional: the table and owner hashes are private.
-- The narrow function validates actions, gift IDs and secret ownership tokens.
-- Public clients receive gift IDs and boolean flags, never hashes or tokens.
create function kimmo_private.gifts_2026(
  p_action text,
  p_gift_id integer,
  p_token text
)
returns table (gift_id integer, busy boolean, mine boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hash text;
  v_changed integer;
begin
  if p_action is null or p_action not in ('list', 'reserve', 'release') then
    raise exception 'Invalid action' using errcode = '22023';
  end if;
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid owner token' using errcode = '22023';
  end if;
  v_hash := pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p_token, 'UTF8')), 'hex');

  if p_action <> 'list' then
    if p_gift_id is null or p_gift_id < 7 or p_gift_id > 15 then
      raise exception 'Invalid gift' using errcode = '22023';
    end if;

    if p_action = 'reserve' then
      insert into kimmo_private.reservations_2026 as current_reservation (gift_id, owner_hash)
      values (p_gift_id, v_hash)
      on conflict on constraint reservations_2026_pkey
      do update set owner_hash = excluded.owner_hash
      where current_reservation.owner_hash = excluded.owner_hash;
      get diagnostics v_changed = row_count;
      if v_changed = 0 then
        raise exception 'Gift is already reserved' using errcode = '23505';
      end if;
    else
      delete from kimmo_private.reservations_2026 as r
      where r.gift_id = p_gift_id and r.owner_hash = v_hash;
    end if;
  end if;

  return query
    select g.id, r.gift_id is not null, coalesce(r.owner_hash = v_hash, false)
    from pg_catalog.generate_series(7, 15) as g(id)
    left join kimmo_private.reservations_2026 as r on r.gift_id = g.id
    order by g.id;
end;
$$;
revoke all on function kimmo_private.gifts_2026(text, integer, text) from public, anon, authenticated;
grant execute on function kimmo_private.gifts_2026(text, integer, text) to anon, authenticated;

-- Exposed RPC is SECURITY INVOKER, with only the narrow private API accessible.
create function public.kimmo_gifts(
  p_action text default 'list',
  p_gift_id integer default null,
  p_token text default null
)
returns table (gift_id integer, busy boolean, mine boolean)
language sql
security invoker
set search_path = ''
as $$ select * from kimmo_private.gifts_2026(p_action, p_gift_id, p_token); $$;
revoke all on function public.kimmo_gifts(text, integer, text) from public, anon, authenticated;
grant execute on function public.kimmo_gifts(text, integer, text) to anon, authenticated;
comment on function public.kimmo_gifts(text, integer, text) is
  'Kimmo Christmas 2026: intentional public gift-status API, mutations require an unguessable browser token. No owner identifiers returned.';

notify pgrst, 'reload schema';
commit;
