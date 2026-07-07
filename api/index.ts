import express from "express";
import dns from "dns";

// Ensure we have correct dns ordering
dns.setDefaultResultOrder("ipv4first");

const app = express();

app.use(express.json({ limit: "15mb" }));

// API routes go here FIRST
app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
});

function getAllowedEmails() {
    const raw = process.env.ALLOWED_EMAILS || process.env.VITE_ALLOWED_EMAILS || "";
    return raw
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean);
}

function getSupabaseServerConfig() {
    return {
        url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
        anonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || ""
    };
}

async function verifyPrivateBetaAccess(req: any) {
    const allowedEmails = getAllowedEmails();
    if (!allowedEmails.length) {
        return { ok: false, status: 403, message: "Private Beta Gate belum dikonfigurasi. Isi ALLOWED_EMAILS atau VITE_ALLOWED_EMAILS di Vercel." };
    }

    const authHeader = String(req.headers.authorization || "");
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (!token) {
        return { ok: false, status: 401, message: "Login Google diperlukan untuk memakai K Creator Suite Pro." };
    }

    const { url, anonKey } = getSupabaseServerConfig();
    if (!url || !anonKey) {
        return { ok: false, status: 500, message: "Supabase server config belum lengkap di Vercel ENV." };
    }

    try {
        const response = await fetch(`${url.replace(/\/$/, "")}/auth/v1/user`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                apikey: anonKey
            }
        });

        if (!response.ok) {
            return { ok: false, status: 401, message: "Session login tidak valid atau sudah expired. Silakan login ulang." };
        }

        const user = await response.json();
        const email = String(user?.email || "").trim().toLowerCase();
        if (!email) {
            return { ok: false, status: 401, message: "Email login tidak terbaca dari session." };
        }

        if (!allowedEmails.includes("*") && !allowedEmails.includes(email)) {
            return { ok: false, status: 403, message: `Email ${email} belum mendapat akses Private Beta.` };
        }

        return { ok: true, status: 200, email };
    } catch (error: any) {
        console.error("Private beta auth verification failed:", error?.message || error);
        return { ok: false, status: 500, message: "Gagal memverifikasi akses Private Beta." };
    }
}

app.use("/api/gemini", async (req, res, next) => {
    const access = await verifyPrivateBetaAccess(req);
    if (!access.ok) {
        return res.status(access.status).json({ success: false, error: access.message });
    }
    (req as any).privateBetaUserEmail = access.email;
    next();
});

// 1. STORYBOARD PROXY ENDPOINT
app.post("/api/gemini/storyboard", async (req, res) => {
    try {
        const { theme, narratorStyle, animStyle, constraints, includeCta, activeRatio, activeSceneMode, sceneCountInput, sceneDuration, outputLanguage = "mixed", characterConsistencyMode = true } = req.body;
        
        const finalKey = process.env.GEMINI_API_KEY;
        if (!finalKey) {
            return res.status(400).json({ 
                success: false, 
                error: "Environment GEMINI_API_KEY belum dikonfigurasi" 
            });
        }

        let sceneCountInfo = "Let model decide optimal scenes (between 4 to 8 scenes).";
        if (activeSceneMode === "manual" && sceneCountInput) {
            sceneCountInfo = `Create EXACTLY ${sceneCountInput} scenes. No more, no less.`;
        }
        let durationInfo = `Each scene should be approx ${sceneDuration || 8} seconds long in pacing.`;
        const durationSeconds = Math.max(3, Math.min(30, parseInt(String(sceneDuration || 8), 10) || 8));
        const minWords = Math.max(6, Math.round(durationSeconds * 1.7));
        const maxWords = Math.max(minWords + 4, Math.round(durationSeconds * 2.45));
        const narrationDurationRule = `Narration duration rule: each narrator_script must be realistic for ${durationSeconds} seconds of Indonesian TTS. Target ${minWords}-${maxWords} spoken words per scene. Avoid long compound sentences. Keep narration tight and punchy.`;
        const characterConsistencyRule = characterConsistencyMode
            ? `Character Consistency Mode: ON. When a known character or main character is mentioned, expand them into a master character reference inside scene_description, imagePrompt, and videoPrompt. Include signature outfit, hair, face, iconic accessories, age impression, expression, body language, and recurring visual traits. Do not only write the character name. Keep the character details consistent across all scenes.`
            : `Character Consistency Mode: OFF. Keep character descriptions concise.`;

        const languageMode = String(outputLanguage || "mixed");
        let languageInstruction = "Mixed Recommended: scene_description and narrator_script must be in Bahasa Indonesia; thumbnail_prompt, imagePrompt, and videoPrompt must be in clear English for best Veo/Kling/Image AI compatibility.";
        if (languageMode === "id") {
            languageInstruction = "Bahasa Indonesia: write all user-facing outputs in Bahasa Indonesia, including captions, scene_description, narrator_script, thumbnail_prompt, imagePrompt, and videoPrompt. Keep the videoPrompt bracket labels exactly in English, but write the descriptions after each bracket in Bahasa Indonesia.";
        } else if (languageMode === "en") {
            languageInstruction = "English: write all user-facing outputs in English, including captions, scene_description, narrator_script, thumbnail_prompt, imagePrompt, and videoPrompt.";
        }

        const systemPrompt = `You are K-Director, an elite AI Storyboard Director & Visual Prompt Engineer.
Create a highly engaging, viral-optimized video storyboard and complete social media distribution package based on the user's theme.
Your output MUST be entirely in valid JSON format matching the schema provided. DO NOT output markdown codeblocks (no \`\`\`json). Just the raw JSON object.

Art & Visual Style Directive: ${animStyle}
Narrator Voice & Tone: ${narratorStyle}
Aspect Ratio Target: ${activeRatio}
Scene Constraints: ${sceneCountInfo}
Pacing/Duration: ${durationInfo}
${narrationDurationRule}
${characterConsistencyRule}
Output Language Directive: ${languageInstruction}
Special User Instructions/Constraints: ${constraints ? constraints : "None"}
Include Viral Call to Action Scene at the end: ${includeCta}

Your JSON MUST contain the following fields:
1. "video_name": A short, clean file name for exported video. Use lowercase words separated by hyphens, no extension, max 70 characters.
1b. "youtube_title": A catchy, clickable, viral-optimized title for YouTube Shorts, following Output Language Directive.
2. "youtube_description": Description including video summary, structured outline, call-to-actions, and video chapters, following Output Language Directive.
3. "tiktok_caption": A high-converting TikTok caption, following Output Language Directive.
4. "instagram_caption": An engaging Instagram Reel caption, following Output Language Directive.
5. "viral_hashtags": Space-separated trending hashtags.
6. "thumbnail_prompt": A professional, detailed image prompt to generate YouTube thumbnail (Art Style: "${animStyle}"), following Output Language Directive.
7. "thumbnail_text": A punchy visual hook text to write directly on the youtube thumbnail image (max 3-5 words, e.g. "RAHASIA GELAP!"). Must follow Output Language Directive.
8. "thumbnail_text_alt": A single strong alternative hook text to write on the thumbnail image (max 3-5 words). Must follow Output Language Directive.
9. "scenes": An array of scene objects.

For EACH scene, generate:
- "scene_number": Integer starting from 1
- "scene_description": Detailed landscape/character scene descriptive overview, following Output Language Directive.
- "narrator_script": Spoken voiceover text, following Output Language Directive. Must obey Narration duration rule and fit the selected scene duration realistically.
- "camera_movement": Precise professional camera motion direction.
- "imagePrompt": Technical Text-to-Image prompt including subject, pose, clothes, environment, and lighting (matching "${animStyle} style"), following Output Language Directive.
- "videoPrompt": High-fidelity Image-to-Video motion prompt following Output Language Directive. Must strictly specify each bracketed layer:
  [CHARACTER MOTION] (Actions, hair/cloth sways, facial movements of subject)
  [EMOTIONAL PERFORMANCE] (Explicit emotional expression, surprise, grit, breathing details)
  [SECONDARY CHARACTER MOTION] (Ambient background person/animal actions)
  [BACKGROUND MOTION] (Distant clouds, flickering lights, shifting views)
  [ENVIRONMENT MOTION] (Wind effects, dust/particles, rain/snow fluid movement)
  [ATMOSPHERE] (Slight color tint, lighting, cinematic mood parameters)
  [CAMERA] (Camera panning, zoom speed, dynamic tracking movement)
  [CINEMATIC DETAILS] (Volumetric ray trace, depth of field blur, cinematic bloom details)
  [VISUAL HOOK] (A sudden gripping visual detail or flash of interest for retention)
  CRITICAL: Maximize kinetic action elements. Avoid static slideshow look.
- "estimated_duration": Integer seconds.`;

        let activeModel = "gemini-2.5-flash";
        let validatedUrl = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${finalKey}`;

        const payload = {
            contents: [{ parts: [{ text: `Generate storyboard for this topic: ${theme}` }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        video_name: { type: "STRING" },
                        youtube_title: { type: "STRING" },
                        youtube_description: { type: "STRING" },
                        tiktok_caption: { type: "STRING" },
                        instagram_caption: { type: "STRING" },
                        viral_hashtags: { type: "STRING" },
                        thumbnail_prompt: { type: "STRING" },
                        thumbnail_text: { type: "STRING" },
                        thumbnail_text_alt: { type: "STRING" },
                        scenes: {
                            type: "ARRAY",
                            items: {
                                type: "OBJECT",
                                properties: {
                                    scene_number: { type: "INTEGER" },
                                    scene_description: { type: "STRING" },
                                    narrator_script: { type: "STRING" },
                                    camera_movement: { type: "STRING" },
                                    imagePrompt: { type: "STRING" },
                                    videoPrompt: { type: "STRING" },
                                    estimated_duration: { type: "INTEGER" }
                                },
                                required: [
                                    "scene_number",
                                    "scene_description",
                                    "narrator_script",
                                    "camera_movement",
                                    "imagePrompt",
                                    "videoPrompt",
                                    "estimated_duration"
                                ]
                            }
                        }
                    },
                    required: ["video_name", "youtube_title", "youtube_description", "tiktok_caption", "instagram_caption", "viral_hashtags", "thumbnail_prompt", "thumbnail_text", "thumbnail_text_alt", "scenes"]
                }
            }
        };

        const MAX_RETRY = 2;
        let response: any = null;
        let lastStatus: number | string = 200;

        for (let attempt = 0; attempt <= MAX_RETRY; attempt++) {
            if (attempt > 0) {
                const backoffDelay = attempt === 1 ? 1000 : 2000;
                await new Promise(resolve => setTimeout(resolve, backoffDelay));
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

            try {
                response = await fetch(validatedUrl, {
                    method: "POST",
                    headers: { 
                        "Content-Type": "application/json",
                        "User-Agent": "aistudio-build"
                    },
                    body: JSON.stringify(payload),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                lastStatus = response.status;
                const status = response.status;

                console.log({
                    activeModel,
                    endpoint: "/api/gemini/storyboard",
                    status: response.status
                });

                if (response.ok) {
                    break;
                }

                const isRetryable = (status >= 500 && status < 600) || status === 408;
                if (!isRetryable || attempt === MAX_RETRY) {
                    break;
                }
            } catch (err: any) {
                clearTimeout(timeoutId);
                
                if (err.name === "AbortError") {
                    lastStatus = 408;
                } else {
                    lastStatus = "network_error";
                }

                console.log({
                    activeModel,
                    endpoint: "/api/gemini/storyboard",
                    status: lastStatus
                });

                if (attempt === MAX_RETRY) {
                    break;
                }
            }
        }

        if (!response || !response.ok) {
            let errorMsg = "Gagal menghubungi AI. Silakan coba lagi.";
            if (lastStatus === 429) {
                errorMsg = "Kuota API habis atau terlalu banyak request";
            } else if (lastStatus === 403) {
                errorMsg = "Akses model ditolak";
            } else if (lastStatus === 404) {
                errorMsg = "Model API tidak ditemukan";
            } else if (lastStatus === 500 || (typeof lastStatus === "number" && lastStatus >= 500 && lastStatus < 600)) {
                errorMsg = "Server AI sedang bermasalah";
            }
            return res.status(typeof lastStatus === "number" ? lastStatus : 500).json({ success: false, error: errorMsg });
        }

        const data = await response.json();
        return res.json(data);
    } catch (error: any) {
        console.error("Storyboard backend error:", error);
        return res.status(500).json({ success: false, error: error.message || String(error) });
    }
});

// 1.5. REGENERATE SINGLE THUMBNAIL TEXT ENDPOINT
app.post("/api/gemini/regenerate-thumbnail-text", async (req, res) => {
    try {
        const { theme, currentStoryboardText, currentYoutubeTitle } = req.body;
        const finalKey = process.env.GEMINI_API_KEY;
        if (!finalKey) {
            return res.status(400).json({ success: false, error: "Environment GEMINI_API_KEY belum dikonfigurasi" });
        }

        const systemPrompt = `You are an elite viral designer. Create a fresh, highly clickable Thumbnail Text visual hook and image generation prompt based on the user's theme and storyboard.
Your output MUST be entirely in valid JSON format. DO NOT output markdown codeblocks. Just the raw JSON object.
JSON fields:
1. "thumbnail_text": visual hook text (max 3-5 words)
2. "thumbnail_text_alt": unique alternate hook text (max 3-5 words)
3. "thumbnail_prompt": highly-detailed visual illustration prompt for the thumbnail image.`;

        const payload = {
            contents: [{ parts: [{ text: `Theme: ${theme}\nTitle: ${currentYoutubeTitle}\nStoryboard reference:\n${currentStoryboardText}` }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        thumbnail_text: { type: "STRING" },
                        thumbnail_text_alt: { type: "STRING" },
                        thumbnail_prompt: { type: "STRING" }
                    },
                    required: ["thumbnail_text", "thumbnail_text_alt", "thumbnail_prompt"]
                }
            }
        };

        const validatedUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${finalKey}`;
        const rawResponse = await fetch(validatedUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", "User-Agent": "aistudio-build" },
            body: JSON.stringify(payload)
        });

        if (!rawResponse.ok) {
            return res.status(rawResponse.status).json({ success: false, error: `Gagal re-generate thumbnail text (${rawResponse.status})` });
        }

        const data = await rawResponse.json();
        return res.json(data);
    } catch (error: any) {
        console.error("Regenerate thumbnail text error:", error);
        return res.status(500).json({ success: false, error: error.message || String(error) });
    }
});

// 1.6. REGENERATE FULL PUBLISHING PACKAGE ENDPOINT
app.post("/api/gemini/regenerate-publishing", async (req, res) => {
    try {
        const { theme, narratorStyle, animStyle, outputLanguage, currentStoryboardText } = req.body;
        const finalKey = process.env.GEMINI_API_KEY;
        if (!finalKey) {
            return res.status(400).json({ success: false, error: "Environment GEMINI_API_KEY belum dikonfigurasi" });
        }

        const systemPrompt = `You are K-Director, an elite AI Social Media distribution agent. Create a revised, hyper-optimized social media publishing package matching the specified output language.
Your output MUST be entirely in valid JSON format. DO NOT output markdown codeblocks. Just the raw JSON object.
JSON fields:
1. "video_name": short clean file name, lowercase hyphenated, no extension
2. "youtube_title": catchy Shorts title
2. "youtube_description": structured Shorts description
3. "tiktok_caption": high-converting TikTok caption
4. "instagram_caption": engaging IG caption
5. "viral_hashtags": space-separated hashtags
6. "thumbnail_prompt": professional cover generation prompt
7. "thumbnail_text": hook text (max 3-5 words)
8. "thumbnail_text_alt": alternate hook text (max 3-5 words)`;

        const payload = {
            contents: [{ parts: [{ text: `Theme: ${theme}\nVoice: ${narratorStyle}\nArt Style: ${animStyle}\nLanguage: ${outputLanguage}\nStoryboard reference:\n${currentStoryboardText}` }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        video_name: { type: "STRING" },
                        youtube_title: { type: "STRING" },
                        youtube_description: { type: "STRING" },
                        tiktok_caption: { type: "STRING" },
                        instagram_caption: { type: "STRING" },
                        viral_hashtags: { type: "STRING" },
                        thumbnail_prompt: { type: "STRING" },
                        thumbnail_text: { type: "STRING" },
                        thumbnail_text_alt: { type: "STRING" }
                    },
                    required: ["video_name", "youtube_title", "youtube_description", "tiktok_caption", "instagram_caption", "viral_hashtags", "thumbnail_prompt", "thumbnail_text", "thumbnail_text_alt"]
                }
            }
        };

        const validatedUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${finalKey}`;
        const rawResponse = await fetch(validatedUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", "User-Agent": "aistudio-build" },
            body: JSON.stringify(payload)
        });

        if (!rawResponse.ok) {
            return res.status(rawResponse.status).json({ success: false, error: `Gagal re-generate publishing package (${rawResponse.status})` });
        }

        const data = await rawResponse.json();
        return res.json(data);
    } catch (error: any) {
        console.error("Regenerate publishing package error:", error);
        return res.status(500).json({ success: false, error: error.message || String(error) });
    }
});

// 2. TTS PROXY ENDPOINT
app.post("/api/gemini/tts", async (req, res) => {
    try {
        const { script, voiceName, actingPrefix, pace, injectBreaths, injectSighs, humanCueInstruction, humanCueIntensity, voiceAgeInstruction, voiceAgeLabel } = req.body;

        const finalKey = process.env.GEMINI_API_KEY;
        if (!finalKey) {
            return res.status(400).json({ 
                success: false, 
                error: "Environment GEMINI_API_KEY belum dikonfigurasi" 
            });
        }

        let cleanScript = String(script || "");
        const cueReplacements: Array<[RegExp, string]> = [
            [/\[breath\]/gi, " ... (take a soft natural breath) ... "],
            [/\[sigh\]/gi, " ... (release a gentle emotional sigh) ... "],
            [/\[smile\]/gi, " ... (speak with a warm smile in the voice) ... "],
            [/\[hmm\]/gi, " ... hmm ... "],
            [/\[soft laugh\]/gi, " ... (give a tiny natural laugh) ... "],
            [/\[laugh\]/gi, " ... (give a short soft laugh) ... "],
            [/\[sad pause\]/gi, " ... (pause briefly, voice softens with sadness) ... "],
            [/\[pause\]/gi, " ... (brief natural pause) ... "],
            [/\[nervous laugh\]/gi, " ... (small nervous laugh, then continue) ... "]
        ];
        for (const [pattern, replacement] of cueReplacements) {
            cleanScript = cleanScript.replace(pattern, replacement);
        }
        if (injectBreaths && !/soft natural breath/i.test(cleanScript)) {
            cleanScript = cleanScript.replace(/([.!?])\s+/g, "$1 ... (take a tiny breath) ... ").slice(0, 4200);
        }
        if (injectSighs && !/gentle emotional sigh/i.test(cleanScript) && /(sedih|kecewa|hancur|menyesal|terluka|sad|regret|pain)/i.test(cleanScript)) {
            cleanScript = cleanScript.replace(/^/, "... (release a gentle emotional sigh) ... ");
        }

        const intensityLabel = Number(humanCueIntensity) <= 1 ? "very subtle" : Number(humanCueIntensity) >= 3 ? "expressive but still controlled" : "natural medium";
        const humanLayer = humanCueInstruction ? String(humanCueInstruction) : "Keep the delivery natural and human, with subtle emotional color but no exaggerated acting.";
        const ageLayer = voiceAgeInstruction ? String(voiceAgeInstruction) : "Use a natural age-neutral creator voice that matches the script context.";
        const ageLabel = voiceAgeLabel ? String(voiceAgeLabel) : "Auto / Netral";
        const finalProcessedPrompt = `${actingPrefix}
Voice age profile: ${ageLabel}.
Age performance direction: ${ageLayer}
Voice acting direction: ${humanLayer}
Acting intensity: ${intensityLabel}.
Speak at a pace of ${pace}x.
Important: do not read bracket labels literally. Convert cue tags and parenthetical acting notes into natural vocal performance such as smile in the voice, tiny laugh, hmm, breath, sad pause, or emotional softness. Keep it realistic for Indonesian creator voice-over, not theatrical overacting.
If a childlike or elderly voice is requested, perform it as a respectful generic character voice. Do not imitate any real person, celebrity, or specific child. Keep articulation clear for creator narration.
Read naturally: ${cleanScript}`;
        const modelName = "gemini-3.1-flash-tts-preview";
        const validatedUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${finalKey}`;

        const validVoices = ["Zephyr", "Puck", "Kore", "Charon", "Fenrir", "Aoede"];
        const resolvedVoiceName = validVoices.includes(voiceName) ? voiceName : "Zephyr";

        const payload = {
            contents: [{ parts: [{ text: finalProcessedPrompt }] }],
            generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: { 
                    voiceConfig: { 
                        prebuiltVoiceConfig: { 
                            voiceName: resolvedVoiceName 
                        } 
                    } 
                }
            }
        };

        const response = await fetch(validatedUrl, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "User-Agent": "aistudio-build"
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            return res.status(response.status).json({ success: false, error: `Google API Error: ${errorText}` });
        }

        const data = await response.json();
        return res.json(data);
    } catch (error: any) {
        console.error("TTS backend error:", error);
        return res.status(500).json({ success: false, error: error.message || String(error) });
    }
});

export default app;
