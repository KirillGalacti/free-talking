import { useCallback, useEffect, useRef, useState } from "react";
import type { StoredSession } from "../../shared/types";
import { analyzeSession } from "@/services/api";
import { getSession, latestFinishedSession, saveSession } from "@/services/session-store";
import { fixtureSession } from "@/state/report-fixtures";

/** Loads a finished session and runs the evaluator once; the result is stored with the session. */
export function useSessionReport(sessionId: string | null) {
  const [session, setSession] = useState<StoredSession | null>(() => {
    const fixture = fixtureSession(new URLSearchParams(window.location.search).get("fixtureSession"));
    if (fixture) {
      saveSession(fixture);
      return fixture;
    }
    return sessionId ? getSession(sessionId) : latestFinishedSession();
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  const run = useCallback(async (current: StoredSession) => {
    if (startedRef.current || current.analysis) return;
    startedRef.current = true;
    setIsAnalyzing(true);
    setError(null);
    try {
      const analysis = await analyzeSession(current);
      const updated = { ...current, analysis, completionState: "COMPLETED" as const };
      saveSession(updated);
      setSession(updated);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось подготовить разбор");
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  useEffect(() => {
    if (session && !session.analysis) void run(session);
  }, [session, run]);

  const retry = useCallback(() => {
    if (!session) return;
    startedRef.current = false;
    void run(session);
  }, [run, session]);

  return { session, isAnalyzing, error, retry };
}
