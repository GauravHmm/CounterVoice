import { describe, expect, it } from "vitest";
import { createSession } from "./session";
import { SessionSchema } from "./schemas";
describe("session state", () => {
  it("creates a valid database-free draft", () => {
    const session = createSession({
      mode: "pitch_defense",
      persona: "skeptical_investor",
      intensity: "rigorous",
      language: "english",
      originalThesis: "A focused proposal worthy of testing.",
    });
    expect(SessionSchema.parse(session).status).toBe("draft");
  });
  it("rejects invalid persisted sessions", () => {
    expect(SessionSchema.safeParse({ version: 9 }).success).toBe(false);
  });
});
