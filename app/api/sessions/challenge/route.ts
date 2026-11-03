import { body, apiError } from "@/lib/http";
import { GeminiProvider } from "@/lib/provider";
import { SessionSchema } from "@/lib/schemas";
export async function POST(request: Request) {
  try {
    const session = await body(request, SessionSchema);
    if (!session.steelman)
      return Response.json(
        { error: "Confirm the interpretation before requesting a challenge." },
        { status: 409 },
      );
    return Response.json({
      challenge: await new GeminiProvider().challenge(session),
    });
  } catch (e) {
    return apiError(e);
  }
}
