import {
  counterpartyRoles, dealParamOptions, difficultyLower, industries, presetById, relationshipLabels, relationshipLong, roles,
  styleLabels, styleTitles, tacticsLabels, topics,
} from "../shared/catalog";
import { generateSeed, pick, seededRandom } from "../shared/seed";
import type {
  BehaviorProfile, CreationMethod, Difficulty, Level, PublicBrief, RelationshipId, SessionSettings, StyleId, TacticsId, TopicId,
} from "../shared/types";
import type { HiddenCard } from "./card";
import { REASONING_MODEL, complete, parseModelJson } from "./yandex";

const levelNumber: Record<Level, number> = { low: 25, mid: 50, high: 75 };
const VERSIONS = { scenario: "1.4", profile: "1.2", rubric: "2.0" };

const text = (value: unknown, max = 600) => (typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : "");
const list = (value: unknown, max = 8, length = 300) =>
  Array.isArray(value) ? value.map((item) => text(item, length)).filter(Boolean).slice(0, max) : [];
const capitalize = (value: string) => (value ? value.charAt(0).toUpperCase() + value.slice(1) : value);
const record = (value: unknown) => (value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {});

const LEVELS: Level[] = ["low", "mid", "high"];
const DIFFICULTIES: Difficulty[] = ["basic", "medium", "high"];
const TACTICS: TacticsId[] = ["none", "moderate", "hard"];
const STYLES: StyleId[] = ["business", "friendly", "cold", "emotional"];
const RELATIONS: RelationshipId[] = ["first", "working", "partner", "conflict"];

/** Validates and clamps settings received from the browser. */
export function sanitizeSettings(value: unknown): SessionSettings {
  const input = record(value);
  const profileInput = record(input.profile);
  const level = (key: string): Level => (LEVELS.includes(profileInput[key] as Level) ? profileInput[key] as Level : "mid");
  const profile: BehaviorProfile = {
    toughness: level("toughness"), cooperation: level("cooperation"), openness: level("openness"),
    emotionality: level("emotionality"), initiative: level("initiative"),
  };
  const locksInput = record(input.locks);
  const conditions = Array.isArray(input.conditions)
    ? input.conditions.slice(0, 6).map((item, index) => {
      const condition = record(item);
      return { id: text(condition.id, 60) || `c${index}`, label: text(condition.label, 40), current: text(condition.current, 40), limit: text(condition.limit, 40) };
    }).filter((condition) => condition.label)
    : [];
  return {
    method: (["preset", "exact", "random", "seed"] as CreationMethod[]).includes(input.method as CreationMethod) ? input.method as CreationMethod : "preset",
    topic: ([...topics.map((topic) => topic.id), "custom"] as TopicId[]).includes(input.topic as TopicId) ? input.topic as TopicId : "purchasing",
    topicCustom: text(input.topicCustom, 60),
    role: ([...roles.map((role) => role.id), "custom"] as string[]).includes(String(input.role)) ? input.role as SessionSettings["role"] : "sales_manager",
    roleCustom: text(input.roleCustom, 60),
    roleDetails: text(input.roleDetails, 160),
    goal: text(input.goal, 260),
    presetId: presetById(input.presetId as SessionSettings["presetId"]).id,
    profile,
    changedProfileKeys: [],
    difficulty: DIFFICULTIES.includes(input.difficulty as Difficulty) ? input.difficulty as Difficulty : "medium",
    style: STYLES.includes(input.style as StyleId) ? input.style as StyleId : "business",
    tactics: TACTICS.includes(input.tactics as TacticsId) ? input.tactics as TacticsId : "moderate",
    industry: text(input.industry, 60) || "Производство",
    counterpartyRole: text(input.counterpartyRole, 60) || "Директор по закупкам",
    relationship: RELATIONS.includes(input.relationship as RelationshipId) ? input.relationship as RelationshipId : "working",
    durationMin: [10, 15, 20, 30].includes(Number(input.durationMin)) ? Number(input.durationMin) : 15,
    knownContext: text(input.knownContext, 400),
    dealParams: list(input.dealParams, 5, 20).filter((param) => dealParamOptions.includes(param)),
    inputMode: input.inputMode === "text" ? "text" : "voice",
    situation: text(input.situation, 600),
    conditions,
    locks: {
      topic: locksInput.topic !== false, role: locksInput.role !== false, goal: locksInput.goal !== false,
      difficulty: locksInput.difficulty !== false, tactics: locksInput.tactics !== false,
      industry: locksInput.industry === true, counterpartyRole: locksInput.counterpartyRole === true,
      style: locksInput.style === true, relationship: locksInput.relationship === true, conditions: locksInput.conditions === true,
    },
    seed: null,
  };
}

/** «Согласованный рандом»: the seed deterministically picks every visible parameter that is not locked. */
export function applyRandomPicks(settings: SessionSettings, seed: string): SessionSettings {
  const random = seededRandom(seed);
  const next = { ...settings, locks: { ...settings.locks } };
  const { locks } = settings;
  if (!locks.topic) next.topic = pick(random, topics).id;
  if (!locks.role) next.role = pick(random, roles).id;
  if (!locks.goal) next.goal = "";
  if (!locks.difficulty) next.difficulty = pick(random, DIFFICULTIES);
  if (!locks.tactics) next.tactics = pick(random, TACTICS);
  if (!locks.industry) next.industry = pick(random, industries);
  if (!locks.counterpartyRole) next.counterpartyRole = pick(random, counterpartyRoles);
  if (!locks.style) next.style = pick(random, next.tactics === "hard" ? ["business", "cold", "emotional"] as StyleId[] : STYLES);
  if (!locks.relationship) next.relationship = pick(random, RELATIONS);
  if (!locks.conditions) {
    const shuffled = [...dealParamOptions].sort(() => random() - 0.5);
    next.dealParams = shuffled.slice(0, 2 + Math.floor(random() * 3));
  }
  // Style must stay compatible with the locked tactics: pressure tactics never pair with a «friendly» mask.
  if (next.tactics === "hard" && next.style === "friendly") next.style = "business";
  next.profile = {
    toughness: next.tactics === "hard" ? "high" : pick(random, LEVELS),
    cooperation: next.style === "friendly" ? "high" : pick(random, LEVELS),
    openness: next.style === "cold" ? "low" : pick(random, LEVELS),
    emotionality: next.style === "emotional" ? "high" : pick(random, ["low", "mid"] as Level[]),
    initiative: pick(random, LEVELS),
  };
  return next;
}

function roleName(settings: SessionSettings) {
  if (settings.role === "custom") return settings.roleDetails.split("·")[0].trim() || "участник переговоров";
  return roles.find((role) => role.id === settings.role)?.lower ?? "менеджер по продажам";
}

function topicName(settings: SessionSettings) {
  if (settings.topic === "custom") return settings.topicCustom || "своя тема";
  return topics.find((topic) => topic.id === settings.topic)?.label ?? "Закупки";
}

const difficultySpec: Record<Difficulty, string> = {
  basic: "1–2 параметра сделки, 1 скрытый интерес, простые возражения, мягкий лимит времени",
  medium: "3–5 параметров сделки, 2–3 скрытых интереса, связанные возражения, умеренный лимит времени",
  high: "5 и более связанных параметров, 3–4 скрытых интереса, возражения с проверкой расчётов, жёсткий лимит времени",
};

function buildPrompt(settings: SessionSettings, method: CreationMethod) {
  const preset = presetById(settings.presetId);
  const visible = {
    method,
    topic: topicName(settings),
    participant_role: roleName(settings),
    participant_authority: settings.roleDetails || "не указаны",
    participant_goal: settings.goal || "система формулирует цель сама, исходя из темы и роли",
    counterparty_preset: method === "random" ? "подбирается под позицию" : preset.label,
    counterparty_role: settings.counterpartyRole,
    industry: settings.industry,
    relationship: relationshipLong[settings.relationship],
    style: styleLabels[settings.style],
    tactics: tacticsLabels[settings.tactics],
    difficulty: `${difficultyLower[settings.difficulty]}: ${difficultySpec[settings.difficulty]}`,
    duration_minutes: settings.durationMin,
    deal_parameters: settings.dealParams,
    known_context: settings.knownContext || "нет",
    participant_situation: method === "exact" ? settings.situation : undefined,
    participant_conditions: method === "exact" ? settings.conditions.map((condition) => `${condition.label}: сейчас ${condition.current}; граница участника — ${condition.limit}`) : undefined,
    profile_0_100: Object.fromEntries(Object.entries(settings.profile).map(([key, value]) => [key, levelNumber[value as Level]])),
  };

  const system = `Ты — методист-сценарист тренажёра деловых переговоров «Арена переговоров». Собери ОДНУ непротиворечивую учебную ситуацию свободных переговоров на русском языке.
Правила:
- Сначала придумай скрытую переговорную позицию ИИ-контрагента, затем публичный бриф участника, согласованный с ней.
- Красные линии контрагента не должны попадать внутрь его целевого пакета; уступки не выходят за полномочия; BATNA контрагента — реальная альтернатива, а не копия сделки.
- Публичные факты не раскрывают скрытые интересы, BATNA и границы контрагента и не противоречат скрытым фактам.
- Стиль и тактики контрагента соблюдай строго: при «без давления» контрагент не давит и не ставит ультиматумов.
- Используй конкретные правдоподобные числа (цены, объёмы, сроки) и единые единицы измерения во всех полях.
- Не используй реальные названия компаний и имена реальных людей; имя контрагента — вымышленное русское имя и фамилия.
- Если участник сам задал ситуацию и условия, сохрани их числа и границы дословно и построй скрытую позицию под них.
- Стартовая реплика контрагента — его заявленная позиция, 1–2 предложения, живая разговорная речь в его стиле.
Верни только JSON без Markdown по схеме:
{
 "public": {
  "title": "короткое название встречи, 2–3 слова",
  "situation_title": "название ситуации, 3–6 слов",
  "summary": "2–3 предложения: кто участник, кто контрагент и в чём ситуация",
  "participant_role": "Вы — … Одно предложение про роль и полномочия участника",
  "situation": "2–3 предложения публичного контекста",
  "task": "задача участника одной фразой",
  "facts": ["3–5 публичных фактов с числами"],
  "participant_batna": "лучшая альтернатива участника или пустая строка",
  "participant_red_line": "красная линия участника или пустая строка",
  "counterparty_name": "Имя Фамилия",
  "counterparty_gender": "f или m",
  "counterparty_role": "должность строчными буквами",
  "opening_line": "первая реплика контрагента",
  "generated": {"industry": "отрасль", "counterparty": "Имя Фамилия · должность", "style": "стиль · манера", "relationship": "отношения сторон", "conditions": "обсуждаемые условия через запятую"}
 },
 "hidden": {
  "stated_position": "…", "true_goal": "…",
  "interests": [{"text": "…", "priority": 1, "reveal_when": "…"}],
  "batna": "…",
  "red_lines": ["…"], "authority": ["…"],
  "target_package": "…", "acceptable_ranges": ["…"], "objective_criteria": ["…"],
  "concessions": [{"give": "…", "require": "…"}],
  "hidden_facts": [{"id": "латиница", "text": "…", "reveal_when": "…"}],
  "objections": [{"topic": "цена|срок|качество|риск|полномочия|доверие|опыт", "text": "…", "close_when": "…"}]
 }
}`;
  return { system, user: JSON.stringify(visible) };
}

export interface ConsistencyReport { ok: boolean; problems: string[]; checks: string[] }

function words(value: string) {
  return new Set(value.toLowerCase().replace(/[^а-яёa-z0-9 ]/g, " ").split(/\s+/).filter((word) => word.length > 4));
}

/** Deterministic checks of the generated card; the model output is never trusted blindly. */
export function checkConsistency(brief: PublicBrief, card: HiddenCard, settings: SessionSettings): ConsistencyReport {
  const problems: string[] = [];
  if (!brief.openingLine || brief.openingLine.length < 12) problems.push("нет стартовой реплики контрагента");
  if (brief.facts.length < 2) problems.push("слишком мало публичных фактов");
  if (!card.targetPackage || card.acceptableRanges.length === 0) problems.push("нет целевого пакета или допустимых диапазонов");
  if (!card.batna) problems.push("нет BATNA контрагента");
  if (card.redLines.length === 0) problems.push("нет красных линий контрагента");
  if (card.interests.length === 0) problems.push("нет скрытых интересов");
  if (card.objections.some((objection) => !objection.closeWhen)) problems.push("у возражения нет условия закрытия");
  if (card.concessions.some((concession) => !concession.require)) problems.push("уступка без встречного условия");

  const batnaWords = words(card.batna);
  const positionWords = words(card.statedPosition);
  const overlap = [...batnaWords].filter((word) => positionWords.has(word)).length;
  if (batnaWords.size && overlap / batnaWords.size > 0.7) problems.push("BATNA повторяет заявленную позицию");

  const redLineInTarget = card.redLines.some((line) => line.length > 12 && card.targetPackage.toLowerCase().includes(line.toLowerCase()));
  if (redLineInTarget) problems.push("красная линия попала в целевой пакет");

  const publicText = `${brief.situation} ${brief.facts.join(" ")}`.toLowerCase();
  const leakedInterest = card.interests.some((interest) => interest.text.length > 20 && publicText.includes(interest.text.toLowerCase()));
  if (leakedInterest) problems.push("скрытый интерес раскрыт в публичном брифе");

  const aggressive = /ультиматум|угрож|последн(ее|ий) предупрежд/i.test(brief.openingLine);
  if (settings.tactics === "none" && aggressive) problems.push("стиль противоречит закреплённым тактикам");

  return {
    ok: problems.length === 0,
    problems,
    checks: [
      "целевой пакет внутри допустимых диапазонов",
      "BATNA — реальная альтернатива, не копия сделки",
      "публичные и скрытые факты не противоречат",
      "у каждого возражения есть условие закрытия",
      "стиль не противоречит закреплённым тактикам",
    ],
  };
}

function buildRecord(output: Record<string, unknown>, settings: SessionSettings, method: CreationMethod, seed: string) {
  const pub = record(output.public);
  const hidden = record(output.hidden);
  const generated = record(pub.generated);
  const preset = presetById(settings.presetId);
  const exactRedLine = settings.conditions.find((condition) => condition.limit)?.limit;
  const exactNotes = settings.conditions.slice(1).filter((condition) => condition.limit).map((condition) => `${condition.label}: ${condition.limit}`);

  const brief: PublicBrief = {
    seed,
    method,
    title: text(pub.title, 60) || "Переговоры",
    situationTitle: text(pub.situation_title, 90) || text(pub.title, 60) || "Новая ситуация",
    summary: text(pub.summary, 420),
    topicLabel: topicName(settings),
    participantRole: text(pub.participant_role, 260),
    situation: text(pub.situation, 480),
    task: text(pub.task, 200) || settings.goal,
    facts: list(pub.facts, 5, 140),
    boundaries: {
      batna: text(pub.participant_batna, 200) || undefined,
      redLine: method === "exact" && exactRedLine ? `${settings.conditions[0].label.toLowerCase()} ${exactRedLine}` : text(pub.participant_red_line, 200) || undefined,
      notes: method === "exact" ? exactNotes : undefined,
    },
    counterparty: {
      name: text(pub.counterparty_name, 60) || "Анна Смирнова",
      gender: pub.counterparty_gender === "m" ? "m" : "f",
      role: (text(pub.counterparty_role, 80) || settings.counterpartyRole).toLowerCase(),
      presetLabel: method === "random" || method === "exact" ? `${styleTitles[settings.style]} контрагент` : preset.label,
      styleLabel: styleLabels[settings.style],
    },
    difficulty: settings.difficulty,
    tactics: settings.tactics,
    durationMin: settings.durationMin,
    inputMode: settings.inputMode,
    openingLine: text(pub.opening_line, 400),
    generated: {
      industry: text(generated.industry, 60) || settings.industry,
      counterparty: text(generated.counterparty, 90) || `${text(pub.counterparty_name, 60)} · ${settings.counterpartyRole.toLowerCase()}`,
      style: capitalize(text(generated.style, 60)) || styleTitles[settings.style],
      relationship: capitalize(text(generated.relationship, 60)) || relationshipLabels[settings.relationship],
      conditions: text(generated.conditions, 80) || settings.dealParams.join(", ").toLowerCase(),
    },
    checks: [],
    versions: VERSIONS,
    createdAt: new Date().toISOString(),
  };

  const itemList = (value: unknown) => (Array.isArray(value) ? value.map(record) : []);
  const card: HiddenCard = {
    statedPosition: text(hidden.stated_position, 300),
    trueGoal: text(hidden.true_goal, 300),
    interests: itemList(hidden.interests).map((item, index) => ({ text: text(item.text, 240), priority: Number(item.priority) || index + 1, revealWhen: text(item.reveal_when, 240) })).filter((item) => item.text).slice(0, 5),
    batna: text(hidden.batna, 300),
    redLines: list(hidden.red_lines, 5, 200),
    authority: list(hidden.authority, 5, 200),
    targetPackage: text(hidden.target_package, 300),
    acceptableRanges: list(hidden.acceptable_ranges, 6, 160),
    objectiveCriteria: list(hidden.objective_criteria, 6, 160),
    concessions: itemList(hidden.concessions).map((item) => ({ give: text(item.give, 200), require: text(item.require, 200) })).filter((item) => item.give).slice(0, 5),
    hiddenFacts: itemList(hidden.hidden_facts).map((item, index) => ({ id: text(item.id, 30) || `f${index + 1}`, text: text(item.text, 240), revealWhen: text(item.reveal_when, 200) })).filter((item) => item.text).slice(0, 6),
    objections: itemList(hidden.objections).map((item) => ({ topic: text(item.topic, 30), text: text(item.text, 240), closeWhen: text(item.close_when, 240) })).filter((item) => item.text).slice(0, 5),
    profile: {
      assertiveness: levelNumber[settings.profile.toughness],
      cooperativeness: levelNumber[settings.profile.cooperation],
      openness: levelNumber[settings.profile.openness],
      directness: settings.style === "business" || settings.style === "cold" ? 70 : 45,
      patience: settings.profile.initiative === "high" ? 35 : 55,
      expertise: settings.difficulty === "high" ? 80 : settings.difficulty === "medium" ? 65 : 45,
      riskTolerance: 40,
      conflictMode: settings.tactics === "hard" ? "соперничество" : settings.profile.cooperation === "high" ? "сотрудничество" : "компромисс",
    },
    initialState: { trust: 50, tension: settings.tactics === "hard" ? 60 : 40, optionReadiness: settings.profile.cooperation === "high" ? 50 : 30 },
  };
  return { brief, card };
}

/** Builds the frozen card through YandexGPT with deterministic validation; one corrective retry. */
export async function assembleScenario(settings: SessionSettings) {
  const method = settings.method === "seed" || !settings.method ? "preset" : settings.method;
  const seed = generateSeed();
  const effective = method === "random" ? applyRandomPicks(settings, seed) : settings;
  const prompt = buildPrompt(effective, method);
  let feedback = "";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { text: answer, model } = await complete(
      [
        { role: "system", content: prompt.system },
        { role: "user", content: feedback ? `${prompt.user}\n\nИсправь проблемы прошлой версии: ${feedback}` : prompt.user },
      ],
      { model: REASONING_MODEL, temperature: method === "random" ? 0.8 : 0.5, maxTokens: 3200 },
    );
    let parsed: Record<string, unknown>;
    try {
      parsed = parseModelJson(answer);
    } catch (error) {
      feedback = "ответ должен быть одним корректным JSON-объектом";
      if (attempt === 1) throw error;
      continue;
    }
    const built = buildRecord(parsed, effective, method, seed);
    const report = checkConsistency(built.brief, built.card, effective);
    if (report.ok) {
      built.brief.checks = report.checks;
      return { ...built, model, settings: effective };
    }
    feedback = report.problems.join("; ");
  }
  throw new Error(`Сценарий не прошёл проверку связности: ${feedback}`);
}

export function describeSettingsForLog(settings: SessionSettings) {
  return `${settings.method}/${topicName(settings)}/${settings.presetId}/${settings.difficulty}/${styleTitles[settings.style]}`;
}

export { tacticsLabels };
