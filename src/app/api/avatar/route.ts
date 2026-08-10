import { NextRequest } from "next/server";

// Проксирует внешние картинки аватаров через наш домен, чтобы WebGL-текстуры
// (3D-граф) не спотыкались об отсутствие CORS-заголовков у сторонних сервисов.
const ALLOWED_HOSTS = new Set(["xsgames.co", "i.pravatar.cc"]);

export async function GET(req: NextRequest) {
  const src = req.nextUrl.searchParams.get("u");
  if (!src) return new Response("Missing u", { status: 400 });

  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return new Response("Invalid url", { status: 400 });
  }

  if (!ALLOWED_HOSTS.has(url.hostname)) {
    return new Response("Host not allowed", { status: 400 });
  }

  const upstream = await fetch(url.toString());
  if (!upstream.ok || !upstream.body) {
    return new Response("Upstream error", { status: 502 });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
