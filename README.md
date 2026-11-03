# CounterVoice

CounterVoice is a database-free, voice-first intellectual sparring workspace. It stores sessions in the current browser and uses stateless Next.js route handlers for Gemini reasoning and Gnani speech services.

## Run locally

1. Copy `.env.example` to `.env.local` and set `GEMINI_API_KEY` plus a Flash-class `GEMINI_MODEL` available to your account.
2. Optionally set `GNANI_API_KEY_ID` for voice transcription and speech.
3. Run `npm install` then `npm run dev`.

The app loads without credentials. It visibly reports provider configuration errors instead of simulating AI or voice output.

## Privacy and persistence

Sessions and completed reports are saved in this browser's `localStorage`; there are no accounts or cross-device sync. Text sent for reasoning leaves the browser for Gemini. Recorded audio is sent to Gnani only when a user explicitly starts and stops a recording, and is not retained by the app. Clearing browser data removes local history.

## Verify

Run `npm run typecheck`, `npm run test`, and `npm run build`. The production build is suitable for Vercel; set the same environment variables in Project Settings.

## Known limitations

Gnani endpoint payload fields are isolated in two adapters and should be verified against the developer account's current API documentation before production use. Browser recording uses the native MIME type (usually WebM); an account that accepts only WAV will require a client-side conversion worker. Real English, Hindi, and Hinglish recognition and available Timbre voices require credentials and live testing, and are not claimed as tested in this repository.
