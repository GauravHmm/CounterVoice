import { z } from "zod";
import { body, apiError } from "@/lib/http";
import { ProviderError } from "@/lib/provider";
export async function POST(request: Request) {
  try {
    if (!process.env.GNANI_API_KEY_ID)
      throw new ProviderError(
        "Opponent voice is not configured. Add GNANI_API_KEY_ID.",
      );
    const input = await body(
      request,
      z.object({
        text: z.string().min(1).max(5000),
        language: z.string().default("en"),
      }),
    );
    const result = await fetch("https://api.vachana.ai/api/v1/tts/inference", {
      method: "POST",
      headers: {
        "X-API-Key-ID": process.env.GNANI_API_KEY_ID,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: input.text,
        model: process.env.GNANI_TTS_MODEL || "timbre-v3.0",
        voice: "Avinash",
        language: input.language,
        audio_config: { audio_format: "wav" },
      }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!result.ok)
      throw new ProviderError(
        "Speech generation failed. Check your Gnani configuration or credits.",
        502,
      );
    return new Response(await result.arrayBuffer(), {
      headers: {
        "Content-Type": result.headers.get("content-type") || "audio/wav",
      },
    });
  } catch (e) {
    return apiError(e);
  }
}
