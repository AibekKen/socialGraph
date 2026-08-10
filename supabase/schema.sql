-- socialGraphTree: schema
-- Модель: люди-узлы, связи знакомства (одностороннее приглашение -> подтверждение),
-- отзывы о специалистах, привязанные к конкретной связи (кто с кем знаком лично).

create extension if not exists "pgcrypto";

-- Профиль привязан 1:1 к auth.users
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  headline text,               -- напр. "Frontend-разработчик, 5 лет"
  city text,
  avatar_url text,
  phone text,
  whatsapp text,
  instagram text,
  share_contacts boolean not null default false, -- показывать ли контакты знакомым
  visible_in_search boolean not null default true, -- показывать ли меня в поиске
  network_visible boolean not null default true, -- видно ли третьим лицам, кого я знаю
  created_at timestamptz not null default now()
);

-- Специализации/теги (нормализованный список, чтобы поиск был по одинаковым тегам)
create table skills (
  id bigint generated always as identity primary key,
  name text not null unique
);

create table profile_skills (
  profile_id uuid not null references profiles(id) on delete cascade,
  skill_id bigint not null references skills(id) on delete cascade,
  primary key (profile_id, skill_id)
);

-- Связь знакомства: односторонняя заявка -> двустороннее подтверждение.
-- requester добавляет addressee; связь "не видна" в графе поиска, пока не confirmed.
create type connection_status as enum ('pending', 'confirmed', 'declined');

create table connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references profiles(id) on delete cascade,
  addressee_id uuid not null references profiles(id) on delete cascade,
  status connection_status not null default 'pending',
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  check (requester_id <> addressee_id),
  unique (requester_id, addressee_id)
);

-- Отзыв о специалисте оставляет тот, кто лично с ним знаком (есть confirmed-связь).
create table reviews (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles(id) on delete cascade,
  subject_id uuid not null references profiles(id) on delete cascade,
  connection_id uuid not null references connections(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (author_id, subject_id)
);

-- Приглашения людей, которых ещё нет в системе — приглашающий генерирует
-- ссылку и отправляет её сам (WhatsApp/Instagram/SMS, без платных API).
create table invites (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references profiles(id) on delete cascade,
  invitee_name text not null,
  invitee_contact text,
  token text not null unique default encode(gen_random_bytes(16), 'hex'),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired')),
  created_at timestamptz not null default now(),
  accepted_by uuid references profiles(id) on delete set null
);

create index connections_requester_idx on connections(requester_id);
create index connections_addressee_idx on connections(addressee_id);
create index reviews_subject_idx on reviews(subject_id);
create index invites_inviter_idx on invites(inviter_id);
create index invites_token_idx on invites(token);

-- Row Level Security -------------------------------------------------------

alter table profiles enable row level security;
alter table skills enable row level security;
alter table profile_skills enable row level security;
alter table connections enable row level security;
alter table reviews enable row level security;
alter table invites enable row level security;

-- Свою строку профиля видно полностью всегда; чужие — только через функции
-- get_public_profiles/search_profiles ниже, которые маскируют контакты по
-- share_contacts (иначе колонка была бы чисто визуальной, а не защитой).
create policy "user can read own full profile"
  on profiles for select to authenticated using (auth.uid() = id);
create policy "user can insert own profile"
  on profiles for insert to authenticated with check (auth.uid() = id);
create policy "user can update own profile"
  on profiles for update to authenticated using (auth.uid() = id);

create policy "skills are readable by authenticated users"
  on skills for select to authenticated using (true);
create policy "authenticated users can add skills"
  on skills for insert to authenticated with check (true);

create policy "profile_skills readable by authenticated users"
  on profile_skills for select to authenticated using (true);
create policy "user manages own profile_skills"
  on profile_skills for all to authenticated
  using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- Связи: pending и confirmed видны всем авторизованным — одностороннее
-- добавление это публичная рекомендация, а не приватная заявка (RLS не может
-- быть асимметричной "видно с одной стороны, не видно с другой" — это одна
-- и та же строка). Приватность обеспечивается тем, что адресат в любой
-- момент может отклонить (declined) — тогда связь не видит никто, включая
-- того, кто её создал. Плюс requester может выключить network_visible в
-- своём профиле — тогда посторонним не видно, кого он знает, вообще.
-- Создать заявку может только requester = сам себя, обновлять статус
-- (подтвердить/отклонить) — только addressee.
create policy "connections visible per recommendation model"
  on connections for select to authenticated
  using (
    (
      status in ('pending', 'confirmed')
      and exists (select 1 from profiles p where p.id = requester_id and p.network_visible)
    )
    or auth.uid() = requester_id
    or auth.uid() = addressee_id
  );
create policy "user creates own connection request"
  on connections for insert to authenticated
  with check (auth.uid() = requester_id);
create policy "addressee confirms or declines"
  on connections for update to authenticated
  using (auth.uid() = addressee_id)
  with check (auth.uid() = addressee_id);

-- Отзывы: читать может любой авторизованный. Оставить отзыв может только автор,
-- и только если связь между author и subject подтверждена (проверяется в with check).
create policy "reviews are readable by authenticated users"
  on reviews for select to authenticated using (true);
create policy "author can insert review for confirmed connection"
  on reviews for insert to authenticated
  with check (
    auth.uid() = author_id
    and exists (
      select 1 from connections c
      where c.id = connection_id
        and c.status = 'confirmed'
        and (
          (c.requester_id = author_id and c.addressee_id = subject_id)
          or (c.addressee_id = author_id and c.requester_id = subject_id)
        )
    )
  );
create policy "author can update own review"
  on reviews for update to authenticated using (auth.uid() = author_id);
create policy "author can delete own review"
  on reviews for delete to authenticated using (auth.uid() = author_id);

-- Приглашения: читать/создавать может только сам приглашающий. Принять
-- (pending -> accepted) может любой авторизованный, но только на себя —
-- токен и есть гейт доступа.
create policy "inviter can read own invites"
  on invites for select to authenticated using (auth.uid() = inviter_id);
create policy "inviter can create invites"
  on invites for insert to authenticated with check (auth.uid() = inviter_id);
create policy "authenticated user can accept a pending invite"
  on invites for update to authenticated
  using (status = 'pending')
  with check (status = 'accepted' and accepted_by = auth.uid());

-- Принятие приглашения создаёт connections(inviter -> новый пользователь) от
-- имени приглашающего, хотя действие выполняет приглашённый — обычная RLS
-- политика connections это не разрешит, поэтому нужна SECURITY DEFINER функция.
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

  update invites set status = 'accepted', accepted_by = auth.uid() where id = v_invite.id;

  insert into connections (requester_id, addressee_id, status)
  values (v_invite.inviter_id, auth.uid(), 'pending')
  on conflict (requester_id, addressee_id) do nothing;
end;
$$;

grant execute on function accept_invite(text) to authenticated;

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

-- Публичные данные людей: имя/специализация/фото — всегда, контакты — только
-- если share_contacts = true. ids = null возвращает всех.
create or replace function get_public_profiles(ids uuid[] default null)
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
  where ids is null or p.id = any(ids);
$$;

grant execute on function get_public_profiles(uuid[]) to authenticated;

-- Поиск людей по имени/специализации — тот же маскированный набор колонок.
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
  limit 20;
$$;

grant execute on function search_profiles(text) to authenticated;
