import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  Analysis,
  AnalysisSchema,
  Challenge,
  ChallengeSchema,
  Evaluation,
  EvaluationSchema,
  PressureReport,
  ReportSchema,
  Session,
  SteelmanSchema,
} from "./schemas";

export class ProviderError extends Error {
  constructor(
    message: string,
    public status = 503,
  ) {
    super(message);
  }
}
function parseJson<T>(text: string, schema: { parse: (x: unknown) => T }): T {
  try {
    return schema.parse(JSON.parse(text.replace(/^```json\s*|\s*```$/g, "")));
  } catch {
    throw new ProviderError(
      "The reasoning service returned an invalid structured response.",
      502,
    );
  }
}
function prompt(task: string, payload: unknown) {
  return `You are CounterVoice, an intellectually honest reasoning coach. ${task}\nReturn ONLY valid JSON matching the requested schema. Do not invent sources, insult users, expose hidden reasoning, or ask multiple main questions.\nINPUT:\n${JSON.stringify(payload)}`;
}
export class GeminiProvider {
  private model() {
    const key = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL;
    if (!key || !model)
      throw new ProviderError(
        "Reasoning is not configured. Add GEMINI_API_KEY and GEMINI_MODEL to enable live challenges.",
      );
    return new GoogleGenerativeAI(key).getGenerativeModel({ model });
  }
  private async call<T>(
    instruction: string,
    input: unknown,
    schema: { parse: (x: unknown) => T },
  ) {
    try {
      const result = await this.model().generateContent(
        prompt(instruction, input),
      );
      return parseJson(result.response.text(), schema);
    } catch (e) {
      if (e instanceof ProviderError) throw e;
      throw new ProviderError(
        "The reasoning service could not complete this request. Please retry.",
        502,
      );
    }
  }
  analyze(
    input: Pick<Session, "originalThesis" | "context" | "mode">,
  ): Promise<Analysis> {
    return this.call(
      "Analyze argument. Schema: {thesis:string,supporting_claims:string[],assumptions:string[],evidence:string[],evidence_gaps:string[],weaknesses:string[],counterarguments:string[],unknowns:string[]}.",
      input,
      AnalysisSchema,
    );
  }
  steelman(session: Session) {
    return this.call(
      "Reconstruct strongest faithful interpretation. Schema: {reconstruction:string,strongest_case:string[],needs_confirmation:string[]}.",
      session,
      SteelmanSchema,
    );
  }
  challenge(session: Session): Promise<Challenge> {
    return this.call(
      "Choose ONE most important unresolved issue. Schema: {id:string,title:string,question:string,why_it_matters:string,issue:string}.",
      session,
      ChallengeSchema,
    );
  }
  evaluate(session: Session, response: string): Promise<Evaluation> {
    return this.call(
      'Evaluate response to current challenge. Schema: {classification:"STRONG_DEFENSE"|"PARTIAL_DEFENSE"|"WEAK_DEFENSE"|"EVASIVE"|"CONTRADICTORY"|"NEW_EVIDENCE"|"POSITION_REVISED"|"REQUIRES_CLARIFICATION",acknowledgement:string,reasoning:string,new_assumptions:string[],contradictions:string[],revised_thesis?:string}.',
      { session, response },
      EvaluationSchema,
    );
  }
  report(session: Session): Promise<PressureReport> {
    return this.call(
      "Generate an honest report only from recorded session data. Schema: {executive_summary:string,strongest_reasoning:string,weakest_assumption:string,unanswered_challenges:string[],contradictions:string[],evidence_gaps:string[],successful_defenses:string[],next_steps:string[],assessment:{clarity:{score:1-5,rationale:string},evidence_quality:{score:1-5,rationale:string},logical_consistency:{score:1-5,rationale:string},responsiveness:{score:1-5,rationale:string},revision:{score:1-5,rationale:string}}}. Scores are transparent heuristics, not psychological measures.",
      session,
      ReportSchema,
    );
  }
}
