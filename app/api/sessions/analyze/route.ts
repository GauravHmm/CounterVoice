import { z } from "zod";
import { body, apiError } from "@/lib/http";
import { GeminiProvider } from "@/lib/provider";
import { ModeSchema } from "@/lib/schemas";
export async function POST(request: Request) {
  try {
    const input = await body(
      request,
      z.object({
        originalThesis: z.string().min(10).max(10000),
        context: z.string().max(5000).optional(),
        mode: ModeSchema,
      }),
    );
    return Response.json({
      analysis: await new GeminiProvider().analyze(input),
    });
  } catch (e) {
    return apiError(e);
  }
}
