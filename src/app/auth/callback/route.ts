import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Сюда возвращает Supabase после перехода по ссылке подтверждения email
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const inviteToken = searchParams.get("invite");
  const next = searchParams.get("next") ?? "/graph";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const { data: existing } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", data.user.id)
        .maybeSingle();

      // Фото из Google подставляем только если пользователь ещё не загрузил своё —
      // не перетираем ручную загрузку при повторном входе через Google.
      const googleAvatar = data.user.user_metadata?.avatar_url ?? data.user.user_metadata?.picture ?? null;

      await supabase.from("profiles").upsert({
        id: data.user.id,
        full_name: data.user.user_metadata?.full_name ?? data.user.email ?? "Без имени",
        avatar_url: existing?.avatar_url ?? googleAvatar,
      });
      if (inviteToken) {
        // не блокируем вход, если приглашение уже устарело/использовано
        await supabase.rpc("accept_invite", { p_token: inviteToken });
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
