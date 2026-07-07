import { supabase, isSupabaseConfigured } from './lib/supabaseClient';
export function sanitizeAndCleanJSON(rawText: string) {
    if (!rawText) return "{}";
    let cleaned = rawText.trim();
    if (cleaned.startsWith("```json")) {
        cleaned = cleaned.substring(7);
    } else if (cleaned.startsWith("```")) {
        cleaned = cleaned.substring(3);
    }
    if (cleaned.endsWith("```")) {
        cleaned = cleaned.substring(0, cleaned.length - 3);
    }
    return cleaned.trim();
}

export function validateStoryboardPayload(data: any) {
    if (!data) return false;
    const requiredFields = ["youtube_title", "youtube_description", "tiktok_caption", "instagram_caption", "viral_hashtags", "thumbnail_prompt", "scenes"];
    for (const field of requiredFields) {
        if (data[field] === undefined) return false;
    }
    if (!Array.isArray(data.scenes)) return false;
    return true;
}

async function getPrivateBetaAuthorizationHeader(url: string, forceRefresh = false) {
    if (!url.startsWith('/api/gemini') || !isSupabaseConfigured()) return {};
    try {
        if (forceRefresh) {
            await supabase.auth.refreshSession();
        }
        const { data } = await supabase.auth.getSession();
        const token = data?.session?.access_token;
        return token ? { Authorization: `Bearer ${token}` } : {};
    } catch (_) {
        return {};
    }
}

export async function fetchWithBackoff(url: string, options: any) {
    const MAX_RETRY = 2;
    
    let lastError: any = null;
    let lastStatus: number | string = "unknown";
    
    const endpoint = url;
    let model = "unknown";
    if (url.includes("storyboard")) {
        model = "gemini-2.5-flash";
    } else if (url.includes("tts")) {
        model = "gemini-3.1-flash-tts-preview";
    }

    try {
        if (options && options.body) {
            const parsedBody = JSON.parse(options.body);
            if (parsedBody && parsedBody.model) {
                model = parsedBody.model;
            }
        }
    } catch (_) {}

    let authRefreshRetried = false;

    for (let attempt = 0; attempt <= MAX_RETRY; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout
        
        try {
            const privateBetaAuthHeader = await getPrivateBetaAuthorizationHeader(url, authRefreshRetried);
            const response = await fetch(url, {
                ...options,
                headers: {
                    ...(options?.headers || {}),
                    ...privateBetaAuthHeader
                },
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (response.ok) {
                return response;
            }

            const status = response.status;
            lastStatus = status;

            let apiMessage = `HTTP error ${status}`;
            try {
                const clonedResponse = response.clone();
                const errText = await clonedResponse.text();
                try {
                    const parsed = JSON.parse(errText);
                    if (parsed.error) apiMessage = parsed.error;
                } catch (_) {
                    if (errText) apiMessage = errText;
                }
            } catch (_) {}

            lastError = new Error(apiMessage);

            if ((status === 401 || status === 403) && url.startsWith('/api/gemini') && isSupabaseConfigured() && !authRefreshRetried) {
                authRefreshRetried = true;
                await supabase.auth.refreshSession().catch(() => null);
                await new Promise(res => setTimeout(res, 350));
                continue;
            }

            const isRetryable = (status >= 500 && status < 600) || status === 408;
            
            if (isRetryable && attempt < MAX_RETRY) {
                const currentDelay = attempt === 0 ? 1000 : 2000;
                await new Promise(res => setTimeout(res, currentDelay));
                continue;
            }

            break;

        } catch (error: any) {
            clearTimeout(timeoutId);
            
            if (error.name === "AbortError") {
                lastStatus = "timeout";
                lastError = new Error("Permintaan terlalu lama");
            } else {
                lastStatus = error.status || "network_error";
                lastError = error;
            }

            if (attempt < MAX_RETRY) {
                const currentDelay = attempt === 0 ? 1000 : 2000;
                await new Promise(res => setTimeout(res, currentDelay));
                continue;
            }
            break;
        }
    }

    let finalMessage = "";
    if (lastStatus === 429) {
        finalMessage = "Kuota API habis atau terlalu banyak request";
    } else if (lastStatus === 403) {
        finalMessage = "Akses model ditolak";
    } else if (lastStatus === 404) {
        finalMessage = "Model API tidak ditemukan";
    } else if (lastStatus === 500) {
        finalMessage = "Server AI sedang bermasalah";
    } else if (lastStatus === "timeout") {
        finalMessage = "Permintaan terlalu lama";
    } else {
        finalMessage = lastError?.message || `Sistem API gagal merespon (${lastStatus})`;
    }

    console.error({
        status: lastStatus,
        endpoint,
        model,
        message: finalMessage
    });

    throw new Error(finalMessage);
}

export const GeminiService = {
    async generateStoryboard(
        theme: string,
        narratorStyle: string,
        animStyle: string,
        constraints: string,
        includeCta: boolean,
        activeRatio: string,
        activeSceneMode: string,
        sceneCountInput: string,
        sceneDuration: string,
        apiKey: string,
        outputLanguage: string = "mixed",
        characterConsistencyMode: boolean = true
    ) {
        try {
            const response = await fetchWithBackoff("/api/gemini/storyboard", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    theme,
                    narratorStyle,
                    animStyle,
                    constraints,
                    includeCta,
                    activeRatio,
                    activeSceneMode,
                    sceneCountInput,
                    sceneDuration,
                    outputLanguage,
                    characterConsistencyMode
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                let errMsg = `Sistem API gagal memberikan respon (${response.status})`;
                try {
                    const parsedErr = JSON.parse(errText);
                    if (parsedErr.error) errMsg = parsedErr.error;
                } catch (_) {}
                return { success: false, data: null, error: errMsg };
            }

            const jsonResult = await response.json();
            const rawText = jsonResult.candidates?.[0]?.content?.parts?.[0]?.text;
            const cleanedJsonText = sanitizeAndCleanJSON(rawText);
            const parsedData = JSON.parse(cleanedJsonText);

            if (!validateStoryboardPayload(parsedData)) {
                return { success: false, data: null, error: "Skema payload JSON dari model tidak lengkap atau cacat struktur." };
            }

            return { success: true, data: parsedData, error: null };
        } catch (err: any) {
            return { success: false, data: null, error: err.message || err };
        }
    },

    async generateTTS(
        script: string,
        voiceName: string,
        actingPrefix: string,
        pace: number,
        injectBreaths: boolean,
        injectSighs: boolean,
        apiKey: string,
        humanCueInstruction: string = "",
        humanCueIntensity: number = 2,
        voiceAgeInstruction: string = "",
        voiceAgeLabel: string = "Auto / Netral"
    ) {
        try {
            const response = await fetchWithBackoff("/api/gemini/tts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    script,
                    voiceName,
                    actingPrefix,
                    pace,
                    injectBreaths,
                    injectSighs,
                    humanCueInstruction,
                    humanCueIntensity,
                    voiceAgeInstruction,
                    voiceAgeLabel
                })
            });

            if (!response.ok) {
                const errorMsg = await response.text();
                let errMsg = errorMsg;
                try {
                    const parsedErr = JSON.parse(errorMsg);
                    if (parsedErr.error) errMsg = parsedErr.error;
                } catch (_) {}
                return { success: false, data: null, error: `Sintesis TTS gagal (${response.status}): ${errMsg}` };
            }

            const result = await response.json();
            const part = result?.candidates?.[0]?.content?.parts?.[0];
            const audioData = part?.inlineData?.data;
            const mimeType = part?.inlineData?.mimeType;

            if (!audioData || !mimeType || !mimeType.startsWith("audio/")) {
                return { success: false, data: null, error: "Gagal memperoleh data biner audio dari respons model." };
            }

            let sampleRate = 24000;
            const rateMatch = mimeType.match(/rate=(\d+)/);
            if (rateMatch) sampleRate = parseInt(rateMatch[1], 10);

            const binaryString = atob(audioData);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const pcm16 = new Int16Array(bytes.buffer);

            return { success: true, data: { pcm16, sampleRate }, error: null };
        } catch (err: any) {
            return { success: false, data: null, error: err.message || err };
        }
    }
};
