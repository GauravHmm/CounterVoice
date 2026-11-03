import { Session, SessionSchema } from "./schemas";
export function createSession(
  input: Pick<
    Session,
    "mode" | "persona" | "intensity" | "language" | "originalThesis"
  > & { context?: string },
): Session {
  const now = new Date().toISOString();
  return SessionSchema.parse({
    version: 1,
    sessionId: crypto.randomUUID(),
    ...input,
    currentThesis: input.originalThesis,
    claims: [],
    assumptions: [],
    evidence: [],
    challenges: [],
    responses: [],
    contradictions: [],
    unresolvedIssues: [],
    currentRound: 0,
    status: "draft",
    createdAt: now,
    updatedAt: now,
  });
}
export function touch(session: Session): Session {
  return { ...session, updatedAt: new Date().toISOString() };
}
