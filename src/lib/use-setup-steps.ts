import type { StepItem } from "@/components/setup-layout";
import { difficultyLabels } from "../../shared/catalog";
import { methodSubtitle, methodTitle, roleText, shortGoal, topicText } from "@/lib/setup-labels";
import { useFlow } from "@/state/flow";

type Screen = "counterparty" | "exact" | "details" | "seed" | "random" | "random-result";

/** Stepper contents for the screens after «Способ создания». */
export function useSetupSteps(screen: Screen): StepItem[] {
  const { settings } = useFlow();
  const method = settings.method ?? "preset";
  const topic = topicText(settings);
  const role = roleText(settings);

  if (screen === "random-result") {
    return [
      { label: "Тематика", sub: topic, state: "done" },
      { label: "Способ", sub: methodTitle[method], state: "done" },
      { label: "Ваша роль", sub: role, state: "done" },
      { label: "Цель", sub: shortGoal(settings.goal), state: "done" },
      { label: "Параметры", sub: "Соберёт система", state: "done" },
      { label: "Сложность", sub: difficultyLabels[settings.difficulty], state: "done" },
    ];
  }

  const active = screen === "counterparty" || screen === "exact";
  return [
    { label: "Способ", sub: methodSubtitle[method], state: "done" },
    { label: "Тематика", sub: topic.toLowerCase(), state: "done" },
    { label: "Ваша роль", sub: role.toLowerCase(), state: "done" },
    { label: "Цель", sub: "ваша цель", state: "done" },
    { label: "Контрагент", state: active ? "current" : "done" },
    { label: "Сложность", state: active ? "current" : "done" },
  ];
}
