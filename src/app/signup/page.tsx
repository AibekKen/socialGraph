"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import AppHeader from "@/components/AppHeader";

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, ready } = useTranslation();
  const inviteToken = searchParams.get("invite");
  const [fullName, setFullName] = useState("");
  const [headline, setHeadline] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!agreed) {
      setError(t.auth.signup.mustAgree);
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const redirectUrl = new URL("/auth/callback", window.location.origin);
    if (inviteToken) redirectUrl.searchParams.set("invite", inviteToken);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, headline: headline.trim() || null },
        emailRedirectTo: redirectUrl.toString(),
      },
    });

    if (error) {
      setLoading(false);
      setError(
        error.message === "User already registered"
          ? t.auth.signup.alreadyRegistered
          : error.message
      );
      return;
    }

    if (data.session && data.user) {
      // подтверждение по email отключено в проекте — сессия уже активна
      await supabase
        .from("profiles")
        .upsert({ id: data.user.id, full_name: fullName, headline: headline.trim() || null });
      if (inviteToken) {
        await supabase.rpc("accept_invite", { p_token: inviteToken });
      }
      setLoading(false);
      router.push("/graph");
      router.refresh();
      return;
    }

    setLoading(false);
    setMessage(t.auth.signup.confirmationSent(email));
  };

  const handleGoogleLogin = async () => {
    setError(null);
    if (!agreed) {
      setError(t.auth.signup.mustAgree);
      return;
    }
    const supabase = createClient();
    const redirectUrl = new URL("/auth/callback", window.location.origin);
    if (inviteToken) redirectUrl.searchParams.set("invite", inviteToken);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectUrl.toString() },
    });
    if (error) setError(error.message);
  };

  if (!ready) return null;

  return (
    <div className="flex min-h-dvh flex-col bg-gray-50">
      <AppHeader />

      <div className="flex flex-1 items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold">{t.auth.signup.title}</h1>
        <p className="mb-5 text-sm text-gray-500">{t.common.tagline}</p>

        {inviteToken && (
          <p className="mb-4 rounded bg-indigo-50 p-3 text-sm text-indigo-800">
            {t.auth.signup.inviteBanner}
          </p>
        )}

        {message ? (
          <p className="rounded bg-indigo-50 p-3 text-sm text-indigo-800">{message}</p>
        ) : (
          <>
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="fullName">
              {t.auth.signup.nameLabel}
            </label>
            <input
              id="fullName"
              type="text"
              required
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mb-3 min-h-[40px] w-full rounded border border-gray-300 px-3 text-base"
              placeholder={t.auth.signup.namePlaceholder}
            />

            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="headline">
              {t.auth.signup.headlineLabel} <span className="font-normal text-gray-400">{t.auth.signup.optional}</span>
            </label>
            <input
              id="headline"
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className="mb-3 min-h-[40px] w-full rounded border border-gray-300 px-3 text-base"
              placeholder={t.auth.signup.headlinePlaceholder}
            />

            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="email">
              {t.auth.signup.emailLabel}
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
              {t.auth.signup.passwordLabel}
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mb-4 min-h-[40px] w-full rounded border border-gray-300 px-3 text-base"
              placeholder={t.auth.signup.passwordPlaceholder}
            />

            <label className="mb-4 flex items-start gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                {t.auth.signup.agreePrefix}{" "}
                <Link href="/legal/privacy" target="_blank" className="text-indigo-600 hover:underline">
                  {t.auth.signup.agreeLink}
                </Link>
              </span>
            </label>

            {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading || !agreed}
              className="min-h-[40px] w-full rounded bg-indigo-600 px-3 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {loading ? t.auth.signup.submitting : t.auth.signup.submit}
            </button>

            <div className="my-4 flex items-center gap-3 text-xs text-gray-400">
              <div className="h-px flex-1 bg-gray-200" />
              {t.common.or}
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={!agreed}
              className="flex min-h-[40px] w-full items-center justify-center gap-2 rounded border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.5z" />
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
                <path fill="#4CAF50" d="M24 44c5.5 0 10.5-2.1 14.3-5.6l-6.6-5.6C29.6 34.5 26.9 35.5 24 35.5c-5.3 0-9.7-3.1-11.3-7.4l-6.6 5.1C9.5 39.6 16.2 44 24 44z" />
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.4l6.6 5.6C41.6 35.9 44 30.3 44 24c0-1.3-.1-2.6-.4-3.5z" />
              </svg>
              {t.auth.signup.googleButton}
            </button>
          </>
        )}

        <p className="mt-4 text-center text-sm text-gray-500">
          {t.auth.signup.haveAccount}{" "}
          <Link href="/login" className="text-indigo-600 hover:underline">
            {t.auth.signup.loginLink}
          </Link>
        </p>
      </form>
      </div>
    </div>
  );
}
