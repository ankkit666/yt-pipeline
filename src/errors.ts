export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export class JSONParseError extends Error {
  constructor(message: string, public readonly rawResponse?: string) {
    super(message);
    this.name = 'JSONParseError';
  }
}

export class RateLimitError extends Error {
  constructor(message: string, public readonly retryAfter?: number) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export class LLMTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LLMTimeoutError';
  }
}

export class ContentPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContentPolicyError';
  }
}

export class EncodingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EncodingError';
  }
}

export type PipelineError =
  | AuthError
  | JSONParseError
  | RateLimitError
  | TimeoutError
  | LLMTimeoutError
  | ContentPolicyError
  | EncodingError;

export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}

export function isJSONParseError(error: unknown): error is JSONParseError {
  return error instanceof JSONParseError;
}

export function isRateLimitError(error: unknown): error is RateLimitError {
  return error instanceof RateLimitError;
}

export function isTimeoutError(error: unknown): error is TimeoutError {
  return error instanceof TimeoutError || error instanceof LLMTimeoutError;
}

export function getUserFriendlyMessage(error: PipelineError): string {
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