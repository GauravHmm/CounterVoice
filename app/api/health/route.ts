export async function POST() {
  return Response.json({
    reasoning: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_MODEL),
    transcription: Boolean(process.env.GNANI_API_KEY_ID),
    speech: Boolean(process.env.GNANI_API_KEY_ID),
    storage: "local_browser",
  });
}
