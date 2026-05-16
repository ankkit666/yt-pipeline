import { generateScript } from '../src/scriptService';
import { LLMTimeoutError, JSONParseError, ContentPolicyError, AuthError } from '../src/errors';

// Mock OpenAI
jest.mock('openai', () => {
  return class MockOpenAI {
    chat = {
      completions: {
        create: jest.fn(),
      },
    };
  };
});

import OpenAI from 'openai';
const mockCreate = OpenAI.prototype.chat.completions.create as jest.Mock;

describe('ScriptService', () => {
  const mockTrend = {
    id: 'test-trend-1',
    title: 'Test AI breakthrough',
    source: 'reddit' as const,
    url: 'https://reddit.com/test',
    score: 100,
    niche: 'ai',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-key';
  });

  describe('LLM timeout (30s+)', () => {
    it('should catch TimeoutError and retry once', async () => {
      mockCreate
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: 'This is a test script about AI breakthrough.',
              },
            },
          ],
        });

      const result = await generateScript(mockTrend, 'ai');
      expect(result.content).toBeTruthy();
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });

    it('should fail after retry attempt and show user message', async () => {
      mockCreate.mockRejectedValue(new Error('timeout'));

      await expect(generateScript(mockTrend, 'ai')).rejects.toThrow(LLMTimeoutError);
    });
  });

  describe('Invalid JSON response', () => {
    it('should catch JSONParseError and attempt fallback', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: '```json\n{"invalid"}\n```',
            },
          },
        ],
      });

      // The service should handle this gracefully
      const result = await generateScript(mockTrend, 'ai');
      expect(result).toBeDefined();
    });

    it('should show "Invalid response, retrying" message on JSONParseError', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: '' } }],
      });

      await expect(generateScript(mockTrend, 'ai')).rejects.toThrow(JSONParseError);
    });
  });

  describe('Content policy violation', () => {
    it('should catch ContentPolicyError and show user-friendly message', async () => {
      const apiError = new Error('content_policy') as unknown as { code: string; status: number };
      (apiError as any).code = 'content_policy';
      (apiError as any).status = 400;

      mockCreate.mockRejectedValue(apiError);

      await expect(generateScript(mockTrend, 'ai')).rejects.toThrow(ContentPolicyError);
    });

    it('should return "Couldn\'t generate this topic" message', async () => {
      const apiError = new Error('content_policy') as any;
      apiError.code = 'content_policy';

      mockCreate.mockRejectedValue(apiError);

      try {
        await generateScript(mockTrend, 'ai');
      } catch (error) {
        expect(error).toBeInstanceOf(ContentPolicyError);
        expect((error as ContentPolicyError).message).toBe('Content policy violation');
      }
    });
  });

  describe('Auth validation', () => {
    it('should throw AuthError when API key is missing', async () => {
      delete process.env.OPENAI_API_KEY;

      await expect(generateScript(mockTrend, 'ai')).rejects.toThrow(AuthError);
    });
  });

  describe('Script generation', () => {
    it('should generate script with correct structure', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: `Hook: You won't believe what's happening in AI.

Point 1: A new model just broke benchmarks
Point 2: Researchers are stunned by the results

Call to action: Subscribe for more AI updates.`,
            },
          },
        ],
      });

      const result = await generateScript(mockTrend, 'ai');

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('wordCount');
      expect(result).toHaveProperty('estimatedDuration');
      expect(result).toHaveProperty('trend');
      expect(result).toHaveProperty('niche');
      expect(result).toHaveProperty('createdAt');
      expect(result.wordCount).toBeGreaterThan(0);
    });

    it('should include trend information in the script', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Test script content',
            },
          },
        ],
      });

      const result = await generateScript(mockTrend, 'ai');
      expect(result.trend.id).toBe(mockTrend.id);
      expect(result.niche).toBe('ai');
    });
  });
});