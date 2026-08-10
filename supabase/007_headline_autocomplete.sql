-- Автокомплит поля "Специализация" в профиле: список уже используемых
-- значений (для подсказки), но ввод остаётся свободным текстом — если
-- подходящего нет, просто сохраняется новое значение.
create or replace function list_headlines()
returns table (headline text)
language sql
security definer
set search_path = public
stable
as $$
  select distinct p.headline
  from profiles p
  where p.headline is not null and p.headline <> ''
  order by p.headline
  limit 200;
$$;

grant execute on function list_headlines() to authenticated;
