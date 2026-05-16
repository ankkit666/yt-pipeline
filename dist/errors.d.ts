export declare class AuthError extends Error {
    constructor(message: string);
}
export declare class JSONParseError extends Error {
    readonly rawResponse?: string | undefined;
    constructor(message: string, rawResponse?: string | undefined);
}
export declare class RateLimitError extends Error {
    readonly retryAfter?: number | undefined;
    constructor(message: string, retryAfter?: number | undefined);
}
export declare class TimeoutError extends Error {
    constructor(message: string);
}
export declare class LLMTimeoutError extends Error {
    constructor(message: string);
}
export declare class ContentPolicyError extends Error {
    constructor(message: string);
}
export declare class EncodingError extends Error {
    constructor(message: string);
}
export type PipelineError = AuthError | JSONParseError | RateLimitError | TimeoutError | LLMTimeoutError | ContentPolicyError | EncodingError;
export declare function isAuthError(error: unknown): error is AuthError;
export declare function isJSONParseError(error: unknown): error is JSONParseError;
export declare function isRateLimitError(error: unknown): error is RateLimitError;
export declare function isTimeoutError(error: unknown): error is TimeoutError;
export declare function getUserFriendlyMessage(error: PipelineError): string;
//# sourceMappingURL=errors.d.ts.map