import { PipelineState, Trend, Script, Voiceover, GenerationOptions, PipelineResult } from './types';
import { discoverTrends, clearTrendCache } from './trendService';
import { generateScript } from './scriptService';
import { generateVoiceover } from './voiceService';
import { AuthError, getUserFriendlyMessage } from './errors';
import { getConfig } from './config';

const STATE_FILE = '.pipeline-state.json';
const PROGRESS_FILE = '.pipeline-progress.json';

interface SavedState {
  state: PipelineState;
  savedAt: string;
}

let currentState: PipelineState = {
  step: 'idle',
  progress: 0,
};

let stateChangeCallbacks: Array<(state: PipelineState) => void> = [];

export function onStateChange(callback: (state: PipelineState) => void): void {
  stateChangeCallbacks.push(callback);
}

function emitStateChange(): void {
  for (const cb of stateChangeCallbacks) {
    try {
      cb(currentState);
    } catch (e) {
      console.error('[Pipeline] State change callback error:', e);
    }
  }
}

function updateState(updates: Partial<PipelineState>): void {
  currentState = { ...currentState, ...updates };
  emitStateChange();
  saveProgress();
}

function saveProgress(): void {
  try {
    const fs = require('fs');
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify({
      state: currentState,
      savedAt: new Date().toISOString(),
    }, null, 2));
  } catch (e) {
    console.error('[Pipeline] Failed to save progress:', e);
  }
}

export function loadProgress(): PipelineState | null {
  try {
    const fs = require('fs');
    if (fs.existsSync(PROGRESS_FILE)) {
      const data = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8')) as SavedState;
      const age = Date.now() - new Date(data.savedAt).getTime();
      if (age < 24 * 60 * 60 * 1000) { // 24 hours
        console.log('[Pipeline] Restored progress from file');
        currentState = data.state;
        return currentState;
      }
    }
  } catch (e) {
    console.error('[Pipeline] Failed to load progress:', e);
  }
  return null;
}

export function clearProgress(): void {
  try {
    const fs = require('fs');
    if (fs.existsSync(PROGRESS_FILE)) {
      fs.unlinkSync(PROGRESS_FILE);
    }
  } catch (e) {
    console.error('[Pipeline] Failed to clear progress:', e);
  }
  currentState = { step: 'idle', progress: 0 };
}

export function getState(): PipelineState {
  return currentState;
}

export async function verifyAuth(): Promise<boolean> {
  const config = getConfig();

  if (!config.openaiApiKey || !config.elevenLabsApiKey) {
    updateState({
      step: 'error',
      error: 'API keys not configured',
      progress: 0,
    });
    return false;
  }

  return true;
}

export async function startPipeline(options: GenerationOptions): Promise<PipelineResult> {
  const { niche, trendId, approveScript = true, generateVoiceover: doVoiceover = true } = options;

  console.log(`[Pipeline] Starting: niche=${niche}, trendId=${trendId}, voice=${doVoiceover}`);

  try {
    // Step 1: Discover trends
    updateState({ step: 'discovering_trends', niche, progress: 10 });

    const trends = await discoverTrends(niche);

    if (trends.length === 0) {
      updateState({
        step: 'error',
        error: 'No trends found for this niche',
        progress: 0,
      });
      return { success: false, error: 'No trends found' };
    }

    // If no specific trend selected, pick the top one
    const selectedTrend = trendId ? trends.find((t) => t.id === trendId) : trends[0];

    if (!selectedTrend) {
      updateState({
        step: 'error',
        error: 'Trend not found',
        progress: 0,
      });
      return { success: false, error: 'Trend not found' };
    }

    updateState({
      step: 'selecting_trend',
      selectedTrend,
      progress: 20,
    });

    // Step 2: Generate script
    updateState({ step: 'generating_script', progress: 30 });

    const script = await generateScript(selectedTrend, niche);

    updateState({
      step: 'reviewing_script',
      script,
      progress: 60,
    });

    // In real implementation, we'd wait for user approval
    // For now, auto-approve if the flag is set
    if (!approveScript) {
      return {
        success: true,
        script,
        error: 'Script awaiting approval',
      };
    }

    // Step 3: Generate voiceover (optional)
    let voiceover: Voiceover | undefined;

    if (doVoiceover) {
      updateState({ step: 'generating_voiceover', progress: 80 });

      voiceover = await generateVoiceover(script);

      updateState({
        step: 'complete',
        script,
        voiceover,
        progress: 100,
      });
    } else {
      updateState({
        step: 'complete',
        script,
        progress: 100,
      });
    }

    // Clear saved progress after successful completion
    clearProgress();

    return {
      success: true,
      script,
      voiceover,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const userMessage = getUserFriendlyMessage(error as any);

    console.error('[Pipeline] Error:', message);

    updateState({
      step: 'error',
      error: userMessage,
      progress: Math.max(currentState.progress, 10),
    });

    // Save state for potential resume
    saveProgress();

    return {
      success: false,
      error: userMessage,
    };
  }
}

export async function resumePipeline(): Promise<PipelineResult> {
  const saved = loadProgress();

  if (!saved) {
    return { success: false, error: 'No saved progress to resume' };
  }

  console.log('[Pipeline] Resuming from saved state:', saved.step);

  // Based on the step, continue from where we left off
  switch (saved.step) {
    case 'selecting_trend':
    case 'generating_script':
      if (saved.selectedTrend && saved.niche) {
        return startPipeline({
          niche: saved.niche,
          trendId: saved.selectedTrend.id,
        });
      }
      break;

    case 'reviewing_script':
      if (saved.script && saved.niche) {
        const voiceover = await generateVoiceover(saved.script);
        updateState({
          step: 'complete',
          script: saved.script,
          voiceover,
          progress: 100,
        });
        return { success: true, script: saved.script, voiceover };
      }
      break;

    case 'generating_voiceover':
      if (saved.script) {
        const voiceover = await generateVoiceover(saved.script);
        updateState({
          step: 'complete',
          script: saved.script,
          voiceover,
          progress: 100,
        });
        return { success: true, script: saved.script, voiceover };
      }
      break;
  }

  return { success: false, error: 'Cannot resume from current state' };
}

export function getAvailableNiches(): Array<{ id: string; name: string }> {
  const { NICHES } = require('./config');
  return Object.values(NICHES).map((n: any) => ({ id: n.id, name: n.name }));
}

export function getTrends(nicheId: string): Promise<Trend[]> {
  return discoverTrends(nicheId, true);
}