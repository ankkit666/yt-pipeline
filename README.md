# YouTube Video Generation Pipeline

Automatic pipeline to generate YouTube content from trending topics.

## Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Run the pipeline
npm run dev
```

## Required API Keys

- **OpenAI API Key** - For script generation (GPT-4o)
- **ElevenLabs API Key** - For voiceover generation

## Optional API Keys

- **Reddit API** - For trend discovery from Reddit
- **YouTube Data API** - For trend discovery from YouTube

## Usage

```typescript
import { startPipeline, getState } from './src/index';

// Run full pipeline
const result = await startPipeline({
  niche: 'ai',
  generateVoiceover: true,
});

if (result.success) {
  console.log(`Script: ${result.script.content}`);
  console.log(`Voiceover: ${result.voiceover.duration}s`);
}
```

## Niche Options

- `ai` - AI & Technology
- `finance` - Finance & Investing
- `tech` - Tech & Gadgets
- `motivation` - Motivation & Self-Improvement

## Architecture

```
[User] → [Trend Discovery] → [Script Generation] → [Voiceover Engine] → [Output]
   │            │                    │                   │
   └────────────┴────────────────────┴───────────────────┘
                (API adapters for each service)
```

## Error Handling

The pipeline handles:
- Rate limit errors (retries with backoff)
- Timeout errors (retry once, then fail gracefully)
- Auth errors (clear message to configure keys)
- Content policy errors (skip topic, explain why)

## Progress & Resume

The pipeline saves progress automatically. Use `--resume` to continue after an interruption.

```bash
npm start -- --resume
```

## Testing

```bash
npm test
```

## Project Status

- **Phase**: MVP Implementation
- **Scope**: Trend → Script → Voiceover (~2.5 min)
- **Reviews**: CEO ✓ | Eng ✓ | Design ✓