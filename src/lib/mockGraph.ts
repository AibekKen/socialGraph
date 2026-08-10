import type { GraphLink, GraphNode } from "@/components/ContactGraph";

// Генератор мок-графа: дерево контактов на N узлов.
// Каждый новый узел цепляется к случайному уже существующему узлу —
// так получается органичное дерево знакомств, а не идеальная иерархия.

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST_NAMES = [
  "Аслан", "Даулет", "Ерлан", "Марат", "Тимур", "Нурлан", "Бауыржан", "Азамат",
  "Санжар", "Дамир", "Ислам", "Арман", "Бекзат", "Ерасыл", "Жандос", "Куаныш",
  "Максат", "Нурсултан", "Олжас", "Рустам", "Санат", "Талгат", "Ануар", "Бекболат",
  "Дастан", "Ержан", "Жасулан", "Кайрат", "Мейрам", "Нурбол", "Рахим", "Серик",
  "Абай", "Бахыт", "Гани", "Данияр", "Есен", "Жумабек", "Канат", "Мурат",
];

const LAST_NAMES = [
  "Ахметов", "Беков", "Сериков", "Жаксыбеков", "Нурланов", "Ибрагимов", "Кенжебаев",
  "Оразов", "Сатыбалдиев", "Тулегенов", "Абенов", "Дюсенов", "Ержанов", "Касымов",
  "Мукашев", "Смагулов", "Тастанов", "Утегенов",
];

const HEADLINES = [
  "Frontend-разработчик", "Backend-разработчик", "Дизайнер", "Юрист", "Бухгалтер",
  "Продуктовый менеджер", "DevOps-инженер", "Маркетолог", "Аналитик данных",
  "HR-специалист", "Архитектор", "Врач", "Финансовый консультант", "SMM-специалист",
  "Строитель", "Фотограф", "Переводчик", "Логист", "Инженер-механик", "QA-инженер",
];

// Отзывы, которые оставляет человек, познакомивший вас со следующим —
// как в исходной идее "найти специалиста через знакомого с отзывом".
const RECOMMENDATIONS = [
  "Работали вместе над проектом — сделал всё быстро и качественно",
  "Знаю по совместной работе, могу смело рекомендовать",
  "Общались на мероприятии, приятный в общении профессионал",
  "Помогал с задачей, разобрался быстрее, чем ожидал",
  "Давно знакомы, всегда на связи и держит слово",
  "Обращался к нему лично — остался доволен результатом",
  "Учились вместе, человек слова, дело своё знает",
  "Коллеги порекомендовали, не пожалел, что обратился",
];

export function generateMockGraph(count = 100, seed = 42) {
  const rand = mulberry32(seed);

  const maleAvatar = (n: number) => {
    const original = `https://xsgames.co/randomusers/assets/avatars/male/${n % 78}.jpg`;
    return `/api/avatar?u=${encodeURIComponent(original)}`;
  };

  const nodes: GraphNode[] = [
    { id: "me", name: "Вы", isMe: true, avatarUrl: maleAvatar(0) },
  ];
  const links: GraphLink[] = [];

  const adjacency = new Map<string, string[]>();
  const edgeKeys = new Set<string>();
  const edgeKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

  const addEdge = (a: string, b: string, status: GraphLink["status"]) => {
    const key = edgeKey(a, b);
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    // отзыв оставляют только по подтверждённым связям — как в идее "отзыв от знакомого"
    const comment =
      status === "confirmed" && rand() < 0.7
        ? RECOMMENDATIONS[Math.floor(rand() * RECOMMENDATIONS.length)]
        : undefined;
    links.push({ source: a, target: b, status, comment });
    if (!adjacency.has(a)) adjacency.set(a, []);
    if (!adjacency.has(b)) adjacency.set(b, []);
    adjacency.get(a)!.push(b);
    adjacency.get(b)!.push(a);
  };

  adjacency.set("me", []);

  for (let i = 1; i < count; i++) {
    const id = `u${i}`;
    const first = FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)];
    const last = LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)];
    const headline = HEADLINES[Math.floor(rand() * HEADLINES.length)];
    const shareContacts = rand() < 0.6;

    nodes.push({
      id,
      name: `${first} ${last}`,
      headline,
      avatarUrl: maleAvatar(i),
      shareContacts,
      phone: shareContacts ? `+7 7${Math.floor(rand() * 90 + 10)} ${100 + Math.floor(rand() * 900)}-${10 + Math.floor(rand() * 90)}-${10 + Math.floor(rand() * 90)}` : undefined,
      whatsapp: shareContacts ? `+7 7${Math.floor(rand() * 90 + 10)} ${100 + Math.floor(rand() * 900)}-${10 + Math.floor(rand() * 90)}-${10 + Math.floor(rand() * 90)}` : undefined,
      instagram: shareContacts ? `@user_${id}` : undefined,
    });

    // прикрепляем узел к случайному уже существующему (дерево растёт органично)
    const parentIndex = Math.floor(rand() * i);
    const parentId = nodes[parentIndex].id;
    const status: GraphLink["status"] = rand() < 0.15 ? "pending" : "confirmed";

    addEdge(parentId, id, status);
  }

  // Знакомые знакомых: НЕ у каждой пары общих знакомых есть связь — иначе граф
  // превращается в клубок. Берём лишь несколько случайных пар на узел (число
  // попыток не растёт квадратично с числом связей), да и то с умеренным шансом.
  // У "хабов" (люди с кучей знакомых, например организаторы мероприятий) доля
  // знакомых друг с другом ниже — они скорее мост между разными кругами.
  for (const node of nodes) {
    const neighbors = adjacency.get(node.id) ?? [];
    if (neighbors.length < 2) continue;

    const closureChance = neighbors.length > 6 ? 0.12 : 0.25;
    const attempts = Math.min(3, Math.floor(neighbors.length / 2));

    for (let t = 0; t < attempts; t++) {
      const a = neighbors[Math.floor(rand() * neighbors.length)];
      const b = neighbors[Math.floor(rand() * neighbors.length)];
      if (a === b) continue;
      if (rand() < closureChance) {
        const status: GraphLink["status"] = rand() < 0.15 ? "pending" : "confirmed";
        addEdge(a, b, status);
      }
    }
  }

  // Немного случайных "слабых" связей поверх дерева и триад — знакомство
  // не по прямой цепочке, а через общее мероприятие/работу и т.п.
  const extraRandomEdges = Math.round(count * 0.08);
  for (let i = 0; i < extraRandomEdges; i++) {
    const a = nodes[Math.floor(rand() * nodes.length)].id;
    const b = nodes[Math.floor(rand() * nodes.length)].id;
    if (a === b) continue;
    const status: GraphLink["status"] = rand() < 0.15 ? "pending" : "confirmed";
    addEdge(a, b, status);
  }

  return { nodes, links };
}
