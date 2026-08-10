-- Миграция: два отдельных флага приватности профиля.
--
-- visible_in_search  — показывать ли меня в поиске специалистов по имени/
--                       специальности (найти меня напрямую).
-- network_visible    — показывать ли ТРЕТЬИМ ЛИЦАМ, кого я знаю (мои
--                       исходящие связи как requester), когда они раскрывают
--                       мой узел на графе. Прямым участникам конкретной
--                       связи она видна в любом случае — это не про них.

alter table profiles add column if not exists visible_in_search boolean not null default true;
alter table profiles add column if not exists network_visible boolean not null default true;

-- Поиск учитывает visible_in_search.
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

-- Публичная видимость связи (pending/confirmed третьим лицам) теперь ещё
-- зависит от network_visible того, кто её создал (requester) — выключил
-- флаг, и посторонние больше не видят, кого он знает. Двум участникам
-- связь видна в любом случае.
drop policy if exists "connections visible per recommendation model" on connections;

create policy "connections visible per recommendation model"
  on connections for select to authenticated
  using (
    (
      status in ('pending', 'confirmed')
      and exists (
        select 1 from profiles p
        where p.id = requester_id and p.network_visible
      )
    )
    or auth.uid() = requester_id
    or auth.uid() = addressee_id
  );
