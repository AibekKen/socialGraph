"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (error) {
      setError(error.message === "Invalid login credentials" ? "Неверный email или пароль" : error.message);
      return;
    }

    router.push("/graph");
    router.refresh();
  };

  const handleGoogleLogin = async () => {
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gray-50 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold">Вход</h1>
        <p className="mb-5 text-sm text-gray-500">Граф контактов — войдите, чтобы продолжить</p>

        <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-3 min-h-[40px] w-full rounded border border-gray-300 px-3 text-base"
          placeholder="you@example.com"
        />

        <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="password">
          Пароль
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 min-h-[40px] w-full rounded border border-gray-300 px-3 text-base"
          placeholder="••••••••"
        />

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="min-h-[40px] w-full rounded bg-indigo-600 px-3 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? "Входим…" : "Войти"}
        </button>

        <div className="my-4 flex items-center gap-3 text-xs text-gray-400">
          <div className="h-px flex-1 bg-gray-200" />
          или
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="flex min-h-[40px] w-full items-center justify-center gap-2 rounded border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.5z" />
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.5 0 10.5-2.1 14.3-5.6l-6.6-5.6C29.6 34.5 26.9 35.5 24 35.5c-5.3 0-9.7-3.1-11.3-7.4l-6.6 5.1C9.5 39.6 16.2 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.4l6.6 5.6C41.6 35.9 44 30.3 44 24c0-1.3-.1-2.6-.4-3.5z" />
          </svg>
          Войти через Google
        </button>

        <p className="mt-4 text-center text-sm text-gray-500">
          Нет аккаунта?{" "}
          <Link href="/signup" className="text-indigo-600 hover:underline">
            Зарегистрироваться
          </Link>
        </p>
      </form>
    </div>
  );
}
