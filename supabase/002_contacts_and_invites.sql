-- Миграция: контакты профиля + приглашения людей, которых ещё нет в системе.
-- Выполнить в Supabase SQL Editor после schema.sql.

-- Контакты и настройка приватности ------------------------------------------

alter table profiles add column if not exists phone text;
alter table profiles add column if not exists whatsapp text;
alter table profiles add column if not exists instagram text;
alter table profiles add column if not exists share_contacts boolean not null default false;

-- Приглашения ------------------------------------------------------------

-- Человек, которого приглашающий добавляет, но которого ещё нет в системе.
-- Приглашающий генерирует ссылку и отправляет её сам (WhatsApp/Instagram/SMS —
-- вручную, без интеграции с платными API). Когда приглашённый регистрируется
-- по ссылке, invite превращается в обычный pending-connections.
create table if not exists invites (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references profiles(id) on delete cascade,
  invitee_name text not null,
  invitee_contact text,
  token text not null unique default encode(gen_random_bytes(16), 'hex'),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired')),
  created_at timestamptz not null default now(),
  accepted_by uuid references profiles(id) on delete set null
);

create index if not exists invites_inviter_idx on invites(inviter_id);
create index if not exists invites_token_idx on invites(token);

alter table invites enable row level security;

drop policy if exists "inviter can read own invites" on invites;
create policy "inviter can read own invites"
  on invites for select to authenticated using (auth.uid() = inviter_id);

drop policy if exists "inviter can create invites" on invites;
create policy "inviter can create invites"
  on invites for insert to authenticated with check (auth.uid() = inviter_id);

-- Принять приглашение может любой авторизованный (гейт — сам непредсказуемый
-- токен), но только перевести из pending в accepted и только на себя.
drop policy if exists "authenticated user can accept a pending invite" on invites;
create policy "authenticated user can accept a pending invite"
  on invites for update to authenticated
  using (status = 'pending')
  with check (status = 'accepted' and accepted_by = auth.uid());

-- Принятие приглашения: создаёт connections(inviter -> новый пользователь) от
-- имени приглашающего, хотя выполняет её приглашённый. Обычная RLS-политика
-- connections этого не разрешит (auth.uid() должен быть requester_id), поэтому
-- нужна SECURITY DEFINER функция с контролируемой логикой.
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
