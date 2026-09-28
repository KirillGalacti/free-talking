import { roleLabel, topicLabel } from "../../shared/catalog";
import type { CreationMethod, SessionSettings } from "../../shared/types";

export const methodSubtitle: Record<CreationMethod, string> = {
  preset: "готовый пресет",
  exact: "точная настройка",
  random: "согласованный рандом",
  seed: "повтор по seed",
};

export const methodTitle: Record<CreationMethod, string> = {
  preset: "Готовый пресет",
  exact: "Точная настройка",
  random: "Согласованный рандом",
  seed: "Повтор по seed",
};

export function topicText(settings: Pick<SessionSettings, "topic" | "topicCustom">) {
  return topicLabel(settings);
}

/** «Ввести» turns the details field into the role itself: its first part becomes the role name. */
export function roleText(settings: Pick<SessionSettings, "role" | "roleCustom" | "roleDetails">) {
  if (settings.role === "custom") {
    return settings.roleDetails.split("·")[0].trim() || settings.roleCustom || "Своя роль";
  }
  return roleLabel(settings);
}

const ADJECTIVE = /(ый|ий|ой|ая|яя|ое|ее|ые|ие)$/i;

/** «Продлить годовой контракт на поставку…» → «Продлить контракт». */
export function shortGoal(goal: string) {
  const words = goal.trim().replace(/\s+/g, " ").split(" ").filter(Boolean);
  if (words.length <= 2) return words.join(" ");
  const [first, ...rest] = words;
  const noun = rest.find((word) => !ADJECTIVE.test(word) && word.length > 2) ?? rest[0];
  return `${first} ${noun.replace(/[.,;:!?]+$/, "")}`;
}
