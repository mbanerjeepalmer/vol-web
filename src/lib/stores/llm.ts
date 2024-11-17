import { writable } from 'svelte/store';
import * as webllm from '@mlc-ai/web-llm';

type LLMStatus = 'idle' | 'loading' | 'ready' | 'error';

interface LLMStore {
    engine: webllm.MLCEngineInterface | null;
    status: LLMStatus;
    progressMessage: string;
    readyMessage: string;
}

export const llmStore = writable<LLMStore>({
    engine: null,
    status: 'idle',
    progressMessage: '',
    readyMessage: ''
});

const MODEL_ID = 'Llama-3.2-1B-Instruct-q4f32_1-MLC';

async function sendInitialMessage(engine: webllm.MLCEngineInterface) {
    try {
        const response = await engine.chat.completions.create({
            messages: [
                {
                    role: 'user',
                    content: "Respond with two humorous words, such as 'Howdy pardner', 'Running on gas', 'Splines reticulated' to indicate you're ready."
                }
            ]
        });
        llmStore.update(store => ({ ...store, readyMessage: response.choices[0]?.message?.content || 'LLM Ready' }));
    } catch (error) {
        console.error('Initial message error:', error);
        llmStore.update(store => ({ ...store, readyMessage: 'LLM borked' }));
    }
}

export async function initializeModel() {
    llmStore.update(store => ({ ...store, status: 'loading', progressMessage: 'Starting model initialization...' }));

    try {
        const initProgressCallback = (progress: { text: string }) => {
            llmStore.update(store => ({ ...store, progressMessage: progress.text }));
        };

        const engine = await webllm.CreateMLCEngine(MODEL_ID, {
            initProgressCallback
        });

        llmStore.update(store => ({
            ...store,
            engine,
            status: 'ready',
            progressMessage: 'Model loaded successfully!'
        }));

        await sendInitialMessage(engine);
    } catch (error) {
        llmStore.update(store => ({
            ...store,
            status: 'error',
            progressMessage: error instanceof Error ? error.message : 'Unknown error occurred'
        }));
        console.error('Model initialization error:', error);
    }
}