"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTrends = void 0;
exports.discoverTrends = discoverTrends;
exports.clearTrendCache = clearTrendCache;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("./config");
const errors_1 = require("./errors");
const TREND_CACHE_TTL = 15 * 60 * 1000; // 15 minutes
const cache = new Map();
async function fetchRedditTrends(niche) {
    const clientId = process.env.REDDIT_CLIENT_ID;
    const clientSecret = process.env.REDDIT_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
        console.log('[TrendService] Reddit credentials not configured, skipping');
        return [];
    }
    try {
        const tokenResponse = await axios_1.default.post('https://www.reddit.com/api/v1/access_token', new URLSearchParams({ grant_type: 'client_credentials' }), {
            auth: { username: clientId, password: clientSecret },
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        const token = tokenResponse.data.access_token;
        const trends = [];
        for (const subreddit of niche.subreddits.slice(0, 2)) {
            const response = await axios_1.default.get(`https://oauth.reddit.com/r/${subreddit}/hot`, {
                headers: { Authorization: `Bearer ${token}` },
                params: { limit: 10 },
            });
            for (const post of response.data.data.children) {
                const data = post.data;
                const title = data.title.toLowerCase();
                const hasKeyword = niche.keywords.some((kw) => title.includes(kw.toLowerCase()));
                if (hasKeyword && data.score > 50) {
                    trends.push({
                        id: `reddit-${data.id}`,
                        title: data.title,
                        source: 'reddit',
                        url: `https://reddit.com${data.permalink}`,
                        score: data.score,
                        publishedAt: new Date(data.created_utc * 1000).toISOString(),
                        niche: niche.id,
                    });
                }
            }
        }
        return trends;
    }
    catch (error) {
        if (axios_1.default.isAxiosError(error)) {
            if (error.response?.status === 429) {
                throw new errors_1.RateLimitError('Reddit rate limit exceeded');
            }
            if (error.response?.status === 401) {
                throw new errors_1.AuthError('Reddit authentication failed');
            }
            if (error.code === 'ECONNABORTED') {
                throw new errors_1.TimeoutError('Reddit request timed out');
            }
        }
        console.error('[TrendService] Reddit fetch error:', error);
        return [];
    }
}
async function fetchYouTubeTrends(niche) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
        console.log('[TrendService] YouTube API key not configured, skipping');
        return [];
    }
    try {
        const trends = [];
        for (const keyword of niche.keywords.slice(0, 3)) {
            const response = await axios_1.default.get('https://www.googleapis.com/youtube/v3/search', {
                params: {
                    part: 'snippet',
                    q: keyword,
                    type: 'video',
                    order: 'viewCount',
                    maxResults: 5,
                    key: apiKey,
                },
                timeout: 5000,
            });
            for (const item of response.data.items || []) {
                trends.push({
                    id: `youtube-${item.id.videoId}`,
                    title: item.snippet.title,
                    source: 'youtube',
                    url: `https://youtube.com/watch?v=${item.id.videoId}`,
                    publishedAt: item.snippet.publishedAt,
                    niche: niche.id,
                });
            }
        }
        return trends;
    }
    catch (error) {
        if (axios_1.default.isAxiosError(error)) {
            if (error.response?.status === 429) {
                throw new errors_1.RateLimitError('YouTube API rate limit exceeded');
            }
            if (error.response?.status === 403) {
                throw new errors_1.AuthError('YouTube API key invalid');
            }
            if (error.code === 'ECONNABORTED') {
                throw new errors_1.TimeoutError('YouTube request timed out');
            }
        }
        console.error('[TrendService] YouTube fetch error:', error);
        return [];
    }
}
async function fetchNewsTrends(niche) {
    const trends = [];
    for (const source of niche.newsSources.slice(0, 2)) {
        try {
            const response = await axios_1.default.get(`https://news.google.com/rss/search`, {
                params: {
                    q: `${niche.keywords[0]} -site:${source}`,
                    hl: 'en-US',
                    gl: 'US',
                },
                timeout: 5000,
            });
            const xmlText = response.data;
            const titleMatch = xmlText.match(/<title>([^<]+)<\/title>/g);
            const linkMatch = xmlText.match(/<link>([^<]+)<\/link>/g);
            if (titleMatch && linkMatch) {
                for (let i = 1; i < Math.min(titleMatch.length, 6); i++) {
                    const title = titleMatch[i].replace(/<title>|<\/title>/g, '');
                    const link = linkMatch[i]?.replace(/<link>|<\/link>/g, '') || '';
                    if (title && title !== 'Google News') {
                        trends.push({
                            id: `news-${Buffer.from(link).toString('base64').slice(0, 12)}`,
                            title,
                            source: 'news',
                            url: link,
                            niche: niche.id,
                        });
                    }
                }
            }
        }
        catch (error) {
            console.error(`[TrendService] News fetch error for ${source}:`, error);
        }
    }
    return trends;
}
async function discoverTrends(nicheId, forceRefresh = false) {
    const cacheKey = `trends-${nicheId}`;
    const cached = cache.get(cacheKey);
    if (!forceRefresh && cached) {
        const age = Date.now() - cached.timestamp;
        if (age < TREND_CACHE_TTL) {
            console.log(`[TrendService] Returning cached trends (age: ${Math.round(age / 1000)}s)`);
            return cached.trends;
        }
    }
    const niche = config_1.NICHES[nicheId];
    if (!niche) {
        throw new Error(`Unknown niche: ${nicheId}`);
    }
    console.log(`[TrendService] Discovering trends for niche: ${niche.name}`);
    const [redditTrends, youtubeTrends, newsTrends] = await Promise.allSettled([
        fetchRedditTrends(niche),
        fetchYouTubeTrends(niche),
        fetchNewsTrends(niche),
    ]);
    const allTrends = [];
    if (redditTrends.status === 'fulfilled')
        allTrends.push(...redditTrends.value);
    if (youtubeTrends.status === 'fulfilled')
        allTrends.push(...youtubeTrends.value);
    if (newsTrends.status === 'fulfilled')
        allTrends.push(...newsTrends.value);
    // Sort by source priority: reddit > youtube > news
    const sourceOrder = { reddit: 0, youtube: 1, news: 2 };
    allTrends.sort((a, b) => sourceOrder[a.source] - sourceOrder[b.source]);
    // Deduplicate by title similarity
    const uniqueTrends = [];
    const seenTitles = new Set();
    for (const trend of allTrends) {
        const normalizedTitle = trend.title.toLowerCase().slice(0, 50);
        if (!seenTitles.has(normalizedTitle)) {
            seenTitles.add(normalizedTitle);
            uniqueTrends.push(trend);
        }
    }
    const result = uniqueTrends.slice(0, 20);
    cache.set(cacheKey, { trends: result, timestamp: Date.now() });
    console.log(`[TrendService] Found ${result.length} trends`);
    if (result.length === 0) {
        console.log('[TrendService] No trends found, adding fallback test trends');
        result.push({
            id: 'fallback-1',
            title: `${niche.keywords[0]} breakthrough: What experts are saying`,
            source: 'reddit',
            url: 'https://reddit.com',
            score: 150,
            niche: nicheId,
        }, {
            id: 'fallback-2',
            title: `Why ${niche.keywords[1]} is changing the industry`,
            source: 'youtube',
            url: 'https://youtube.com',
            niche: nicheId,
        });
    }
    return result;
}
function clearTrendCache(nicheId) {
    if (nicheId) {
        cache.delete(`trends-${nicheId}`);
    }
    else {
        cache.clear();
    }
}
// Alias for external use
exports.getTrends = discoverTrends;
//# sourceMappingURL=trendService.js.map