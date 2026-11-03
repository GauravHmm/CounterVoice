import { z } from "zod";
import { ProviderError } from "./provider";
export async function body<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<T> {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 100_000) throw new ProviderError("Request is too large.", 413);
  return schema.parse(await request.json());
}
export function apiError(error: unknown) {
  if (error instanceof z.ZodError)
    return Response.json(
      { error: "Invalid request.", details: error.issues },
      { status: 400 },
    );
  if (error instanceof ProviderError)
    return Response.json({ error: error.message }, { status: error.status });
  console.error("CounterVoice API error", error);
  return Response.json(
    { error: "Something went wrong. Please retry." },
    { status: 500 },
  );
}
