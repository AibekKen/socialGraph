"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatPhoneMask } from "@/lib/phone";

type ProfileForm = {
  fullName: string;
  headline: string;
  phone: string;
  whatsapp: string;
  instagram: string;
  shareContacts: boolean;
  visibleInSearch: boolean;
  networkVisible: boolean;
};

const EMPTY: ProfileForm = {
  fullName: "",
  headline: "",
  phone: "",
  whatsapp: "",
  instagram: "",
  shareContacts: false,
  visibleInSearch: true,
  networkVisible: true,
};

export default function ProfilePage() {
  const router = useRouter();
  const [form, setForm] = useState<ProfileForm>(EMPTY);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [headlineOptions, setHeadlineOptions] = useState<string[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase.rpc("list_headlines").then(({ data }) => {
      setHeadlineOptions(((data ?? []) as { headline: string }[]).map((r) => r.headline));
    });
  }, []);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUserId(user.id);

      const { data } = await supabase
        .from("profiles")
        .select(
          "full_name, headline, phone, whatsapp, instagram, share_contacts, avatar_url, visible_in_search, network_visible"
        )
        .eq("id", user.id)
        .maybeSingle();

      if (data) {
        setForm({
          fullName: data.full_name ?? "",
          headline: data.headline ?? "",
          phone: data.phone ?? "",
          whatsapp: data.whatsapp ?? "",
          instagram: data.instagram ?? "",
          shareContacts: data.share_contacts ?? false,
          visibleInSearch: data.visible_in_search ?? true,
          networkVisible: data.network_visible ?? true,
        });
        setAvatarUrl(data.avatar_url ?? null);
      }
      setLoading(false);
    })();
  }, []);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    if (!file.type.startsWith("image/")) {
      setAvatarError("Нужен файл изображения");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError("Файл больше 5 МБ");
      return;
    }

    setAvatarError(null);
    setAvatarUploading(true);

    const supabase = createClient();
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, cacheControl: "3600" });

    if (uploadError) {
      setAvatarUploading(false);
      setAvatarError(uploadError.message);
      return;
    }

    const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(path);
    // добавляем метку времени, чтобы обойти кэш браузера/CDN на этот же путь
    const freshUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

    const { error: saveError } = await supabase
      .from("profiles")
      .upsert({ id: userId, full_name: form.fullName || "Без имени", avatar_url: freshUrl });

    setAvatarUploading(false);

    if (saveError) {
      setAvatarError(`Файл загружен, но не сохранился в профиле: ${saveError.message}`);
      return;
    }

    setAvatarUrl(freshUrl);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: form.fullName,
      headline: form.headline || null,
      phone: form.phone || null,
      whatsapp: form.whatsapp || null,
      instagram: form.instagram || null,
      share_contacts: form.shareContacts,
      visible_in_search: form.visibleInSearch,
      network_visible: form.networkVisible,
    });

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSaved(true);
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const hasAnyContact = form.phone || form.whatsapp || form.instagram;

  if (loading) {
    return <div className="flex min-h-dvh items-center justify-center text-sm text-gray-500">Загрузка…</div>;
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gray-50 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Профиль</h1>
          <Link
            href="/graph"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-indigo-300 text-indigo-700 hover:bg-indigo-50"
            aria-label="К графу"
            title="К графу"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </Link>
        </div>

        <div className="mb-5 flex items-center gap-4">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-gray-100">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="Аватар" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xl font-medium text-gray-400">
                {form.fullName ? form.fullName[0].toUpperCase() : "?"}
              </div>
            )}
          </div>
          <div>
            <label className="inline-block cursor-pointer rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
              {avatarUploading ? "Загружаем…" : "Загрузить фото"}
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                disabled={avatarUploading}
                className="hidden"
              />
            </label>
            {avatarError && <p className="mt-1 text-xs text-red-600">{avatarError}</p>}
          </div>
        </div>

        <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="fullName">
          Имя
        </label>
        <input
          id="fullName"
          type="text"
          required
          value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          className="mb-3 min-h-[40px] w-full rounded border border-gray-300 px-3 text-base"
        />

        <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="headline">
          Специализация
        </label>
        <input
          id="headline"
          type="text"
          list="headline-options"
          value={form.headline}
          onChange={(e) => setForm({ ...form, headline: e.target.value })}
          className="mb-4 min-h-[40px] w-full rounded border border-gray-300 px-3 text-base"
          placeholder="Профессия"
          autoComplete="off"
        />
        <datalist id="headline-options">
          {headlineOptions.map((h) => (
            <option key={h} value={h} />
          ))}
        </datalist>

        <div className="mb-4 border-t border-gray-100 pt-4">
          <p className="mb-3 text-sm font-medium text-gray-700">Контакты</p>

          <label className="mb-1 block text-xs text-gray-500" htmlFor="phone">
            Телефон
          </label>
          <input
            id="phone"
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: formatPhoneMask(e.target.value) })}
            className="mb-3 min-h-[40px] w-full rounded border border-gray-300 px-3 text-base"
            placeholder="+7 700 000-00-00"
          />

          <label className="mb-1 block text-xs text-gray-500" htmlFor="whatsapp">
            WhatsApp
          </label>
          <input
            id="whatsapp"
            type="tel"
            value={form.whatsapp}
            onChange={(e) => setForm({ ...form, whatsapp: formatPhoneMask(e.target.value) })}
            className="mb-3 min-h-[40px] w-full rounded border border-gray-300 px-3 text-base"
            placeholder="+7 700 000-00-00"
          />

          <label className="mb-1 block text-xs text-gray-500" htmlFor="instagram">
            Instagram
          </label>
          <input
            id="instagram"
            type="text"
            value={form.instagram}
            onChange={(e) => setForm({ ...form, instagram: e.target.value })}
            className="mb-3 min-h-[40px] w-full rounded border border-gray-300 px-3 text-base"
            placeholder="@username"
          />
        </div>

        <div className="mb-4 space-y-2">
          <p className="text-sm font-medium text-gray-700">Приватность</p>

          <label className="flex items-start gap-2 rounded bg-gray-50 p-3 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.shareContacts}
              onChange={(e) => setForm({ ...form, shareContacts: e.target.checked })}
              className="mt-0.5"
            />
            <span>
              Показывать мои контакты знакомым в графе
              {!hasAnyContact && (
                <span className="block text-xs text-gray-500">Сначала заполните хотя бы один контакт</span>
              )}
            </span>
          </label>

          <label className="flex items-start gap-2 rounded bg-gray-50 p-3 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.visibleInSearch}
              onChange={(e) => setForm({ ...form, visibleInSearch: e.target.checked })}
              className="mt-0.5"
            />
            <span>
              Показывать меня в поиске
              <span className="block text-xs text-gray-500">Меня можно будет найти по имени/специальности</span>
            </span>
          </label>

          <label className="flex items-start gap-2 rounded bg-gray-50 p-3 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.networkVisible}
              onChange={(e) => setForm({ ...form, networkVisible: e.target.checked })}
              className="mt-0.5"
            />
            <span>
              Показывать мою сеть посторонним
              <span className="block text-xs text-gray-500">
                Кого я знаю, смогут раскрыть на графе другие — не только мои прямые контакты
              </span>
            </span>
          </label>
        </div>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        {saved && <p className="mb-3 text-sm text-green-600">Сохранено</p>}

        <button
          type="submit"
          disabled={saving}
          className="min-h-[44px] w-full rounded bg-indigo-600 px-3 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? "Сохраняем…" : "Сохранить"}
        </button>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-3 min-h-[44px] w-full rounded border border-gray-300 px-3 text-sm text-gray-600 hover:bg-gray-50"
        >
          Выйти
        </button>
      </form>
    </div>
  );
}
