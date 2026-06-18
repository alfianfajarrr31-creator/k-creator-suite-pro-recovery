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

// 1. STORYBOARD PROXY ENDPOINT
app.post("/api/gemini/storyboard", async (req, res) => {
    try {
        const { theme, narratorStyle, animStyle, constraints, includeCta, activeRatio, activeSceneMode, sceneCountInput, sceneDuration } = req.body;
        
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

        const systemPrompt = `You are K-Director, an elite AI Storyboard Director & Visual Prompt Engineer.
Create a highly engaging, viral-optimized video storyboard and complete social media distribution package based on the user's theme.
Your output MUST be entirely in valid JSON format matching the schema provided. DO NOT output markdown codeblocks (no \`\`\`json). Just the raw JSON object.

Art & Visual Style Directive: ${animStyle}
Narrator Voice & Tone: ${narratorStyle}
Aspect Ratio Target: ${activeRatio}
Scene Constraints: ${sceneCountInfo}
Pacing/Duration: ${durationInfo}
Special User Instructions/Constraints: ${constraints ? constraints : "None"}
Include Viral Call to Action Scene at the end: ${includeCta}

Your JSON MUST contain the following fields:
1. "youtube_title": A catchy, clickable, viral-optimized title for YouTube Shorts.
2. "youtube_description": Description including video summary, structured outline, call-to-actions, and video chapters.
3. "tiktok_caption": A high-converting TikTok caption.
4. "instagram_caption": An engaging Instagram Reel caption.
5. "viral_hashtags": Space-separated trending hashtags.
6. "thumbnail_prompt": A professional, detailed image prompt to generate YouTube thumbnail (Art Style: "${animStyle}").
7. "scenes": An array of scene objects.

For EACH scene, generate:
- "scene_number": Integer starting from 1
- "scene_description": Detailed landscape/character scene descriptive overview (in Indonesian).
- "narrator_script": Spoken voiceover text (in Indonesian).
- "camera_movement": Precise professional camera motion direction.
- "imagePrompt": Technical Text-to-Image prompt in English including subject, pose, clothes, environment, and lighting (matching "${animStyle} style").
- "videoPrompt": High-fidelity Image-to-Video motion prompt in English. Must strictly specify each bracketed layer:
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
                        youtube_title: { type: "STRING" },
                        youtube_description: { type: "STRING" },
                        tiktok_caption: { type: "STRING" },
                        instagram_caption: { type: "STRING" },
                        viral_hashtags: { type: "STRING" },
                        thumbnail_prompt: { type: "STRING" },
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
                    required: ["youtube_title", "youtube_description", "tiktok_caption", "instagram_caption", "viral_hashtags", "thumbnail_prompt", "scenes"]
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

// 2. TTS PROXY ENDPOINT
app.post("/api/gemini/tts", async (req, res) => {
    try {
        const { script, voiceName, actingPrefix, pace, injectBreaths, injectSighs } = req.body;

        const finalKey = process.env.GEMINI_API_KEY;
        if (!finalKey) {
            return res.status(400).json({ 
                success: false, 
                error: "Environment GEMINI_API_KEY belum dikonfigurasi" 
            });
        }

        let cleanScript = script;
        if (injectBreaths) {
            cleanScript = cleanScript.replace(/\[breath\]/g, " ... [intake of soft breath] ... ");
        }
        if (injectSighs) {
            cleanScript = cleanScript.replace(/\[sigh\]/g, " ... [emotional gentle sigh] ... ");
        }

        const finalProcessedPrompt = `${actingPrefix} Speak at a pace of ${pace}x. Translate all breathing tags inside brackets into realistic breathing noises. Read naturally: ${cleanScript}`;
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
