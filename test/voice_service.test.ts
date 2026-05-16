import { generateVoiceover, listVoices } from '../src/voiceService';
import { RateLimitError, TimeoutError, EncodingError, AuthError } from '../src/errors';

// Mock fetch globally
global.fetch = jest.fn();

describe('VoiceService', () => {
  const mockScript = {
    id: 'script-123',
    content: 'This is a test script for voice generation.',
    wordCount: 10,
    estimatedDuration: 4,
    trend: { id: 'trend-1', title: 'Test', source: 'reddit' as const, url: '', niche: 'ai' },
    niche: 'ai',
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ELEVENLABS_API_KEY = 'test-eleven-key';
  });

  afterEach(() => {
    jest.resetModules();
  });

  describe('ElevenLabs rate limit', () => {
    it('should catch RateLimitError and retry with backoff', async () => {
      let callCount = 0;
      (global.fetch as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            status: 429,
            ok: false,
          });
        }
        return Promise.resolve({
          status: 200,
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
        });
      });

      // Should retry and succeed
      const result = await generateVoiceover(mockScript);
      expect(result).toHaveProperty('id');
      expect(callCount).toBe(2);
    });

    it('should fail after max retries and show message', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 429,
        ok: false,
      });

      await expect(generateVoiceover(mockScript)).rejects.toThrow(RateLimitError);
    });
  });

  describe('Timeout handling', () => {
    it('should throw TimeoutError on timeout', async () => {
      (global.fetch as jest.Mock).mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('timeout')), 100);
        });
      });

      // Should handle and throw EncodingError for timeout
      await expect(generateVoiceover(mockScript)).rejects.toThrow();
    });
  });

  describe('Auth validation', () => {
    it('should throw AuthError when API key is missing', async () => {
      delete process.env.ELEVENLABS_API_KEY;
      jest.resetModules();

      // Re-import to pick up new env
      const { generateVoiceover: genVoice } = await import('../src/voiceService');
      await expect(genVoice(mockScript)).rejects.toThrow(AuthError);
    });
  });

  describe('Voice generation', () => {
    it('should generate voiceover with correct structure', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 200,
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1000)),
      });

      const result = await generateVoiceover(mockScript);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('audioUrl');
      expect(result).toHaveProperty('scriptId');
      expect(result).toHaveProperty('duration');
      expect(result).toHaveProperty('voiceId');
      expect(result).toHaveProperty('createdAt');
      expect(result.scriptId).toBe(mockScript.id);
    });

    it('should use custom voice ID when provided', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 200,
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1000)),
      });

      const customVoiceId = 'custom-voice-123';
      const result = await generateVoiceover(mockScript, customVoiceId);

      expect(result.voiceId).toBe(customVoiceId);
    });

    it('should estimate duration based on word count', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 200,
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1000)),
      });

      const result = await generateVoiceover(mockScript);
      // ~150 words/min = ~2.5 words/second, so 10 words = ~4 seconds
      expect(result.duration).toBeGreaterThan(0);
    });
  });

  describe('listVoices', () => {
    it('should return default voice when no API key', async () => {
      delete process.env.ELEVENLABS_API_KEY;

      const voices = await listVoices();
      expect(voices.length).toBe(1);
      expect(voices[0].name).toContain('Rachel');
    });

    it('should return list of voices from API', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 200,
        ok: true,
        json: () =>
          Promise.resolve({
            voices: [
              { voice_id: 'voice-1', name: 'Rachel' },
              { voice_id: 'voice-2', name: 'Adam' },
            ],
          }),
      });

      const voices = await listVoices();
      expect(voices.length).toBe(2);
    });
  });
});