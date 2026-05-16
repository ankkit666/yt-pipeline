"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onStateChange = onStateChange;
exports.loadProgress = loadProgress;
exports.clearProgress = clearProgress;
exports.getState = getState;
exports.verifyAuth = verifyAuth;
exports.startPipeline = startPipeline;
exports.resumePipeline = resumePipeline;
exports.getAvailableNiches = getAvailableNiches;
exports.getTrends = getTrends;
const trendService_1 = require("./trendService");
const scriptService_1 = require("./scriptService");
const voiceService_1 = require("./voiceService");
const errors_1 = require("./errors");
const config_1 = require("./config");
const STATE_FILE = '.pipeline-state.json';
const PROGRESS_FILE = '.pipeline-progress.json';
let currentState = {
    step: 'idle',
    progress: 0,
};
let stateChangeCallbacks = [];
function onStateChange(callback) {
    stateChangeCallbacks.push(callback);
}
function emitStateChange() {
    for (const cb of stateChangeCallbacks) {
        try {
            cb(currentState);
        }
        catch (e) {
            console.error('[Pipeline] State change callback error:', e);
        }
    }
}
function updateState(updates) {
    currentState = { ...currentState, ...updates };
    emitStateChange();
    saveProgress();
}
function saveProgress() {
    try {
        const fs = require('fs');
        fs.writeFileSync(PROGRESS_FILE, JSON.stringify({
            state: currentState,
            savedAt: new Date().toISOString(),
        }, null, 2));
    }
    catch (e) {
        console.error('[Pipeline] Failed to save progress:', e);
    }
}
function loadProgress() {
    try {
        const fs = require('fs');
        if (fs.existsSync(PROGRESS_FILE)) {
            const data = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
            const age = Date.now() - new Date(data.savedAt).getTime();
            if (age < 24 * 60 * 60 * 1000) { // 24 hours
                console.log('[Pipeline] Restored progress from file');
                currentState = data.state;
                return currentState;
            }
        }
    }
    catch (e) {
        console.error('[Pipeline] Failed to load progress:', e);
    }
    return null;
}
function clearProgress() {
    try {
        const fs = require('fs');
        if (fs.existsSync(PROGRESS_FILE)) {
            fs.unlinkSync(PROGRESS_FILE);
        }
    }
    catch (e) {
        console.error('[Pipeline] Failed to clear progress:', e);
    }
    currentState = { step: 'idle', progress: 0 };
}
function getState() {
    return currentState;
}
async function verifyAuth() {
    const config = (0, config_1.getConfig)();
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
async function startPipeline(options) {
    const { niche, trendId, approveScript = true, generateVoiceover: doVoiceover = true } = options;
    console.log(`[Pipeline] Starting: niche=${niche}, trendId=${trendId}, voice=${doVoiceover}`);
    try {
        // Step 1: Discover trends
        updateState({ step: 'discovering_trends', niche, progress: 10 });
        const trends = await (0, trendService_1.discoverTrends)(niche);
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
        const script = await (0, scriptService_1.generateScript)(selectedTrend, niche);
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
        let voiceover;
        if (doVoiceover) {
            updateState({ step: 'generating_voiceover', progress: 80 });
            voiceover = await (0, voiceService_1.generateVoiceover)(script);
            updateState({
                step: 'complete',
                script,
                voiceover,
                progress: 100,
            });
        }
        else {
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
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        const userMessage = (0, errors_1.getUserFriendlyMessage)(error);
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
async function resumePipeline() {
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
                const voiceover = await (0, voiceService_1.generateVoiceover)(saved.script);
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
                const voiceover = await (0, voiceService_1.generateVoiceover)(saved.script);
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
function getAvailableNiches() {
    const { NICHES } = require('./config');
    return Object.values(NICHES).map((n) => ({ id: n.id, name: n.name }));
}
function getTrends(nicheId) {
    return (0, trendService_1.discoverTrends)(nicheId, true);
}
//# sourceMappingURL=pipeline.js.map