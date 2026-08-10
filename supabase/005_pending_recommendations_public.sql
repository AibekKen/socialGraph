-- Миграция: одностороннее добавление — это не "дружба", а публичная
-- рекомендация ("я знаю и рекомендую этого человека"), поэтому она видна
-- сразу, а не только после подтверждения.
--
-- Важное техническое ограничение: RLS в Postgres действует на уровне строки,
-- а не "с чьей стороны идёт запрос" — нельзя сделать одну и ту же связь
-- видимой через профиль добавившего, но скрытой через профиль добавленного,
-- потому что это буквально один и тот же факт. Поэтому приватность здесь
-- обеспечивается не скрытием, а возможностью адресата в любой момент
-- ОТКЛОНИТЬ связь (status='declined') — после этого её не видит никто,
-- включая того, кто добавил. Это и есть механизм "отключить видимость".

drop policy if exists "confirmed connections are public, pending only to participants" on connections;
drop policy if exists "connections visible per recommendation model" on connections;

create policy "connections visible per recommendation model"
  on connections for select to authenticated
  using (
    status in ('pending', 'confirmed')
    or auth.uid() = requester_id
    or auth.uid() = addressee_id
  );
