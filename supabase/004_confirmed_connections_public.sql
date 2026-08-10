-- Миграция: подтверждённые связи видны всем авторизованным (иначе граф
-- физически нельзя обойти дальше своей прямой связи — RLS блокирует). А ещё
-- закрываем прямой доступ к чужим profiles: сейчас политика "true" отдаёт
-- ЛЮБОМУ авторизованному все колонки, включая телефон/WhatsApp/Instagram,
-- даже если владелец выключил share_contacts — переключатель в профиле был
-- чисто визуальным, а не реальной защитой. Теперь свою строку видно
-- полностью всегда, а чужие данные идут только через функции ниже, которые
-- маскируют контакты по share_contacts.

-- Связи -----------------------------------------------------------------

drop policy if exists "participants can read connection" on connections;
drop policy if exists "confirmed connections are public, pending only to participants" on connections;

create policy "confirmed connections are public, pending only to participants"
  on connections for select to authenticated
  using (
    status = 'confirmed'
    or auth.uid() = requester_id
    or auth.uid() = addressee_id
  );

-- Профили -----------------------------------------------------------------

drop policy if exists "profiles are readable by authenticated users" on profiles;
drop policy if exists "user can read own full profile" on profiles;

create policy "user can read own full profile"
  on profiles for select to authenticated
  using (auth.uid() = id);

-- Публичные данные людей: имя/специализация/фото — всегда, контакты — только
-- если share_contacts = true. Идентификаторы можно не указывать (тогда вернёт
-- всех), либо передать конкретный список.
create or replace function get_public_profiles(ids uuid[] default null)
returns table (
  id uuid,
  full_name text,
  headline text,
  avatar_url text,
  share_contacts boolean,
  phone text,
  whatsapp text,
  instagram text
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
  where ids is null or p.id = any(ids);
$$;

grant execute on function get_public_profiles(uuid[]) to authenticated;

-- Поиск людей по имени/специализации — тот же маскированный набор колонок.
create or replace function search_profiles(q text)
returns table (
  id uuid,
  full_name text,
  headline text,
  avatar_url text,
  share_contacts boolean,
  phone text,
  whatsapp text,
  instagram text
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
  where p.full_name ilike '%' || q || '%' or p.headline ilike '%' || q || '%'
  limit 20;
$$;

grant execute on function search_profiles(text) to authenticated;

-- Поиск кратчайшего пути между двумя людьми по подтверждённым связям —
-- считается на сервере, клиенту отдаётся только готовый путь, а не весь граф.
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
