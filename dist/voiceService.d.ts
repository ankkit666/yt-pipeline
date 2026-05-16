import { Voiceover, Script } from './types';
export declare function generateVoiceover(script: Script, voiceId?: string): Promise<Voiceover>;
export declare function listVoices(): Promise<Array<{
    id: string;
    name: string;
}>>;
//# sourceMappingURL=voiceService.d.ts.map