import { PipelineState, Trend, GenerationOptions, PipelineResult } from './types';
export declare function onStateChange(callback: (state: PipelineState) => void): void;
export declare function loadProgress(): PipelineState | null;
export declare function clearProgress(): void;
export declare function getState(): PipelineState;
export declare function verifyAuth(): Promise<boolean>;
export declare function startPipeline(options: GenerationOptions): Promise<PipelineResult>;
export declare function resumePipeline(): Promise<PipelineResult>;
export declare function getAvailableNiches(): Array<{
    id: string;
    name: string;
}>;
export declare function getTrends(nicheId: string): Promise<Trend[]>;
//# sourceMappingURL=pipeline.d.ts.map