"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateScript = generateScript;
exports.estimateReadTime = estimateReadTime;
const openai_1 = __importDefault(require("openai"));
const config_1 = require("./config");
const errors_1 = require("./errors");
let openaiClient = null;
function getOpenAIClient() {
    if (!openaiClient) {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new errors_1.AuthError('OpenAI API key not configured');
        }
        openaiClient = new openai_1.default({ apiKey });
    }
    return openaiClient;
}
const SCRIPT_SYSTEM_PROMPT = `You are a YouTube Shorts script writer. Write engaging, punchy scripts that work well as voiceovers.

Rules:
- Keep scripts 150-300 words (60-90 second video)
- Start with a HOOK that grabs attention in the first 2 seconds
- Use short sentences, conversational tone
- Include 2-3 key points with brief explanations
- End with a call-to-action or teaser
- Format as plain text, no markdown
- NEVER include stage directions like [Music] or [Cut to]`;
async function generateWithRetry(client, messages, maxRetries = 2) {
    let lastError = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await client.chat.completions.create({
                model: 'gpt-4o',
                messages,
                temperature: 0.7,
                max_tokens: 1000,
            });
            const content = response.choices[0]?.message?.content;
            if (!content) {
                throw new errors_1.JSONParseError('Empty response from OpenAI');
            }
            return content;
        }
        catch (error) {
            if (error instanceof openai_1.default) {
                const openaiError = error;
                if (openaiError.code === 'content_policy') {
                    throw new errors_1.ContentPolicyError('Content policy violation');
                }
                if (openaiError.status === 429 || openaiError.code === 'rate_limit_error') {
                    if (attempt < maxRetries) {
                        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
                        continue;
                    }
                }
            }
            if (error instanceof Error) {
                if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
                    lastError = new errors_1.LLMTimeoutError('Script generation timed out');
                    if (attempt < maxRetries) {
                        console.log('[ScriptService] Timeout, retrying...');
                        continue;
                    }
                }
                else if (error.message?.includes('API key')) {
                    throw new errors_1.AuthError('OpenAI API key invalid');
                }
                else {
                    lastError = error;
                }
            }
            if (attempt === maxRetries)
                break;
        }
    }
    throw lastError || new Error('Script generation failed after retries');
}
async function generateScript(trend, nicheId) {
    const niche = config_1.NICHES[nicheId];
    if (!niche) {
        throw new Error(`Unknown niche: ${nicheId}`);
    }
    console.log(`[ScriptService] Generating script for: "${trend.title}"`);
    const client = getOpenAIClient();
    const userPrompt = `Niche: ${niche.name}
Style: ${niche.stylePrompt}

Trend/Topic: ${trend.title}
Source: ${trend.source}${trend.url ? ` (${trend.url})` : ''}

Write a YouTube Shorts script (150-300 words).`;
    const messages = [
        { role: 'system', content: SCRIPT_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
    ];
    let content = '';
    try {
        content = await generateWithRetry(client, messages);
    }
    catch (error) {
        if (error instanceof errors_1.JSONParseError) {
            console.error('[ScriptService] JSON parse error, attempting fallback');
            throw new errors_1.JSONParseError('Invalid JSON response from LLM', content);
        }
        throw error;
    }
    // Clean up the content
    content = content.trim();
    // Fallback parsing if the response isn't clean
    const lines = content.split('\n').filter((l) => l.trim());
    const cleanedContent = lines.join('\n');
    const wordCount = cleanedContent.split(/\s+/).length;
    const estimatedDuration = Math.ceil(wordCount / 150 * 60); // ~150 words/min
    const script = {
        id: `script-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        content: cleanedContent,
        wordCount,
        estimatedDuration,
        trend,
        niche: nicheId,
        createdAt: new Date().toISOString(),
    };
    console.log(`[ScriptService] Generated script: ${wordCount} words, ~${estimatedDuration}s`);
    return script;
}
function estimateReadTime(wordCount) {
    return Math.ceil((wordCount / 150) * 60);
}
//# sourceMappingURL=scriptService.js.map