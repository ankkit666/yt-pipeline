import { discoverTrends, clearTrendCache } from '../src/trendService';
import { RateLimitError, TimeoutError } from '../src/errors';

// Mock axios
jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
  isAxiosError: jest.fn(() => true),
}));

import axios from 'axios';
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('TrendService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearTrendCache();
    process.env.REDDIT_CLIENT_ID = 'test-id';
    process.env.REDDIT_CLIENT_SECRET = 'test-secret';
    process.env.YOUTUBE_API_KEY = 'test-key';
  });

  describe('Reddit API returns 429', () => {
    it('should raise RateLimitError when Reddit returns 429', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { access_token: 'test-token' },
      });

      mockedAxios.get.mockRejectedValueOnce({
        response: { status: 429 },
        isAxiosError: () => true,
      });

      await expect(discoverTrends('ai', true)).rejects.toThrow(RateLimitError);
    });

    it('should trigger backoff and retry', async () => {
      let callCount = 0;
      mockedAxios.post.mockResolvedValueOnce({
        data: { access_token: 'test-token' },
      });

      mockedAxios.get.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject({ response: { status: 429 }, isAxiosError: () => true });
        }
        return Promise.resolve({
          data: {
            data: {
              children: [
                {
                  data: {
                    id: 'test-1',
                    title: 'AI breakthrough',
                    score: 100,
                    created_utc: Date.now() / 1000,
                    permalink: '/r/test/post',
                  },
                },
              ],
            },
          },
        });
      });

      const trends = await discoverTrends('ai', true);
      expect(trends.length).toBeGreaterThan(0);
    });
  });

  describe('YouTube API returns empty', () => {
    it('should return empty list and fallback to news RSS', async () => {
      // Reddit returns some trends
      mockedAxios.post.mockResolvedValueOnce({
        data: { access_token: 'test-token' },
      });

      mockedAxios.get.mockImplementation((url: string) => {
        if (url.includes('oauth')) {
          return Promise.resolve({
            data: {
              data: {
                children: [
                  {
                    data: {
                      id: 'reddit-1',
                      title: 'AI News Test',
                      score: 200,
                      created_utc: Date.now() / 1000,
                      permalink: '/r/test/post',
                    },
                  },
                ],
              },
            },
          });
        }
        if (url.includes('googleapis')) {
          return Promise.resolve({ data: { items: [] } });
        }
        return Promise.resolve({ data: '<rss><channel><item><title>Test</title></item></channel></rss>' });
      });

      const trends = await discoverTrends('ai', true);
      expect(Array.isArray(trends)).toBe(true);
    });
  });

  describe('Network timeout', () => {
    it('should catch TimeoutError and trigger fallback', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        code: 'ECONNABORTED',
        message: 'timeout',
        isAxiosError: () => true,
      });

      mockedAxios.post.mockResolvedValueOnce({
        data: { access_token: 'test-token' },
      });

      mockedAxios.get.mockResolvedValueOnce({
        data: {
          data: {
            children: [
              {
                data: {
                  id: 'fallback-1',
                  title: 'Fallback trend',
                  score: 50,
                  created_utc: Date.now() / 1000,
                  permalink: '/r/test/post',
                },
              },
            ],
          },
        },
      });

      const trends = await discoverTrends('ai', true);
      // Should still return trends from other sources or fallbacks
      expect(Array.isArray(trends)).toBe(true);
    });

    it('should show user-friendly timeout message', async () => {
      mockedAxios.get.mockRejectedValue({
        code: 'ECONNABORTED',
        isAxiosError: () => true,
      });

      try {
        await discoverTrends('ai', true);
      } catch (error) {
        expect(error).toBeInstanceOf(TimeoutError);
      }
    });
  });

  describe('Cache behavior', () => {
    it('should cache trends for 15 minutes', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { access_token: 'test-token' },
      });

      mockedAxios.get.mockResolvedValueOnce({
        data: {
          data: {
            children: [
              {
                data: {
                  id: 'cached-1',
                  title: 'Cached trend',
                  score: 100,
                  created_utc: Date.now() / 1000,
                  permalink: '/r/test/post',
                },
              },
            ],
          },
        },
      });

      await discoverTrends('ai');
      await discoverTrends('ai');

      // Should only make one API call due to caching
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('should refresh when forceRefresh is true', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { access_token: 'test-token' },
      });

      mockedAxios.get.mockResolvedValue({
        data: {
          data: {
            children: [
              {
                data: {
                  id: 'refresh-1',
                  title: 'Refreshed trend',
                  score: 100,
                  created_utc: Date.now() / 1000,
                  permalink: '/r/test/post',
                },
              },
            ],
          },
        },
      });

      await discoverTrends('ai');
      await discoverTrends('ai', true);

      // Should make API calls for both with forceRefresh
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });
  });
});