import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

/**
 * ElevenLabs text-to-speech helper.
 *
 * Renders short spoken scripts with a realistic voice. Falls back to null so
 * callers can use the built-in browser speech synthesis whenever ElevenLabs is
 * not configured or the request fails.
 */

// Pre-made voice from the ElevenLabs library (works on every account).
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel

export interface SpeechResult {
  /** MP3 audio bytes, or null when ElevenLabs is unavailable. */
  audio: Buffer | null;
  source: "elevenlabs" | "unavailable";
}

let cachedText: string | null = null;
let cachedAudio: Buffer | null = null;

export function isElevenLabsEnabled(): boolean {
  return Boolean(process.env.ELEVENLABS_API_KEY);
}

/**
 * Converts text into realistic MP3 speech. Repeats of the same script reuse
 * the cached audio so the wizard feels instant.
 */
export async function textToSpeech(
  text: string,
  options: { voiceId?: string } = {},
): Promise<SpeechResult> {
  if (!isElevenLabsEnabled() || !text.trim()) {
    return { audio: null, source: "unavailable" };
  }

  if (cachedText === text && cachedAudio) {
    return { audio: cachedAudio, source: "elevenlabs" };
  }

  try {
    const client = new ElevenLabsClient();
    const voiceId = options.voiceId || DEFAULT_VOICE_ID;

    const audioStream = await client.textToSpeech.convert(voiceId, {
      text,
      modelId: "eleven_multilingual_v2",
      outputFormat: "mp3_44100_128",
      optimizeStreamingLatency: 3,
      voiceSettings: {
        stability: 0.5,
        similarityBoost: 0.75,
        style: 0.15,
        useSpeakerBoost: true,
      },
    });

    const chunks: Buffer[] = [];
    const reader = (audioStream as unknown as ReadableStream<Uint8Array>).getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(Buffer.from(value));
    }
    const audio = Buffer.concat(chunks);

    cachedText = text;
    cachedAudio = audio;

    return { audio, source: "elevenlabs" };
  } catch (error) {
    console.error("ElevenLabs speech failed:", error);
    return { audio: null, source: "unavailable" };
  }
}
