import { z } from "zod";
import { body, apiError } from "@/lib/http";
import { GeminiProvider } from "@/lib/provider";
import { SessionSchema } from "@/lib/schemas";
export async function POST(request: Request) {
  try {
    const { session, response } = await body(
      request,
      z.object({
        session: SessionSchema,
        response: z.string().min(1).max(10000),
      }),
    );
    if (session.status !== "active" || !session.challenges.at(-1))
      return Response.json(
        { error: "There is no active challenge to answer." },
        { status: 409 },
      );
    return Response.json({
      evaluation: await new GeminiProvider().evaluate(session, response),
    });
  } catch (e) {
    return apiError(e);
  }
}
