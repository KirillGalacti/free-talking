import { navigate } from "@/lib/router";

const hotspots = [
  { label: "Обзор", top: 246 },
  { label: "Обучение", top: 328 },
  { label: "Тренировки", top: 410 },
  { label: "Свободные переговоры", top: 492, current: true },
  { label: "Прогресс", top: 574 },
  { label: "Достижения", top: 656 },
  { label: "Профиль", top: 897 },
  { label: "Настройки", top: 963 },
];

/** Application rail from the mockup; «Свободные переговоры» is the active section. */
export function AppRail() {
  return (
    <nav className="app-rail" aria-label="Разделы приложения">
      <img className="app-rail-art" src="/assets/rail.svg" alt="" width="120" height="1010" draggable={false} />
      <button type="button" className="app-rail-logo" aria-label="Новая сессия" title="Новая сессия" onClick={() => navigate("setup")} />
      {hotspots.map((spot) => (
        <button
          key={spot.label}
          type="button"
          className="app-rail-spot"
          style={{ top: spot.top }}
          title={spot.label}
          aria-label={spot.label}
          aria-current={spot.current ? "page" : undefined}
          onClick={spot.current ? () => navigate("setup") : undefined}
        />
      ))}
    </nav>
  );
}
