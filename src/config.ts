import { z } from 'zod';

export const NicheSchema = z.object({
  id: z.string(),
  name: z.string(),
  keywords: z.array(z.string()),
  subreddits: z.array(z.string()),
  newsSources: z.array(z.string()),
  stylePrompt: z.string(),
});

export type Niche = z.infer<typeof NicheSchema>;

export const NICHES: Record<string, Niche> = {
  ai: {
    id: 'ai',
    name: 'AI & Technology',
    keywords: ['AI', 'ChatGPT', 'LLM', 'machine learning', 'artificial intelligence', 'OpenAI', 'Claude', 'Gemini'],
    subreddits: ['r/artificial', 'r/MachineLearning', 'r/ChatGPT', 'r/LocalLLaMA'],
    newsSources: ['techcrunch.com', 'theverge.com', 'wired.com', 'arxiv.org'],
    stylePrompt: 'Write in an informative, slightly technical but accessible tone. Start with a hook, explain the news, and end with implications.',
  },
  finance: {
    id: 'finance',
    name: 'Finance & Investing',
    keywords: ['stock market', 'investing', 'crypto', 'bitcoin', 'economy', 'Fed', 'earnings'],
    subreddits: ['r/investing', 'r/wallstreetbets', 'r/cryptocurrency', 'r/economics'],
    newsSources: ['bloomberg.com', 'reuters.com', 'cnbc.com', 'wsj.com'],
    stylePrompt: 'Write in a clear, data-driven tone. State the key metric or event first, explain why it matters, give practical takeaways.',
  },
  tech: {
    id: 'tech',
    name: 'Tech & Gadgets',
    keywords: ['Apple', 'Google', 'Microsoft', 'Tesla', 'startup', 'tech', 'software'],
    subreddits: ['r/technology', 'r/gadgets', 'r/apple', 'r/google'],
    newsSources: ['techcrunch.com', 'theverge.com', 'engadget.com', 'arstechnica.com'],
    stylePrompt: 'Write in an enthusiastic but balanced tone. Focus on what makes this interesting to everyday users.',
  },
  motivation: {
    id: 'motivation',
    name: 'Motivation & Self-Improvement',
    keywords: ['motivation', 'success', 'habits', 'productivity', 'mindset', 'goals'],
    subreddits: ['r/getdisciplined', 'r/productivity', 'r/Motivation', 'r/selfimprovement'],
    newsSources: ['medium.com', 'linkedin.com', 'forbes.com'],
    stylePrompt: 'Write in an energetic, encouraging tone. Use specific examples and actionable advice. End with inspiration.',
  },
};

export const ConfigSchema = z.object({
  openaiApiKey: z.string().min(1, 'OpenAI API key required'),
  elevenLabsApiKey: z.string().min(1, 'ElevenLabs API key required'),
  redditClientId: z.string().optional(),
  redditClientSecret: z.string().optional(),
  youtubeApiKey: z.string().optional(),
});

export type AppConfig = z.infer<typeof ConfigSchema>;

export function getConfig(): AppConfig {
  return {
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    elevenLabsApiKey: process.env.ELEVENLABS_API_KEY || '',
    redditClientId: process.env.REDDIT_CLIENT_ID,
    redditClientSecret: process.env.REDDIT_CLIENT_SECRET,
    youtubeApiKey: process.env.YOUTUBE_API_KEY,
  };
}