// Development-only sessions with analyses taken from the mockups (?fixtureSession=deal|nodeal).
import { defaultSettings } from "../../shared/catalog";
import { presetBrief } from "../../shared/preset-scenario";
import type { SessionAnalysis, StoredSession } from "../../shared/types";

const transcript: StoredSession["transcript"] = [
  { id: "t0", role: "assistant", content: "Восемь процентов — или мы расходимся. Решайте сейчас.", elapsedSec: 0 },
  { id: "t1", role: "user", content: "Понимаю. Что для вас важнее в новом контракте — цена за короб или надёжность поставок?", elapsedSec: 150 },
  { id: "t2", role: "assistant", content: "Восемь процентов — или мы расходимся. Решайте сейчас.", elapsedSec: 245 },
  { id: "t3", role: "user", content: "Хорошо, можем снизить на три процента", elapsedSec: 252 },
  { id: "t4", role: "assistant", content: "У конкурента цена ниже, это факт", elapsedSec: 425 },
  { id: "t5", role: "user", content: "Давайте тогда обсудим, что мы можем сделать по цене", elapsedSec: 460 },
  { id: "t6", role: "assistant", content: "Бюджет на следующий год урезали — мне нужно показать экономию.", elapsedSec: 425 },
  { id: "t7", role: "user", content: "Ниже 1 150 ₽ мы не опустимся. Если это ваш предел — давайте вернёмся к разговору в следующем квартале.", elapsedSec: 760 },
  { id: "t8", role: "assistant", content: "Хорошо, продлеваем на этих условиях", elapsedSec: 600 },
  { id: "t9", role: "user", content: "Отлично, тогда договорились", elapsedSec: 605 },
];

const skills = (values: (number | null)[]): SessionAnalysis["skills"] => {
  const ids = ["preparation", "framing", "listening", "spin", "interests", "options", "criteria", "argumentation", "concessions", "pressure", "batna", "closing"] as const;
  const summaries = [
    "Назвали цель и свою границу до первого предложения", "Обозначили повестку: цена, срок, хранение", "Пересказали требование Ирины перед ответом",
    "Спросили о проблеме, но не о последствиях", "Выяснили: Ирине нужно показать экономию бюджета", "Предложили один вариант — скидку",
    "В разговоре не возникло момента сослаться на рынок или расчёт", "Ответили на цену аргументом о надёжности поставок", "Уступили 3% без встречного условия",
    "Не приняли ультиматум и вернули разговор к интересам", "Сделку не сравнивали со своей альтернативой — повода не было", "Не проговорили сроки оплаты перед согласием",
  ];
  return ids.map((id, index) => ({ id, score: values[index], summary: summaries[index], evidenceTurnId: "t1" }));
};

const base: Omit<SessionAnalysis, "dealReached" | "outcomeTitle" | "outcomeBullets" | "outcomeNote" | "skills" | "assessedCount"> = {
  moments: [
    { id: "M1", positionTurnId: "t2", responseTurnId: "t3", title: "Уступка без встречного условия", skill: "concessions", positionQuote: "Восемь процентов — или мы расходимся. Решайте сейчас.", responseQuote: "Хорошо, можем снизить на три процента", fact: "Уступили цену сразу, не назвав, что хотите взамен.", effect: "Ирина закрепила уступку и попросила ещё 5%.", improvement: "Ставьте уступку в пару: «если…, то…» — объём, срок или предоплата.", reactionSummary: "Ирина усилила давление и попросила ещё 5%", timeSec: 252, replayRemainingSec: 648 },
    { id: "M2", positionTurnId: "t4", responseTurnId: "t5", title: "BATNA контрагента не проверена", skill: "batna", positionQuote: "У конкурента цена ниже, это факт", responseQuote: "Давайте тогда обсудим, что мы можем сделать по цене", fact: "Не уточнили, насколько реально предложение конкурента.", effect: "Цена обсуждалась только относительно конкурента.", improvement: "Спросите о сроках, объёме и условиях конкурента.", reactionSummary: "Цена обсуждалась только относительно конкурента", timeSec: 460, replayRemainingSec: 475 },
    { id: "M3", positionTurnId: "t8", responseTurnId: "t9", title: "Сроки оплаты не зафиксированы", skill: "closing", positionQuote: "Хорошо, продлеваем на этих условиях", responseQuote: "Отлично, тогда договорились", fact: "Закрыли сделку, не повторив условия.", effect: "Отсрочка платежа осталась без договорённости.", improvement: "Перед согласием кратко повторите цену, срок, хранение и оплату.", reactionSummary: "Отсрочка платежа осталась без договорённости", timeSec: 605, replayRemainingSec: 300 },
  ],
  strongDecision: { turnId: "t7", quote: "Ниже 1 150 ₽ мы не опустимся. Если это ваш предел — давайте вернёмся к разговору в следующем квартале.", comment: "Вы сравнили предложение со своей альтернативой и не перешли красную линию.", timeSec: 760 },
  growthPoint: { text: "Вы не предложили вариантов кроме цены: объём, срок контракта или хранение запаса могли дать Ирине экономию без скидки.", skill: "options", score: 1 },
  offers: [
    { turnId: "t0", turnIndex: 1, who: "counterparty", text: "−8% или контракт не продлевается", status: "отклонено" },
    { turnId: "t3", turnIndex: 5, who: "user", text: "−3% на год", status: "Ирина просит ещё 5%" },
    { turnId: "t9", turnIndex: 9, who: "user", text: "−3%, хранение запаса за вами, цена на год", status: "принято", accent: true },
  ],
  concessions: [
    { turnId: "t3", timeSec: 252, text: "−3% цены", received: "ничего взамен", conditional: false },
    { turnId: "t7", timeSec: 580, text: "хранение запаса", received: "цена зафиксирована на 12 месяцев", conditional: true },
  ],
  concessionNote: "Безусловная уступка снижает оценку навыка «Уступки», даже если сделка состоялась.",
  timeline: [
    { turnId: "t0", timeSec: 0, kind: "ultimatum", category: "offers", title: "Ультиматум", caption: "«−8% или не продлеваем»" },
    { turnId: "t1", timeSec: 150, kind: "question", category: "other", title: "Вопрос", caption: "что важнее: цена или надёжность" },
    { turnId: "t3", timeSec: 252, kind: "concession", category: "concessions", title: "Уступка", caption: "−3% без условия" },
    { turnId: "t6", timeSec: 425, kind: "revealed", category: "revealed", title: "Раскрыто", caption: "бюджет урезан" },
    { turnId: "t5", timeSec: 460, kind: "missed", category: "other", title: "Упущено", caption: "BATNA не проверена" },
    { turnId: "t7", timeSec: 580, kind: "package", category: "offers", title: "Пакет", caption: "цена на год + хранение" },
    { turnId: "t9", timeSec: 705, kind: "deal", category: "offers", title: "Сделка", caption: "контракт продлён" },
  ],
  learnedFacts: [
    { turnId: "t6", timeSec: 425, text: "Бюджет на следующий год урезан — нужно показать экономию" },
    { turnId: "t8", timeSec: 490, text: "Для Ирины важна надёжность: у прошлого поставщика был срыв" },
  ],
  hiddenFactsLeft: 2,
  boundaries: [
    { label: "Красная линия: не ниже 1 150 ₽", detail: "итог 1 203 ₽", status: "kept" },
    { label: "BATNA: новый клиент на 60% объёма", detail: "сделка лучше — объём 100%", status: "kept" },
    { label: "Отсрочка не больше 45 дней", detail: "не обсуждалась", status: "unknown" },
  ],
  nextAttempt: "Ставьте каждую уступку в пару: «Если вы…, то мы…». Начните повтор с 04:12 — там решился итог по цене.",
  keyMomentId: "M1",
  rubricVersion: "FREE-rubric-2.0",
  modelVersion: "fixture",
  analyzedAt: "2026-09-24T12:00:00.000Z",
};

const dealAnalysis: SessionAnalysis = {
  ...base,
  dealReached: true,
  outcomeTitle: "Контракт продлён на год",
  outcomeBullets: ["цена −3%: 1 203 ₽ за короб", "хранение запаса — за вами", "сроки оплаты не обсуждались"],
  outcomeNote: "Исход сделки показан отдельно от оценки навыков",
  skills: skills([3, 3, 3, 2, 3, 2, null, 3, 1, 3, null, 2]),
  assessedCount: 10,
};

const noDealAnalysis: SessionAnalysis = {
  ...base,
  dealReached: false,
  outcomeTitle: "Соглашение не достигнуто",
  outcomeBullets: ["Ирина: −8% или без продления", "ваша граница: не ниже 1 150 ₽", "вы выбрали свою BATNA"],
  outcomeNote: "Отказ от сделки за красной линией — тоже решение",
  skills: skills([3, 2, 3, null, 2, 1, 3, 2, 3, 2, 4, null]),
  assessedCount: 10,
  keyMomentId: "M2",
  moments: [{ ...base.moments[1], timeSec: 380 }, base.moments[0], base.moments[2]],
};

export function fixtureSession(kind: string | null): StoredSession | null {
  if (!import.meta.env.DEV || (kind !== "deal" && kind !== "nodeal")) return null;
  return {
    schemaVersion: 1,
    id: `fixture-${kind}`,
    seed: presetBrief.seed,
    brief: presetBrief,
    settings: defaultSettings(),
    startedAt: "2026-09-24T12:00:00.000Z",
    endedAt: "2026-09-24T12:12:00.000Z",
    durationSec: 900,
    elapsedSec: kind === "deal" ? 705 : 790,
    transcript,
    completionState: "COMPLETED",
    completionReason: kind === "deal" ? "DEAL" : "NO_DEAL",
    dealStatus: kind === "deal" ? "agreed" : "rejected",
    attempt: 1,
    analysis: kind === "deal" ? dealAnalysis : noDealAnalysis,
  };
}
