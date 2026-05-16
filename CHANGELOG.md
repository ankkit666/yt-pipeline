# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.0.0.1] - 2026-05-16

### Added
- Initial MVP release of YouTube Pipeline
- Trend discovery from Reddit, YouTube, and News RSS
- Script generation using GPT-4o
- Voice generation using ElevenLabs (Rachel voice)
- Progress saving and resume capability
- YouTube-themed dashboard design
- Support for 4 niches: AI, Finance, Tech, Motivation

### Core Features
- `discoverTrends(niche)` - Fetches trending topics from multiple sources
- `generateScript(trend, niche)` - Creates YouTube Shorts scripts (150-300 words)
- `generateVoiceover(script)` - Generates audio using ElevenLabs
- `startPipeline(options)` - Orchestrates the full pipeline

### Technical
- TypeScript implementation with strict typing
- Error handling: AuthError, JSONParseError, RateLimitError, TimeoutError, ContentPolicyError
- 15-minute trend caching
- Progress state persistence