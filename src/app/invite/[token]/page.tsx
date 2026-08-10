"use client";

import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "accepting" | "done" | "error">("checking");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        // ещё не зарегистрирован — сохраняем токен и уводим на регистрацию,
        // после которой примем приглашение автоматически
        sessionStorage.setItem("pendingInviteToken", token);
        router.push(`/signup?invite=${token}`);
        return;
      }

      setStatus("accepting");
      const { error } = await supabase.rpc("accept_invite", { p_token: token });
      if (error) {
        setStatus("error");
        setError(error.message === "Приглашение не найдено или уже использовано"
          ? "Ссылка недействительна или уже использована"
          : error.message);
        return;
      }

      setStatus("done");
      setTimeout(() => router.push("/graph"), 1200);
    })();
  }, [token, router]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm">
        {status === "checking" && <p className="text-sm text-gray-500">Проверяем приглашение…</p>}
        {status === "accepting" && <p className="text-sm text-gray-500">Подключаем вас к сети знакомств…</p>}
        {status === "done" && (
          <>
            <p className="mb-1 text-lg font-semibold text-gray-900">Готово!</p>
            <p className="text-sm text-gray-500">Заявка на связь отправлена. Переходим в граф…</p>
          </>
        )}
        {status === "error" && (
          <>
            <p className="mb-3 text-sm text-red-600">{error}</p>
            <button
              onClick={() => router.push("/graph")}
              className="min-h-[40px] w-full rounded border border-gray-300 px-3 text-sm text-gray-600 hover:bg-gray-50"
            >
              К графу
            </button>
          </>
        )}
      </div>
    </div>
  );
}
