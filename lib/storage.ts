import { Session, SessionSchema } from "./schemas";
const KEY = "countervoice.sessions.v1";
export function loadSessions(): Session[] {
  if (typeof window === "undefined") return [];
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(raw)
      ? raw.flatMap((x) => {
          const parsed = SessionSchema.safeParse(x);
          return parsed.success ? [parsed.data] : [];
        })
      : [];
  } catch {
    return [];
  }
}
export function saveSession(session: Session) {
  const sessions = loadSessions().filter(
    (s) => s.sessionId !== session.sessionId,
  );
  localStorage.setItem(
    KEY,
    JSON.stringify([session, ...sessions].slice(0, 30)),
  );
}
export function removeSession(id: string) {
  localStorage.setItem(
    KEY,
    JSON.stringify(loadSessions().filter((s) => s.sessionId !== id)),
  );
}
