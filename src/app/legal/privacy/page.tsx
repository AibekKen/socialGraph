import Link from "next/link";

export const metadata = {
  title: "Обработка персональных данных",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 text-sm leading-relaxed text-gray-700">
      <Link href="/signup" className="mb-6 inline-block text-indigo-600 hover:underline">
        ← Назад
      </Link>

      <h1 className="mb-1 text-xl font-semibold text-gray-900">
        Согласие на обработку персональных данных
      </h1>
      <p className="mb-6 text-xs text-gray-400">Последнее обновление: {new Date().toLocaleDateString("ru-RU")}</p>

      <h2 className="mb-2 mt-6 font-medium text-gray-900">1. Какие данные мы собираем</h2>
      <ul className="mb-4 list-disc space-y-1 pl-5">
        <li>Имя и email — при регистрации</li>
        <li>Специализация/род деятельности — если вы её укажете</li>
        <li>Телефон, WhatsApp, Instagram — если вы их укажете в профиле</li>
        <li>Информация о ваших связях (кто с кем знаком) и оставленные вами отзывы о знакомых</li>
        <li>При входе через Google — имя, email и фото профиля, предоставленные Google</li>
      </ul>

      <h2 className="mb-2 mt-6 font-medium text-gray-900">2. Зачем это нужно</h2>
      <p className="mb-4">
        Данные используются для работы сервиса: чтобы вас могли найти через общих знакомых,
        показать ваш профиль другим пользователям сети и связать вас с приглашённым контактом.
        Мы не используем ваши данные для рекламы третьих лиц и не продаём их.
      </p>

      <h2 className="mb-2 mt-6 font-medium text-gray-900">3. Кому видны данные</h2>
      <ul className="mb-4 list-disc space-y-1 pl-5">
        <li>Имя, специализация и сам факт связи — видны другим авторизованным пользователям сети</li>
        <li>
          Телефон, WhatsApp и Instagram — видны другим пользователям только если вы включили
          переключатель «Показывать мои контакты знакомым» в профиле
        </li>
        <li>Email нигде, кроме вашего аккаунта, не отображается</li>
      </ul>

      <h2 className="mb-2 mt-6 font-medium text-gray-900">4. Где хранятся данные</h2>
      <p className="mb-4">
        Данные хранятся в облачной базе данных с разграничением доступа — каждый пользователь
        может редактировать только свой профиль и свои связи.
      </p>

      <h2 className="mb-2 mt-6 font-medium text-gray-900">5. Ваши права</h2>
      <p className="mb-4">
        Вы можете в любой момент изменить или удалить данные своего профиля на странице{" "}
        <Link href="/profile" className="text-indigo-600 hover:underline">
          «Профиль»
        </Link>
        , отозвать согласие на показ контактов (выключив переключатель) или запросить полное
        удаление аккаунта, написав нам.
      </p>

      <h2 className="mb-2 mt-6 font-medium text-gray-900">6. Согласие</h2>
      <p className="mb-4">
        Регистрируясь, вы подтверждаете, что ознакомлены с этим документом и даёте согласие
        на обработку указанных выше персональных данных в описанных целях.
      </p>
    </div>
  );
}
