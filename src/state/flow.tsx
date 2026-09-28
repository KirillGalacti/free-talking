import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { defaultSettings, presetById } from "../../shared/catalog";
import type { PresetId, PublicBrief, SessionSettings } from "../../shared/types";
import { fixtureBrief, fixtureSettings } from "./fixtures";

const DRAFT_KEY = "free-talking:draft:v1";

interface FlowState {
  settings: SessionSettings;
  brief: PublicBrief | null;
}

interface FlowApi extends FlowState {
  update: (patch: Partial<SessionSettings>) => void;
  applyPreset: (id: PresetId) => void;
  setBrief: (brief: PublicBrief | null) => void;
  reset: () => void;
}

function readDraft(): FlowState {
  const params = new URLSearchParams(window.location.search);
  const fixture = fixtureSettings(params.get("fixture"));
  if (fixture) return { settings: fixture, brief: fixtureBrief(params.get("fixtureBrief")) };
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as FlowState;
      return { settings: { ...defaultSettings(), ...parsed.settings }, brief: parsed.brief ?? null };
    }
  } catch {
    // A broken draft is replaced with defaults.
  }
  return { settings: defaultSettings(), brief: null };
}

const FlowContext = createContext<FlowApi | null>(null);

export function FlowProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FlowState>(readDraft);

  useEffect(() => {
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(state)); } catch { /* storage is optional */ }
  }, [state]);

  const update = useCallback((patch: Partial<SessionSettings>) => {
    setState((current) => ({ ...current, settings: { ...current.settings, ...patch } }));
  }, []);

  const applyPreset = useCallback((id: PresetId) => {
    const preset = presetById(id);
    setState((current) => ({
      ...current,
      settings: {
        ...current.settings,
        presetId: id,
        profile: { ...preset.profile },
        changedProfileKeys: [],
        style: preset.style,
        tactics: preset.tactics,
        durationMin: preset.durationMin,
        counterpartyRole: preset.typicalRole.charAt(0).toUpperCase() + preset.typicalRole.slice(1),
      },
    }));
  }, []);

  const setBrief = useCallback((brief: PublicBrief | null) => setState((current) => ({ ...current, brief })), []);
  const reset = useCallback(() => setState({ settings: defaultSettings(), brief: null }), []);

  const value = useMemo(() => ({ ...state, update, applyPreset, setBrief, reset }), [state, update, applyPreset, setBrief, reset]);
  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>;
}

export function useFlow() {
  const value = useContext(FlowContext);
  if (!value) throw new Error("useFlow outside FlowProvider");
  return value;
}
