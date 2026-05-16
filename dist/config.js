"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigSchema = exports.NICHES = exports.NicheSchema = void 0;
exports.getConfig = getConfig;
const zod_1 = require("zod");
exports.NicheSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    keywords: zod_1.z.array(zod_1.z.string()),
    subreddits: zod_1.z.array(zod_1.z.string()),
    newsSources: zod_1.z.array(zod_1.z.string()),
    stylePrompt: zod_1.z.string(),
});
exports.NICHES = {
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
exports.ConfigSchema = zod_1.z.object({
    openaiApiKey: zod_1.z.string().min(1, 'OpenAI API key required'),
    elevenLabsApiKey: zod_1.z.string().min(1, 'ElevenLabs API key required'),
    redditClientId: zod_1.z.string().optional(),
    redditClientSecret: zod_1.z.string().optional(),
    youtubeApiKey: zod_1.z.string().optional(),
});
function getConfig() {
    return {
        openaiApiKey: process.env.OPENAI_API_KEY || '',
        elevenLabsApiKey: process.env.ELEVENLABS_API_KEY || '',
        redditClientId: process.env.REDDIT_CLIENT_ID,
        redditClientSecret: process.env.REDDIT_CLIENT_SECRET,
        youtubeApiKey: process.env.YOUTUBE_API_KEY,
    };
}
//# sourceMappingURL=config.js.map