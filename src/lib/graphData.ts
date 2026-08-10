import { createClient } from "@/lib/supabase/client";
import type { GraphNode, GraphLink } from "@/components/ContactGraph";

type PublicProfileRow = {
  id: string;
  full_name: string;
  headline: string | null;
  avatar_url: string | null;
  share_contacts: boolean;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
};

function toNode(row: PublicProfileRow, meId: string): GraphNode {
  return {
    id: row.id,
    name: row.full_name,
    headline: row.headline ?? undefined,
    isMe: row.id === meId,
    avatarUrl: row.avatar_url ?? undefined,
    shareContacts: row.share_contacts,
    phone: row.phone ?? undefined,
    whatsapp: row.whatsapp ?? undefined,
    instagram: row.instagram ?? undefined,
  };
}

// Свой профиль — из profiles напрямую, доступен полностью всегда.
export async function loadMe(): Promise<GraphNode | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, headline, avatar_url, share_contacts, phone, whatsapp, instagram")
    .eq("id", user.id)
    .maybeSingle();

  if (!data) return null;
  return toNode(data as PublicProfileRow, user.id);
}

async function getPublicProfiles(ids: string[], meId: string): Promise<Map<string, GraphNode>> {
  const map = new Map<string, GraphNode>();
  if (ids.length === 0) return map;

  const supabase = createClient();
  const { data } = await supabase.rpc("get_public_profiles", { ids });
  for (const row of (data ?? []) as PublicProfileRow[]) {
    map.set(row.id, toNode(row, meId));
  }
  return map;
}

type LoadedConnection = { source: string; target: string; status: "pending" | "confirmed" };

// Связи человека personId — pending и confirmed видны всем (одностороннее
// добавление — публичная рекомендация), declined исключаем: адресат таким
// образом "отключает видимость", и связь пропадает из графа для всех,
// включая того, кто её создал.
async function loadConnectionsOf(personId: string): Promise<LoadedConnection[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("connections")
    .select("requester_id, addressee_id, status")
    .or(`requester_id.eq.${personId},addressee_id.eq.${personId}`)
    .neq("status", "declined");

  return (data ?? []).map((c) => ({
    source: c.requester_id as string,
    target: c.addressee_id as string,
    status: c.status as "pending" | "confirmed",
  }));
}

// Эго-сеть "Вы": свой узел + прямые связи (любого статуса — свои заявки видно).
export async function loadEgoNetwork(meId: string): Promise<{ nodes: GraphNode[]; links: GraphLink[] }> {
  const conns = await loadConnectionsOf(meId);
  const otherIds = Array.from(
    new Set(conns.map((c) => (c.source === meId ? c.target : c.source)))
  );

  const profiles = await getPublicProfiles(otherIds, meId);
  const nodes = Array.from(profiles.values());
  const links: GraphLink[] = conns
    .filter((c) => profiles.has(c.source === meId ? c.target : c.source))
    .map((c) => ({ source: c.source, target: c.target, status: c.status }));

  return { nodes, links };
}

// Раскрыть человека: подгрузить ЕГО подтверждённые связи и вернуть новые
// узлы/рёбра, которых ещё не было в текущем видимом наборе.
export async function expandPerson(
  personId: string,
  meId: string,
  knownIds: Set<string>
): Promise<{ nodes: GraphNode[]; links: GraphLink[] }> {
  const conns = await loadConnectionsOf(personId);
  const otherIds = Array.from(
    new Set(
      conns
        .map((c) => (c.source === personId ? c.target : c.source))
        .filter((id) => !knownIds.has(id))
    )
  );

  const profiles = await getPublicProfiles(otherIds, meId);
  const nodes = Array.from(profiles.values());
  const links: GraphLink[] = conns.map((c) => ({ source: c.source, target: c.target, status: c.status }));

  return { nodes, links };
}

export async function searchPeople(query: string, meId: string): Promise<GraphNode[]> {
  if (!query.trim()) return [];
  const supabase = createClient();
  const { data } = await supabase.rpc("search_profiles", { q: query.trim() });
  return ((data ?? []) as PublicProfileRow[]).filter((r) => r.id !== meId).map((r) => toNode(r, meId));
}

// Кратчайший путь по подтверждённым связям — считается на сервере.
export async function findPathTo(meId: string, targetId: string): Promise<string[] | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("find_path", { from_id: meId, to_id: targetId });
  if (error || !data) return null;
  return data as string[];
}

export async function loadDegree(personId: string): Promise<number> {
  const supabase = createClient();
  const { count } = await supabase
    .from("connections")
    .select("id", { count: "exact", head: true })
    .or(`requester_id.eq.${personId},addressee_id.eq.${personId}`)
    .neq("status", "declined");
  return count ?? 0;
}

export async function loadProfilesByIds(ids: string[], meId: string): Promise<GraphNode[]> {
  const map = await getPublicProfiles(ids, meId);
  return Array.from(map.values());
}

// Отзывы (рекомендации) о человеке от людей, уже видимых на графе.
export async function loadRecommendations(subjectId: string, contextIds: Set<string>) {
  const supabase = createClient();
  const { data } = await supabase
    .from("reviews")
    .select("author_id, comment, profiles!reviews_author_id_fkey(full_name)")
    .eq("subject_id", subjectId);

  return ((data ?? []) as { author_id: string; comment: string | null; profiles: { full_name: string } | { full_name: string }[] | null }[])
    .filter((r) => contextIds.has(r.author_id) && r.comment)
    .map((r) => {
      const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
      return { authorId: r.author_id, authorName: profile?.full_name ?? "Без имени", comment: r.comment as string };
    });
}
