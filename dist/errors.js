"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EncodingError = exports.ContentPolicyError = exports.LLMTimeoutError = exports.TimeoutError = exports.RateLimitError = exports.JSONParseError = exports.AuthError = void 0;
exports.isAuthError = isAuthError;
exports.isJSONParseError = isJSONParseError;
exports.isRateLimitError = isRateLimitError;
exports.isTimeoutError = isTimeoutError;
exports.getUserFriendlyMessage = getUserFriendlyMessage;
class AuthError extends Error {
    constructor(message) {
        super(message);
        this.name = 'AuthError';
    }
}
exports.AuthError = AuthError;
class JSONParseError extends Error {
    rawResponse;
    constructor(message, rawResponse) {
        super(message);
        this.rawResponse = rawResponse;
        this.name = 'JSONParseError';
    }
}
exports.JSONParseError = JSONParseError;
class RateLimitError extends Error {
    retryAfter;
    constructor(message, retryAfter) {
        super(message);
        this.retryAfter = retryAfter;
        this.name = 'RateLimitError';
    }
}
exports.RateLimitError = RateLimitError;
class TimeoutError extends Error {
    constructor(message) {
        super(message);
        this.name = 'TimeoutError';
    }
}
exports.TimeoutError = TimeoutError;
class LLMTimeoutError extends Error {
    constructor(message) {
        super(message);
        this.name = 'LLMTimeoutError';
    }
}
exports.LLMTimeoutError = LLMTimeoutError;
class ContentPolicyError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ContentPolicyError';
    }
}
exports.ContentPolicyError = ContentPolicyError;
class EncodingError extends Error {
    constructor(message) {
        super(message);
        this.name = 'EncodingError';
    }
}
exports.EncodingError = EncodingError;
function isAuthError(error) {
    return error instanceof AuthError;
}
function isJSONParseError(error) {
    return error instanceof JSONParseError;
}
function isRateLimitError(error) {
    return error instanceof RateLimitError;
}
function isTimeoutError(error) {
    return error instanceof TimeoutError || error instanceof LLMTimeoutError;
}
function getUserFriendlyMessage(error) {
    if (error instanceof AuthError) {
        return 'Setup required. Please configure your API keys in the environment.';
    }
    if (error instanceof RateLimitError) {
        return 'Service busy. Please try again in a moment.';
    }
    if (error instanceof TimeoutError || error instanceof LLMTimeoutError) {
        return 'Generation timed out. Please try again.';
    }
    if (error instanceof JSONParseError) {
        return 'Invalid response received. Retrying...';
    }
    if (error instanceof ContentPolicyError) {
        return "Couldn't generate content for this topic.";
    }
    if (error instanceof EncodingError) {
        return 'Audio generation failed. Please try again.';
    }
    return 'An unexpected error occurred. Please try again.';
}
//# sourceMappingURL=errors.js.map