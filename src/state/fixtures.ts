// Development-only presets of the setup flow, used to compare screens with the mockups (?fixture=…).
import { defaultSettings } from "../../shared/catalog";
import type { SessionSettings } from "../../shared/types";

const filled: Partial<SessionSettings> = {
  topic: "purchasing",
  role: "sales_manager",
};

export const fixtures: Record<string, Partial<SessionSettings>> = {
  empty: {},
  preset: { ...filled, method: "preset" },
  random: { ...filled, method: "random" },
  seed: { ...filled, method: "seed" },
  exact: { ...filled, method: "exact" },
};

export function fixtureSettings(name: string | null): SessionSettings | null {
  if (!import.meta.env.DEV || !name || !(name in fixtures)) return null;
  return { ...defaultSettings(), ...fixtures[name] };
}

import { presetBrief } from "../../shared/preset-scenario";
import type { PublicBrief } from "../../shared/types";

const randomBrief: PublicBrief = {
  ...presetBrief,
  seed: "7KQ2M1XA",
  method: "random",
  title: "Новый поставщик",
  situationTitle: "Новый поставщик для молочного завода",
  summary: "Вы — менеджер по продажам поставщика упаковки. Молочный завод впервые выбирает поставщика стаканчиков на сезон. Директор по закупкам сравнивает три предложения и сначала говорит о сроках, а не о цене.",
  counterparty: { ...presetBrief.counterparty, name: "Олег Миронов", gender: "m" },
  tactics: "none",
  generated: {
    industry: "Пищевое производство",
    counterparty: "Олег Миронов · директор по закупкам",
    style: "Холодный · медленно раскрывается",
    relationship: "Первая встреча",
    conditions: "цена, объём, график поставок",
  },
};

export function fixtureBrief(name: string | null): PublicBrief | null {
  if (!import.meta.env.DEV || !name) return null;
  if (name === "preset") return presetBrief;
  if (name === "random") return randomBrief;
  return null;
}
