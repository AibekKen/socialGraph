"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ContactGraph, { GraphLink, GraphNode } from "@/components/ContactGraph";
import { createClient } from "@/lib/supabase/client";
import { formatPhoneMask } from "@/lib/phone";
import {
  loadMe,
  loadEgoNetwork,
  expandPerson,
  searchPeople,
  findPathTo,
  loadProfilesByIds,
  loadDegree,
  loadRecommendations,
} from "@/lib/graphData";

function linkKey(a: string, b: string) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function mergeNodes(prev: GraphNode[], added: GraphNode[]): GraphNode[] {
  const map = new Map(prev.map((n) => [n.id, n]));
  for (const n of added) map.set(n.id, n);
  return Array.from(map.values());
}

function mergeLinks(prev: GraphLink[], added: GraphLink[]): GraphLink[] {
  const map = new Map(prev.map((l) => [linkKey(l.source, l.target), l]));
  for (const l of added) map.set(linkKey(l.source, l.target), l);
  return Array.from(map.values());
}

export default function GraphPage() {
  const router = useRouter();

  const [meId, setMeId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);

  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<GraphNode[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);

  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [path, setPath] = useState<string[] | null>(null);
  const [pathLoading, setPathLoading] = useState(false);

  const [lastClicked, setLastClicked] = useState<GraphNode | null>(null);
  const [lastClickedDegree, setLastClickedDegree] = useState<number | null>(null);
  const [recommendations, setRecommendations] = useState<{ authorId: string; authorName: string; comment: string }[]>([]);

  type PendingRequest = {
    connectionId: string;
    requesterId: string;
    requesterName: string;
    requesterHeadline: string | null;
  };
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Модалка "+ Контакт": сначала ищем среди уже зарегистрированных,
  // и только если человека нет — предлагаем создать ссылку-приглашение.
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [modalStep, setModalStep] = useState<"search" | "invite" | "sent">("search");
  const [modalQuery, setModalQuery] = useState("");
  const [modalResults, setModalResults] = useState<GraphNode[]>([]);
  const [modalSearching, setModalSearching] = useState(false);
  const [sentToName, setSentToName] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSaving, setInviteSaving] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [contactPickerSupported, setContactPickerSupported] = useState(false);

  useEffect(() => {
    setContactPickerSupported(
      typeof navigator !== "undefined" && "contacts" in navigator && "ContactsManager" in window
    );
  }, []);

  const pickContact = async () => {
    try {
      // Contact Picker API — поддерживается только в Chrome на Android (HTTPS)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nav = navigator as any;
      const contacts = await nav.contacts.select(["name", "tel"], { multiple: false });
      const contact = contacts?.[0];
      if (!contact) return;
      if (contact.tel?.[0]) setInvitePhone(formatPhoneMask(contact.tel[0]));
      if (contact.name?.[0]) setInviteName(contact.name[0]);
    } catch {
      // пользователь отменил выбор или запретил доступ — ничего не делаем
    }
  };

  useEffect(() => {
    if (!meId || modalStep !== "search") return;
    const q = modalQuery.trim();
    if (!q) {
      setModalResults([]);
      return;
    }
    const id = setTimeout(async () => {
      setModalSearching(true);
      const results = await searchPeople(q, meId);
      setModalResults(results);
      setModalSearching(false);
    }, 300);
    return () => clearTimeout(id);
  }, [modalQuery, modalStep, meId]);

  const sendConnectionRequest = async (person: GraphNode) => {
    if (!meId) return;
    setInviteError(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("connections")
      .insert({ requester_id: meId, addressee_id: person.id, status: "pending" });

    if (error) {
      setInviteError(
        error.code === "23505" ? "Заявка этому человеку уже отправлена ранее" : error.message
      );
      return;
    }
    setSentToName(person.name);
    setModalStep("sent");
  };

  const loadPendingRequests = async (uid: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("connections")
      .select("id, requester_id, profiles!connections_requester_id_fkey(full_name, headline)")
      .eq("addressee_id", uid)
      .eq("status", "pending");

    setPendingRequests(
      (data ?? []).map((row) => {
        const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
        return {
          connectionId: row.id as string,
          requesterId: row.requester_id as string,
          requesterName: profile?.full_name ?? "Без имени",
          requesterHeadline: profile?.headline ?? null,
        };
      })
    );
  };

  // Первичная загрузка: свой профиль + прямые связи
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }
      setUserEmail(user.email ?? null);
      setMeId(user.id);

      const me = await loadMe();
      if (!me) {
        setInitializing(false);
        return;
      }

      const ego = await loadEgoNetwork(user.id);
      setNodes(mergeNodes([me], ego.nodes));
      setLinks(ego.links);
      setExpandedIds(new Set([user.id]));

      loadPendingRequests(user.id);
      setInitializing(false);
    })();
  }, []);

  // Поиск с debounce
  useEffect(() => {
    if (!meId) return;
    const q = query.trim();
    if (!q) {
      setSuggestions([]);
      return;
    }
    const id = setTimeout(async () => {
      setSearching(true);
      const results = await searchPeople(q, meId);
      setSuggestions(results);
      setSearching(false);
    }, 300);
    return () => clearTimeout(id);
  }, [query, meId]);

  const respondToRequest = async (connectionId: string, accept: boolean) => {
    const supabase = createClient();
    await supabase
      .from("connections")
      .update({ status: accept ? "confirmed" : "declined", confirmed_at: accept ? new Date().toISOString() : null })
      .eq("id", connectionId);
    if (meId) {
      loadPendingRequests(meId);
      // подтверждённая связь могла появиться в моей эго-сети
      const ego = await loadEgoNetwork(meId);
      setNodes((prev) => mergeNodes(prev, ego.nodes));
      setLinks((prev) => mergeLinks(prev, ego.links));
    }
  };

  const toggleExpand = async (id: string) => {
    if (!meId) return;
    if (expandedIds.has(id)) {
      // визуально просто "сворачиваем" — но накопленные данные не теряем,
      // они не мешают, просто больше не подгружаем дальше через этот узел
      setExpandedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      return;
    }

    const known = new Set(nodes.map((n) => n.id));
    const { nodes: newNodes, links: newLinks } = await expandPerson(id, meId, known);
    setNodes((prev) => mergeNodes(prev, newNodes));
    setLinks((prev) => mergeLinks(prev, newLinks));
    setExpandedIds((prev) => new Set(prev).add(id));
  };

  const openPersonInfo = async (node: GraphNode) => {
    setSelected(null);
    setPath(null);
    setQuery("");
    setLastClicked(node);
    setLastClickedDegree(null);
    setRecommendations([]);

    const degree = await loadDegree(node.id);
    setLastClickedDegree(degree);

    const knownIds = new Set(nodes.map((n) => n.id));
    const recs = await loadRecommendations(node.id, knownIds);
    setRecommendations(recs);
  };

  const selectSearchResult = async (person: GraphNode) => {
    if (!meId) return;
    setLastClicked(null);
    setSelected(person);
    setShowSuggestions(false);
    setQuery(person.name);
    setPathLoading(true);

    const p = await findPathTo(meId, person.id);
    setPath(p);

    if (p && p.length > 0) {
      const missing = p.filter((id) => !nodes.some((n) => n.id === id));
      if (missing.length > 0) {
        const extra = await loadProfilesByIds(missing, meId);
        setNodes((prev) => mergeNodes(prev, extra));
      }
    }
    setPathLoading(false);
  };

  const backToGraph = () => {
    setSelected(null);
    setPath(null);
  };

  const resetToMe = () => {
    setLastClicked(null);
    setSelected(null);
    setPath(null);
    setQuery("");
  };

  const createInvite = async () => {
    if (!meId || !invitePhone.trim()) return;
    setInviteSaving(true);
    setInviteError(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("invites")
      .insert({
        inviter_id: meId,
        invitee_name: inviteName.trim() || invitePhone.trim(),
        invitee_contact: invitePhone.trim(),
      })
      .select("token")
      .single();

    setInviteSaving(false);
    if (error || !data) {
      setInviteError(error?.message ?? "Не удалось создать приглашение");
      return;
    }
    const link = `${window.location.origin}/invite/${data.token}`;
    setInviteLink(link);

    if (invitePhone.trim()) {
      const text = `Привет! Присоединяйся к моей сети знакомых — так тебя смогут найти через общих знакомых, когда будут искать специалиста вроде тебя: ${link}`;
      window.open(`https://wa.me/${invitePhone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`, "_blank");
    }
  };

  const closeInviteModal = () => {
    setShowInviteModal(false);
    setModalStep("search");
    setModalQuery("");
    setModalResults([]);
    setSentToName("");
    setInviteName("");
    setInvitePhone("");
    setInviteLink(null);
    setInviteError(null);
  };

  const { visibleNodes, visibleLinks } = useMemo(() => {
    if (path) {
      const idSet = new Set(path);
      const pNodes = nodes.filter((n) => idSet.has(n.id));
      const pLinks: GraphLink[] = [];
      for (let i = 0; i < path.length - 1; i++) {
        pLinks.push({ source: path[i], target: path[i + 1], status: "confirmed" });
      }
      return { visibleNodes: pNodes, visibleLinks: pLinks };
    }
    return { visibleNodes: nodes, visibleLinks: links };
  }, [path, nodes, links]);

  if (initializing) {
    return <div className="flex h-dvh items-center justify-center text-sm text-gray-500">Загрузка графа…</div>;
  }

  return (
    <div className="flex h-dvh w-screen flex-col overflow-hidden">
      <header className="flex flex-col gap-2 border-b border-gray-200 p-3 md:flex-row md:items-center md:gap-4 md:px-4 md:py-3">
        <div className="flex w-full items-center justify-between gap-2 md:w-auto">
          <h1 className="flex items-center gap-2 text-base font-semibold md:text-lg">
            <svg width="24" height="24" viewBox="0 0 100 100" aria-hidden="true">
              <polygon
                points="82,50 66,22.29 34,22.29 18,50 34,77.71 66,77.71"
                fill="none"
                stroke="#4f46e5"
                strokeWidth="4"
                strokeLinejoin="round"
              />
              <circle cx="82" cy="50" r="7" fill="#a5b4fc" />
              <circle cx="66" cy="22.29" r="7" fill="#a5b4fc" />
              <circle cx="34" cy="22.29" r="7" fill="#a5b4fc" />
              <circle cx="18" cy="50" r="7" fill="#a5b4fc" />
              <circle cx="34" cy="77.71" r="7" fill="#a5b4fc" />
              <circle cx="66" cy="77.71" r="7" fill="#a5b4fc" />
              <circle cx="50" cy="50" r="13" fill="#4f46e5" />
            </svg>
            Круг доверия
          </h1>
          {userEmail && (
            <div className="flex items-center gap-2 text-xs text-gray-500 md:order-last">
              <button
                onClick={() => setShowInviteModal(true)}
                className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full border border-indigo-300 text-indigo-700 hover:bg-indigo-50 md:flex"
                aria-label="Добавить контакт"
                title="Добавить контакт"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="19" y1="8" x2="19" y2="14" />
                  <line x1="16" y1="11" x2="22" y2="11" />
                </svg>
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowNotifications((v) => !v)}
                  className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                  aria-label="Уведомления"
                  title="Уведомления"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  {pendingRequests.length > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
                      {pendingRequests.length}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="fixed left-2 right-2 top-[calc(env(safe-area-inset-top,0px)+3.25rem)] z-40 max-h-[70vh] overflow-y-auto rounded border border-gray-200 bg-white text-sm shadow-lg sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-1 sm:max-h-none sm:w-80">
                    {pendingRequests.length === 0 ? (
                      <p className="p-3 text-gray-500">Новых заявок нет</p>
                    ) : (
                      pendingRequests.map((r) => (
                        <div key={r.connectionId} className="border-b border-gray-100 p-3 last:border-b-0">
                          <div className="font-medium text-gray-900">{r.requesterName}</div>
                          {r.requesterHeadline && <div className="text-gray-500">{r.requesterHeadline}</div>}
                          <p className="mt-1 text-xs text-gray-500">
                            Хочет добавить вас в свою сеть знакомств. Благодаря этому вас смогут найти
                            через общих знакомых, когда будут искать специалиста вроде вас.
                          </p>
                          <div className="mt-2 flex gap-2">
                            <button
                              onClick={() => respondToRequest(r.connectionId, true)}
                              className="flex-1 rounded bg-indigo-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                            >
                              Принять
                            </button>
                            <button
                              onClick={() => respondToRequest(r.connectionId, false)}
                              className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                            >
                              Отклонить
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <a
                href="/profile"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                aria-label="Профиль"
                title="Профиль"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </a>
              <span className="hidden truncate max-w-[140px] sm:inline">{userEmail}</span>
            </div>
          )}
        </div>

        <div className="relative w-full md:max-w-sm">
          <input
            className="min-h-[44px] w-full rounded border border-gray-300 px-3 text-base md:min-h-[40px] md:text-sm"
            placeholder="Найти специалиста (напр. дизайнер)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          />
          {showSuggestions && (searching || suggestions.length > 0) && (
            <ul className="absolute inset-x-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded border border-gray-200 bg-white text-sm shadow-lg">
              {searching && <li className="px-3 py-2.5 text-gray-400">Ищем…</li>}
              {!searching &&
                suggestions.map((s) => (
                  <li key={s.id}>
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectSearchResult(s)}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-gray-50"
                    >
                      <span className="font-medium text-gray-900">{s.name}</span>
                      {s.headline && <span className="ml-auto text-xs text-gray-400">{s.headline}</span>}
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </header>

      {!path && nodes.length <= 1 && (
        <div className="flex items-center justify-between gap-3 border-b border-indigo-100 bg-indigo-50 px-3 py-2 text-xs text-indigo-900">
          <span>
            Ваша сеть пока пуста. Пригласите первого знакомого — так о нём узнают через вас, и
            наоборот.
          </span>
          <button
            onClick={() => setShowInviteModal(true)}
            className="shrink-0 rounded-full bg-indigo-600 px-3 py-1.5 font-medium text-white hover:bg-indigo-700"
          >
            Пригласить
          </button>
        </div>
      )}

      {!path && nodes.length > 1 && (
        <p className="border-b border-gray-100 px-3 py-1.5 text-xs text-gray-500">
          Нажмите на человека на графе, затем — «Раскрыть контакты». Добавьте свои полезные
          контакты, чтобы о них узнали другие.
        </p>
      )}

      <div className="relative flex-1 overflow-hidden md:flex">
        <main className="absolute inset-0 md:static md:h-full md:flex-1">
          {nodes.length === 0 ? (
            <div className="flex h-full items-center justify-center p-6 text-center text-sm text-gray-500">
              Пока у вас нет подтверждённых знакомств. Нажмите на кнопку «+» вверху, чтобы
              пригласить первого человека, или дождитесь, пока кто-то добавит вас.
            </div>
          ) : (
            <ContactGraph
              nodes={visibleNodes}
              links={visibleLinks}
              onNodeClick={openPersonInfo}
              onExpandClick={(node) => {
                openPersonInfo(node);
                toggleExpand(node.id);
              }}
              onAddContactClick={() => setShowInviteModal(true)}
              expandedIds={expandedIds}
            />
          )}
        </main>

        <aside
          className={`absolute inset-x-0 bottom-0 z-10 max-h-[55vh] overflow-y-auto rounded-t-2xl border-t border-gray-200 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(0,0,0,0.12)] transition-transform duration-200 md:static md:h-full md:w-72 md:shrink-0 md:translate-y-0 md:rounded-none md:border-t-0 md:border-r md:border-gray-200 md:p-3 md:pb-3 md:shadow-none md:order-first ${
            selected || lastClicked ? "translate-y-0" : "translate-y-full md:translate-y-0"
          }`}
        >
          {(selected || lastClicked) && (
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500 md:hidden">Информация</span>
              <button
                onClick={resetToMe}
                className="-mr-2 ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
                aria-label="Закрыть"
                title="Закрыть"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          )}

          {selected && (
            <div className="text-sm">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-medium">Путь до {selected.name}</span>
                <button onClick={backToGraph} className="text-xs text-gray-500 underline hover:text-gray-700">
                  Назад к графу
                </button>
              </div>
              {pathLoading ? (
                <div className="text-gray-500">Ищем путь…</div>
              ) : path ? (
                <div className="text-gray-600">
                  {path.map((id) => nodes.find((n) => n.id === id)?.name ?? "…").join(" → ")}
                </div>
              ) : (
                <div className="text-gray-500">Нет подтверждённого пути</div>
              )}
            </div>
          )}

          {!selected && lastClicked && (
            <div className="text-sm">
              <div className="mb-1">
                <span className="font-medium">{lastClicked.name}</span>
              </div>
              {lastClicked.headline && <div className="text-gray-500">{lastClicked.headline}</div>}
              <div className="mt-1 text-gray-500">
                Знакомых: {lastClickedDegree === null ? "…" : lastClickedDegree}
              </div>

              {lastClicked.id !== meId && (
                <div className="mt-4 border-t border-gray-200 pt-3">
                  <div className="mb-1 font-medium text-gray-700">Контакты</div>
                  {lastClicked.shareContacts ? (
                    <div className="space-y-1.5">
                      {lastClicked.phone && (
                        <a
                          href={`tel:${lastClicked.phone.replace(/[^\d+]/g, "")}`}
                          className="flex items-center gap-1.5 text-indigo-600 hover:underline"
                        >
                          📞 {lastClicked.phone}
                        </a>
                      )}
                      {lastClicked.whatsapp && (
                        <a
                          href={`https://wa.me/${lastClicked.whatsapp.replace(/[^\d]/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-green-600 hover:underline"
                        >
                          💬 WhatsApp: {lastClicked.whatsapp}
                        </a>
                      )}
                      {lastClicked.instagram && (
                        <a
                          href={`https://instagram.com/${lastClicked.instagram.replace(/^@/, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-pink-600 hover:underline"
                        >
                          📷 Instagram: {lastClicked.instagram}
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="text-gray-400">Человек не разрешил делиться своими контактами</div>
                  )}
                </div>
              )}

              {lastClicked.id !== meId && recommendations.length > 0 && (
                <div className="mt-4 border-t border-gray-200 pt-3">
                  <div className="mb-1 font-medium text-gray-700">
                    Отзывы знакомых, через которых вы вышли
                  </div>
                  <div className="space-y-2">
                    {recommendations.map((r) => (
                      <div key={r.authorId} className="rounded bg-gray-50 p-2">
                        <div className="text-xs font-medium text-gray-500">{r.authorName}</div>
                        <div className="text-gray-600">«{r.comment}»</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!selected && !lastClicked && (
            <p className="hidden text-sm text-gray-400 md:block">Выберите человека на графе</p>
          )}
        </aside>
      </div>

      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Добавить контакт</h2>
              <button onClick={closeInviteModal} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            {modalStep === "search" && (
              <>
                <p className="mb-3 text-sm text-gray-500">
                  Сначала поищем — может, человек уже зарегистрирован.
                </p>

                <input
                  autoFocus
                  value={modalQuery}
                  onChange={(e) => setModalQuery(e.target.value)}
                  className="mb-3 min-h-[40px] w-full rounded border border-gray-300 px-3 text-base"
                  placeholder="Имя или профессия"
                />

                {inviteError && <p className="mb-3 text-sm text-red-600">{inviteError}</p>}

                <div className="mb-3 max-h-56 overflow-y-auto">
                  {modalSearching && <p className="py-2 text-sm text-gray-400">Ищем…</p>}
                  {!modalSearching &&
                    modalQuery.trim() &&
                    modalResults.length === 0 && (
                      <p className="py-2 text-sm text-gray-400">Никого не нашли</p>
                    )}
                  {!modalSearching &&
                    modalResults.map((person) => (
                      <div
                        key={person.id}
                        className="flex items-center justify-between gap-2 border-b border-gray-100 py-2 last:border-b-0"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-gray-900">{person.name}</div>
                          {person.headline && <div className="truncate text-xs text-gray-500">{person.headline}</div>}
                        </div>
                        <button
                          onClick={() => sendConnectionRequest(person)}
                          className="shrink-0 rounded bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                        >
                          Отправить заявку
                        </button>
                      </div>
                    ))}
                </div>

                <button
                  onClick={() => {
                    setInviteError(null);
                    setInviteName(modalQuery.trim());
                    setModalStep("invite");
                  }}
                  className="min-h-[40px] w-full rounded border border-gray-300 px-3 text-sm text-gray-600 hover:bg-gray-50"
                >
                  Человека нет в списке — пригласить
                </button>
              </>
            )}

            {modalStep === "invite" && !inviteLink && (
              <>
                <p className="mb-4 text-sm text-gray-500">
                  Отправьте приглашение, чтобы добавить человека в свою сеть знакомств.
                </p>

                <label className="mb-1 block text-sm font-medium text-gray-700">WhatsApp</label>
                <div className="mb-4 flex items-center gap-2">
                  <input
                    value={invitePhone}
                    onChange={(e) => setInvitePhone(formatPhoneMask(e.target.value))}
                    type="tel"
                    className="min-h-[40px] w-full rounded border border-gray-300 px-3 text-base"
                    placeholder="+7 700 000-00-00"
                  />
                  {contactPickerSupported && (
                    <button
                      type="button"
                      onClick={pickContact}
                      title="Выбрать из контактов"
                      aria-label="Выбрать из контактов"
                      className="flex min-h-[40px] shrink-0 items-center justify-center rounded border border-gray-300 px-3 text-gray-600 hover:bg-gray-50"
                    >
                      📇
                    </button>
                  )}
                </div>

                {inviteError && <p className="mb-3 text-sm text-red-600">{inviteError}</p>}

                <button
                  onClick={createInvite}
                  disabled={inviteSaving || !invitePhone.trim()}
                  className="mb-2 min-h-[40px] w-full rounded bg-green-600 px-3 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
                >
                  {inviteSaving ? "Отправляем…" : "Отправить приглашение"}
                </button>
                <button
                  onClick={() => setModalStep("search")}
                  className="min-h-[40px] w-full rounded border border-gray-300 px-3 text-sm text-gray-600 hover:bg-gray-50"
                >
                  Назад к поиску
                </button>
              </>
            )}

            {modalStep === "invite" && inviteLink && (
              <>
                <p className="mb-3 text-sm text-gray-500">Ссылка готова — WhatsApp уже открылся:</p>
                <div className="mb-3 flex items-center gap-2">
                  <input
                    readOnly
                    value={inviteLink}
                    className="min-h-[40px] w-full rounded border border-gray-300 bg-gray-50 px-3 text-sm"
                    onFocus={(e) => e.target.select()}
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(inviteLink);
                      setLinkCopied(true);
                      setTimeout(() => setLinkCopied(false), 1500);
                    }}
                    className="min-h-[40px] shrink-0 rounded border border-gray-300 px-3 text-sm hover:bg-gray-50"
                  >
                    {linkCopied ? "Скопировано ✓" : "Скопировать"}
                  </button>
                </div>

                {invitePhone.trim() && (
                  <a
                    href={`https://wa.me/${invitePhone.replace(/\D/g, "")}?text=${encodeURIComponent(
                      `Привет! Присоединяйся к моей сети знакомых — так тебя смогут найти через общих знакомых, когда будут искать специалиста вроде тебя: ${inviteLink}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mb-3 block min-h-[40px] rounded bg-green-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-green-700"
                  >
                    Открыть WhatsApp ещё раз
                  </a>
                )}

                <button
                  onClick={closeInviteModal}
                  className="min-h-[40px] w-full rounded border border-gray-300 px-3 text-sm text-gray-600 hover:bg-gray-50"
                >
                  Готово
                </button>
              </>
            )}

            {modalStep === "sent" && (
              <>
                <p className="mb-4 text-sm text-gray-600">
                  Заявка на связь отправлена пользователю <span className="font-medium">{sentToName}</span>.
                  Как только он подтвердит — вы увидите его в графе.
                </p>
                <button
                  onClick={closeInviteModal}
                  className="min-h-[40px] w-full rounded bg-indigo-600 px-3 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Готово
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
