import { z } from "zod";

export const ModeSchema = z.enum([
  "pitch_defense",
  "decision_stress_test",
  "argument_challenge",
]);
export const PersonaSchema = z.enum([
  "skeptical_investor",
  "socratic_examiner",
  "red_team_strategist",
  "pragmatic_operator",
]);
export const IntensitySchema = z.enum(["constructive", "rigorous", "intense"]);
export const LanguageSchema = z.enum(["english", "hindi", "hinglish"]);
export const AnalysisSchema = z.object({
  thesis: z.string(),
  supporting_claims: z.array(z.string()),
  assumptions: z.array(z.string()),
  evidence: z.array(z.string()),
  evidence_gaps: z.array(z.string()),
  weaknesses: z.array(z.string()),
  counterarguments: z.array(z.string()),
  unknowns: z.array(z.string()),
});
export const SteelmanSchema = z.object({
  reconstruction: z.string(),
  strongest_case: z.array(z.string()),
  needs_confirmation: z.array(z.string()),
});
export const ChallengeSchema = z.object({
  id: z.string(),
  title: z.string(),
  question: z.string(),
  why_it_matters: z.string(),
  issue: z.string(),
});
export const EvaluationSchema = z.object({
  classification: z.enum([
    "STRONG_DEFENSE",
    "PARTIAL_DEFENSE",
    "WEAK_DEFENSE",
    "EVASIVE",
    "CONTRADICTORY",
    "NEW_EVIDENCE",
    "POSITION_REVISED",
    "REQUIRES_CLARIFICATION",
  ]),
  acknowledgement: z.string(),
  reasoning: z.string(),
  new_assumptions: z.array(z.string()),
  contradictions: z.array(z.string()),
  revised_thesis: z.string().optional(),
});
export const ReportSchema = z.object({
  executive_summary: z.string(),
  strongest_reasoning: z.string(),
  weakest_assumption: z.string(),
  unanswered_challenges: z.array(z.string()),
  contradictions: z.array(z.string()),
  evidence_gaps: z.array(z.string()),
  successful_defenses: z.array(z.string()),
  next_steps: z.array(z.string()),
  assessment: z.object({
    clarity: z.object({
      score: z.number().min(1).max(5),
      rationale: z.string(),
    }),
    evidence_quality: z.object({
      score: z.number().min(1).max(5),
      rationale: z.string(),
    }),
    logical_consistency: z.object({
      score: z.number().min(1).max(5),
      rationale: z.string(),
    }),
    responsiveness: z.object({
      score: z.number().min(1).max(5),
      rationale: z.string(),
    }),
    revision: z.object({
      score: z.number().min(1).max(5),
      rationale: z.string(),
    }),
  }),
});
export const ResponseSchema = z.object({
  challengeId: z.string(),
  text: z.string().min(1).max(10000),
  createdAt: z.string(),
});
export const SessionSchema = z.object({
  version: z.literal(1),
  sessionId: z.string(),
  mode: ModeSchema,
  persona: PersonaSchema,
  intensity: IntensitySchema,
  language: LanguageSchema,
  originalThesis: z.string(),
  currentThesis: z.string(),
  context: z.string().optional(),
  argumentAnalysis: AnalysisSchema.optional(),
  steelman: SteelmanSchema.optional(),
  claims: z.array(z.string()),
  assumptions: z.array(z.string()),
  evidence: z.array(z.string()),
  challenges: z.array(ChallengeSchema),
  responses: z.array(
    ResponseSchema.extend({ evaluation: EvaluationSchema.optional() }),
  ),
  contradictions: z.array(z.string()),
  unresolvedIssues: z.array(z.string()),
  currentRound: z.number().int().min(0),
  status: z.enum(["draft", "confirming", "active", "completed", "paused"]),
  createdAt: z.string(),
  updatedAt: z.string(),
  report: ReportSchema.optional(),
});
export type Session = z.infer<typeof SessionSchema>;
export type Analysis = z.infer<typeof AnalysisSchema>;
export type Challenge = z.infer<typeof ChallengeSchema>;
export type Evaluation = z.infer<typeof EvaluationSchema>;
export type PressureReport = z.infer<typeof ReportSchema>;
