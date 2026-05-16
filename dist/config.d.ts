import { z } from 'zod';
export declare const NicheSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    keywords: z.ZodArray<z.ZodString, "many">;
    subreddits: z.ZodArray<z.ZodString, "many">;
    newsSources: z.ZodArray<z.ZodString, "many">;
    stylePrompt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    keywords: string[];
    subreddits: string[];
    newsSources: string[];
    stylePrompt: string;
}, {
    id: string;
    name: string;
    keywords: string[];
    subreddits: string[];
    newsSources: string[];
    stylePrompt: string;
}>;
export type Niche = z.infer<typeof NicheSchema>;
export declare const NICHES: Record<string, Niche>;
export declare const ConfigSchema: z.ZodObject<{
    openaiApiKey: z.ZodString;
    elevenLabsApiKey: z.ZodString;
    redditClientId: z.ZodOptional<z.ZodString>;
    redditClientSecret: z.ZodOptional<z.ZodString>;
    youtubeApiKey: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    openaiApiKey: string;
    elevenLabsApiKey: string;
    redditClientId?: string | undefined;
    redditClientSecret?: string | undefined;
    youtubeApiKey?: string | undefined;
}, {
    openaiApiKey: string;
    elevenLabsApiKey: string;
    redditClientId?: string | undefined;
    redditClientSecret?: string | undefined;
    youtubeApiKey?: string | undefined;
}>;
export type AppConfig = z.infer<typeof ConfigSchema>;
export declare function getConfig(): AppConfig;
//# sourceMappingURL=config.d.ts.map