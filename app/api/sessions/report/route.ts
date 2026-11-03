import { body, apiError } from "@/lib/http";
import { GeminiProvider } from "@/lib/provider";
import { SessionSchema } from "@/lib/schemas";
export async function POST(request: Request) {
  try {
    const session = await body(request, SessionSchema);
    return Response.json({
      report: await new GeminiProvider().report(session),
    });
  } catch (e) {
    return apiError(e);
  }
}
