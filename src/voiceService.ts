import { Voiceover, Script } from './types';
import { RateLimitError, TimeoutError, EncodingError, AuthError } from './errors';

const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel - professional, clear voice

let elevenLabsClient: {
  textToSpeech: (voiceId: string, text: string) => Promise<Buffer>;
} | null = null;

function getElevenLabsClient(): typeof elevenLabsClient & { textToSpeech: (voiceId: string, text: string) => Promise<Buffer> } {
  if (!elevenLabsClient) {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new AuthError('ElevenLabs API key not configured');
    }

    // ElevenLabs Node SDK pattern
    elevenLabsClient = {
      textToSpeech: async (voiceId: string, text: string): Promise<Buffer> => {
        const response = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'xi-api-key': apiKey,
            },
            body: JSON.stringify({
              text,
              model_id: 'eleven_monolingual_v1',
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.5,
              },
            }),
          }
        );

        if (response.status === 429) {
          throw new RateLimitError('ElevenLabs rate limit exceeded');
        }

        if (response.status === 401) {
          throw new AuthError('ElevenLabs API key invalid');
        }

        if (!response.ok) {
          const errorText = await response.text();
          if (response.status === 422) {
            throw new EncodingError(`Invalid request: ${errorText}`);
          }
          throw new Error(`ElevenLabs API error: ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
      },
    };
  }
  return elevenLabsClient;
}

export async function generateVoiceover(
  script: Script,
  voiceId?: string
): Promise<Voiceover> {
  console.log(`[VoiceService] Generating voiceover for script: ${script.id}`);

  const client = getElevenLabsClient();
  const selectedVoiceId = voiceId || DEFAULT_VOICE_ID;

  let audioBuffer: Buffer | null = null;
  let attempts = 0;
  const maxAttempts = 2;

  const elevenClient = getElevenLabsClient()!;
  while (attempts <= maxAttempts && !audioBuffer) {
    try {
      audioBuffer = await elevenClient.textToSpeech(selectedVoiceId, script.content);
      break;
    } catch (error: unknown) {
      attempts++;

      if (error instanceof RateLimitError && attempts <= maxAttempts) {
        const backoff = 2000 * attempts;
        console.log(`[VoiceService] Rate limited, backing off ${backoff}ms`);
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }

      if (error instanceof TimeoutError) {
        throw new EncodingError('Voice generation timed out');
      }

      if (error instanceof AuthError) {
        throw error;
      }

      if (error instanceof EncodingError) {
        throw error;
      }

      if (attempts > maxAttempts) {
        throw new EncodingError(`Voice generation failed after ${attempts} attempts`);
      }
    }
  }

  if (!audioBuffer) {
    throw new EncodingError('No audio buffer generated');
  }

  // In a real implementation, we'd upload this to storage (S3, etc.)
  // For now, we'll return a mock URL
  const audioUrl = `data:audio/mp3;base64,${audioBuffer.toString('base64').slice(0, 100)}...`;

  // Estimate duration based on word count (~150 words/min for standard speaking)
  const duration = Math.ceil((script.wordCount / 150) * 60);

  const voiceover: Voiceover = {
    id: `voice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    audioUrl,
    scriptId: script.id,
    duration,
    voiceId: selectedVoiceId,
    createdAt: new Date().toISOString(),
  };

  console.log(
    `[VoiceService] Generated voiceover: ${duration}s, voice: ${selectedVoiceId}`
  );

  return voiceover;
}

export async function listVoices(): Promise<Array<{ id: string; name: string }>> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return [{ id: DEFAULT_VOICE_ID, name: 'Rachel (default)' }];
  }

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': apiKey },
    });

    if (!response.ok) {
      return [{ id: DEFAULT_VOICE_ID, name: 'Rachel (default)' }];
    }

    const data = await response.json() as { voices: Array<{ voice_id: string; name: string }> };
    return data.voices.map((v) => ({
      id: v.voice_id,
      name: v.name,
    }));
  } catch {
    return [{ id: DEFAULT_VOICE_ID, name: 'Rachel (default)' }];
  }
}