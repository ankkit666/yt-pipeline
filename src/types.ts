export interface Trend {
  id: string;
  title: string;
  source: 'reddit' | 'youtube' | 'news';
  url: string;
  score?: number;
  publishedAt?: string;
  niche: string;
}

export interface Script {
  id: string;
  content: string;
  wordCount: number;
  estimatedDuration: number;
  trend: Trend;
  niche: string;
  createdAt: string;
}

export interface Voiceover {
  id: string;
  audioUrl: string;
  scriptId: string;
  duration: number;
  voiceId: string;
  createdAt: string;
}

export interface PipelineState {
  step: 'idle' | 'discovering_trends' | 'selecting_trend' | 'generating_script' | 'reviewing_script' | 'generating_voiceover' | 'complete' | 'error';
  niche?: string;
  selectedTrend?: Trend;
  script?: Script;
  voiceover?: Voiceover;
  error?: string;
  progress: number;
}

export interface GenerationOptions {
  niche: string;
  trendId?: string;
  approveScript?: boolean;
  generateVoiceover?: boolean;
}

export interface PipelineResult {
  success: boolean;
  script?: Script;
  voiceover?: Voiceover;
  error?: string;
}