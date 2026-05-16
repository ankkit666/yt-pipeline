"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateVoiceover = generateVoiceover;
exports.listVoices = listVoices;
const errors_1 = require("./errors");
const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel - professional, clear voice
let elevenLabsClient = null;
function getElevenLabsClient() {
    if (!elevenLabsClient) {
        const apiKey = process.env.ELEVENLABS_API_KEY;
        if (!apiKey) {
            throw new errors_1.AuthError('ElevenLabs API key not configured');
        }
        // ElevenLabs Node SDK pattern
        elevenLabsClient = {
            textToSpeech: async (voiceId, text) => {
                const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
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
                });
                if (response.status === 429) {
                    throw new errors_1.RateLimitError('ElevenLabs rate limit exceeded');
                }
                if (response.status === 401) {
                    throw new errors_1.AuthError('ElevenLabs API key invalid');
                }
                if (!response.ok) {
                    const errorText = await response.text();
                    if (response.status === 422) {
                        throw new errors_1.EncodingError(`Invalid request: ${errorText}`);
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
async function generateVoiceover(script, voiceId) {
    console.log(`[VoiceService] Generating voiceover for script: ${script.id}`);
    const client = getElevenLabsClient();
    const selectedVoiceId = voiceId || DEFAULT_VOICE_ID;
    let audioBuffer = null;
    let attempts = 0;
    const maxAttempts = 2;
    const elevenClient = getElevenLabsClient();
    while (attempts <= maxAttempts && !audioBuffer) {
        try {
            audioBuffer = await elevenClient.textToSpeech(selectedVoiceId, script.content);
            break;
        }
        catch (error) {
            attempts++;
            if (error instanceof errors_1.RateLimitError && attempts <= maxAttempts) {
                const backoff = 2000 * attempts;
                console.log(`[VoiceService] Rate limited, backing off ${backoff}ms`);
                await new Promise((r) => setTimeout(r, backoff));
                continue;
            }
            if (error instanceof errors_1.TimeoutError) {
                throw new errors_1.EncodingError('Voice generation timed out');
            }
            if (error instanceof errors_1.AuthError) {
                throw error;
            }
            if (error instanceof errors_1.EncodingError) {
                throw error;
            }
            if (attempts > maxAttempts) {
                throw new errors_1.EncodingError(`Voice generation failed after ${attempts} attempts`);
            }
        }
    }
    if (!audioBuffer) {
        throw new errors_1.EncodingError('No audio buffer generated');
    }
    // In a real implementation, we'd upload this to storage (S3, etc.)
    // For now, we'll return a mock URL
    const audioUrl = `data:audio/mp3;base64,${audioBuffer.toString('base64').slice(0, 100)}...`;
    // Estimate duration based on word count (~150 words/min for standard speaking)
    const duration = Math.ceil((script.wordCount / 150) * 60);
    const voiceover = {
        id: `voice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        audioUrl,
        scriptId: script.id,
        duration,
        voiceId: selectedVoiceId,
        createdAt: new Date().toISOString(),
    };
    console.log(`[VoiceService] Generated voiceover: ${duration}s, voice: ${selectedVoiceId}`);
    return voiceover;
}
async function listVoices() {
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
        const data = await response.json();
        return data.voices.map((v) => ({
            id: v.voice_id,
            name: v.name,
        }));
    }
    catch {
        return [{ id: DEFAULT_VOICE_ID, name: 'Rachel (default)' }];
    }
}
//# sourceMappingURL=voiceService.js.map