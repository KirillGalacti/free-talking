import { skillLabel } from "../../shared/catalog";
import type { StoredSession } from "../../shared/types";

/** Short outcome label for history cards («Контракт продлён · −3%», «Без сделки»). */
export function outcomeChip(session: StoredSession) {
  const analysis = session.analysis;
  if (analysis) {
    if (!analysis.dealReached) return "Без сделки";
    const tail = analysis.outcomeBullets[0]?.match(/[−-]\s?\d+[,.]?\d*\s?%/)?.[0];
    return tail ? `${analysis.outcomeTitle.split(" ").slice(0, 2).join(" ")} · ${tail.replace("-", "−")}` : analysis.outcomeTitle;
  }
  if (session.dealStatus === "agreed") return "Сделка";
  if (session.dealStatus === "rejected" || session.dealStatus === "walk_away") return "Без сделки";
  return "Завершено";
}

export function skillsSummary(session: StoredSession) {
  const analysis = session.analysis;
  if (!analysis) return "Разбор ещё не готов";
  const scored = analysis.skills.filter((skill) => typeof skill.score === "number");
  const weakest = [...scored].sort((a, b) => (a.score ?? 0) - (b.score ?? 0))[0];
  return `Навыки: ${analysis.assessedCount} из 12 оценены${weakest ? ` · слабее всего «${skillLabel(weakest.id)}» — ${weakest.score} из 4` : ""}`;
}

export function formatDay(iso: string) {
  const date = new Date(iso);
  return `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function formatClock(seconds: number) {
  const safe = Math.max(0, Math.round(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

export function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  const plural = (value: number, forms: [string, string, string]) => {
    const mod10 = value % 10;
    const mod100 = value % 100;
    if (mod10 === 1 && mod100 !== 11) return forms[0];
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
    return forms[2];
  };
  return `${minutes} ${plural(minutes, ["минута", "минуты", "минут"])} ${rest} ${plural(rest, ["секунда", "секунды", "секунд"])}`;
}

export function pluralRu(value: number, forms: [string, string, string]) {
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}
