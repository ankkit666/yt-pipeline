import {
  startPipeline,
  resumePipeline,
  getState,
  verifyAuth,
  clearProgress,
  loadProgress,
  onStateChange,
} from '../src/pipeline';
import * as trendService from '../src/trendService';
import * as scriptService from '../src/scriptService';
import * as voiceService from '../src/voiceService';
import { PipelineState } from '../src/types';

// Mock all dependencies
jest.mock('../src/trendService');
jest.mock('../src/scriptService');
jest.mock('../src/voiceService');

const mockDiscoverTrends = trendService.discoverTrends as jest.Mock;
const mockGenerateScript = scriptService.generateScript as jest.Mock;
const mockGenerateVoiceover = voiceService.generateVoiceover as jest.Mock;

describe('MVP Flow', () => {
  const mockTrend = {
    id: 'test-trend-1',
    title: 'Test AI breakthrough',
    source: 'reddit' as const,
    url: 'https://reddit.com/test',
    score: 100,
    niche: 'ai',
  };

  const mockScript = {
    id: 'script-123',
    content: 'Test script content',
    wordCount: 50,
    estimatedDuration: 20,
    trend: mockTrend,
    niche: 'ai',
    createdAt: new Date().toISOString(),
  };

  const mockVoiceover = {
    id: 'voice-123',
    audioUrl: 'https://example.com/audio.mp3',
    scriptId: 'script-123',
    duration: 20,
    voiceId: 'default-voice',
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    clearProgress();

    process.env.OPENAI_API_KEY = 'test-key';
    process.env.ELEVENLABS_API_KEY = 'test-eleven-key';

    // Default mocks
    mockDiscoverTrends.mockResolvedValue([mockTrend]);
    mockGenerateScript.mockResolvedValue(mockScript);
    mockGenerateVoiceover.mockResolvedValue(mockVoiceover);
  });

  describe('No trends in niche', () => {
    it('should show empty state when no trends found', async () => {
      mockDiscoverTrends.mockResolvedValue([]);

      const result = await startPipeline({ niche: 'ai' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No trends found');

      const state = getState();
      expect(state.step).toBe('error');
    });

    it('should show user-friendly "No trends found" message', async () => {
      mockDiscoverTrends.mockResolvedValue([]);

      const result = await startPipeline({ niche: 'ai' });

      expect(result.error).toBe('No trends found for this niche');
    });
  });

  describe('User navigates away mid-generation', () => {
    it('should save intermediate state automatically', async () => {
      const stateChanges: PipelineState[] = [];
      onStateChange((state) => stateChanges.push(state));

      await startPipeline({ niche: 'ai', generateVoiceover: false });

      // After generateScript but before voiceover, state should be saved
      const savedState = loadProgress();
      expect(savedState).not.toBeNull();
      expect(savedState?.step).toBe('complete'); // script generated, no voiceover
    });

    it('should offer "Resume" option on return', async () => {
      await startPipeline({ niche: 'ai', generateVoiceover: false });

      // Simulate returning to the app
      const savedState = loadProgress();
      expect(savedState).not.toBeNull();

      // Resume should work
      const resumeResult = await resumePipeline();
      expect(resumeResult.success).toBe(true);
    });
  });

  describe('Generation timeout', () => {
    it('should show error message on timeout with retry button', async () => {
      mockGenerateScript.mockRejectedValue(new Error('timeout'));

      const result = await startPipeline({ niche: 'ai' });

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();

      const state = getState();
      expect(state.step).toBe('error');
      expect(state.error).toBeTruthy();
    });

    it('should preserve state for retry', async () => {
      mockGenerateScript.mockRejectedValueOnce(new Error('timeout'));
      mockGenerateScript.mockResolvedValueOnce(mockScript);

      await startPipeline({ niche: 'ai' });

      // Should have saved state
      const saved = loadProgress();
      expect(saved?.error).toBeTruthy();

      // Retry should work
      const retryResult = await startPipeline({ niche: 'ai' });
      expect(retryResult.success).toBe(true);
    });
  });

  describe('Voice generation fails', () => {
    it('should show error message but preserve script', async () => {
      mockGenerateVoiceover.mockRejectedValue(new Error('API error'));

      const result = await startPipeline({ niche: 'ai', generateVoiceover: true });

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();

      // Script should still be available
      const state = getState();
      expect(state.script).toBeTruthy();
    });

    it('should offer retry button for voice generation', async () => {
      mockGenerateVoiceover
        .mockRejectedValueOnce(new Error('API error'))
        .mockResolvedValueOnce(mockVoiceover);

      await startPipeline({ niche: 'ai', generateVoiceover: true });

      // State should be saved with the error
      const saved = loadProgress();
      expect(saved?.error).toBeTruthy();

      // The pipeline should have saved the script
      expect(saved?.script).toBeTruthy();
    });
  });

  describe('Full pipeline flow', () => {
    it('should complete full pipeline: niche -> trends -> script -> voice', async () => {
      const result = await startPipeline({
        niche: 'ai',
        generateVoiceover: true,
      });

      expect(result.success).toBe(true);
      expect(result.script).toBeDefined();
      expect(result.voiceover).toBeDefined();

      expect(mockDiscoverTrends).toHaveBeenCalledWith('ai', true);
      expect(mockGenerateScript).toHaveBeenCalled();
      expect(mockGenerateVoiceover).toHaveBeenCalled();

      const state = getState();
      expect(state.step).toBe('complete');
      expect(state.progress).toBe(100);
    });

    it('should run without voiceover (script-only mode)', async () => {
      const result = await startPipeline({
        niche: 'ai',
        generateVoiceover: false,
      });

      expect(result.success).toBe(true);
      expect(result.script).toBeDefined();
      expect(result.voiceover).toBeUndefined();

      expect(mockGenerateVoiceover).not.toHaveBeenCalled();
    });
  });

  describe('Auth verification', () => {
    it('should fail gracefully when API keys are missing', async () => {
      delete process.env.OPENAI_API_KEY;
      delete process.env.ELEVENLABS_API_KEY;

      const isValid = await verifyAuth();
      expect(isValid).toBe(false);

      const state = getState();
      expect(state.step).toBe('error');
    });
  });

  describe('State management', () => {
    it('should track progress correctly through pipeline', async () => {
      const progressSteps: number[] = [];

      onStateChange((state) => {
        progressSteps.push(state.progress);
      });

      await startPipeline({ niche: 'ai', generateVoiceover: true });

      // Progress should increase through the pipeline
      expect(progressSteps[0]).toBe(10); // discovering
      expect(progressSteps[1]).toBe(20); // selecting trend
      expect(progressSteps[2]).toBe(30); // generating script
      expect(progressSteps[3]).toBe(60); // reviewing script
      expect(progressSteps[4]).toBe(80); // generating voiceover
      expect(progressSteps[5]).toBe(100); // complete
    });

    it('should clear progress after successful completion', async () => {
      await startPipeline({ niche: 'ai', generateVoiceover: true });

      const saved = loadProgress();
      expect(saved).toBeNull(); // Should be cleared after success
    });
  });
});