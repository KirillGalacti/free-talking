import type {
  BehaviorProfile, Difficulty, Level, PresetId, RelationshipId, RoleId, SessionSettings, SkillId, StyleId, TacticsId, TopicId,
} from "./types";

export const topics: { id: TopicId; label: string; genitive: string }[] = [
  { id: "sales", label: "Продажи", genitive: "продажи" },
  { id: "purchasing", label: "Закупки", genitive: "закупки" },
  { id: "partnership", label: "Партнёрство", genitive: "партнёрство" },
  { id: "salary", label: "Зарплата", genitive: "зарплата" },
  { id: "conflict", label: "Конфликт", genitive: "конфликт" },
  { id: "management", label: "Управление", genitive: "управление" },
];

export const roles: { id: RoleId; label: string; lower: string }[] = [
  { id: "sales_manager", label: "Менеджер по продажам", lower: "менеджер по продажам" },
  { id: "manager", label: "Руководитель", lower: "руководитель" },
  { id: "buyer", label: "Закупщик", lower: "закупщик" },
  { id: "entrepreneur", label: "Предприниматель", lower: "предприниматель" },
];

export interface PresetDefinition {
  id: PresetId;
  label: string;
  hint: string;
  typicalRole: string;
  compatible: string;
  tags: string[];
  warning: string;
  profile: BehaviorProfile;
  style: StyleId;
  tactics: TacticsId;
  durationMin: number;
}

export const presets: PresetDefinition[] = [
  {
    id: "tough_buyer",
    label: "Жёсткий закупщик",
    hint: "держит цену, требует доказательств",
    typicalRole: "директор по закупкам",
    compatible: "закупки, продажи, партнёрство",
    tags: ["требует доказательств", "медленно уступает", "сравнивает с конкурентами"],
    warning: "Умеренные тактики давления: ссылка на конкурента, ограничение по срокам.",
    profile: { toughness: "high", cooperation: "mid", openness: "low", emotionality: "mid", initiative: "mid" },
    style: "business",
    tactics: "moderate",
    durationMin: 15,
  },
  {
    id: "careful_financier",
    label: "Осторожный финансист",
    hint: "считает риски, просит гарантии",
    typicalRole: "финансовый директор",
    compatible: "закупки, управление, партнёрство",
    tags: ["считает риски", "просит гарантии", "проверяет расчёты"],
    warning: "Без давления, но каждое условие проверяет цифрами и гарантиями.",
    profile: { toughness: "mid", cooperation: "mid", openness: "low", emotionality: "low", initiative: "low" },
    style: "cold",
    tactics: "none",
    durationMin: 15,
  },
  {
    id: "friendly_partner",
    label: "Дружелюбный партнёр",
    hint: "ищет общую выгоду, раскрывается легче",
    typicalRole: "директор по развитию",
    compatible: "партнёрство, продажи, управление",
    tags: ["ищет общую выгоду", "делится интересами", "ценит отношения"],
    warning: "Без давления: соглашается легче, но ждёт встречной ценности.",
    profile: { toughness: "low", cooperation: "high", openness: "high", emotionality: "mid", initiative: "mid" },
    style: "friendly",
    tactics: "none",
    durationMin: 15,
  },
  {
    id: "busy_executive",
    label: "Занятой руководитель",
    hint: "мало времени, ждёт сути сразу",
    typicalRole: "генеральный директор",
    compatible: "управление, продажи, зарплата",
    tags: ["ждёт сути сразу", "перебивает длинные речи", "решает быстро"],
    warning: "Умеренное давление временем: короткие ответы и требование конкретики.",
    profile: { toughness: "mid", cooperation: "mid", openness: "mid", emotionality: "low", initiative: "high" },
    style: "business",
    tactics: "moderate",
    durationMin: 10,
  },
];

export const levelLabels: Record<Level, string> = { low: "низкая", mid: "средняя", high: "высокая" };
export const levelOrder: Level[] = ["low", "mid", "high"];

export const profileLabels: Record<keyof BehaviorProfile, string> = {
  toughness: "Жёсткость",
  cooperation: "Сотрудничество",
  openness: "Открытость",
  emotionality: "Эмоциональность",
  initiative: "Инициативность",
};

export const difficultyLabels: Record<Difficulty, string> = { basic: "Базовая", medium: "Средняя", high: "Высокая" };
export const difficultyLower: Record<Difficulty, string> = { basic: "базовая", medium: "средняя", high: "высокая" };
export const difficultyGenitive: Record<Difficulty, string> = { basic: "базовая сложность", medium: "средняя сложность", high: "высокая сложность" };
export const difficultyDescriptions: Record<Difficulty, string> = {
  basic: "1–2 параметра сделки, один скрытый интерес, простые возражения и мягкий лимит времени. Стиль контрагента сложность не меняет.",
  medium: "3–5 параметров сделки, 2–3 скрытых интереса, связанные возражения и умеренный лимит времени. Стиль контрагента сложность не меняет.",
  high: "5+ связанных параметров, 3–4 скрытых интереса, возражения с проверкой расчётов и жёсткий лимит времени. Стиль контрагента сложность не меняет.",
};

export const styleLabels: Record<StyleId, string> = { business: "деловой", friendly: "дружелюбный", cold: "холодный", emotional: "эмоциональный" };
export const styleTitles: Record<StyleId, string> = { business: "Деловой", friendly: "Дружелюбный", cold: "Холодный", emotional: "Эмоциональный" };
export const tacticsLabels: Record<TacticsId, string> = { none: "без давления", moderate: "умеренные", hard: "жёсткие" };
export const tacticsTitles: Record<TacticsId, string> = { none: "Без давления", moderate: "Умеренные", hard: "Жёсткие" };

export const relationshipLabels: Record<RelationshipId, string> = {
  first: "Первая встреча",
  working: "Рабочие",
  partner: "Партнёрские",
  conflict: "Конфликтные",
};
export const relationshipLong: Record<RelationshipId, string> = {
  first: "Первая встреча",
  working: "Рабочие отношения",
  partner: "Партнёрство",
  conflict: "Конфликт",
};

export const industries = ["Производство", "Пищевое производство", "Ритейл", "IT и digital", "Логистика", "Строительство", "Фармацевтика", "Финансы"];
export const counterpartyRoles = ["Директор по закупкам", "Финансовый директор", "Генеральный директор", "Директор по развитию", "Руководитель отдела", "Владелец бизнеса", "HR-директор"];
export const durations = [10, 15, 20, 30];
export const dealParamOptions = ["Цена", "Объём", "Сроки", "Оплата", "Гарантии"];

export const skillCatalog: { id: SkillId; label: string }[] = [
  { id: "preparation", label: "Подготовка позиции" },
  { id: "framing", label: "Контакт и рамка" },
  { id: "listening", label: "Активное слушание" },
  { id: "spin", label: "Диагностика SPIN" },
  { id: "interests", label: "Выявление интересов" },
  { id: "options", label: "Создание вариантов" },
  { id: "criteria", label: "Объективные критерии" },
  { id: "argumentation", label: "Аргументация" },
  { id: "concessions", label: "Уступки" },
  { id: "pressure", label: "Давление и деэскалация" },
  { id: "batna", label: "Решение по BATNA" },
  { id: "closing", label: "Фиксация договорённости" },
];

export function skillLabel(id: SkillId) {
  return skillCatalog.find((skill) => skill.id === id)?.label ?? id;
}

export function presetById(id: PresetId) {
  return presets.find((preset) => preset.id === id) ?? presets[0];
}

export function topicLabel(settings: Pick<SessionSettings, "topic" | "topicCustom">) {
  if (settings.topic === "custom") return settings.topicCustom.trim() || "Своя тема";
  return topics.find((topic) => topic.id === settings.topic)?.label ?? "";
}

export function roleLabel(settings: Pick<SessionSettings, "role" | "roleCustom">) {
  if (settings.role === "custom") return settings.roleCustom.trim() || "Своя роль";
  return roles.find((role) => role.id === settings.role)?.label ?? "";
}

export function defaultSettings(): SessionSettings {
  const preset = presets[0];
  return {
    method: null,
    topic: null,
    topicCustom: "",
    role: null,
    roleCustom: "",
    roleDetails: "Поставщик упаковки · цена в пределах 5%",
    goal: "Продлить годовой контракт на поставку упаковки и сохранить цену",
    presetId: preset.id,
    profile: { ...preset.profile },
    changedProfileKeys: [],
    difficulty: "medium",
    style: preset.style,
    tactics: preset.tactics,
    industry: "Производство",
    counterpartyRole: "Директор по закупкам",
    relationship: "working",
    durationMin: preset.durationMin,
    knownContext: "Контракт истекает через месяц. У клиента есть предложение конкурента на 8% дешевле.",
    dealParams: ["Цена", "Объём", "Сроки", "Оплата"],
    inputMode: "voice",
    situation: "Мы поставляем упаковку производителю бытовой химии три года. Контракт истекает через месяц. У «ТехПак» есть предложение конкурента на 8% ниже. Хотим продлить договор на год.",
    conditions: [
      { id: "price", label: "Цена за короб", current: "1 240 ₽ сейчас", limit: "не ниже 1 150 ₽" },
      { id: "volume", label: "Объём", current: "5 000 в месяц", limit: "не меньше 4 000" },
      { id: "term", label: "Срок контракта", current: "12 месяцев", limit: "6–12 месяцев" },
      { id: "payment", label: "Отсрочка платежа", current: "30 дней", limit: "не больше 45 дней" },
    ],
    locks: {
      topic: true, role: true, goal: true, difficulty: true, tactics: true,
      industry: false, counterpartyRole: false, style: false, relationship: false, conditions: false,
    },
    seed: null,
  };
}
