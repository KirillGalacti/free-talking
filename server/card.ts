import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PRESET_SEED, presetBrief } from "../shared/preset-scenario";
import type { PublicBrief } from "../shared/types";

/** Hidden counterparty card. It is frozen per seed and never sent to the client. */
export interface HiddenCard {
  statedPosition: string;
  trueGoal: string;
  interests: { text: string; priority: number; revealWhen: string }[];
  batna: string;
  redLines: string[];
  authority: string[];
  targetPackage: string;
  acceptableRanges: string[];
  objectiveCriteria: string[];
  concessions: { give: string; require: string }[];
  hiddenFacts: { id: string; text: string; revealWhen: string }[];
  objections: { topic: string; text: string; closeWhen: string }[];
  profile: { assertiveness: number; cooperativeness: number; openness: number; directness: number; patience: number; expertise: number; riskTolerance: number; conflictMode: string };
  initialState: { trust: number; tension: number; optionReadiness: number };
}

export interface ScenarioRecord {
  brief: PublicBrief;
  card: HiddenCard;
  model: string;
  createdAt: string;
}

export const presetCard: HiddenCard = {
  statedPosition: "Цена конкурента на 8% ниже; без такой же скидки продлевать контракт не будет.",
  trueGoal: "Показать руководству экономию бюджета на упаковке и не рисковать надёжностью поставок.",
  interests: [
    { text: "Бюджет на следующий год урезали — нужно показать экономию", priority: 1, revealWhen: "участник спрашивает, что стоит за требованием скидки или что для неё важнее" },
    { text: "Надёжность поставок: у прошлого поставщика был срыв, линия стояла", priority: 2, revealWhen: "участник спрашивает о рисках смены поставщика или о надёжности" },
    { text: "Склад переполнен: хранение запаса упаковки обходится дорого", priority: 3, revealWhen: "участник предлагает обсудить логистику, хранение или график поставок" },
  ],
  batna: "Перейти к конкуренту «ТехПак»: цена ниже на 8%, но поставщик новый, первая поставка через 45 дней, без истории качества.",
  redLines: [
    "Не соглашается на цену выше 1 215 ₽ за короб без дополнительной ценности",
    "Не принимает отсрочку платежа меньше 30 дней",
    "Не подписывает договор без фиксации сроков поставки",
  ],
  authority: ["Может подписать контракт на 6–18 месяцев", "Может согласовать отсрочку до 45 дней", "Не может менять объём больше чем на 20%"],
  targetPackage: "Цена 1 190–1 205 ₽ за короб, фиксированная на 12 месяцев, хранение запаса на складе поставщика, отсрочка 45 дней.",
  acceptableRanges: ["Цена: 1 180–1 215 ₽ за короб", "Срок контракта: 6–18 месяцев", "Отсрочка: 30–45 дней", "Объём: 4 500–6 000 коробов в месяц"],
  objectiveCriteria: ["Рыночная цена упаковки", "Стоимость хранения запаса", "История надёжности поставок", "Стоимость перехода на нового поставщика"],
  concessions: [
    { give: "Согласится на меньшую скидку (3–4%)", require: "поставщик берёт хранение запаса на себя или фиксирует цену на год" },
    { give: "Продлит контракт на 18 месяцев", require: "цена фиксируется на весь срок" },
    { give: "Увеличит объём до 5 500 коробов", require: "дополнительная скидка 1–2%" },
  ],
  hiddenFacts: [
    { id: "budget", text: "Бюджет на упаковку на следующий год урезан на 6%", revealWhen: "вопрос о причинах скидки" },
    { id: "failure", text: "У прошлого поставщика был срыв поставки, линия простояла два дня", revealWhen: "вопрос о надёжности или рисках" },
    { id: "techpak", text: "«ТехПак» не гарантирует первую поставку раньше чем через 45 дней", revealWhen: "вопрос о сроках или условиях конкурента" },
    { id: "storage", text: "Собственный склад заполнен, аренда дополнительного места дорогая", revealWhen: "разговор о хранении или графике поставок" },
  ],
  objections: [
    { topic: "цена", text: "Конкурент дешевле на восемь процентов", closeWhen: "участник показывает ценность пакета или обменивает уступку на условие" },
    { topic: "доверие", text: "Почему я должна верить, что вы не поднимете цену через полгода?", closeWhen: "цена фиксируется договором на срок" },
    { topic: "срок", text: "Контракт истекает через месяц, решать нужно сейчас", closeWhen: "участник предлагает конкретный график решения" },
  ],
  profile: { assertiveness: 65, cooperativeness: 50, openness: 35, directness: 70, patience: 55, expertise: 75, riskTolerance: 40, conflictMode: "соперничество с переходом к сотрудничеству" },
  initialState: { trust: 50, tension: 40, optionReadiness: 35 },
};

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDirectory = path.join(root, "data");
const storeFile = path.join(dataDirectory, "scenarios.json");

let scenarios: Record<string, ScenarioRecord> = {};
try {
  if (existsSync(storeFile)) scenarios = JSON.parse(readFileSync(storeFile, "utf8")) as Record<string, ScenarioRecord>;
} catch {
  scenarios = {};
}

let writeTimer: NodeJS.Timeout | null = null;
function persist() {
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    try {
      mkdirSync(dataDirectory, { recursive: true });
      writeFileSync(storeFile, JSON.stringify(scenarios, null, 1));
    } catch (error) {
      console.error("Не удалось сохранить сценарии:", error);
    }
  }, 150);
}

export function saveScenario(record: ScenarioRecord) {
  scenarios[record.brief.seed] = record;
  persist();
}

export function getScenario(seed: string): ScenarioRecord | null {
  if (seed === PRESET_SEED) return { brief: presetBrief, card: presetCard, model: "preset", createdAt: presetBrief.createdAt };
  return scenarios[seed] ?? null;
}

export function hasSeed(seed: string) {
  return seed === PRESET_SEED || Boolean(scenarios[seed]);
}
