import { apiError } from "@/lib/http";
import { ProviderError } from "@/lib/provider";
export async function POST(request: Request) {
  try {
    if (!process.env.GNANI_API_KEY_ID)
      throw new ProviderError(
        "Voice transcription is not configured. Add GNANI_API_KEY_ID.",
      );
    const form = await request.formData();
    const audio = form.get("audio");
    if (!(audio instanceof File) || audio.size === 0)
      throw new ProviderError("Please provide a recording.", 400);
    if (audio.size > 8_000_000)
      throw new ProviderError(
        "Recording is too large. Keep voice turns under 30 seconds.",
        413,
      );
    const upstream = new FormData();
    upstream.set("audio_file", audio);
    upstream.set("model", process.env.GNANI_STT_MODEL || "prisma-v3.0");
    upstream.set("language_code", String(form.get("language") || "en"));
    upstream.set("format", String(form.get("format") || "transcribe"));
    const result = await fetch("https://api.vachana.ai/stt/v3", {
      method: "POST",
      headers: { "X-API-Key-ID": process.env.GNANI_API_KEY_ID },
      body: upstream,
      signal: AbortSignal.timeout(25_000),
    });
    if (!result.ok)
      throw new ProviderError(
        "Transcription failed. Check your Gnani configuration or credits.",
        502,
      );
    return Response.json(await result.json());
  } catch (e) {
    return apiError(e);
  }
}
