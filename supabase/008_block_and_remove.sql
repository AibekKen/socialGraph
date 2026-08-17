-- Миграция: удаление связи из круга и блокировка человека.
-- Выполнить в Supabase SQL Editor после 007_headline_autocomplete.sql.
--
-- "Удалить из круга" — разрывает connections между двумя людьми. Раньше
-- убрать подтверждённую связь мог только addressee через declined —
-- ни одна из сторон не могла просто выйти из круга по своей инициативе,
-- поэтому нужна отдельная delete-политика для обоих участников.
--
-- "Заблокировать" — то же самое + запись в blocks, которая: (1) не даёт
-- заблокированному прислать новую заявку, (2) прячет от блокирующего любую
-- связь, касающуюся заблокированного, даже через общих знакомых, (3) прячет
-- заблокированного из поиска специалистов, (4) исключается при поиске
-- кратчайшего пути (find_path).

create table if not exists blocks (
  blocker_id uuid not null references profiles(id) on delete cascade,
  blocked_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index if not exists blocks_blocked_idx on blocks(blocked_id);

alter table blocks enable row level security;

-- Список заблокированных виден только тому, кто блокировал — иначе
-- заблокированный узнает, что его заблокировали.
drop policy if exists "user reads own blocks" on blocks;
create policy "user reads own blocks"
  on blocks for select to authenticated using (auth.uid() = blocker_id);

drop policy if exists "user creates own block" on blocks;
create policy "user creates own block"
  on blocks for insert to authenticated with check (auth.uid() = blocker_id);

drop policy if exists "user deletes own block" on blocks;
create policy "user deletes own block"
  on blocks for delete to authenticated using (auth.uid() = blocker_id);

-- Любой участник может удалить свою связь напрямую (выйти из круга).
drop policy if exists "participant can delete own connection" on connections;
create policy "participant can delete own connection"
  on connections for delete to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- Заявку нельзя создать, если между людьми есть блокировка в любую сторону.
drop policy if exists "user creates own connection request" on connections;
create policy "user creates own connection request"
  on connections for insert to authenticated
  with check (
    auth.uid() = requester_id
    and not exists (
      select 1 from blocks b
      where (b.blocker_id = requester_id and b.blocked_id = addressee_id)
         or (b.blocker_id = addressee_id and b.blocked_id = requester_id)
    )
  );

-- Видимость связей третьих лиц: прячем от текущего пользователя любую связь,
-- где участвует человек, находящийся с ним в блокировке (в любую сторону) —
-- иначе заблокированный всё равно всплывает через общих знакомых на графе.
drop policy if exists "connections visible per recommendation model" on connections;
create policy "connections visible per recommendation model"
  on connections for select to authenticated
  using (
    (
      status in ('pending', 'confirmed')
      and exists (select 1 from profiles p where p.id = requester_id and p.network_visible)
      and not exists (
        select 1 from blocks b
        where (b.blocker_id = auth.uid() and b.blocked_id in (requester_id, addressee_id))
           or (b.blocked_id = auth.uid() and b.blocker_id in (requester_id, addressee_id))
      )
    )
    or auth.uid() = requester_id
    or auth.uid() = addressee_id
  );

-- Заблокировать: фиксируем блокировку и сразу разрываем связь между людьми
-- (requester/addressee могли быть в любом порядке).
create or replace function block_person(p_blocked_id uuid)
returns void
language plpgsql
set search_path = public
as $$
begin
  if p_blocked_id = auth.uid() then
    raise exception 'Нельзя заблокировать самого себя';
  end if;

  insert into blocks (blocker_id, blocked_id)
  values (auth.uid(), p_blocked_id)
  on conflict (blocker_id, blocked_id) do nothing;

  delete from connections
  where (requester_id = auth.uid() and addressee_id = p_blocked_id)
     or (requester_id = p_blocked_id and addressee_id = auth.uid());
end;
$$;

grant execute on function block_person(uuid) to authenticated;

-- Поиск специалистов не должен показывать никого, с кем есть блокировка
-- в любую сторону.
create or replace function search_profiles(q text)
returns table (
  id uuid, full_name text, headline text, avatar_url text,
  share_contacts boolean, phone text, whatsapp text, instagram text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id, p.full_name, p.headline, p.avatar_url, p.share_contacts,
    case when p.share_contacts then p.phone else null end,
    case when p.share_contacts then p.whatsapp else null end,
    case when p.share_contacts then p.instagram else null end
  from profiles p
  where p.visible_in_search
    and (p.full_name ilike '%' || q || '%' or p.headline ilike '%' || q || '%')
    and not exists (
      select 1 from blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = p.id)
         or (b.blocked_id = auth.uid() and b.blocker_id = p.id)
    )
  limit 20;
$$;

grant execute on function search_profiles(text) to authenticated;

-- Кратчайший путь не должен проходить через людей, состоящих в блокировке
-- с искателем (from_id), в любую сторону.
create or replace function find_path(from_id uuid, to_id uuid)
returns uuid[]
language plpgsql
security definer
set search_path = public
as $$
declare
  result uuid[];
begin
  if from_id = to_id then
    return array[from_id];
  end if;

  with recursive search(current_id, path, depth) as (
    select from_id, array[from_id], 0

    union all

    select
      case when c.requester_id = s.current_id then c.addressee_id else c.requester_id end,
      s.path || case when c.requester_id = s.current_id then c.addressee_id else c.requester_id end,
      s.depth + 1
    from connections c
    join search s on (c.requester_id = s.current_id or c.addressee_id = s.current_id)
    where c.status = 'confirmed'
      and s.depth < 6
      and not (case when c.requester_id = s.current_id then c.addressee_id else c.requester_id end = any(s.path))
      and (case when c.requester_id = s.current_id then c.addressee_id else c.requester_id end) not in (
        select blocked_id from blocks where blocker_id = from_id
        union
        select blocker_id from blocks where blocked_id = from_id
      )
  )
  select path into result
  from search
  where current_id = to_id
  order by depth
  limit 1;

  return result;
end;
$$;

grant execute on function find_path(uuid, uuid) to authenticated;

-- Принятие приглашения тоже не должно создавать связь, если между
-- пригласившим и принимающим уже есть блокировка.
create or replace function accept_invite(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite invites%rowtype;
begin
  select * into v_invite from invites where token = p_token and status = 'pending' for update;

  if not found then
    raise exception 'Приглашение не найдено или уже использовано';
  end if;

  if v_invite.inviter_id = auth.uid() then
    raise exception 'Нельзя принять собственное приглашение';
  end if;

  if exists (
    select 1 from blocks b
    where (b.blocker_id = v_invite.inviter_id and b.blocked_id = auth.uid())
       or (b.blocker_id = auth.uid() and b.blocked_id = v_invite.inviter_id)
  ) then
    raise exception 'Невозможно принять это приглашение';
  end if;

  update invites set status = 'accepted', accepted_by = auth.uid() where id = v_invite.id;

  insert into connections (requester_id, addressee_id, status)
  values (v_invite.inviter_id, auth.uid(), 'pending')
  on conflict (requester_id, addressee_id) do nothing;
end;
$$;

grant execute on function accept_invite(text) to authenticated;
