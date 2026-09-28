import type { StoredSession } from "../../shared/types";

const PREFIX = "free-talking:session:";
const INDEX = "free-talking:session-index:v1";
const MAX_SESSIONS = 30;

function readIndex(): string[] {
  try {
    const value = localStorage.getItem(INDEX);
    const parsed: unknown = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function saveSession(session: StoredSession) {
  localStorage.setItem(`${PREFIX}${session.id}`, JSON.stringify(session));
  const previous = readIndex().filter((id) => id !== session.id);
  const next = [session.id, ...previous].slice(0, MAX_SESSIONS);
  localStorage.setItem(INDEX, JSON.stringify(next));
  for (const expired of previous.slice(MAX_SESSIONS - 1)) localStorage.removeItem(`${PREFIX}${expired}`);
}

export function getSession(id: string | null | undefined): StoredSession | null {
  if (!id) return null;
  try {
    const value = localStorage.getItem(`${PREFIX}${id}`);
    return value ? JSON.parse(value) as StoredSession : null;
  } catch {
    return null;
  }
}

export function listSessions(): StoredSession[] {
  return readIndex().map((id) => getSession(id)).filter((session): session is StoredSession => Boolean(session));
}

/** Finished sessions from the last 30 days — the source for «Повтор по seed». */
export function recentFinishedSessions(days = 30): StoredSession[] {
  const border = Date.now() - days * 24 * 60 * 60 * 1000;
  const seen = new Set<string>();
  return listSessions().filter((session) => {
    if (!session.endedAt || Date.parse(session.startedAt) < border || seen.has(session.seed) || session.parentSessionId) return false;
    seen.add(session.seed);
    return true;
  });
}

export function latestFinishedSession() {
  return listSessions().find((session) => session.endedAt) ?? null;
}
