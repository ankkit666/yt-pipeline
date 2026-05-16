import 'dotenv/config';
import {
  startPipeline,
  resumePipeline,
  getState,
  verifyAuth,
  getAvailableNiches,
  loadProgress,
  clearProgress,
  onStateChange,
} from './pipeline';
import { getTrends } from './trendService';
import { getConfig } from './config';

async function main() {
  console.log('=== YouTube Video Generation Pipeline ===\n');

  // Load any saved progress
  const savedState = loadProgress();
  if (savedState && savedState.step !== 'idle' && savedState.step !== 'complete') {
    console.log('Found saved progress. Use --resume to continue.\n');
    console.log('Saved state:', savedState.step, '- Progress:', savedState.progress + '%');
    if (savedState.error) {
      console.log('Error:', savedState.error);
    }
  }

  // Check auth
  const config = getConfig();
  console.log('Config check:');
  console.log('  OpenAI:', config.openaiApiKey ? '✓' : '✗ (set OPENAI_API_KEY)');
  console.log('  ElevenLabs:', config.elevenLabsApiKey ? '✓' : '✗ (set ELEVENLABS_API_KEY)');
  console.log('  Reddit:', config.redditClientId ? '✓' : '○ (optional)');
  console.log('  YouTube:', config.youtubeApiKey ? '✓' : '○ (optional)');
  console.log();

  // Show available niches
  const niches = getAvailableNiches();
  console.log('Available niches:');
  for (const niche of niches) {
    console.log(`  - ${niche.id}: ${niche.name}`);
  }
  console.log();

  // Demo: Run a quick pipeline for AI niche
  console.log('Running pipeline for AI niche...\n');

  // Subscribe to state changes
  onStateChange((state) => {
    console.log(`[State] ${state.step} - ${state.progress}%`);
    if (state.selectedTrend) {
      console.log(`  Trend: ${state.selectedTrend.title.slice(0, 50)}...`);
    }
    if (state.error) {
      console.log(`  Error: ${state.error}`);
    }
  });

  try {
    // Test step by step
    console.log('1. Discovering trends...');
    const trends = await getTrends('ai');
    console.log(`   Found ${trends.length} trends`);
    if (trends[0]) {
      console.log(`   Top: ${trends[0].title.slice(0, 60)}...`);
    }

    console.log('\n2. Running full pipeline...');
    const result = await startPipeline({
      niche: 'ai',
      generateVoiceover: true,
    });

    if (result.success) {
      console.log('\n✓ Pipeline complete!');
      console.log(`  Script: ${result.script?.wordCount} words`);
      if (result.voiceover) {
        console.log(`  Voiceover: ${result.voiceover.duration}s`);
      }
    } else {
      console.log('\n✗ Pipeline failed:', result.error);
    }
  } catch (error) {
    console.error('\nError:', error);
  }
}

// Allow running as CLI
const args = process.argv.slice(2);
if (require.main === module) {
  if (args.includes('--resume')) {
    resumePipeline().then((result) => {
      console.log('Resume result:', result.success ? 'success' : result.error);
    });
  } else if (args.includes('--clear')) {
    clearProgress();
    console.log('Progress cleared');
  } else {
    main();
  }
}

export { startPipeline, resumePipeline, getState, verifyAuth, getAvailableNiches };