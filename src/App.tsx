import { useEffect } from 'react';
import { HTML_CONTENT } from './HtmlContent';
import { dbContainer, BaseRepository, ProjectRepo, CharacterRepo, VoiceRepo, SettingsRepo } from './Repositories';
import { GeminiService, sanitizeAndCleanJSON, validateStoryboardPayload } from './GeminiService';
import { audioState, AudioMemoryRegistry, pcmToWav, responseToWavBuffer, AudioEngine } from './AudioHelper';
import { supabase, isSupabaseConfigured } from './lib/supabaseClient';

const DB_NAME = 'KCreatorSuiteDB';
const DB_VERSION = 3;

function escapeHTML(str: any): string {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/\//g, '&#x2F;');
}

function sanitizeImageSource(src: any): string {
    if (!src) return '';
    if (src instanceof Blob) {
        try {
            return URL.createObjectURL(src);
        } catch (e) {
            return '';
        }
    }
    const clean = String(src).trim();
    if (clean.startsWith('data:image/') && clean.includes(';base64,')) {
        return clean;
    }
    if (/^(http|https):\/\//i.test(clean)) {
        return clean;
    }
    return '';
}

function helperBlobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        if (!(blob instanceof Blob)) {
            return reject(new Error("Parameter bukan merupakan objek Blob biner yang valid."));
        }
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
    });
}

function helperBase64ToBlob(base64Data: string, contentType = ''): Blob {
    const base64Clean = base64Data.split(',')[1] || base64Data;
    const sliceSize = 1024;
    const byteCharacters = atob(base64Clean);
    const byteArrays = [];
    
    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
        const slice = byteCharacters.slice(offset, offset + sliceSize);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }
    return new Blob(byteArrays, { type: contentType });
}

function generateSecureId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    return 'k_' + Date.now() + '_' + s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

function formatTime(seconds: number): string {
    if (isNaN(seconds)) return "00:00";
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

export default function App() {
    useEffect(() => {
        // Set dynamic title and favicon
        document.title = "K Creator Suite Pro";
        const faviconSvg = `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="gf" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#6366f1" />
              <stop offset="100%" stop-color="#a855f7" />
            </linearGradient>
          </defs>
          <rect width="100" height="100" rx="22" fill="url(#gf)" />
          <rect x="25" y="25" width="12" height="50" rx="3" fill="white" />
          <path d="M37 50 L65 25 H53 L37 40 Z" fill="white" opacity="0.9" />
          <path d="M37 50 L65 75 H53 L37 60 Z" fill="white" opacity="0.9" />
          <polygon points="56,44 68,50 56,56" fill="#050609" opacity="0.85" />
        </svg>`;
        let link: any = document.querySelector("link[rel~='icon']");
        if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
        }
        link.href = 'data:image/svg+xml;utf8,' + encodeURIComponent(faviconSvg);

        // ==========================================
        // 1. STATE & STORES LAYER
        // ==========================================
        const AppStore: any = {
            state: {
                activeTab: 'director',
                globalApiKey: '',
                activeRatio: '16:9',
                activeStoryboardData: null as any,
                activeSceneMode: 'auto',
                characterImageBlob: null as Blob | null,
                characterImageMime: '',
                workflowProjects: [] as any[],
                filteredWorkflowProjects: [] as any[],
                selectedProjects: new Set<string>(),
                characterLibrary: [] as any[],
                currentlyOpenDrawerId: null as string | null,
                workflowFilters: {
                    search: '',
                    tag: '',
                    category: '',
                    status: '',
                    favoriteOnly: false,
                    archiveOnly: false,
                    sortBy: 'created_at',
                    sortDir: 'desc'
                },
                workflowPagination: {
                    currentPage: 1,
                    itemsPerPage: 10
                },
                storyboardHistory: [] as any[],
                currentActiveHistoryId: null as string | null,
                databaseLogs: [] as string[],
                generationHistory: [] as any[],
                authSession: null as any,
                authUser: null as any,
                cloudProjects: [] as any[],
                activeCloudProjectId: null as string | null,
                sceneVersionHistory: {} as Record<string, any[]>
            },
            listeners: [] as Array<(state: any, oldState: any) => void>,
            subscribe(fn: (state: any, oldState: any) => void) {
                this.listeners.push(fn);
            },
            setState(updates: any) {
                const oldState = { ...this.state };
                this.state = { ...this.state, ...updates };
                this.listeners.forEach(fn => fn(this.state, oldState));
            }
        };

        // ==========================================
        // 2. TOAST SYSTEM & DATABASE LOGGING
        // ==========================================
        function isNotificationSoundEnabled(): boolean {
            try {
                return localStorage.getItem('kc_notify_sound') !== 'off';
            } catch (_) {
                return true;
            }
        }

        function playNotificationSound(type: string = 'success') {
            if (!isNotificationSoundEnabled()) return;
            try {
                const AudioContextRef = (window as any).AudioContext || (window as any).webkitAudioContext;
                if (!AudioContextRef) return;
                const ctx = new AudioContextRef();
                const now = ctx.currentTime;
                const master = ctx.createGain();
                master.gain.setValueAtTime(0.0001, now);
                master.gain.exponentialRampToValueAtTime(type === 'error' ? 0.08 : 0.055, now + 0.015);
                master.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
                master.connect(ctx.destination);

                const makeTone = (freq: number, start: number, duration: number) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = type === 'error' ? 'sawtooth' : 'sine';
                    osc.frequency.setValueAtTime(freq, now + start);
                    gain.gain.setValueAtTime(0.0001, now + start);
                    gain.gain.exponentialRampToValueAtTime(0.8, now + start + 0.01);
                    gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);
                    osc.connect(gain);
                    gain.connect(master);
                    osc.start(now + start);
                    osc.stop(now + start + duration + 0.03);
                };

                if (type === 'error') {
                    makeTone(220, 0, 0.14);
                    makeTone(150, 0.15, 0.17);
                } else if (type === 'warning') {
                    makeTone(440, 0, 0.11);
                    makeTone(330, 0.13, 0.13);
                } else {
                    makeTone(660, 0, 0.10);
                    makeTone(880, 0.12, 0.14);
                }

                setTimeout(() => {
                    try { ctx.close(); } catch (_) {}
                }, 500);
            } catch (_) {
                // Browser may block audio context; toast still works.
            }
        }

        function showToast(message: string, type = "success") {
            const toast = document.getElementById('toast');
            if (!toast) return;

            const tone = type === 'error' ? 'error' : type === 'warning' ? 'warning' : 'success';
            const config: Record<string, any> = {
                success: { icon: '✅', title: 'Berhasil', cls: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300' },
                error: { icon: '⚠️', title: 'Gagal', cls: 'bg-rose-500/10 border-rose-500/25 text-rose-300' },
                warning: { icon: '🟡', title: 'Perhatian', cls: 'bg-amber-500/10 border-amber-500/25 text-amber-300' },
                info: { icon: 'ℹ️', title: 'Info', cls: 'bg-indigo-500/10 border-indigo-500/25 text-indigo-300' }
            };
            const selected = config[type] || config.success;
            toast.innerHTML = `
                <div class="flex items-start gap-3">
                    <span class="text-base leading-none mt-0.5">${selected.icon}</span>
                    <div class="min-w-0">
                        <div class="text-[10px] uppercase tracking-wider font-black opacity-80">${selected.title}</div>
                        <div class="text-sm font-semibold leading-snug break-words">${escapeHTML(message)}</div>
                    </div>
                </div>
            `;
            toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
            toast.className = `fixed bottom-6 right-6 max-w-[360px] px-5 py-3 rounded-2xl shadow-2xl transition-all duration-300 transform translate-y-12 opacity-0 text-sm z-50 font-medium border backdrop-blur-xl pointer-events-none ${selected.cls}`;
            playNotificationSound(tone);
            setTimeout(() => {
                toast.classList.remove('translate-y-12', 'opacity-0');
                toast.classList.add('translate-y-0', 'opacity-100');
            }, 50);
            setTimeout(() => {
                toast.classList.remove('translate-y-0', 'opacity-100');
                toast.classList.add('translate-y-12', 'opacity-0');
            }, type === 'error' ? 5200 : 3200);
        }

        function getFriendlyFailureAdvice(message: any, context = 'generate'): { title: string; detail: string; tips: string[] } {
            const raw = String(message || '').trim();
            const lower = raw.toLowerCase();
            let title = context === 'tts' ? 'TTS gagal dibuat' : context === 'regenerate' ? 'Regenerate belum berhasil' : 'Generate belum berhasil';
            let detail = raw || 'Sistem AI belum mengembalikan hasil yang bisa dipakai.';
            const tips: string[] = [];

            if (lower.includes('timeout') || lower.includes('terlalu lama')) {
                title = 'Request terlalu lama';
                detail = 'Mesin AI tidak selesai merespons dalam batas waktu aman.';
                tips.push('Coba ulang 1 kali.');
                tips.push('Kurangi jumlah scene atau persingkat instruksi khusus.');
            } else if (lower.includes('kuota') || lower.includes('429') || lower.includes('too many')) {
                title = 'Kuota / rate limit API';
                detail = 'Request terlalu banyak atau kuota Gemini sedang mentok.';
                tips.push('Tunggu beberapa menit lalu coba lagi.');
                tips.push('Hindari klik generate berkali-kali saat loading.');
            } else if (lower.includes('token') || lower.includes('login') || lower.includes('unauthorized') || lower.includes('401')) {
                title = 'Session login bermasalah';
                detail = 'Akses Private Beta atau session login perlu diperbarui.';
                tips.push('Keluar lalu login ulang.');
                tips.push('Pastikan email kamu masuk whitelist.');
            } else if (lower.includes('json') || lower.includes('payload') || lower.includes('schema')) {
                title = 'Format hasil AI tidak valid';
                detail = 'AI menjawab, tapi format datanya belum sesuai struktur app.';
                tips.push('Klik ulang generate.');
                tips.push('Coba buat instruksi lebih sederhana dan jelas.');
            } else if (lower.includes('model') || lower.includes('403') || lower.includes('404')) {
                title = 'Konfigurasi model/API bermasalah';
                detail = 'Server belum bisa memakai model AI yang diminta.';
                tips.push('Cek GEMINI_API_KEY di Vercel.');
                tips.push('Cek apakah model tersedia untuk akun API tersebut.');
            } else {
                tips.push('Coba ulang sekali.');
                tips.push('Kalau masih gagal, sederhanakan tema atau instruksi khusus.');
            }

            return { title, detail, tips };
        }

        function showGenerationFeedback(message: any, context: 'generate' | 'regenerate' | 'tts' = 'generate') {
            const panel = document.getElementById('generationFeedbackPanel');
            if (!panel) return;
            const info = getFriendlyFailureAdvice(message, context);
            panel.classList.remove('hidden');
            panel.innerHTML = `
                <div class="rounded-2xl border border-rose-500/25 bg-rose-500/10 p-4 text-left shadow-lg shadow-rose-950/20">
                    <div class="flex items-start gap-3">
                        <span class="text-xl">🚨</span>
                        <div class="min-w-0 flex-1">
                            <div class="flex items-center justify-between gap-3">
                                <h3 class="text-sm font-black text-rose-200">${escapeHTML(info.title)}</h3>
                                <button data-action="dismiss-generation-feedback" class="text-[10px] font-bold text-rose-300 hover:text-white border border-rose-500/20 px-2 py-1 rounded-lg cursor-pointer">Tutup</button>
                            </div>
                            <p class="text-xs text-rose-100/80 mt-1 leading-relaxed">${escapeHTML(info.detail)}</p>
                            <ul class="mt-3 space-y-1 text-[11px] text-slate-300 list-disc pl-4">
                                ${info.tips.map(tip => `<li>${escapeHTML(tip)}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                </div>
            `;
        }

        function clearGenerationFeedback() {
            const panel = document.getElementById('generationFeedbackPanel');
            if (!panel) return;
            panel.classList.add('hidden');
            panel.innerHTML = '';
        }

        function getNarrationWordBudget(seconds: number): { min: number; max: number } {
            const safeSeconds = Number(seconds) || 8;
            if (safeSeconds <= 5) return { min: 8, max: 12 };
            if (safeSeconds <= 8) return { min: 14, max: 20 };
            if (safeSeconds <= 10) return { min: 20, max: 28 };
            if (safeSeconds <= 12) return { min: 28, max: 35 };
            return { min: 32, max: 42 };
        }

        function scrollToScene(index: number) {
            const el = document.getElementById(`sceneCard_${index}`);
            if (!el) {
                showToast('Scene tidak ditemukan.', 'warning');
                return;
            }
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            document.querySelectorAll('[data-scene-card]').forEach((card) => {
                card.classList.remove('ring-2', 'ring-indigo-500', 'border-indigo-500/60');
            });
            el.classList.add('ring-2', 'ring-indigo-500', 'border-indigo-500/60');
            setTimeout(() => {
                el.classList.remove('ring-2', 'ring-indigo-500', 'border-indigo-500/60');
            }, 2200);
        }

        function renderSceneShortcutNav(data: any) {
            const nav = document.getElementById('sceneShortcutNav');
            const inner = document.getElementById('sceneShortcutNavInner');
            if (!nav || !inner) return;
            const scenes = Array.isArray(data?.scenes) ? data.scenes : [];
            if (scenes.length === 0) {
                nav.classList.add('hidden');
                inner.innerHTML = '';
                return;
            }
            nav.classList.remove('hidden');
            inner.innerHTML = `
                <span class="text-[9px] text-slate-500 font-black uppercase tracking-widest px-1">Jump to:</span>
                ${scenes.map((scene: any, index: number) => `
                    <button data-action="jump-scene" data-index="${index}" class="shrink-0 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-indigo-600/20 border border-slate-800 hover:border-indigo-500/30 text-[10px] font-bold text-slate-300 hover:text-indigo-200 transition cursor-pointer">
                        Scene ${escapeHTML(scene?.scene_number || index + 1)}
                    </button>
                `).join('')}
            `;
        }

        function addDBLog(message: string, type = 'info') {
            const safeMsg = escapeHTML(message);
            const time = new Date().toLocaleTimeString([], { hour12: false });
            let color = 'text-slate-400';
            if (type === 'success') color = 'text-emerald-400';
            if (type === 'error') color = 'text-rose-400 font-bold';
            if (type === 'warning') color = 'text-amber-400';

            const logHTML = `<div class="${color}">[${time}] ${safeMsg}</div>`;
            const logs = [...AppStore.state.databaseLogs];
            logs.unshift(logHTML);
            if (logs.length > 100) logs.pop();

            AppStore.setState({ databaseLogs: logs });

            const container = document.getElementById('dbLogsContainer');
            if (container) {
                container.innerHTML = logs.join('');
            }
        }


        function getAllowedEmails(): string[] {
            const raw = String(import.meta.env.VITE_ALLOWED_EMAILS || '');
            return raw
                .split(',')
                .map((email) => email.trim().toLowerCase())
                .filter(Boolean);
        }

        function isPrivateBetaConfigured(): boolean {
            return getAllowedEmails().length > 0;
        }

        function isEmailAllowed(email: any): boolean {
            const allowed = getAllowedEmails();
            const normalized = String(email || '').trim().toLowerCase();
            if (!normalized) return false;
            if (allowed.includes('*')) return true;
            return allowed.includes(normalized);
        }

        function isCurrentUserAllowed(): boolean {
            const user = AppStore.state.authUser;
            return Boolean(user?.email && isEmailAllowed(user.email));
        }

        function ensurePrivateBetaAccess(showMessage = true): boolean {
            if (!isSupabaseConfigured()) {
                if (showMessage) showToast('Supabase belum dikonfigurasi di Vercel ENV.', 'error');
                renderPrivateBetaGate();
                return false;
            }
            if (!isPrivateBetaConfigured()) {
                if (showMessage) showToast('Akses Private Beta belum dikonfigurasi. Isi VITE_ALLOWED_EMAILS di Vercel.', 'error');
                renderPrivateBetaGate();
                return false;
            }
            const user = AppStore.state.authUser;
            if (!user) {
                if (showMessage) showToast('Login Google dulu untuk memakai aplikasi Private Beta.', 'error');
                renderPrivateBetaGate();
                return false;
            }
            if (!isEmailAllowed(user.email)) {
                if (showMessage) showToast('Email ini belum masuk daftar akses Private Beta.', 'error');
                renderPrivateBetaGate();
                return false;
            }
            return true;
        }

        function getPrivateGateHTML(mode: 'login' | 'denied' | 'config') {
            const user = AppStore.state.authUser;
            const email = escapeHTML(user?.email || '');
            const allowedPreview = getAllowedEmails().filter((item) => item !== '*').slice(0, 3).map(escapeHTML).join(', ');
            if (mode === 'config') {
                return `
                    <div class="max-w-xl w-full mx-auto p-8 rounded-3xl border border-amber-500/20 bg-[#0d0f16] shadow-2xl text-center">
                        <div class="text-4xl mb-4">🔐</div>
                        <h2 class="text-2xl font-black text-white mb-2">Akses Private Beta belum siap</h2>
                        <p class="text-sm text-slate-400 leading-relaxed mb-5">Tambahkan environment variable <b class="text-amber-300">VITE_ALLOWED_EMAILS</b> di Vercel agar hanya email yang kamu izinkan bisa masuk.</p>
                        <div class="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-left text-xs text-slate-300 font-mono mb-5">VITE_ALLOWED_EMAILS=emailkamu@gmail.com,teman@gmail.com</div>
                        <p class="text-[11px] text-slate-500">Setelah ENV diisi, redeploy aplikasi.</p>
                    </div>
                `;
            }
            if (mode === 'denied') {
                return `
                    <div class="max-w-xl w-full mx-auto p-8 rounded-3xl border border-rose-500/20 bg-[#0d0f16] shadow-2xl text-center">
                        <div class="text-4xl mb-4">⛔</div>
                        <h2 class="text-2xl font-black text-white mb-2">Access belum diberikan</h2>
                        <p class="text-sm text-slate-400 leading-relaxed mb-4">Email <b class="text-rose-300">${email}</b> belum masuk daftar akses Private Beta.</p>
                        <p class="text-xs text-slate-500 mb-5">Hubungi admin agar email ini didaftarkan. ${allowedPreview ? `Email terdaftar contoh: ${allowedPreview}` : ''}</p>
                        <button data-action="logout-google" class="px-5 py-3 bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/20 text-rose-300 rounded-2xl text-sm font-black cursor-pointer">Keluar & pakai email lain</button>
                    </div>
                `;
            }
            return `
                <div class="max-w-xl w-full mx-auto p-8 rounded-3xl border border-indigo-500/20 bg-[#0d0f16] shadow-2xl text-center">
                    <div class="text-4xl mb-4">🚪</div>
                    <h2 class="text-2xl font-black text-white mb-2">K Creator Suite Pro — Akses Private Beta</h2>
                    <p class="text-sm text-slate-400 leading-relaxed mb-6">Aplikasi ini sedang mode private. Login memakai Google dengan email yang sudah didaftarkan untuk masuk.</p>
                    <button data-action="login-google" class="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-sm font-black shadow-lg shadow-emerald-600/20 cursor-pointer">🔐 Login Google</button>
                    <p class="text-[11px] text-slate-500 mt-5">Belum punya akses? Minta admin mendaftarkan email kamu dulu.</p>
                </div>
            `;
        }

        function renderPrivateBetaGate() {
            let gate = document.getElementById('privateBetaGate');
            if (!gate) return;
            const main = document.querySelector('main') as HTMLElement | null;
            const mobileTabs = document.querySelector('.flex.md\\:hidden.border-b') as HTMLElement | null;
            const inspectorBtn = document.getElementById('btnToggleInspector');
            const cloudHistoryBtn = document.getElementById('btnCloudHistory');
            const statusBadge = document.getElementById('globalEngineStatusBadge');

            let allowed = false;
            let mode: 'login' | 'denied' | 'config' = 'login';
            if (!isSupabaseConfigured() || !isPrivateBetaConfigured()) {
                mode = 'config';
            } else if (!AppStore.state.authUser) {
                mode = 'login';
            } else if (!isEmailAllowed(AppStore.state.authUser.email)) {
                mode = 'denied';
            } else {
                allowed = true;
            }

            if (allowed) {
                gate.classList.add('hidden');
                if (main) main.classList.remove('hidden');
                if (mobileTabs) mobileTabs.classList.remove('hidden');
                if (inspectorBtn) inspectorBtn.classList.remove('hidden');
                if (cloudHistoryBtn) cloudHistoryBtn.classList.remove('hidden');
                if (statusBadge) statusBadge.classList.remove('hidden');
            } else {
                gate.innerHTML = getPrivateGateHTML(mode);
                gate.classList.remove('hidden');
                if (main) main.classList.add('hidden');
                if (mobileTabs) mobileTabs.classList.add('hidden');
                if (inspectorBtn) inspectorBtn.classList.add('hidden');
                if (cloudHistoryBtn) cloudHistoryBtn.classList.add('hidden');
                if (statusBadge) statusBadge.classList.add('hidden');
            }
        }

        function renderAuthUI() {
            const user = AppStore.state.authUser;
            const label = document.getElementById('authUserLabel');
            const loginBtn = document.getElementById('btnLoginGoogle');
            const logoutBtn = document.getElementById('btnKeluarGoogle');
            const badge = document.getElementById('authStatusBadge');

            if (!label || !loginBtn || !logoutBtn || !badge) return;

            if (!isSupabaseConfigured()) {
                label.innerText = 'Supabase belum siap';
                badge.className = 'hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-semibold text-amber-400';
                loginBtn.classList.add('hidden');
                logoutBtn.classList.add('hidden');
                return;
            }

            if (user) {
                const displayName = user.user_metadata?.full_name || user.email || 'User aktif';
                const allowed = isEmailAllowed(user.email);
                label.innerText = allowed ? displayName : `No Access: ${user.email || 'Unknown'}`;
                badge.className = allowed
                    ? 'hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-semibold text-emerald-400 max-w-[240px] truncate'
                    : 'hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-[10px] font-semibold text-rose-400 max-w-[240px] truncate';
                loginBtn.classList.add('hidden');
                logoutBtn.classList.remove('hidden');
            } else {
                label.innerText = 'Login Required';
                badge.className = 'hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-slate-500/10 border border-slate-700 text-[10px] font-semibold text-slate-400';
                loginBtn.classList.remove('hidden');
                logoutBtn.classList.add('hidden');
            }
        }

        async function initSupabaseAuth() {
            renderAuthUI();
            renderPrivateBetaGate();
            if (!isSupabaseConfigured()) {
                console.warn('Supabase env belum lengkap. Login Google dinonaktifkan sementara.');
                return;
            }

            try {
                const { data, error } = await supabase.auth.getSession();
                if (error) {
                    console.warn('Gagal membaca session Supabase:', error.message);
                }
                AppStore.setState({
                    authSession: data?.session || null,
                    authUser: data?.session?.user || null
                });
                renderAuthUI();
                renderPrivateBetaGate();
            } catch (err) {
                console.warn('Auth init Supabase gagal:', err);
                AppStore.setState({ authSession: null, authUser: null });
                renderAuthUI();
                renderPrivateBetaGate();
            }

            supabase.auth.onAuthStateChange((_event, session) => {
                AppStore.setState({
                    authSession: session || null,
                    authUser: session?.user || null
                });
                renderAuthUI();
                renderPrivateBetaGate();
            });
        }

        async function signInWithGoogle() {
            if (!isSupabaseConfigured()) {
                showToast('Supabase belum dikonfigurasi di Vercel ENV.', 'error');
                return;
            }
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin
                }
            });
            if (error) {
                console.error('Login Google gagal:', error);
                showToast('Login Google gagal. Cek Supabase Google Provider.', 'error');
            }
        }

        async function signOutGoogle() {
            try {
                const { error } = await supabase.auth.signOut();
                if (error) throw error;
                AppStore.setState({ authSession: null, authUser: null });
                renderAuthUI();
                renderPrivateBetaGate();
                showToast('Berhasil logout dari Google.', 'success');
            } catch (err) {
                console.error('Keluar gagal:', err);
                showToast('Keluar gagal.', 'error');
            }
        }

        function cleanProjectTitlePart(value: any): string {
            return String(value || '')
                .replace(/[#*_`~|<>\[\]{}]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
        }

        function toTitleCase(value: string): string {
            const keepUpper = new Set(['AI', 'CGI', '3D', '2D', 'ASMR', 'TTS', 'POV', 'KOL']);
            return value
                .split(' ')
                .filter(Boolean)
                .map((word) => {
                    const upper = word.toUpperCase();
                    if (keepUpper.has(upper)) return upper;
                    if (word.length <= 3 && upper === word) return word;
                    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
                })
                .join(' ');
        }

        function getSelectedAnimationStyleLabel(): string {
            const customStyle = (document.getElementById('customStyleInput') as HTMLInputElement | null)?.value?.trim();
            const select = document.getElementById('animationStyle') as HTMLSelectElement | null;
            const selected = select?.value || '';
            if (selected === 'Gaya Kustom' && customStyle) return customStyle;
            return selected || '';
        }

        function generateSmartProjectTitle(storyboardData: any, theme: string): string {
            const aiTitle = cleanProjectTitlePart(storyboardData?.youtube_title || storyboardData?.title || '');
            const topicRaw = cleanProjectTitlePart(theme || aiTitle || 'Untitled Project');
            const animationStyle = cleanProjectTitlePart(getSelectedAnimationStyleLabel());

            const shortTopic = topicRaw
                .replace(/^(bahas|membahas|tentang|animasi tentang|buat|bikin|konten tentang)\s+/i, '')
                .split(/[.!?\n]/)[0]
                .slice(0, 54)
                .trim();

            const styleToken = animationStyle
                .replace(/Animation|Style|Gaya|Animasi/gi, '')
                .replace(/\(.+?\)/g, '')
                .trim()
                .split(' ')
                .slice(0, 2)
                .join(' ');

            let title = '';
            if (aiTitle && aiTitle.length <= 70 && !/^Project Storyboard/i.test(aiTitle)) {
                title = aiTitle;
            } else {
                title = [shortTopic || 'Untitled Project', styleToken || 'Storyboard']
                    .filter(Boolean)
                    .join(' - ');
            }

            return toTitleCase(title).slice(0, 80).trim() || 'Untitled Project';
        }

        function setCloudSaveStatus(status: 'hidden' | 'unsaved' | 'saving' | 'saved' | 'updated' | 'guest' | 'error', customText?: string) {
            const badge = document.getElementById('cloudSaveStatus');
            if (!badge) return;

            const styles: Record<string, string> = {
                hidden: 'hidden px-2.5 py-1 rounded-xl text-[10px] font-bold border bg-slate-900/70 text-slate-500 border-slate-800',
                unsaved: 'px-2.5 py-1 rounded-xl text-[10px] font-bold border bg-amber-500/10 text-amber-300 border-amber-500/20',
                saving: 'px-2.5 py-1 rounded-xl text-[10px] font-bold border bg-sky-500/10 text-sky-300 border-sky-500/20 animate-pulse',
                saved: 'px-2.5 py-1 rounded-xl text-[10px] font-bold border bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
                updated: 'px-2.5 py-1 rounded-xl text-[10px] font-bold border bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
                guest: 'px-2.5 py-1 rounded-xl text-[10px] font-bold border bg-slate-500/10 text-slate-400 border-slate-700',
                error: 'px-2.5 py-1 rounded-xl text-[10px] font-bold border bg-rose-500/10 text-rose-300 border-rose-500/20'
            };

            const labels: Record<string, string> = {
                hidden: '',
                unsaved: 'Unsaved',
                saving: 'Saving...',
                saved: 'Saved',
                updated: 'Updated',
                guest: 'Guest Draft',
                error: 'Save Failed'
            };

            badge.className = styles[status] || styles.unsaved;
            badge.textContent = customText || labels[status] || 'Unsaved';
        }


        function getSceneVisualPrompts(scene: any) {
            let imagePrompt = scene?.imagePrompt || "";
            let videoPrompt = scene?.videoPrompt || scene?.camera_movement || "";

            if (!imagePrompt && scene?.visual_prompt_details) {
                const p = scene.visual_prompt_details;
                imagePrompt = [
                    p.scene_description ? `Scene: ${p.scene_description}.` : '',
                    p.main_character_action ? `Main Subject: ${p.main_character_action}.` : '',
                    p.secondary_character_action ? `Supporting Activity: ${p.secondary_character_action}.` : '',
                    p.environment_motion ? `Environment Activity: ${p.environment_motion}.` : '',
                    p.lighting ? `Lighting: ${p.lighting}.` : '',
                    p.atmosphere ? `Mood: ${p.atmosphere}.` : '',
                ].filter(Boolean).join(' ');
            } else if (!imagePrompt) {
                imagePrompt = scene?.text_to_image || "";
            }

            return { imagePrompt, videoPrompt };
        }

        function safeFilename(value: string) {
            return cleanProjectTitlePart(value || 'k-creator-project')
                .replace(/[^a-z0-9\-\s_]/gi, '')
                .replace(/\s+/g, '-')
                .slice(0, 70)
                .toLowerCase() || 'k-creator-project';
        }

        function downloadTextFile(filename: string, content: string, mimeType = 'text/plain;charset=utf-8') {
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }

        function buildExportText(storyboardData: any) {
            const theme = (document.getElementById('themeInput') as HTMLTextAreaElement | null)?.value?.trim() || '';
            const title = generateSmartProjectTitle(storyboardData, theme);
            const scenes = Array.isArray(storyboardData?.scenes) ? storyboardData.scenes : [];

            const lines: string[] = [];
            lines.push(`K CREATOR SUITE PRO - EXPORT`);
            lines.push(`Title: ${title}`);
            lines.push(`Exported: ${new Date().toLocaleString('id-ID')}`);
            if (theme) lines.push(`Theme: ${theme}`);
            lines.push('');
            lines.push('==============================');
            lines.push('SOCIAL PACKAGE');
            lines.push('==============================');
            lines.push(`Video File Name:\n${storyboardData?.video_name || generateSafeVideoFileName(storyboardData, theme)}`);
            lines.push('');
            lines.push(`YouTube Title:\n${storyboardData?.youtube_title || '-'}`);
            lines.push('');
            lines.push(`YouTube Description:\n${storyboardData?.youtube_description || '-'}`);
            lines.push('');
            lines.push(`TikTok Caption:\n${storyboardData?.tiktok_caption || '-'}`);
            lines.push('');
            lines.push(`Instagram Caption:\n${storyboardData?.instagram_caption || '-'}`);
            lines.push('');
            lines.push(`Hashtags:\n${storyboardData?.viral_hashtags || '-'}`);
            lines.push('');
            lines.push(`Thumbnail Prompt:\n${storyboardData?.thumbnail_prompt || '-'}`);
            lines.push('');
            lines.push('==============================');
            lines.push('SCENES');
            lines.push('==============================');

            scenes.forEach((scene: any, index: number) => {
                const { imagePrompt, videoPrompt } = getSceneVisualPrompts(scene);
                lines.push('');
                lines.push(`SCENE ${scene?.scene_number || index + 1} (${scene?.estimated_duration || 8}s)`);
                lines.push('------------------------------');
                lines.push(`[SCENE DESCRIPTION]\n${scene?.scene_description || '-'}`);
                lines.push('');
                lines.push(`[TTS / NARRATION]\n${scene?.narrator_script || '-'}`);
                lines.push('');
                lines.push(`[TEXT TO IMAGE PROMPT]\n${imagePrompt || '-'}`);
                lines.push('');
                lines.push(`[IMAGE TO VIDEO PROMPT]\n${videoPrompt || '-'}`);
            });

            return { title, text: lines.join('\n') };
        }

        function buildScenePackageText(scene: any, index: number) {
            const { imagePrompt, videoPrompt } = getSceneVisualPrompts(scene);
            const sceneNumber = scene?.scene_number || index + 1;
            const duration = scene?.estimated_duration || 8;
            const lines: string[] = [];
            lines.push(`SCENE ${sceneNumber} - COMPLETE PACKAGE`);
            lines.push(`Duration: ${duration}s`);
            lines.push('');
            lines.push('[SCENE DESCRIPTION]');
            lines.push(scene?.scene_description || '-');
            lines.push('');
            lines.push('[TTS / NARRATION SCRIPT]');
            lines.push(scene?.narrator_script || '-');
            lines.push('');
            lines.push('[TEXT TO IMAGE PROMPT]');
            lines.push(imagePrompt || '-');
            lines.push('');
            lines.push('[IMAGE TO VIDEO PROMPT]');
            lines.push(videoPrompt || '-');
            return lines.join('\n');
        }


        function buildFullStoryboardPackageText(storyboardData: any) {
            const theme = (document.getElementById('themeInput') as HTMLTextAreaElement | null)?.value?.trim() || '';
            const title = generateSmartProjectTitle(storyboardData, theme);
            const scenes = Array.isArray(storyboardData?.scenes) ? storyboardData.scenes : [];
            const lines: string[] = [];
            lines.push(`PROJECT TITLE: ${title}`);
            if (theme) lines.push(`PROJECT THEME: ${theme}`);
            lines.push(`EXPORTED FROM: K Creator Suite Pro`);
            lines.push(`EXPORTED AT: ${new Date().toLocaleString('id-ID')}`);
            lines.push('');
            lines.push(`VIDEO FILE NAME: ${storyboardData?.video_name || generateSafeVideoFileName(storyboardData, theme)}`);
            lines.push('');
            lines.push(`YOUTUBE TITLE: ${storyboardData?.youtube_title || '-'}`);
            lines.push('');
            lines.push('YOUTUBE DESCRIPTION:');
            lines.push(storyboardData?.youtube_description || '-');
            lines.push('');
            lines.push('TIKTOK CAPTION:');
            lines.push(storyboardData?.tiktok_caption || '-');
            lines.push('');
            lines.push('INSTAGRAM CAPTION:');
            lines.push(storyboardData?.instagram_caption || '-');
            lines.push('');
            lines.push('VIRAL HASHTAGS:');
            lines.push(storyboardData?.viral_hashtags || '-');
            lines.push('');
            lines.push('THUMBNAIL PROMPT:');
            lines.push(storyboardData?.thumbnail_prompt || '-');
            lines.push('');
            lines.push('==============================');
            lines.push('FULL SCENE PACKAGES');
            lines.push('==============================');
            scenes.forEach((scene: any, index: number) => {
                lines.push('');
                lines.push(buildScenePackageText(scene, index));
                if (index < scenes.length - 1) {
                    lines.push('');
                    lines.push('------------------------------');
                }
            });
            return lines.join('\n');
        }

        function buildAllNarrationText(storyboardData: any) {
            const scenes = Array.isArray(storyboardData?.scenes) ? storyboardData.scenes : [];
            const lines: string[] = [];
            scenes.forEach((scene: any, index: number) => {
                const sceneNumber = scene?.scene_number || index + 1;
                lines.push(`SCENE ${sceneNumber}`);
                lines.push(scene?.narrator_script || '-');
                if (index < scenes.length - 1) lines.push('');
            });
            return lines.join('\n');
        }

        function buildAllImagePromptsText(storyboardData: any) {
            const scenes = Array.isArray(storyboardData?.scenes) ? storyboardData.scenes : [];
            const lines: string[] = [];
            scenes.forEach((scene: any, index: number) => {
                const sceneNumber = scene?.scene_number || index + 1;
                const { imagePrompt } = getSceneVisualPrompts(scene);
                lines.push(`SCENE ${sceneNumber}`);
                lines.push(imagePrompt || '-');
                if (index < scenes.length - 1) {
                    lines.push('');
                    lines.push('---');
                    lines.push('');
                }
            });
            return lines.join('\n');
        }

        function buildAllVideoPromptsText(storyboardData: any) {
            const scenes = Array.isArray(storyboardData?.scenes) ? storyboardData.scenes : [];
            const lines: string[] = [];
            scenes.forEach((scene: any, index: number) => {
                const sceneNumber = scene?.scene_number || index + 1;
                const { videoPrompt } = getSceneVisualPrompts(scene);
                lines.push(`SCENE ${sceneNumber}`);
                lines.push(videoPrompt || '-');
                if (index < scenes.length - 1) {
                    lines.push('');
                    lines.push('---');
                    lines.push('');
                }
            });
            return lines.join('\n');
        }

        async function copyTextToClipboard(text: string, successMessage: string) {
            try {
                if (!text || !text.trim()) {
                    showToast('Tidak ada teks untuk disalin.', 'warning');
                    return;
                }
                await navigator.clipboard.writeText(text);
                showToast(successMessage, 'success');
            } catch (error) {
                console.error('Clipboard copy failed:', error);
                showToast('Gagal menyalin ke clipboard. Coba lagi.', 'error');
            }
        }

        function copyActiveStoryboardBulk(type: 'full' | 'narration' | 'image' | 'video') {
            const storyboardData = AppStore.state.activeStoryboardData;
            if (!storyboardData || !Array.isArray(storyboardData.scenes) || storyboardData.scenes.length === 0) {
                showToast('Belum ada storyboard aktif untuk disalin.', 'warning');
                return;
            }

            if (type === 'full') {
                copyTextToClipboard(buildFullStoryboardPackageText(storyboardData), 'Full Storyboard Package berhasil disalin!');
                return;
            }
            if (type === 'narration') {
                copyTextToClipboard(buildAllNarrationText(storyboardData), 'Semua narasi berhasil disalin!');
                return;
            }
            if (type === 'image') {
                copyTextToClipboard(buildAllImagePromptsText(storyboardData), 'Semua Text-to-Image prompt berhasil disalin!');
                return;
            }
            if (type === 'video') {
                copyTextToClipboard(buildAllVideoPromptsText(storyboardData), 'Semua Image-to-Video prompt berhasil disalin!');
            }
        }

        function buildNarrationOnlyRewriteTheme(storyboardData: any, mode: 'rewrite' | 'shorten') {
            const scenes = Array.isArray(storyboardData?.scenes) ? storyboardData.scenes : [];
            const outputLanguage = getStoryboardOutputLanguage();
            const languageInstruction = outputLanguage === 'en'
                ? 'All rewritten narration must be in English.'
                : 'All rewritten narration must be in Bahasa Indonesia, natural, conversational, and easy for Indonesian TTS.';
            const sceneBrief = scenes.map((scene: any, index: number) => {
                const duration = Number(scene?.estimated_duration || (document.getElementById('sceneDuration') as HTMLInputElement | null)?.value || 8);
                const budget = getNarrationWordBudget(duration);
                return [
                    `SCENE ${scene?.scene_number || index + 1}`,
                    `Duration: ${duration}s`,
                    `Target narration length: ${budget.min}-${budget.max} words`,
                    `Scene description: ${scene?.scene_description || '-'}`,
                    `Current narration: ${scene?.narrator_script || '-'}`
                ].join('\n');
            }).join('\n\n---\n\n');

            return `REWRITE ONLY THE NARRATION SCRIPTS for this existing storyboard. Keep every scene meaning, visual logic, character continuity, and pacing. Do not change visual prompts unless required by schema.\n\nMODE: ${mode === 'shorten' ? 'SHORTEN existing narration aggressively to fit duration' : 'REGENERATE all narration to sound better and fit duration'}\n\nLANGUAGE RULE:\n${languageInstruction}\n\nSTRICT DURATION RULE:\n- Narration must realistically fit each selected scene duration for spoken TTS.\n- 5 seconds = 8-12 words.\n- 8 seconds = 14-20 words.\n- 10 seconds = 20-28 words.\n- 12 seconds = 28-35 words.\n- Avoid long clauses, stacked commas, and over-explaining.\n- Keep it punchy, clear, and natural for Shorts/Reels/TikTok narration.\n\nEXISTING STORYBOARD CONTEXT:\nYouTube title: ${storyboardData?.youtube_title || '-'}\nVideo name: ${storyboardData?.video_name || '-'}\nThumbnail text: ${storyboardData?.thumbnail_text || '-'}\n\nSCENES TO REWRITE:\n${sceneBrief}\n\nReturn the full valid storyboard JSON schema required by the app, but the important updated fields are scenes[].narrator_script. Preserve scene count and scene_number. Do not add extra scenes.`;
        }

        async function regenerateAllNarrationsOnly(mode: 'rewrite' | 'shorten' = 'rewrite') {
            if (!ensurePrivateBetaAccess(true)) return;
            const storyboardData = AppStore.state.activeStoryboardData;
            if (!storyboardData || !Array.isArray(storyboardData.scenes) || storyboardData.scenes.length === 0) {
                showToast('Belum ada storyboard aktif untuk generate narasi.', 'warning');
                return;
            }

            const btnId = mode === 'shorten' ? 'btnShortenAllNarration' : 'btnGenerateAllNarrationOnly';
            const btn = document.getElementById(btnId) as HTMLButtonElement | null;
            const originalText = btn?.innerHTML || (mode === 'shorten' ? '⏱️ Shorten All Narration' : '✂️ Generate All Narration Only');

            try {
                if (btn) {
                    btn.disabled = true;
                    btn.innerHTML = '⏳ Processing narration...';
                }
                updateGlobalStatus(mode === 'shorten' ? 'Shortening Narration' : 'Regenerating Narration', 'amber');
                clearGenerationFeedback();

                const theme = buildNarrationOnlyRewriteTheme(storyboardData, mode);
                const sceneCount = String(storyboardData.scenes.length || 5);
                const sceneDuration = String(storyboardData.scenes[0]?.estimated_duration || (document.getElementById('sceneDuration') as HTMLInputElement | null)?.value || 8);
                const result = await GeminiService.generateStoryboard(
                    theme,
                    (document.getElementById('narratorStyle') as HTMLSelectElement | null)?.value || 'narator_dokumenter',
                    (document.getElementById('animationStyle') as HTMLSelectElement | null)?.value || 'Claymation Animation',
                    'Rewrite narration only. Preserve visuals and scene count.',
                    false,
                    AppStore.state.activeRatio,
                    'manual',
                    sceneCount,
                    sceneDuration,
                    AppStore.state.globalApiKey,
                    getStoryboardOutputLanguage(),
                    getCharacterConsistencyMode()
                );

                if (!result.success) {
                    const errorMessage = result.error || 'Generate narasi gagal.';
                    showToast(errorMessage, 'error');
                    showGenerationFeedback(errorMessage, 'regenerate');
                    return;
                }

                const nextScenes = Array.isArray(result.data?.scenes) ? result.data.scenes : [];
                if (nextScenes.length === 0) {
                    showToast('AI belum mengembalikan narasi yang bisa dipakai.', 'warning');
                    return;
                }

                const cloned = JSON.parse(JSON.stringify(storyboardData));
                cloned.scenes = cloned.scenes.map((scene: any, index: number) => {
                    const next = nextScenes[index] || {};
                    return {
                        ...scene,
                        narrator_script: next.narrator_script || scene.narrator_script || '',
                        estimated_duration: scene.estimated_duration || next.estimated_duration || sceneDuration
                    };
                });
                cloned.narration_last_updated_at = new Date().toISOString();

                AppStore.setState({ activeStoryboardData: cloned });
                Views.renderStoryboard(cloned, AppStore.state.activeRatio);
                markActiveStoryboardDirty(mode === 'shorten' ? 'All narration shortened' : 'All narration regenerated');
                setCloudSaveStatus('unsaved', 'Narration Updated');
                showToast(mode === 'shorten' ? 'Semua narasi berhasil dipendekkan.' : 'Semua narasi berhasil di-generate ulang.', 'success');
            } catch (err: any) {
                console.error('Regenerate all narration failed:', err);
                const errorMessage = err?.message || 'Generate semua narasi gagal.';
                showToast(errorMessage, 'error');
                showGenerationFeedback(errorMessage, 'regenerate');
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = originalText;
                }
                updateGlobalStatus('Director Studio Active', 'indigo');
            }
        }


        function exportActiveProjectAsTxt() {
            const storyboardData = AppStore.state.activeStoryboardData;
            if (!storyboardData) {
                showToast('Belum ada storyboard aktif untuk diexport.', 'warning');
                return;
            }
            const { title, text } = buildExportText(storyboardData);
            downloadTextFile(`${safeFilename(title)}.txt`, text);
            showToast('Project berhasil diexport ke TXT.', 'success');
        }

        function exportActiveProjectAsJson() {
            const storyboardData = AppStore.state.activeStoryboardData;
            if (!storyboardData) {
                showToast('Belum ada storyboard aktif untuk diexport.', 'warning');
                return;
            }
            const theme = (document.getElementById('themeInput') as HTMLTextAreaElement | null)?.value?.trim() || '';
            const title = generateSmartProjectTitle(storyboardData, theme);
            const payload = {
                title,
                theme,
                ratio: AppStore.state.activeRatio,
                activeCloudProjectId: AppStore.state.activeCloudProjectId,
                exported_at: new Date().toISOString(),
                storyboard: storyboardData
            };
            downloadTextFile(`${safeFilename(title)}.json`, JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
            showToast('Project berhasil diexport ke JSON.', 'success');
        }


        function getSceneHistoryKey(index: number) {
            const scene = AppStore.state.activeStoryboardData?.scenes?.[index];
            return String(scene?.scene_number || index + 1);
        }

        function getSceneVersionCount(index: number) {
            const key = getSceneHistoryKey(index);
            return (AppStore.state.sceneVersionHistory?.[key] || []).length;
        }

        function pushSceneVersionSnapshot(index: number, reason = 'Before edit') {
            const storyboardData = AppStore.state.activeStoryboardData;
            const scene = storyboardData?.scenes?.[index];
            if (!scene) return;
            const key = getSceneHistoryKey(index);
            const history = { ...(AppStore.state.sceneVersionHistory || {}) };
            const stack = Array.isArray(history[key]) ? [...history[key]] : [];
            stack.unshift({
                id: generateSecureId(),
                reason,
                saved_at: new Date().toISOString(),
                scene: JSON.parse(JSON.stringify(scene))
            });
            history[key] = stack.slice(0, 8);
            AppStore.setState({ sceneVersionHistory: history });
        }

        function undoLastSceneVersion(index: number) {
            const storyboardData = AppStore.state.activeStoryboardData;
            if (!storyboardData || !Array.isArray(storyboardData.scenes) || !storyboardData.scenes[index]) {
                showToast('Scene tidak ditemukan untuk undo.', 'error');
                return;
            }

            const key = getSceneHistoryKey(index);
            const history = { ...(AppStore.state.sceneVersionHistory || {}) };
            const stack = Array.isArray(history[key]) ? [...history[key]] : [];
            const previous = stack.shift();
            if (!previous?.scene) {
                showToast('Belum ada versi sebelumnya untuk scene ini.', 'warning');
                return;
            }

            const cloned = JSON.parse(JSON.stringify(storyboardData));
            cloned.scenes[index] = {
                ...previous.scene,
                scene_number: previous.scene.scene_number || cloned.scenes[index].scene_number || index + 1
            };
            history[key] = stack;
            AppStore.setState({ activeStoryboardData: cloned, sceneVersionHistory: history });
            Views.renderStoryboard(cloned, AppStore.state.activeRatio);
            markActiveStoryboardDirty('Undo');
            showToast(`Scene ${cloned.scenes[index].scene_number || index + 1} dikembalikan ke versi sebelumnya.`, 'success');
        }

        function clearSceneVersionHistory(index: number) {
            const key = getSceneHistoryKey(index);
            const history = { ...(AppStore.state.sceneVersionHistory || {}) };
            history[key] = [];
            AppStore.setState({ sceneVersionHistory: history });
            Views.renderStoryboard(AppStore.state.activeStoryboardData, AppStore.state.activeRatio);
            showToast('Version history scene dibersihkan.', 'success');
        }

        function markActiveStoryboardDirty(label = 'Edited') {
            const user = AppStore.state.authUser;
            setCloudSaveStatus(user?.id ? 'unsaved' : 'guest', user?.id ? label : 'Guest Draft');
        }

        function getSceneEditValue(id: string) {
            const el = document.getElementById(id) as HTMLTextAreaElement | HTMLInputElement | null;
            return el ? el.value.trim() : '';
        }

        function updateSceneAtIndex(index: number, updates: any, successMessage = 'Scene berhasil diperbarui.') {
            const storyboardData = AppStore.state.activeStoryboardData;
            if (!storyboardData || !Array.isArray(storyboardData.scenes) || !storyboardData.scenes[index]) {
                showToast('Scene tidak ditemukan.', 'error');
                return false;
            }

            const cloned = JSON.parse(JSON.stringify(storyboardData));
            cloned.scenes[index] = {
                ...cloned.scenes[index],
                ...updates,
                scene_number: cloned.scenes[index].scene_number || index + 1,
                estimated_duration: updates.estimated_duration || cloned.scenes[index].estimated_duration || 8
            };

            AppStore.setState({ activeStoryboardData: cloned });
            Views.renderStoryboard(cloned, AppStore.state.activeRatio);
            markActiveStoryboardDirty('Edited');
            showToast(successMessage, 'success');
            return true;
        }

        function saveSceneManualEdits(index: number) {
            const scene = AppStore.state.activeStoryboardData?.scenes?.[index];
            if (!scene) {
                showToast('Scene tidak ditemukan.', 'error');
                return;
            }

            const sceneNumber = scene.scene_number || index + 1;
            updateSceneAtIndex(index, {
                scene_description: getSceneEditValue(`editSceneDescription_${index}`) || scene.scene_description || '',
                narrator_script: getSceneEditValue(`editNarration_${index}`) || scene.narrator_script || '',
                imagePrompt: getSceneEditValue(`editImagePrompt_${index}`) || scene.imagePrompt || scene.text_to_image || '',
                videoPrompt: getSceneEditValue(`editVideoPrompt_${index}`) || scene.videoPrompt || scene.camera_movement || '',
                camera_movement: getSceneEditValue(`editVideoPrompt_${index}`) || scene.camera_movement || '',
                estimated_duration: parseInt(getSceneEditValue(`editDuration_${index}`), 10) || scene.estimated_duration || 8
            }, `Scene ${sceneNumber} berhasil diedit. Klik Save / Update Cloud untuk simpan permanen.`);
        }


        function resequenceStoryboardScenes(storyboardData: any) {
            if (!storyboardData || !Array.isArray(storyboardData.scenes)) return storyboardData;
            storyboardData.scenes = storyboardData.scenes.map((scene: any, idx: number) => ({
                ...scene,
                scene_number: idx + 1
            }));
            return storyboardData;
        }

        function createDraftScene(afterIndex: number) {
            const storyboardData = AppStore.state.activeStoryboardData || {};
            const scenes = Array.isArray(storyboardData.scenes) ? storyboardData.scenes : [];
            const reference = scenes[afterIndex] || scenes[scenes.length - 1] || {};
            const nextNumber = Math.max(1, afterIndex + 2);
            const duration = reference.estimated_duration || parseInt((document.getElementById('sceneDuration') as HTMLInputElement | null)?.value || '8', 10) || 8;
            const lang = getStoryboardOutputLanguage();
            const isIndonesian = lang === 'id';

            return {
                scene_number: nextNumber,
                scene_description: isIndonesian
                    ? `Draft scene baru ${nextNumber}. Tulis atau regenerate adegan ini agar sesuai alur cerita.`
                    : `New draft scene ${nextNumber}. Edit or regenerate this scene to fit the story flow.`,
                narrator_script: isIndonesian
                    ? `Narasi draft untuk scene ${nextNumber}. Silakan edit atau gunakan Regenerate Full Scene.`
                    : `Draft narration for scene ${nextNumber}. Edit it or use Regenerate Full Scene.`,
                imagePrompt: isIndonesian
                    ? `Prompt gambar draft untuk scene ${nextNumber}, mengikuti gaya visual project aktif, komposisi vertikal sinematik, detail karakter dan lingkungan jelas.`
                    : `Draft text-to-image prompt for scene ${nextNumber}, matching the active project visual style, cinematic vertical composition, clear character and environment details.`,
                videoPrompt: isIndonesian
                    ? `[CHARACTER MOTION] Gerakan karakter utama dibuat jelas dan sederhana. [EMOTIONAL PERFORMANCE] Ekspresi mengikuti emosi scene. [SECONDARY CHARACTER MOTION] Elemen pendukung bergerak natural. [BACKGROUND MOTION] Latar bergerak halus. [ENVIRONMENT MOTION] Atmosfer lingkungan terasa hidup. [ATMOSPHERE] Mood mengikuti alur cerita. [CAMERA] Kamera bergerak sederhana dan aman untuk AI video. [CINEMATIC DETAILS] Detail sinematik, depth of field, lighting terarah. [VISUAL HOOK] Hook visual kuat dalam 1 detik pertama.`
                    : `[CHARACTER MOTION] The main character movement is clear and simple. [EMOTIONAL PERFORMANCE] Expression matches the scene emotion. [SECONDARY CHARACTER MOTION] Supporting elements move naturally. [BACKGROUND MOTION] Background moves subtly. [ENVIRONMENT MOTION] The environment feels alive. [ATMOSPHERE] Mood follows the story flow. [CAMERA] Simple AI-video-safe camera movement. [CINEMATIC DETAILS] Cinematic detail, depth of field, directed lighting. [VISUAL HOOK] Strong visual hook in the first second.`,
                camera_movement: `[CAMERA] Simple AI-video-safe camera movement.`,
                estimated_duration: duration,
                visual_prompt_details: {
                    scene_description: reference.scene_description || '',
                    main_character_action: '',
                    secondary_character_action: '',
                    environment_motion: '',
                    camera_movement: '',
                    lighting: '',
                    atmosphere: '',
                    technical_notes: 'Draft scene created manually from Scene Tools.'
                }
            };
        }

        function duplicateSceneAtIndex(index: number) {
            const storyboardData = AppStore.state.activeStoryboardData;
            if (!storyboardData || !Array.isArray(storyboardData.scenes) || !storyboardData.scenes[index]) {
                showToast('Scene tidak ditemukan untuk duplicate.', 'error');
                return;
            }
            const cloned = JSON.parse(JSON.stringify(storyboardData));
            const copiedScene = JSON.parse(JSON.stringify(cloned.scenes[index]));
            copiedScene.scene_description = `${copiedScene.scene_description || ''}${copiedScene.scene_description ? ' ' : ''}(Duplicated draft)`;
            cloned.scenes.splice(index + 1, 0, copiedScene);
            resequenceStoryboardScenes(cloned);
            AppStore.setState({ activeStoryboardData: cloned, sceneVersionHistory: {} });
            Views.renderStoryboard(cloned, AppStore.state.activeRatio);
            markActiveStoryboardDirty('Scene duplicated');
            showToast(`Scene ${index + 1} berhasil diduplikasi.`, 'success');
        }

        function addDraftSceneAfterIndex(index: number) {
            const storyboardData = AppStore.state.activeStoryboardData;
            if (!storyboardData || !Array.isArray(storyboardData.scenes)) {
                showToast('Belum ada storyboard aktif untuk tambah scene.', 'error');
                return;
            }
            const cloned = JSON.parse(JSON.stringify(storyboardData));
            const safeIndex = Math.max(0, Math.min(index, cloned.scenes.length - 1));
            cloned.scenes.splice(safeIndex + 1, 0, createDraftScene(safeIndex));
            resequenceStoryboardScenes(cloned);
            AppStore.setState({ activeStoryboardData: cloned, sceneVersionHistory: {} });
            Views.renderStoryboard(cloned, AppStore.state.activeRatio);
            markActiveStoryboardDirty('Scene added');
            showToast('Draft scene baru ditambahkan. Edit atau klik Regenerate Full Scene.', 'success');
        }

        function deleteSceneAtIndex(index: number) {
            const storyboardData = AppStore.state.activeStoryboardData;
            if (!storyboardData || !Array.isArray(storyboardData.scenes) || !storyboardData.scenes[index]) {
                showToast('Scene tidak ditemukan untuk dihapus.', 'error');
                return;
            }
            if (storyboardData.scenes.length <= 1) {
                showToast('Minimal harus ada 1 scene.', 'warning');
                return;
            }
            const cloned = JSON.parse(JSON.stringify(storyboardData));
            const sceneNumber = cloned.scenes[index].scene_number || index + 1;
            cloned.scenes.splice(index, 1);
            resequenceStoryboardScenes(cloned);
            AppStore.setState({ activeStoryboardData: cloned, sceneVersionHistory: {} });
            Views.renderStoryboard(cloned, AppStore.state.activeRatio);
            markActiveStoryboardDirty('Scene deleted');
            showToast(`Scene ${sceneNumber} dihapus. Klik Save / Update Cloud untuk simpan.`, 'success');
        }

        function buildSceneRegenerationTheme(scene: any, index: number, feedback: string) {
            const storyboardData = AppStore.state.activeStoryboardData || {};
            const theme = (document.getElementById('themeInput') as HTMLTextAreaElement | null)?.value?.trim() || storyboardData.youtube_title || 'Untitled project';
            const { imagePrompt, videoPrompt } = getSceneVisualPrompts(scene);
            const sceneNumber = scene?.scene_number || index + 1;
            const languageMode = getStoryboardOutputLanguage();
            const languageInstruction = getStoryboardOutputLanguageInstruction(languageMode);

            return `Regenerate ONLY ONE SCENE for an existing short-form video project. Do not create multiple scenes. The output must contain exactly 1 improved scene in the scenes array.\n\nPROJECT CONTEXT:\nTheme: ${theme}\nYouTube title: ${storyboardData.youtube_title || '-'}\nExisting project description: ${storyboardData.youtube_description || '-'}\n\nCURRENT SCENE ${sceneNumber}:\nScene description: ${scene?.scene_description || '-'}\nNarration: ${scene?.narrator_script || '-'}\nText-to-image prompt: ${imagePrompt || '-'}\nImage-to-video prompt: ${videoPrompt || '-'}\nDuration: ${scene?.estimated_duration || 8}s\n\nUSER FEEDBACK / ISSUE TO FIX:\n${feedback || 'Improve this scene so it feels more cinematic, clearer, and more reliable for AI video generation.'}\n\nREGENERATION RULES:\n- Keep it as Scene ${sceneNumber}.\n- Preserve the core story continuity.\n- Improve the weak part based on user feedback.\n- If the video prompt failed in Veo/Kling, rewrite it with clearer physical motion, simpler camera path, and stronger layer separation.\n- Avoid impossible motion, confusing camera instructions, and static slideshow wording.\n- Follow this language instruction exactly: ${languageInstruction}\n- The videoPrompt must use the bracketed layer format: [CHARACTER MOTION], [EMOTIONAL PERFORMANCE], [SECONDARY CHARACTER MOTION], [BACKGROUND MOTION], [ENVIRONMENT MOTION], [ATMOSPHERE], [CAMERA], [CINEMATIC DETAILS], [VISUAL HOOK].\n- Return one scene only.`;
        }

        async function regenerateSceneWithFeedback(index: number) {
            if (!ensurePrivateBetaAccess(true)) return;
            const storyboardData = AppStore.state.activeStoryboardData;
            const scene = storyboardData?.scenes?.[index];
            if (!scene) {
                showToast('Scene tidak ditemukan untuk regenerate.', 'error');
                return;
            }

            const feedback = getSceneEditValue(`regenFeedback_${index}`);
            if (!feedback) {
                showToast('Tulis komentar dulu, misalnya: prompt video gagal di Veo, gerakannya kurang jelas.', 'warning');
                return;
            }

            const btn = document.querySelector(`[data-action="regenerate-scene"][data-index="${index}"]`) as HTMLButtonElement | null;
            const originalText = btn?.innerHTML || '♻️ Regenerate Scene';
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '♻️ Regenerating...';
            }

            try {
                const narratorStyle = (document.getElementById('narratorStyle') as HTMLSelectElement | null)?.value || 'narator_dokumenter';
                let animStyle = (document.getElementById('animationStyle') as HTMLSelectElement | null)?.value || 'Claymation Animation';
                if (animStyle === 'Gaya Kustom') {
                    animStyle = (document.getElementById('customStyleInput') as HTMLInputElement | null)?.value?.trim() || 'Cinematic 2D';
                }
                const baseConstraints = (document.getElementById('constraintsInput') as HTMLTextAreaElement | null)?.value?.trim() || '';
                const sceneDuration = String(scene.estimated_duration || (document.getElementById('sceneDuration') as HTMLInputElement | null)?.value || 8);
                const regenTheme = buildSceneRegenerationTheme(scene, index, feedback);
                const regenConstraints = [
                    baseConstraints,
                    'Regenerate exactly one scene only. Keep JSON schema valid. This is a scene-level repair, not a full storyboard rewrite.',
                    `User repair note: ${feedback}`
                ].filter(Boolean).join('\n');

                showToast(`Regenerating Scene ${scene.scene_number || index + 1}...`, 'success');
                const result = await GeminiService.generateStoryboard(
                    regenTheme,
                    narratorStyle,
                    animStyle,
                    regenConstraints,
                    false,
                    AppStore.state.activeRatio,
                    'manual',
                    '1',
                    sceneDuration,
                    AppStore.state.globalApiKey,
                    getStoryboardOutputLanguage(),
                    getCharacterConsistencyMode()
                );

                if (!result.success) {
                    const errorMessage = result.error || 'Regenerate scene gagal.';
                    showToast(errorMessage, 'error');
                    showGenerationFeedback(errorMessage, 'regenerate');
                    return;
                }

                const replacement = result.data?.scenes?.[0];
                if (!replacement) {
                    const errorMessage = 'AI tidak mengembalikan scene pengganti yang valid.';
                    showToast(errorMessage, 'error');
                    showGenerationFeedback(errorMessage, 'regenerate');
                    return;
                }

                replacement.scene_number = scene.scene_number || index + 1;
                replacement.estimated_duration = replacement.estimated_duration || scene.estimated_duration || 8;
                updateSceneAtIndex(index, replacement, `Scene ${replacement.scene_number} berhasil di-regenerate. Review dulu sebelum Save / Update Cloud.`);
            } catch (err: any) {
                console.error('Regenerate scene failed:', err);
                const errorMessage = err?.message || 'Regenerate scene gagal.';
                showToast(errorMessage, 'error');
                showGenerationFeedback(errorMessage, 'regenerate');
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = originalText;
                }
            }
        }


        function getRegenPresetText(preset: string) {
            const presets: Record<string, string> = {
                veo_failed: 'Ini di Veo failed generate. Tolong perbaiki supaya instruksi video lebih sederhana, jelas, tidak kontradiktif, gerakan kamera tidak terlalu rumit, dan semua motion bisa dilakukan secara fisik.',
                kling_failed: 'Ini di Kling gagal atau hasilnya aneh. Tolong buat prompt video lebih stabil, motion lebih natural, objek tidak berubah bentuk, kamera lebih sederhana, dan durasi gerakan sesuai scene.',
                too_static: 'Scene ini terlalu statis. Tolong tambahkan motion kecil yang natural pada karakter, background, atmosphere, dan visual hook, tapi jangan terlalu ramai.',
                too_complex: 'Prompt ini terlalu kompleks. Tolong sederhanakan instruksi visual, kurangi gerakan kamera yang berlebihan, fokus pada satu aksi utama, dan buat lebih mudah dipahami AI video generator.',
                more_emotional: 'Tolong buat scene ini lebih emosional dan cinematic. Perkuat ekspresi karakter, mood, tension, lighting, dan visual hook tanpa mengubah inti cerita.',
                more_viral: 'Tolong buat scene ini lebih cocok untuk Shorts/Reels. Perkuat hook visual 1-2 detik pertama, buat lebih dramatis, jelas, dan mudah bikin penonton berhenti scroll.',
                image_not_match: 'Text-to-image prompt belum sesuai scene. Tolong perjelas karakter utama, pose, ekspresi, environment, lighting, composition, aspect ratio, dan style agar hasil gambar lebih konsisten.',
                tts_flat: 'Narasi TTS terasa datar. Tolong buat lebih natural, emosional, pendek, enak dibaca voice over, dan lebih cocok untuk konten Shorts Indonesia.'
            };
            return presets[preset] || '';
        }

        function applyRegenPreset(index: number, preset: string) {
            const feedbackEl = document.getElementById(`regenFeedback_${index}`) as HTMLTextAreaElement | null;
            if (!feedbackEl) {
                showToast('Box komentar regenerate tidak ditemukan.', 'error');
                return;
            }
            const presetText = getRegenPresetText(preset);
            if (!presetText) {
                showToast('Preset tidak ditemukan.', 'error');
                return;
            }
            const current = feedbackEl.value.trim();
            feedbackEl.value = current ? `${current}\n\n${presetText}` : presetText;
            feedbackEl.focus();
            showToast('Preset komentar ditambahkan. Pilih Fix field atau Regenerate Full Scene.', 'success');
        }


        function getStoryboardOutputLanguage() {
            return (document.getElementById('outputLanguage') as HTMLSelectElement | null)?.value || 'mixed';
        }

        function getCharacterConsistencyMode() {
            const toggle = document.getElementById('characterConsistencyToggle') as HTMLInputElement | null;
            return toggle ? toggle.checked : true;
        }

        function generateSafeVideoFileName(storyboardData: any, theme = '') {
            const raw = storyboardData?.video_name || storyboardData?.youtube_title || theme || 'k-creator-video';
            const cleaned = String(raw)
                .toLowerCase()
                .replace(/[^a-z0-9\s_-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .replace(/^[-_]+|[-_]+$/g, '')
                .slice(0, 70);
            return cleaned || 'k-creator-video';
        }

        function getStoryboardOutputLanguageLabel(language = getStoryboardOutputLanguage()) {
            const map: Record<string, string> = {
                mixed: 'Mixed Recommended',
                id: 'Bahasa Indonesia',
                en: 'English'
            };
            return map[language] || map.mixed;
        }

        function getStoryboardOutputLanguageInstruction(language = getStoryboardOutputLanguage()) {
            if (language === 'id') {
                return `OUTPUT LANGUAGE MODE: Bahasa Indonesia. Write all user-facing outputs in Bahasa Indonesia, including scene_description, narrator_script, youtube_title, captions, thumbnail_prompt, imagePrompt, and videoPrompt. Keep technical bracket labels for videoPrompt exactly as written in English, but the descriptive content after each bracket should be in Bahasa Indonesia.`;
            }
            if (language === 'en') {
                return `OUTPUT LANGUAGE MODE: English. Write all user-facing outputs in English, including scene_description, narrator_script, captions, thumbnail_prompt, imagePrompt, and videoPrompt.`;
            }
            return `OUTPUT LANGUAGE MODE: Mixed Recommended. Write scene_description and narrator_script in Bahasa Indonesia. Write technical visual prompts, thumbnail_prompt, imagePrompt, and videoPrompt in clear English for better compatibility with Veo, Kling, PixVerse, and image generators.`;
        }

        function getTargetedRegenLabel(target: string) {
            const map: Record<string, string> = {
                description: 'Scene Description',
                narration: 'TTS / Narration',
                image: 'Text-to-Image Prompt',
                video: 'Image-to-Video Prompt'
            };
            return map[target] || 'Selected Field';
        }

        function buildTargetedRegenerationTheme(scene: any, index: number, feedback: string, target: string) {
            const storyboardData = AppStore.state.activeStoryboardData || {};
            const theme = (document.getElementById('themeInput') as HTMLTextAreaElement | null)?.value?.trim() || storyboardData.youtube_title || 'Untitled project';
            const { imagePrompt, videoPrompt } = getSceneVisualPrompts(scene);
            const sceneNumber = scene?.scene_number || index + 1;
            const targetLabel = getTargetedRegenLabel(target);
            const languageMode = getStoryboardOutputLanguage();
            const languageInstruction = getStoryboardOutputLanguageInstruction(languageMode);

            const targetRules: Record<string, string> = {
                description: '- Rewrite ONLY the scene_description so it is clearer, more cinematic, and visually precise. Keep narration, image prompt, and video prompt consistent with the new description.',
                narration: '- Rewrite ONLY the narrator_script. Make it punchier for Shorts/Reels, emotional, and easy for TTS. Follow the selected output language mode.',
                image: '- Rewrite ONLY the imagePrompt. Make it clean, detailed, and compatible with the existing scene. Follow the selected output language mode.',
                video: '- Rewrite ONLY the videoPrompt. If Veo/Kling/PixVerse failed, make the motion clearer, simpler, physically possible, and less contradictory. Keep the bracketed layer format exactly.'
            };

            return `Regenerate a single field for ONE SCENE in an existing short-form video project. Return exactly 1 scene in the scenes array, but improve primarily this field: ${targetLabel}.

PROJECT CONTEXT:
Theme: ${theme}
YouTube title: ${storyboardData.youtube_title || '-'}
Existing project description: ${storyboardData.youtube_description || '-'}

CURRENT SCENE ${sceneNumber}:
Scene description: ${scene?.scene_description || '-'}
Narration: ${scene?.narrator_script || '-'}
Text-to-image prompt: ${imagePrompt || '-'}
Image-to-video prompt: ${videoPrompt || '-'}
Duration: ${scene?.estimated_duration || 8}s

USER FEEDBACK / ISSUE TO FIX:
${feedback || 'Improve the selected field while preserving the story continuity.'}

TARGET FIELD RULES:
${targetRules[target] || targetRules.video}

GENERAL RULES:
- Keep it as Scene ${sceneNumber}.
- Preserve story continuity with the previous and next scenes.
- Do not rewrite the whole storyboard.
- Follow this language instruction exactly: ${languageInstruction}
- The videoPrompt must use this bracketed layer format when present: [CHARACTER MOTION], [EMOTIONAL PERFORMANCE], [SECONDARY CHARACTER MOTION], [BACKGROUND MOTION], [ENVIRONMENT MOTION], [ATMOSPHERE], [CAMERA], [CINEMATIC DETAILS], [VISUAL HOOK].
- Return one scene only.`;
        }

        async function regenerateSceneFieldWithFeedback(index: number, target: string) {
            if (!ensurePrivateBetaAccess(true)) return;
            const storyboardData = AppStore.state.activeStoryboardData;
            const scene = storyboardData?.scenes?.[index];
            if (!scene) {
                showToast('Scene tidak ditemukan untuk regenerate field.', 'error');
                return;
            }

            const feedback = getSceneEditValue(`regenFeedback_${index}`);
            if (!feedback) {
                showToast('Tulis komentar dulu agar AI tahu bagian mana yang harus diperbaiki.', 'warning');
                return;
            }

            const btn = document.querySelector(`[data-action="regenerate-scene-field"][data-index="${index}"][data-target="${target}"]`) as HTMLButtonElement | null;
            const originalText = btn?.innerHTML || 'Regenerate Field';
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '♻️ Fixing...';
            }

            try {
                const narratorStyle = (document.getElementById('narratorStyle') as HTMLSelectElement | null)?.value || 'narator_dokumenter';
                let animStyle = (document.getElementById('animationStyle') as HTMLSelectElement | null)?.value || 'Claymation Animation';
                if (animStyle === 'Gaya Kustom') {
                    animStyle = (document.getElementById('customStyleInput') as HTMLInputElement | null)?.value?.trim() || 'Cinematic 2D';
                }
                const baseConstraints = (document.getElementById('constraintsInput') as HTMLTextAreaElement | null)?.value?.trim() || '';
                const sceneDuration = String(scene.estimated_duration || (document.getElementById('sceneDuration') as HTMLInputElement | null)?.value || 8);
                const regenTheme = buildTargetedRegenerationTheme(scene, index, feedback, target);
                const regenConstraints = [
                    baseConstraints,
                    `Targeted scene repair only. Improve primarily: ${getTargetedRegenLabel(target)}. Keep JSON schema valid.`,
                    `User repair note: ${feedback}`
                ].filter(Boolean).join('\n');

                showToast(`Regenerating ${getTargetedRegenLabel(target)} Scene ${scene.scene_number || index + 1}...`, 'success');
                const result = await GeminiService.generateStoryboard(
                    regenTheme,
                    narratorStyle,
                    animStyle,
                    regenConstraints,
                    false,
                    AppStore.state.activeRatio,
                    'manual',
                    '1',
                    sceneDuration,
                    AppStore.state.globalApiKey,
                    getStoryboardOutputLanguage(),
                    getCharacterConsistencyMode()
                );

                if (!result.success) {
                    const errorMessage = result.error || 'Regenerate field gagal.';
                    showToast(errorMessage, 'error');
                    showGenerationFeedback(errorMessage, 'regenerate');
                    return;
                }

                const replacement = result.data?.scenes?.[0];
                if (!replacement) {
                    const errorMessage = 'AI tidak mengembalikan field pengganti yang valid.';
                    showToast(errorMessage, 'error');
                    showGenerationFeedback(errorMessage, 'regenerate');
                    return;
                }

                const currentPrompts = getSceneVisualPrompts(scene);
                const nextPrompts = getSceneVisualPrompts(replacement);
                const updates: any = { scene_number: scene.scene_number || index + 1 };

                if (target === 'description') {
                    updates.scene_description = replacement.scene_description || scene.scene_description || '';
                } else if (target === 'narration') {
                    updates.narrator_script = replacement.narrator_script || scene.narrator_script || '';
                } else if (target === 'image') {
                    updates.imagePrompt = nextPrompts.imagePrompt || replacement.imagePrompt || replacement.text_to_image || currentPrompts.imagePrompt || '';
                    updates.text_to_image = updates.imagePrompt;
                } else if (target === 'video') {
                    updates.videoPrompt = nextPrompts.videoPrompt || replacement.videoPrompt || replacement.camera_movement || currentPrompts.videoPrompt || '';
                    updates.camera_movement = updates.videoPrompt;
                }

                updates.estimated_duration = scene.estimated_duration || 8;
                updateSceneAtIndex(index, updates, `${getTargetedRegenLabel(target)} Scene ${scene.scene_number || index + 1} berhasil diperbaiki. Review dulu sebelum Save / Update Cloud.`);
            } catch (err: any) {
                console.error('Regenerate scene field failed:', err);
                const errorMessage = err?.message || 'Regenerate field gagal.';
                showToast(errorMessage, 'error');
                showGenerationFeedback(errorMessage, 'regenerate');
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = originalText;
                }
            }
        }


        async function saveActiveProjectToCloud(silent = false) {
            if (!isSupabaseConfigured()) {
                if (!silent) showToast('Supabase belum dikonfigurasi di Vercel ENV.', 'error');
                return null;
            }

            const user = AppStore.state.authUser;
            if (!user?.id) {
                if (!silent) showToast('Login Google dulu untuk menyimpan project ke cloud.', 'error');
                return null;
            }

            const storyboardData = AppStore.state.activeStoryboardData;
            if (!storyboardData) {
                if (!silent) showToast('Belum ada storyboard aktif untuk disimpan.', 'error');
                return null;
            }

            const theme = (document.getElementById('themeInput') as HTMLTextAreaElement)?.value?.trim() || '';
            const title = generateSmartProjectTitle(storyboardData, theme);
            const btn = document.getElementById('btnSaveCloudProject') as HTMLButtonElement | null;
            const originalText = btn?.innerHTML || '☁️ Save to Cloud';
            const existingCloudId = AppStore.state.activeCloudProjectId;
            const contentPayload = {
                title,
                theme,
                ratio: AppStore.state.activeRatio,
                outputLanguage: getStoryboardOutputLanguage(),
                saved_from: 'k-creator-suite-pro',
                saved_at: new Date().toISOString(),
                storyboard: storyboardData
            };

            try {
                if (btn && !silent) {
                    btn.disabled = true;
                    btn.innerHTML = existingCloudId ? '☁️ Updating...' : '☁️ Saving...';
                }
                setCloudSaveStatus('saving');

                let savedId = existingCloudId;

                if (existingCloudId) {
                    const { data, error } = await supabase
                        .from('projects')
                        .update({
                            title,
                            content: contentPayload,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', existingCloudId)
                        .eq('user_id', user.id)
                        .select('id')
                        .single();

                    if (error) throw error;
                    savedId = data?.id || existingCloudId;
                } else {
                    const { data, error } = await supabase
                        .from('projects')
                        .insert({
                            user_id: user.id,
                            title,
                            content: contentPayload
                        })
                        .select('id')
                        .single();

                    if (error) throw error;
                    savedId = data?.id || null;
                }

                AppStore.setState({ activeCloudProjectId: savedId });
                setCloudSaveStatus(existingCloudId ? 'updated' : 'saved', existingCloudId ? 'Updated' : 'Saved');
                if (!silent) showToast(existingCloudId ? 'Project cloud berhasil diperbarui.' : `Project "${title}" berhasil disimpan ke Supabase Cloud.`, 'success');
                addDBLog(`${silent ? 'Auto-save cloud' : 'Cloud save'} berhasil: ${title}`, 'success');
                return savedId;
            } catch (err: any) {
                console.error('Cloud save gagal:', err);
                setCloudSaveStatus('error');
                if (!silent) showToast(err?.message || 'Gagal menyimpan project ke cloud.', 'error');
                addDBLog(`Cloud save gagal: ${err?.message || err}`, 'error');
                return null;
            } finally {
                if (btn && !silent) {
                    btn.disabled = false;
                    btn.innerHTML = originalText;
                }
            }
        }



        function formatCloudDate(value: string) {
            if (!value) return '-';
            try {
                return new Date(value).toLocaleString('id-ID', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } catch {
                return value;
            }
        }

        function closeUserGuideModal() {
            const modal = document.getElementById('userGuideModal');
            if (modal) modal.remove();
        }

        function closeFailurePlaybookModal() {
            const modal = document.getElementById('failurePlaybookModal');
            if (modal) modal.remove();
        }

        function openFailurePlaybookModal() {
            closeFailurePlaybookModal();
            const modal = document.createElement('div');
            modal.id = 'failurePlaybookModal';
            modal.className = 'fixed inset-0 z-[85] bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5';
            modal.innerHTML = `
                <div class="w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-[2rem] bg-[#070910] border border-slate-800 shadow-2xl flex flex-col">
                    <div class="p-5 sm:p-6 border-b border-slate-800 bg-gradient-to-r from-rose-950/45 via-[#0b1020] to-amber-950/30">
                        <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                            <div class="flex items-start gap-3">
                                <div class="w-11 h-11 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-xl shrink-0">🚑</div>
                                <div>
                                    <h3 class="text-lg sm:text-xl font-black text-slate-100 tracking-tight">Bantuan Prompt Gagal</h3>
                                    <p class="text-xs text-slate-400 mt-1 leading-relaxed max-w-3xl">Panduan cepat saat hasil image/video/TTS gagal. Pilih gejala masalahnya, lalu ikuti tombol repair yang disarankan. Tujuannya supaya user awam tidak bingung harus klik apa.</p>
                                </div>
                            </div>
                            <button data-action="close-failure-playbook" class="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/10 text-xs font-bold transition cursor-pointer">Close</button>
                        </div>
                    </div>
                    <div class="overflow-y-auto custom-scrollbar p-5 sm:p-6 space-y-5">
                        <div class="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-4 sm:p-5">
                            <h4 class="text-sm font-black text-amber-100 mb-2">Cara Pakai Cepat</h4>
                            <ol class="grid md:grid-cols-4 gap-3 text-xs text-slate-300 leading-relaxed list-decimal pl-4 md:pl-0 md:list-none">
                                <li class="rounded-2xl bg-slate-950/70 border border-slate-800 p-3"><b class="text-amber-300">1. Buka scene</b><br/>Klik <b>Edit / Perbaiki</b> di scene yang bermasalah.</li>
                                <li class="rounded-2xl bg-slate-950/70 border border-slate-800 p-3"><b class="text-amber-300">2. Pilih preset</b><br/>Klik preset seperti <b>Veo Failed</b>, <b>Too Complex</b>, atau <b>Image Mismatch</b>.</li>
                                <li class="rounded-2xl bg-slate-950/70 border border-slate-800 p-3"><b class="text-amber-300">3. Fix field</b><br/>Klik <b>Fix Video Prompt</b>, <b>Fix Image Prompt</b>, atau <b>Fix TTS</b>.</li>
                                <li class="rounded-2xl bg-slate-950/70 border border-slate-800 p-3"><b class="text-amber-300">4. Simpan</b><br/>Kalau sudah cocok, klik <b>Save / Update Cloud</b>.</li>
                            </ol>
                        </div>

                        <div class="grid lg:grid-cols-2 gap-4">
                            <div class="rounded-3xl border border-rose-500/20 bg-rose-500/5 p-4">
                                <h4 class="text-sm font-black text-rose-100 mb-3">🎥 Video Prompt / Veo / Kling</h4>
                                <div class="space-y-3 text-xs text-slate-300 leading-relaxed">
                                    <div class="rounded-2xl bg-slate-950/70 border border-slate-800 p-3"><b class="text-rose-300">Veo failed generate</b><p class="mt-1 text-slate-400">Pakai preset <b>Veo Failed</b> → klik <b>Fix Video Prompt</b>. Ini akan menyederhanakan gerakan kamera, memperjelas motion, dan mengurangi instruksi yang bertabrakan.</p></div>
                                    <div class="rounded-2xl bg-slate-950/70 border border-slate-800 p-3"><b class="text-orange-300">Kling hasilnya diam / terlalu statis</b><p class="mt-1 text-slate-400">Pakai preset <b>Too Static</b> atau <b>Kling Failed</b> → klik <b>Fix Video Prompt</b>. Tambahkan motion kecil yang realistis: rambut, kain, debu, crowd, cahaya, dan ambience.</p></div>
                                    <div class="rounded-2xl bg-slate-950/70 border border-slate-800 p-3"><b class="text-yellow-300">Gerakan terlalu rumit</b><p class="mt-1 text-slate-400">Pakai preset <b>Too Complex</b> → klik <b>Fix Video Prompt</b>. Kamera akan dibuat lebih sederhana: slow push-in, static hold, atau gentle tilt.</p></div>
                                </div>
                            </div>

                            <div class="rounded-3xl border border-indigo-500/20 bg-indigo-500/5 p-4">
                                <h4 class="text-sm font-black text-indigo-100 mb-3">🖼️ Image Prompt / Karakter / Thumbnail</h4>
                                <div class="space-y-3 text-xs text-slate-300 leading-relaxed">
                                    <div class="rounded-2xl bg-slate-950/70 border border-slate-800 p-3"><b class="text-indigo-300">Karakter tidak mirip / berubah</b><p class="mt-1 text-slate-400">Aktifkan <b>Detail Karakter Konsisten</b>. Lalu pakai preset <b>Image Mismatch</b> → klik <b>Fix Image Prompt</b>. Prompt akan dibuat lebih seperti master character reference.</p></div>
                                    <div class="rounded-2xl bg-slate-950/70 border border-slate-800 p-3"><b class="text-fuchsia-300">Thumbnail kurang nendang</b><p class="mt-1 text-slate-400">Buka <b>Paket Publishing</b>, edit <b>Thumbnail Text</b>, atau klik <b>Regen Thumbnail Text</b> untuk hook alternatif.</p></div>
                                    <div class="rounded-2xl bg-slate-950/70 border border-slate-800 p-3"><b class="text-sky-300">Visual tidak sesuai narasi</b><p class="mt-1 text-slate-400">Isi komentar spesifik, misalnya “background harus Marineford, bukan kota biasa” → klik <b>Fix Image Prompt</b>.</p></div>
                                </div>
                            </div>
                        </div>

                        <div class="grid lg:grid-cols-2 gap-4">
                            <div class="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                                <h4 class="text-sm font-black text-emerald-100 mb-3">🎙️ Narasi / TTS</h4>
                                <div class="space-y-3 text-xs text-slate-300 leading-relaxed">
                                    <div class="rounded-2xl bg-slate-950/70 border border-slate-800 p-3"><b class="text-emerald-300">Narasi terlalu panjang</b><p class="mt-1 text-slate-400">Klik <b>Tools Output</b> → <b>Shorten All Narration</b>. Untuk satu scene saja, buka editor lalu klik <b>Fix TTS</b>.</p></div>
                                    <div class="rounded-2xl bg-slate-950/70 border border-slate-800 p-3"><b class="text-lime-300">Narasi datar / kurang emosional</b><p class="mt-1 text-slate-400">Pakai preset <b>TTS Flat</b> atau <b>More Emotional</b> → klik <b>Fix TTS</b>.</p></div>
                                </div>
                            </div>

                            <div class="rounded-3xl border border-slate-700 bg-slate-950/50 p-4">
                                <h4 class="text-sm font-black text-slate-100 mb-3">🧯 Kalau AI Generate Gagal Total</h4>
                                <ul class="space-y-2 text-xs text-slate-300 leading-relaxed list-disc pl-4">
                                    <li>Jangan klik Generate berkali-kali saat loading.</li>
                                    <li>Kalau error timeout, coba ulang 1 kali.</li>
                                    <li>Kalau tetap gagal, kurangi jumlah scene atau persingkat instruksi khusus.</li>
                                    <li>Kalau kena rate limit / kuota, tunggu beberapa menit.</li>
                                    <li>Kalau hanya satu scene bermasalah, gunakan <b>Regenerate Scene</b>, bukan generate ulang semua.</li>
                                </ul>
                            </div>
                        </div>

                        <div class="rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-950 to-[#0b1020] p-4 sm:p-5">
                            <h4 class="text-sm font-black text-slate-100 mb-3">Cheat Sheet Tombol Repair</h4>
                            <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-slate-300">
                                <div class="rounded-2xl bg-slate-900/70 border border-slate-800 p-3"><b class="text-rose-300">Fix Video Prompt</b><p class="text-slate-400 mt-1">Untuk Veo/Kling gagal, gerakan aneh, kamera rumit.</p></div>
                                <div class="rounded-2xl bg-slate-900/70 border border-slate-800 p-3"><b class="text-indigo-300">Fix Image Prompt</b><p class="text-slate-400 mt-1">Untuk karakter, outfit, lokasi, thumbnail visual.</p></div>
                                <div class="rounded-2xl bg-slate-900/70 border border-slate-800 p-3"><b class="text-emerald-300">Fix TTS</b><p class="text-slate-400 mt-1">Untuk narasi kepanjangan, datar, atau kurang hook.</p></div>
                                <div class="rounded-2xl bg-slate-900/70 border border-slate-800 p-3"><b class="text-amber-300">Regenerate Full Scene</b><p class="text-slate-400 mt-1">Untuk scene yang konsepnya memang kurang cocok total.</p></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        function openUserGuideModal() {
            closeUserGuideModal();
            const modal = document.createElement('div');
            modal.id = 'userGuideModal';
            modal.className = 'fixed inset-0 z-[80] bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5';
            modal.innerHTML = `
                <div class="w-full max-w-5xl max-h-[88vh] overflow-hidden rounded-[2rem] bg-[#070910] border border-slate-800 shadow-2xl flex flex-col">
                    <div class="p-5 sm:p-6 border-b border-slate-800 bg-gradient-to-r from-amber-950/40 via-[#0b1020] to-slate-950">
                        <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                            <div class="flex items-start gap-3">
                                <div class="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-xl shrink-0">📘</div>
                                <div>
                                    <h3 class="text-lg sm:text-xl font-black text-slate-100 tracking-tight">Panduan — K Creator Suite Pro</h3>
                                    <p class="text-xs text-slate-400 mt-1 leading-relaxed max-w-2xl">Panduan cepat untuk generate storyboard, koreksi scene, simpan cloud, dan ambil output siap produksi. Dibuat untuk pemula, jadi ikuti dari atas ke bawah saja.</p>
                                </div>
                            </div>
                            <button data-action="close-user-guide" class="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/10 text-xs font-bold transition cursor-pointer">Close</button>
                        </div>
                    </div>

                    <div class="overflow-y-auto custom-scrollbar p-5 sm:p-6 space-y-5">
                        <div class="grid lg:grid-cols-3 gap-4">
                            <div class="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                                <div class="text-2xl mb-2">🚀</div>
                                <h4 class="text-sm font-black text-emerald-200">Workflow Cepat</h4>
                                <ol class="mt-3 space-y-2 text-xs text-slate-300 leading-relaxed list-decimal pl-4">
                                    <li>Login dengan email yang sudah diizinkan.</li>
                                    <li>Isi tema konten di panel kiri.</li>
                                    <li>Pilih style, bahasa output, jumlah scene, dan durasi.</li>
                                    <li>Klik <b>Generate Storyboard</b>.</li>
                                    <li>Review scene dari atas ke bawah.</li>
                                    <li>Kalau sudah cocok, klik <b>Save / Update Cloud</b>.</li>
                                </ol>
                            </div>
                            <div class="rounded-3xl border border-indigo-500/20 bg-indigo-500/5 p-4">
                                <div class="text-2xl mb-2">🛠️</div>
                                <h4 class="text-sm font-black text-indigo-200">Kalau Scene Kurang Cocok</h4>
                                <ul class="mt-3 space-y-2 text-xs text-slate-300 leading-relaxed list-disc pl-4">
                                    <li>Klik <b>Edit / Perbaiki</b> pada scene.</li>
                                    <li>Tulis komentar, misalnya: “Veo gagal, kamera terlalu rumit.”</li>
                                    <li>Pilih <b>Fix Video Prompt</b> kalau hanya prompt video yang bermasalah.</li>
                                    <li>Pilih <b>Regenerate Full Scene</b> kalau mau scene diganti total.</li>
                                    <li>Gunakan <b>Undo Last</b> kalau hasil baru lebih jelek.</li>
                                </ul>
                            </div>
                            <div class="rounded-3xl border border-sky-500/20 bg-sky-500/5 p-4">
                                <div class="text-2xl mb-2">☁️</div>
                                <h4 class="text-sm font-black text-sky-200">Cloud & History</h4>
                                <ul class="mt-3 space-y-2 text-xs text-slate-300 leading-relaxed list-disc pl-4">
                                    <li><b>Save / Update Cloud</b> menyimpan project ke akun kamu.</li>
                                    <li><b>Cloud History</b> membuka project lama.</li>
                                    <li><b>Rename</b> untuk merapikan nama project.</li>
                                    <li><b>Delete</b> untuk menghapus project test.</li>
                                    <li>Auto-save aktif setelah generate jika kamu login.</li>
                                </ul>
                            </div>
                        </div>

                        <div class="rounded-3xl border border-slate-800 bg-slate-950/50 p-4 sm:p-5">
                            <div class="flex items-center gap-2 mb-4">
                                <span class="w-8 h-8 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">🎬</span>
                                <h4 class="text-sm font-black text-slate-100">Tombol Penting</h4>
                            </div>
                            <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                                <div class="rounded-2xl bg-slate-900/80 border border-slate-800 p-3"><b class="text-amber-300">Edit / Repair</b><p class="text-slate-400 mt-1">Buka editor scene untuk edit manual atau perbaiki prompt tertentu.</p></div>
                                <div class="rounded-2xl bg-slate-900/80 border border-slate-800 p-3"><b class="text-indigo-300">Copy Package</b><p class="text-slate-400 mt-1">Copy scene lengkap: deskripsi, narasi, image prompt, video prompt.</p></div>
                                <div class="rounded-2xl bg-slate-900/80 border border-slate-800 p-3"><b class="text-emerald-300">Voice Lab</b><p class="text-slate-400 mt-1">Kirim narasi scene ke area TTS / Voice Lab.</p></div>
                                <div class="rounded-2xl bg-slate-900/80 border border-slate-800 p-3"><b class="text-sky-300">Output Tools</b><p class="text-slate-400 mt-1">Tempat copy paket lengkap, export TXT/JSON, dan regenerate narasi massal.</p></div>
                                <div class="rounded-2xl bg-slate-900/80 border border-slate-800 p-3"><b class="text-orange-300">Shorten Narration</b><p class="text-slate-400 mt-1">Pendekkan semua narasi kalau durasi scene terasa tidak realistis.</p></div>
                                <div class="rounded-2xl bg-slate-900/80 border border-slate-800 p-3"><b class="text-rose-300">More Actions</b><p class="text-slate-400 mt-1">Tambah, duplicate, atau hapus scene tanpa memenuhi tampilan utama.</p></div>
                            </div>
                        </div>

                        <div class="rounded-3xl border border-rose-500/20 bg-rose-500/5 p-4 sm:p-5">
                            <div class="flex items-center gap-2 mb-3">
                                <span class="w-8 h-8 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">🚨</span>
                                <h4 class="text-sm font-black text-rose-100">Kalau Generate / Veo / Kling Gagal</h4>
                            </div>
                            <div class="grid lg:grid-cols-2 gap-3 text-xs text-slate-300 leading-relaxed">
                                <div class="rounded-2xl bg-slate-950/70 border border-slate-800 p-3"><b class="text-rose-300">Veo failed generate</b><p class="mt-1 text-slate-400">Klik preset <b>Veo Failed</b>, lalu klik <b>Fix Video Prompt</b>. Biasanya prompt perlu dibuat lebih sederhana.</p></div>
                                <div class="rounded-2xl bg-slate-950/70 border border-slate-800 p-3"><b class="text-amber-300">Kling gagal / hasil diam</b><p class="mt-1 text-slate-400">Klik <b>Too Static</b> atau <b>Kling Failed</b>, lalu perbaiki prompt video.</p></div>
                                <div class="rounded-2xl bg-slate-950/70 border border-slate-800 p-3"><b class="text-indigo-300">Karakter berubah-ubah</b><p class="mt-1 text-slate-400">Aktifkan <b>Detail Karakter Konsisten</b>, lalu gunakan <b>Fix Image Prompt</b>.</p></div>
                                <div class="rounded-2xl bg-slate-950/70 border border-slate-800 p-3"><b class="text-emerald-300">Narasi terlalu panjang</b><p class="mt-1 text-slate-400">Klik <b>Shorten All Narration</b> di Output Tools agar lebih sesuai durasi.</p></div>
                            </div>
                        </div>

                        <div class="rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-950 to-[#0b1020] p-4 sm:p-5">
                            <h4 class="text-sm font-black text-slate-100 mb-3">Checklist Produksi Harian</h4>
                            <div class="grid sm:grid-cols-2 gap-2 text-xs text-slate-300">
                                <label class="flex items-start gap-2 rounded-2xl bg-slate-900/60 border border-slate-800 p-3"><span>☑️</span><span>Generate storyboard dan cek semua scene.</span></label>
                                <label class="flex items-start gap-2 rounded-2xl bg-slate-900/60 border border-slate-800 p-3"><span>☑️</span><span>Perbaiki scene yang gagal sebelum copy/export.</span></label>
                                <label class="flex items-start gap-2 rounded-2xl bg-slate-900/60 border border-slate-800 p-3"><span>☑️</span><span>Save / Update Cloud setelah hasil final.</span></label>
                                <label class="flex items-start gap-2 rounded-2xl bg-slate-900/60 border border-slate-800 p-3"><span>☑️</span><span>Export TXT atau Copy Full Package untuk workflow produksi.</span></label>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        function closeCloudHistoryModal() {
            const modal = document.getElementById('cloudHistoryModal');
            if (modal) modal.remove();
        }

        function renderCloudHistoryModal(projects: any[]) {
            closeCloudHistoryModal();

            const modal = document.createElement('div');
            modal.id = 'cloudHistoryModal';
            modal.className = 'fixed inset-0 z-[70] bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5';

            const safeProjects = Array.isArray(projects) ? projects : [];
            const totalScenes = safeProjects.reduce((sum: number, item: any) => {
                const scenes = item.content?.storyboard?.scenes || item.content?.scenes || [];
                return sum + (Array.isArray(scenes) ? scenes.length : 0);
            }, 0);

            const rows = safeProjects.length ? safeProjects.map((item: any, index: number) => {
                const title = escapeHTML(item.title || 'Untitled Project');
                const date = escapeHTML(formatCloudDate(item.updated_at || item.created_at));
                const id = escapeHTML(item.id || '');
                const sceneCount = item.content?.storyboard?.scenes?.length || item.content?.scenes?.length || 0;
                const themeRaw = item.content?.theme || item.content?.storyboard?.youtube_title || 'Cloud project';
                const theme = escapeHTML(themeRaw);
                const searchText = escapeHTML(`${item.title || ''} ${themeRaw || ''} ${item.content?.storyboard?.youtube_title || ''}`.toLowerCase());
                const activeBadge = AppStore.state.activeCloudProjectId === item.id
                    ? '<span class="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">Active</span>'
                    : '';
                const recentBadge = index === 0
                    ? '<span class="px-2 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">Latest</span>'
                    : '';
                return `
                    <div data-cloud-project-card="true" data-search="${searchText}" class="group border border-slate-800/80 bg-gradient-to-br from-slate-950 to-[#080a12] hover:from-slate-900 hover:to-[#0b1020] hover:border-sky-500/35 rounded-2xl p-4 transition shadow-lg shadow-black/10">
                        <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                            <div class="min-w-0 flex-1">
                                <div class="flex items-start gap-3">
                                    <div class="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0 text-lg">🎬</div>
                                    <div class="min-w-0 flex-1">
                                        <div class="flex flex-wrap items-center gap-2">
                                            <h4 class="text-sm sm:text-base font-bold text-slate-100 truncate max-w-full">${title}</h4>
                                            ${activeBadge}
                                            ${recentBadge}
                                        </div>
                                        <p class="text-[11px] sm:text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">${theme}</p>
                                    </div>
                                </div>
                                <div class="flex flex-wrap items-center gap-2 mt-4 text-[10px] text-slate-500 font-mono">
                                    <span class="px-2 py-1 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/10">${sceneCount} scene</span>
                                    <span class="px-2 py-1 rounded-lg bg-slate-900/80 border border-slate-800">${date}</span>
                                </div>
                            </div>
                            <div class="shrink-0 grid grid-cols-3 lg:flex lg:flex-col gap-2 min-w-[210px]">
                                <button data-action="load-cloud-project" data-id="${id}" class="px-3 py-2 rounded-xl bg-sky-600/15 hover:bg-sky-600/30 border border-sky-500/20 text-sky-300 text-xs font-bold transition cursor-pointer">
                                    Load
                                </button>
                                <button data-action="rename-cloud-project" data-id="${id}" data-title="${title}" class="px-3 py-2 rounded-xl bg-amber-600/10 hover:bg-amber-600/25 border border-amber-500/20 text-amber-300 text-xs font-bold transition cursor-pointer">
                                    Rename
                                </button>
                                <button data-action="delete-cloud-project" data-id="${id}" data-title="${title}" class="px-3 py-2 rounded-xl bg-rose-600/10 hover:bg-rose-600/25 border border-rose-500/20 text-rose-400 text-xs font-bold transition cursor-pointer">
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('') : `
                <div class="border border-dashed border-slate-800 rounded-3xl p-10 text-center bg-slate-950/40">
                    <div class="text-4xl mb-4">☁️</div>
                    <h4 class="text-base font-bold text-slate-200">Belum ada project cloud</h4>
                    <p class="text-xs text-slate-500 mt-2 max-w-sm mx-auto">Generate storyboard, lalu klik Save / Update Cloud. Project yang tersimpan akan muncul di sini.</p>
                </div>
            `;

            modal.innerHTML = `
                <div class="w-full max-w-5xl max-h-[86vh] overflow-hidden rounded-[2rem] bg-[#070910] border border-slate-800 shadow-2xl flex flex-col">
                    <div class="p-5 sm:p-6 border-b border-slate-800 bg-gradient-to-r from-slate-950 via-[#0b1020] to-slate-950">
                        <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                            <div>
                                <div class="flex items-center gap-2">
                                    <span class="w-9 h-9 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">☁️</span>
                                    <div>
                                        <h3 class="text-lg sm:text-xl font-black text-slate-100 tracking-tight">Cloud History</h3>
                                        <p class="text-xs text-slate-400 mt-0.5">Project tersimpan di Supabase milik akun Google aktif.</p>
                                    </div>
                                </div>
                            </div>
                            <div class="flex items-center gap-2">
                                <button data-action="refresh-cloud-history" class="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer">↻ Refresh</button>
                                <button data-action="close-cloud-history" class="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/10 text-xs font-bold transition cursor-pointer">Close</button>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                            <div class="rounded-2xl bg-slate-900/70 border border-slate-800 p-3">
                                <p class="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Projects</p>
                                <p class="text-lg font-black text-slate-100">${safeProjects.length}</p>
                            </div>
                            <div class="rounded-2xl bg-slate-900/70 border border-slate-800 p-3">
                                <p class="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Scenes</p>
                                <p class="text-lg font-black text-slate-100">${totalScenes}</p>
                            </div>
                            <div class="rounded-2xl bg-slate-900/70 border border-slate-800 p-3 col-span-2">
                                <p class="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Mode</p>
                                <p class="text-sm font-bold text-emerald-300 mt-1">Login Cloud Sync Active</p>
                            </div>
                        </div>
                    </div>
                    <div class="px-5 sm:px-6 pt-5">
                        <div class="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div class="relative flex-1">
                                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔎</span>
                                <input id="cloudHistorySearch" type="text" placeholder="Cari project, tema, atau judul..." class="w-full bg-slate-950/80 border border-slate-800 focus:border-sky-500/50 outline-none rounded-2xl pl-10 pr-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 transition" />
                            </div>
                            <div id="cloudHistoryCounter" class="text-[11px] text-slate-500 font-mono px-3 py-2 rounded-xl bg-slate-900/70 border border-slate-800 text-center">
                                ${safeProjects.length} project
                            </div>
                        </div>
                    </div>
                    <div id="cloudHistoryList" class="p-5 sm:p-6 overflow-y-auto custom-scrollbar space-y-3">
                        ${rows}
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const searchInput = document.getElementById('cloudHistorySearch') as HTMLInputElement | null;
            const counter = document.getElementById('cloudHistoryCounter');
            const cards = Array.from(document.querySelectorAll('[data-cloud-project-card]')) as HTMLElement[];
            if (searchInput && cards.length) {
                searchInput.addEventListener('input', () => {
                    const query = searchInput.value.trim().toLowerCase();
                    let visible = 0;
                    cards.forEach((card) => {
                        const haystack = card.getAttribute('data-search') || '';
                        const match = !query || haystack.includes(query);
                        card.classList.toggle('hidden', !match);
                        if (match) visible += 1;
                    });
                    if (counter) counter.textContent = query ? `${visible} / ${cards.length} project` : `${cards.length} project`;
                });
            }
        }

        async function openCloudHistory() {
            if (!isSupabaseConfigured()) {
                showToast('Supabase belum dikonfigurasi di Vercel ENV.', 'error');
                return;
            }

            const user = AppStore.state.authUser;
            if (!user?.id) {
                showToast('Login Google dulu untuk membuka Cloud History.', 'error');
                return;
            }

            const btn = document.getElementById('btnCloudHistory') as HTMLButtonElement | null;
            const originalText = btn?.innerHTML || '☁️ Riwayat Cloud';

            try {
                if (btn) {
                    btn.disabled = true;
                    btn.innerHTML = '☁️ Loading...';
                }

                const { data, error } = await supabase
                    .from('projects')
                    .select('id,title,content,created_at,updated_at')
                    .eq('user_id', user.id)
                    .order('updated_at', { ascending: false });

                if (error) throw error;

                AppStore.setState({ cloudProjects: data || [] });
                renderCloudHistoryModal(data || []);
                addDBLog(`Cloud history dimuat: ${(data || []).length} project`, 'success');
            } catch (err: any) {
                console.error('Gagal membuka Cloud History:', err);
                showToast(err?.message || 'Gagal membuka Cloud History.', 'error');
                addDBLog(`Cloud history gagal: ${err?.message || err}`, 'error');
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = originalText;
                }
            }
        }

        async function loadCloudProject(projectId: string) {
            const item = AppStore.state.cloudProjects.find((p: any) => p.id === projectId);
            if (!item) {
                showToast('Project cloud tidak ditemukan di daftar aktif. Klik Refresh.', 'error');
                return;
            }

            const content = item.content || {};
            const storyboard = content.storyboard || content;
            const ratio = content.ratio || '16:9';
            const theme = content.theme || item.title || '';

            if (!storyboard || !storyboard.scenes) {
                showToast('Data storyboard cloud tidak valid.', 'error');
                return;
            }

            AppStore.setState({
                activeStoryboardData: storyboard,
                activeRatio: ratio,
                currentActiveHistoryId: item.id,
                activeCloudProjectId: item.id,
                sceneVersionHistory: {}
            });

            const themeInput = document.getElementById('themeInput') as HTMLTextAreaElement | null;
            if (themeInput) themeInput.value = theme;

            const outputLanguageSelect = document.getElementById('outputLanguage') as HTMLSelectElement | null;
            const savedLanguage = content.outputLanguage || content.storyboard?.outputLanguage || 'mixed';
            if (outputLanguageSelect && ['mixed', 'id', 'en'].includes(savedLanguage)) {
                outputLanguageSelect.value = savedLanguage;
            }

            Views.renderStoryboard(storyboard, ratio);
            setCloudSaveStatus('saved', 'Loaded from Cloud');
            closeCloudHistoryModal();
            showToast('Project cloud berhasil dimuat ke canvas.', 'success');
            addDBLog(`Cloud project dimuat: ${item.title || item.id}`, 'success');
        }

        async function renameCloudProject(projectId: string) {
            if (!isSupabaseConfigured()) {
                showToast('Supabase belum dikonfigurasi di Vercel ENV.', 'error');
                return;
            }

            const user = AppStore.state.authUser;
            if (!user?.id) {
                showToast('Login Google dulu untuk rename project cloud.', 'error');
                return;
            }

            const item = AppStore.state.cloudProjects.find((p: any) => p.id === projectId);
            const currentTitle = item?.title || 'Untitled Project';
            const nextTitleRaw = window.prompt('Nama project baru:', currentTitle);
            if (nextTitleRaw === null) return;

            const nextTitle = nextTitleRaw.trim();
            if (!nextTitle) {
                showToast('Nama project tidak boleh kosong.', 'error');
                return;
            }

            if (nextTitle === currentTitle) {
                showToast('Nama project tidak berubah.', 'info');
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('projects')
                    .update({ title: nextTitle })
                    .eq('id', projectId)
                    .eq('user_id', user.id)
                    .select('id,title,content,created_at,updated_at')
                    .single();

                if (error) throw error;

                const updatedProjects = AppStore.state.cloudProjects.map((p: any) =>
                    p.id === projectId ? { ...p, ...(data || {}), title: nextTitle } : p
                );

                AppStore.setState({ cloudProjects: updatedProjects });
                renderCloudHistoryModal(updatedProjects);
                showToast('Nama project cloud berhasil diubah.', 'success');
                addDBLog(`Cloud project rename: ${currentTitle} → ${nextTitle}`, 'success');
            } catch (err: any) {
                console.error('Gagal rename cloud project:', err);
                showToast(err?.message || 'Gagal rename project cloud.', 'error');
                addDBLog(`Cloud rename gagal: ${err?.message || err}`, 'error');
            }
        }


        async function deleteCloudProject(projectId: string) {
            if (!isSupabaseConfigured()) {
                showToast('Supabase belum dikonfigurasi di Vercel ENV.', 'error');
                return;
            }

            const user = AppStore.state.authUser;
            if (!user?.id) {
                showToast('Login Google dulu untuk menghapus project cloud.', 'error');
                return;
            }

            const item = AppStore.state.cloudProjects.find((p: any) => p.id === projectId);
            const title = item?.title || 'project ini';
            const confirmed = window.confirm(`Hapus project cloud "${title}"? Data ini akan hilang dari Supabase.`);
            if (!confirmed) return;

            try {
                const { error } = await supabase
                    .from('projects')
                    .delete()
                    .eq('id', projectId)
                    .eq('user_id', user.id);

                if (error) throw error;

                const remainingProjects = AppStore.state.cloudProjects.filter((p: any) => p.id !== projectId);
                const updates: any = { cloudProjects: remainingProjects };
                if (AppStore.state.activeCloudProjectId === projectId) {
                    updates.activeCloudProjectId = null;
                }
                if (AppStore.state.currentActiveHistoryId === projectId) {
                    updates.currentActiveHistoryId = null;
                }

                AppStore.setState(updates);
                renderCloudHistoryModal(remainingProjects);
                showToast('Project cloud berhasil dihapus.', 'success');
                addDBLog(`Cloud project dihapus: ${title}`, 'success');
            } catch (err: any) {
                console.error('Gagal menghapus cloud project:', err);
                showToast(err?.message || 'Gagal menghapus project cloud.', 'error');
                addDBLog(`Cloud delete gagal: ${err?.message || err}`, 'error');
            }
        }


        async function logWorkflowActivity(actionText: string, actionType = 'info') {
            try {
                const logs = await SettingsRepo.get('activity_log') || [];
                logs.unshift({
                    id: generateSecureId(),
                    action: actionText,
                    type: actionType,
                    timestamp: new Date().toISOString()
                });

                const trimmedLogs = logs.slice(0, 50);
                await SettingsRepo.put('activity_log', trimmedLogs);
                await renderActivityTimeline();
            } catch (e) {
                console.error("Gagal melacak aktivitas workflow timeline:", e);
            }
        }

        // ==========================================
        // 3. UI RENDERING ENGINES
        // ==========================================
        const Views: any = {
            renderDashboard() {
                const container = document.getElementById('workflowDashboardContainer');
                if (!container) return;

                const list = AppStore.state.workflowProjects;
                const total = list.length;
                const draft = list.filter((p: any) => p.status === 'Draft' || !p.status).length;
                const generated = list.filter((p: any) => p.status === 'Generated').length;
                const voiceGenerated = list.filter((p: any) => p.status === 'Voice Generated').length;
                const exported = list.filter((p: any) => p.status === 'Exported').length;
                const published = list.filter((p: any) => p.status === 'Published').length;

                const cards = [
                    { title: "Total Projek", count: total, icon: "📂", color: "border-slate-800 text-slate-350" },
                    { title: "Draft", count: draft, icon: "📝", color: "border-amber-500/20 text-amber-400 bg-amber-500/5" },
                    { title: "Generated", count: generated, icon: "🎬", color: "border-indigo-500/20 text-indigo-400 bg-indigo-500/5" },
                    { title: "Voice Ready", count: voiceGenerated, icon: "🎙️", color: "border-emerald-500/20 text-emerald-400 bg-emerald-500/5" },
                    { title: "Exported", count: exported, icon: "📦", color: "border-purple-500/20 text-purple-400 bg-purple-500/5" },
                    { title: "Published", count: published, icon: "🚀", color: "border-teal-500/20 text-teal-400 bg-teal-500/5" }
                ];

                container.innerHTML = cards.map(c => `
                    <div class="border rounded-2xl p-4 flex flex-col justify-between h-24 shadow-lg transition ${c.color}">
                        <div class="flex items-center justify-between">
                            <span class="text-[9px] font-bold tracking-wider uppercase opacity-85 font-mono">${escapeHTML(c.title)}</span>
                            <span class="text-xs">${c.icon}</span>
                        </div>
                        <span class="text-xl font-extrabold tracking-tight font-mono">${c.count}</span>
                    </div>
                `).join('');
            },

            renderTable() {
                const tbody = document.getElementById('workflowTableBody');
                const pbar = document.getElementById('workflowPaginationBar');
                if (!tbody) return;

                const state = AppStore.state;
                const filtered = state.filteredWorkflowProjects;
                const totalItems = filtered.length;
                const itemsPerPage = state.workflowPagination.itemsPerPage;
                const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

                let curr = state.workflowPagination.currentPage;
                if (curr > totalPages) curr = totalPages;

                const start = (curr - 1) * itemsPerPage;
                const end = Math.min(start + itemsPerPage, totalItems);
                const pageItems = filtered.slice(start, end);

                if (pageItems.length === 0) {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="7" class="p-8 text-center text-slate-500 italic">
                                Tidak ada draf projek yang ditemukan memenuhi kriteria filter.
                            </td>
                        </tr>
                    `;
                    if (pbar) pbar.innerHTML = "";
                    return;
                }

                tbody.innerHTML = pageItems.map((p: any) => {
                    const createdDate = p.created_at ? new Date(p.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : "-";
                    let badgeClass = "bg-slate-800 text-slate-400";
                    if (p.status === 'Draft') badgeClass = "bg-amber-500/10 text-amber-400 border border-amber-500/20";
                    if (p.status === 'Generated') badgeClass = "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20";
                    if (p.status === 'Voice Generated') badgeClass = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
                    if (p.status === 'Exported') badgeClass = "bg-purple-500/10 text-purple-400 border border-purple-500/20";
                    if (p.status === 'Published') badgeClass = "bg-teal-500/10 text-teal-400 border border-teal-500/20";

                    const isSel = state.selectedProjects.has(p.id);
                    const favIcon = p.isFavorite ? "⭐" : "☆";
                    const isArc = p.isArchived ? "opacity-45" : "";
                    const tags = (p.tags || []).map((t: string) => `<span class="px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[9px] font-semibold">${escapeHTML(t)}</span>`).join(' ');

                    return `
                        <tr class="hover:bg-slate-900/10 transition cursor-pointer ${isArc}" data-id="${escapeHTML(p.id)}">
                            <td class="p-3" data-action="stop-propagation">
                                <input type="checkbox" class="project-selector rounded border-slate-800 text-indigo-500 bg-slate-900 focus:ring-0 w-3.5 h-3.5" data-id="${escapeHTML(p.id)}" ${isSel ? 'checked' : ''}>
                            </td>
                            <td class="p-3 font-semibold text-slate-200 max-w-xs truncate">
                                <span class="btn-toggle-fav mr-1 text-slate-500 hover:text-yellow-500 transition text-[13px] inline-block select-none" data-action="toggle-project-favorite" data-id="${escapeHTML(p.id)}">${favIcon}</span>
                                ${escapeHTML(p.title)}
                            </td>
                            <td class="p-3 text-slate-400 max-w-md truncate italic">"${escapeHTML(p.theme)}"</td>
                            <td class="p-3">
                                <div class="flex flex-wrap gap-1 items-center">
                                    <span class="px-2 py-0.5 rounded-md bg-slate-900 text-slate-400 font-medium font-mono uppercase text-[9px]">${escapeHTML(p.category || 'Anime')}</span>
                                    ${tags}
                                </div>
                            </td>
                            <td class="p-3"><span class="px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wide uppercase ${badgeClass}">${escapeHTML(p.status || 'Draft')}</span></td>
                            <td class="p-3 text-slate-500 font-mono">${createdDate}</td>
                            <td class="p-3 text-right" data-action="stop-propagation">
                                <div class="flex items-center justify-end gap-1.5">
                                    <button class="btn-row-duplicate p-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition" data-action="duplicate-row" data-id="${escapeHTML(p.id)}">📋</button>
                                    <button class="btn-row-delete p-1.5 rounded bg-rose-500/5 hover:bg-rose-500/15 text-rose-455 transition" data-action="delete-row" data-id="${escapeHTML(p.id)}">❌</button>
                                </div>
                            </td>
                        </tr>
                    `;
                }).join('');

                if (pbar) {
                    pbar.innerHTML = `
                        <div>Menampilkan <span class="font-bold text-slate-300 font-mono">${start + 1} - ${end}</span> dari <span class="font-bold text-slate-300 font-mono">${totalItems}</span> Projek</div>
                        <div class="flex items-center gap-2">
                            <button id="pPrevExtreme" class="p-1 hover:text-slate-300 font-bold cursor-pointer">«</button>
                            <button id="pPrev" class="p-1 hover:text-slate-300 cursor-pointer">‹</button>
                            <span class="px-2 font-mono">Page ${curr} of ${totalPages}</span>
                            <button id="pNext" class="p-1 hover:text-slate-300 font-bold cursor-pointer">›</button>
                            <button id="pNextExtreme" class="p-1 hover:text-slate-300 font-bold cursor-pointer">»</button>
                        </div>
                    `;
                }

                const masterCheck = document.getElementById('masterSelectCheckbox') as HTMLInputElement;
                if (masterCheck) {
                    masterCheck.checked = pageItems.length > 0 && pageItems.every((p: any) => state.selectedProjects.has(p.id));
                }
            },

            renderDrawer() {
                const drawer = document.getElementById('workflowDetailDrawer');
                if (!drawer) return;

                const state = AppStore.state;
                if (!state.currentlyOpenDrawerId) {
                    drawer.classList.add('translate-x-full');
                    setTimeout(() => drawer.classList.add('hidden'), 300);
                    return;
                }

                const project = state.workflowProjects.find((p: any) => p.id === state.currentlyOpenDrawerId);
                if (!project) return;

                drawer.classList.remove('hidden');
                setTimeout(() => drawer.classList.remove('translate-x-full'), 50);

                const data = project.data_json || {};
                const scenes = data.scenes || [];

                const favBtn = project.isFavorite
                    ? `<button id="btnDrawerUnfav" data-action="drawer-unfav" class="py-1.5 px-3 bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer">⭐ Unfavorite</button>`
                    : `<button id="btnDrawerFav" data-action="drawer-fav" class="py-1.5 px-3 bg-slate-900 border border-slate-800 text-slate-400 hover:text-yellow-500 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer">☆ Favorite</button>`;

                const arcBtn = project.isArchived
                    ? `<button id="btnDrawerUnarchive" data-action="drawer-unarchive" class="py-1.5 px-3 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer">📥 Unarchive</button>`
                    : `<button id="btnDrawerArchive" data-action="drawer-archive" class="py-1.5 px-3 bg-slate-900 border border-slate-800 text-slate-400 hover:text-blue-400 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer">📦 Archive</button>`;

                const tagItems = (project.tags || []).map((t: string, idx: number) => `
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-semibold">
                        <span>${escapeHTML(t)}</span>
                        <button class="btn-drawer-remove-tag hover:text-rose-400 font-bold" data-action="remove-drawer-tag" data-index="${idx}">×</button>
                    </span>
                `).join('');

                drawer.innerHTML = `
                    <div class="p-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-[#0a0b10]">
                        <div class="flex items-center gap-2">
                            <span class="text-lg">📁</span>
                            <div>
                                <h2 class="text-xs font-bold tracking-wide text-indigo-400 max-w-xs truncate">${escapeHTML(project.title)}</h2>
                                <p class="text-[9px] text-slate-500 uppercase font-semibold">Project Detail & Advanced Workflow</p>
                            </div>
                        </div>
                        <button id="btnCloseDrawer" data-action="close-drawer" class="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer">✕</button>
                    </div>

                    <div class="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
                        <div class="bg-[#0f111a] rounded-xl border border-slate-800 p-3 space-y-3">
                            <div class="flex justify-between items-center text-xs">
                                <span class="text-slate-400 font-semibold">Status Workflow:</span>
                                <span class="px-2.5 py-0.5 rounded-full font-mono font-bold text-[10px] bg-indigo-500/10 text-indigo-400 uppercase border border-indigo-500/20">${escapeHTML(project.status || 'Draft')}</span>
                            </div>

                            <div class="grid grid-cols-3 gap-2 pt-1 border-b border-slate-855/50 pb-3">
                                <button id="btnTransVoiceReady" data-action="transition-status" data-status="Voice Generated" class="py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold transition cursor-pointer">
                                    🎙️ Voice Ready
                                </button>
                                <button id="btnTransExported" data-action="transition-status" data-status="Exported" class="py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[10px] font-bold transition cursor-pointer">
                                    📦 Exported
                                </button>
                                <button id="btnTransPublished" data-action="transition-status" data-status="Published" class="py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-[10px] font-bold transition cursor-pointer">
                                    🚀 Publish
                                </button>
                            </div>

                            <div class="flex items-center gap-2 pt-1 justify-between">
                                <span class="text-[10px] text-slate-500 uppercase font-bold tracking-wider font-mono">Status Spesifik:</span>
                                <div class="flex gap-2">
                                    ${favBtn}
                                    ${arcBtn}
                                </div>
                            </div>
                        </div>

                        <div class="bg-[#0f111a] rounded-xl border border-slate-800 p-3.5 space-y-3">
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block">🏷️ Tag System Manager</span>
                            <div class="flex flex-wrap gap-1.5" id="drawerTagsContainer">
                                ${tagItems || '<span class="text-[10px] text-slate-500 italic">Belum ada tag disematkan.</span>'}
                            </div>
                            <div class="flex gap-2 pt-1.5">
                                <input type="text" id="newTagInput" placeholder="Ketik tag baru..." class="flex-1 rounded-lg bg-[#08090e] border border-slate-800 p-1.5 text-xs text-slate-300 placeholder-slate-655 outline-none focus:border-indigo-500 transition">
                                <button id="btnDrawerAddTag" data-action="add-drawer-tag" class="px-3 py-1.5 bg-indigo-600/10 hover:bg-indigo-600/25 border border-indigo-500/20 text-indigo-400 rounded-lg text-xs font-bold transition cursor-pointer">Add</button>
                            </div>
                        </div>

                        <div class="space-y-3">
                            <div class="bg-black/20 p-3 rounded-xl border border-slate-855 space-y-1.5">
                                <span class="text-[10px] font-bold text-rose-455 uppercase font-mono">Youtube Title</span>
                                <p class="text-xs text-slate-200 leading-relaxed font-bold">${escapeHTML(data.youtube_title || "-")}</p>
                            </div>
                            <div class="bg-black/20 p-3 rounded-xl border border-slate-855 space-y-1.5">
                                <span class="text-[10px] font-bold text-red-500 uppercase font-mono">Description</span>
                                <p class="text-[11px] text-slate-300 leading-relaxed max-h-32 overflow-y-auto custom-scrollbar whitespace-pre-line">${escapeHTML(data.youtube_description || "-")}</p>
                            </div>
                            <div class="bg-black/20 p-3 rounded-xl border border-slate-855 space-y-1.5">
                                <span class="text-[10px] font-bold text-indigo-400 uppercase font-mono">Viral Hashtags</span>
                                <p class="text-xs text-indigo-300 font-mono">${escapeHTML(data.viral_hashtags || "-")}</p>
                            </div>
                            <div class="bg-gradient-to-tr from-indigo-950/20 to-purple-950/20 p-3 rounded-xl border border-indigo-500/20 space-y-1.5">
                                <span class="text-[10px] font-bold text-indigo-300 uppercase font-sans tracking-wider">Cover Thumbnail Prompt</span>
                                <p class="text-[11px] text-slate-300 leading-relaxed font-mono whitespace-pre-line">${escapeHTML(project.thumbnail_prompt || "-")}</p>
                            </div>
                        </div>

                        <div class="space-y-3">
                            <h4 class="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Daftar Adegan / Scenes (${scenes.length})</h4>
                            <div class="space-y-2.5">
                                ${scenes.map((s: any) => {
                                    let compactPrompt = "";
                                    if (s.visual_prompt_details) {
                                        const p = s.visual_prompt_details;
                                        compactPrompt = [
                                            p.scene_description ? `Scene: ${p.scene_description}.` : '',
                                            p.main_character_action ? `Main Subject: ${p.main_character_action}.` : '',
                                            p.secondary_character_action ? `Supporting Activity: ${p.secondary_character_action}.` : '',
                                            p.environment_motion ? `Environment Activity: ${p.environment_motion}.` : '',
                                            p.camera_movement ? `Camera Movement: ${p.camera_movement}.` : '',
                                            p.lighting ? `Lighting: ${p.lighting}.` : '',
                                            p.atmosphere ? `Mood: ${p.atmosphere}.` : '',
                                            p.technical_notes ? `Params: ${p.technical_notes}.` : ''
                                        ].filter(b => b !== '').join(' ');
                                    } else {
                                        compactPrompt = s.text_to_image || "";
                                    }
                                    return `
                                        <div class="bg-black/40 p-3 rounded-xl border border-slate-855 space-y-2">
                                            <div class="flex items-center justify-between text-[10px] border-b border-slate-855 pb-1.5">
                                                <span class="font-bold text-indigo-400 font-mono">SCENE ${escapeHTML(s.scene_number)}</span>
                                                <span class="text-slate-500 font-mono">${escapeHTML(s.estimated_duration || 8)} Detik</span>
                                            </div>
                                            <div class="space-y-1.5">
                                                <p class="text-[11px] text-slate-200 leading-relaxed"><span class="text-[10px] text-emerald-400 font-bold block uppercase font-mono">Voice Script:</span> "${escapeHTML(s.narrator_script)}"</p>
                                                <p class="text-[10px] text-slate-400 italic"><span class="text-[9px] text-indigo-400 font-bold block uppercase font-mono">Camera:</span> ${escapeHTML(s.camera_movement)}</p>
                                                <p class="text-[10px] text-slate-400 font-mono bg-[#0f111a] p-1.5 rounded border border-slate-800"><span class="text-[9px] text-purple-400 font-bold block uppercase font-mono">Visual Prompt:</span> ${escapeHTML(compactPrompt)}</p>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    </div>

                    <div class="p-3 border-t border-slate-855 bg-[#0a0b10] shrink-0 flex items-center justify-between gap-2.5">
                        <button id="btnDrawerDuplicate" data-action="drawer-duplicate" class="flex-1 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 text-xs font-bold transition text-center cursor-pointer">
                            📋 Duplikasi Projek
                        </button>
                        <button id="btnDrawerLoadCanvas" data-action="drawer-load" class="flex-1 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition text-center cursor-pointer">
                            ⚙️ Muat di Canvas
                        </button>
                    </div>
                `;
            },

            renderCharacterList() {
                const container = document.getElementById('characterLibraryContainer');
                if (!container) return;

                const searchVal = (document.getElementById('characterLibrarySearch') as HTMLInputElement)?.value.toLowerCase().trim() || "";
                let list = AppStore.state.characterLibrary;

                if (searchVal) {
                    list = list.filter((c: any) => 
                        (c.name && c.name.toLowerCase().includes(searchVal)) ||
                        (c.description && c.description.toLowerCase().includes(searchVal))
                    );
                }

                if (list.length === 0) {
                    container.innerHTML = `
                        <div class="col-span-1 sm:col-span-2 md:col-span-3 p-8 text-center text-slate-500 italic bg-black/10 border border-slate-855/60 border-dashed rounded-xl">
                            Belum ada aktor karakter unik yang disimpan atau cocok dengan kata kunci.
                        </div>
                    `;
                    return;
                }

                list.sort((a: any, b: any) => (b.is_favorite ? 1 : 0) - (a.is_favorite ? 1 : 0));

                container.innerHTML = list.map((char: any) => {
                    const favHeart = char.is_favorite ? "❤️" : "🤍";
                    const sanitizedImg = sanitizeImageSource(char.image_base64 || char.image_blob);
                    
                    return `
                        <div class="bg-[#0f111a] border border-slate-855/80 rounded-xl overflow-hidden flex flex-col group relative">
                            <div class="aspect-square w-full bg-black/40 relative overflow-hidden">
                                <img src="${sanitizedImg}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300" alt="${escapeHTML(char.name)}">
                                <button class="btn-char-fav absolute top-2 right-2 bg-black/60 hover:bg-black/80 p-1.5 rounded-full text-xs transition z-10 cursor-pointer" data-action="toggle-char-fav" data-id="${escapeHTML(char.id)}">
                                    ${favHeart}
                                </button>
                            </div>
                            <div class="p-3.5 space-y-1.5 flex-1 flex flex-col justify-between">
                                <div>
                                    <h4 class="text-xs font-bold text-slate-200 truncate">${escapeHTML(char.name)}</h4>
                                    <p class="text-[10px] text-slate-400 line-clamp-2 mt-0.5">${escapeHTML(char.description)}</p>
                                </div>
                                <div class="flex items-center justify-between border-t border-slate-855/50 pt-2.5 mt-1.5">
                                    <button class="btn-char-edit text-[10px] text-purple-400 font-bold hover:text-purple-300 cursor-pointer" data-action="edit-char" data-id="${escapeHTML(char.id)}">Edit</button>
                                    <button class="btn-char-delete text-[10px] text-rose-455 hover:text-rose-400 cursor-pointer" data-action="delete-char" data-id="${escapeHTML(char.id)}">Hapus</button>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
            },

            renderHistory() {
                const container = document.getElementById('historyList');
                const emptyState = document.getElementById('historyEmpty');
                const badge = document.getElementById('historyBadge');

                if (!container || !emptyState || !badge) return;

                const list = AppStore.state.generationHistory;

                if (list.length === 0) {
                    container.classList.add('hidden');
                    emptyState.classList.remove('hidden');
                    badge.innerText = "0 Saved";
                    return;
                }

                container.classList.remove('hidden');
                emptyState.classList.add('hidden');
                badge.innerText = `${list.length} Saved`;
                container.innerHTML = "";

                list.forEach((item: any) => {
                    const card = document.createElement('div');
                    card.className = "bg-[#0c0d13] border border-slate-855 rounded-xl p-3.5 flex items-center justify-between gap-4 transition duration-150";
                    
                    const truncatedText = item.text_script.length > 50 ? item.text_script.substring(0, 50) + "..." : item.text_script;
                    const escapedId = escapeHTML(item.id).replace(/'/g, "\\'");

                    card.innerHTML = `
                        <div class="flex items-center gap-3 flex-1 min-w-0">
                            <div class="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center">🔊</div>
                            <div class="truncate flex-1">
                                <span class="text-xs font-bold text-slate-200">${escapeHTML(item.voice_name)} (${escapeHTML(item.style_name)})</span>
                                <p class="text-[10px] text-slate-400 truncate italic mt-0.5">"${escapeHTML(truncatedText)}"</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            <button class="btn-load-history-audio px-2.5 py-1.5 rounded-lg bg-slate-900 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10 transition cursor-pointer" data-action="load-history-audio" data-id="${escapedId}">Load</button>
                            <button class="btn-delete-history-audio text-rose-400 hover:text-rose-300 p-1.5 rounded-lg bg-rose-500/10 transition cursor-pointer" data-action="delete-history-audio" data-id="${escapedId}">❌</button>
                        </div>
                    `;
                    container.appendChild(card);
                });
            },

            renderStoryboardHistoryList() {
                const container = document.getElementById('historyListContainer');
                const badge = document.getElementById('historyCountBadge');
                const list = AppStore.state.storyboardHistory;
                
                if (!container) return;

                if (list.length === 0) {
                    container.innerHTML = `<p class="text-[10px] text-slate-500 italic text-center py-2">Belum ada draf tersimpan.</p>`;
                    if (badge) badge.innerText = "0 Draft";
                    return;
                }
                
                if (badge) badge.innerText = `${list.length} Draft`;
                container.innerHTML = "";
                
                list.forEach((item: any) => {
                    const isActive = item.id === AppStore.state.currentActiveHistoryId;
                    const activeClass = isActive 
                        ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-200' 
                        : 'border-slate-800 bg-[#0f111a] text-slate-400 hover:border-slate-700 hover:text-slate-200';
                    
                    const card = document.createElement('div');
                    card.className = `btn-load-storyboard-draft group flex items-center justify-between p-2 rounded-xl border text-[10px] transition cursor-pointer ${activeClass}`;
                    card.setAttribute('data-action', 'load-storyboard-draft');
                    card.setAttribute('data-id', item.id);
                    
                    const truncatedTheme = item.theme.length > 32 ? item.theme.substring(0, 32) + "..." : item.theme;
                    const escapedId = escapeHTML(item.id).replace(/'/g, "\\'");
                    
                    card.innerHTML = `
                        <div class="flex-1 min-w-0 pr-2 pointer-events-none">
                            <div class="flex items-center gap-1.5 font-semibold">
                                <span class="text-indigo-400 font-mono text-[9px]">${item.timestamp}</span>
                                <span class="px-1 py-0.5 rounded bg-slate-850 text-[8px] text-slate-400 font-mono font-bold uppercase">${item.ratio}</span>
                            </div>
                            <p class="truncate text-slate-300 mt-0.5 text-[9px]">${escapeHTML(truncatedTheme)}</p>
                        </div>
                        <button class="btn-delete-draft opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 transition shrink-0 cursor-pointer" data-action="delete-storyboard-draft" data-id="${escapedId}">
                            ❌
                        </button>
                    `;
                    container.appendChild(card);
                });
            },

            renderStoryboard(data: any, ratio: string) {
                const emptyState = document.getElementById('emptyState');
                if (emptyState) emptyState.classList.add('hidden');
                
                const container = document.getElementById('storyboardContainer');
                if (container) container.classList.remove('hidden');
                
                const exportBar = document.getElementById('exportBar');
                if (exportBar) exportBar.classList.remove('hidden');

                const videoName = document.getElementById('videoNameText');
                if (videoName) videoName.innerText = data.video_name || generateSafeVideoFileName(data, (document.getElementById('themeInput') as HTMLTextAreaElement | null)?.value || '');
                const ytTitle = document.getElementById('ytTitleText');
                if (ytTitle) ytTitle.innerText = data.youtube_title;
                const ytDesc = document.getElementById('ytDescText');
                if (ytDesc) ytDesc.innerText = data.youtube_description;
                const htags = document.getElementById('hashtagsText');
                if (htags) htags.innerText = data.viral_hashtags;
                const tcap = document.getElementById('tiktokCaptionText');
                if (tcap) tcap.innerText = data.tiktok_caption;
                const icap = document.getElementById('igCaptionText');
                if (icap) icap.innerText = data.instagram_caption;
                const tprompt = document.getElementById('thumbnailPromptText');
                if (tprompt) tprompt.innerText = data.thumbnail_prompt;

                const thumbText = document.getElementById('thumbnailTextVal') as HTMLInputElement | null;
                if (thumbText) {
                    thumbText.value = data.thumbnail_text || data.thumbnail_hook || (data.youtube_title ? data.youtube_title.split("|")[0].trim() : "RAHASIA BARU!");
                }
                const thumbTextAlt = document.getElementById('thumbnailTextAltVal') as HTMLInputElement | null;
                if (thumbTextAlt) {
                    thumbTextAlt.value = data.thumbnail_text_alt || "TIPS VIRAL";
                }

                const deck = document.getElementById('scenesContainer');
                if (!deck) return;
                deck.innerHTML = "";
                renderSceneShortcutNav(data);

                data.scenes.forEach((scene: any, index: number) => {
                    const card = document.createElement('div');
                    card.id = `sceneCard_${index}`;
                    card.setAttribute('data-scene-card', 'true');
                    card.className = "bg-[#08090e] border border-slate-855 rounded-2xl overflow-hidden shadow-xl transition hover:border-slate-800 scroll-mt-24";
                    
                    let imagePromptToShow = scene.imagePrompt || "";
                    let videoPromptToShow = scene.videoPrompt || "";
                    let sceneDescToShow = scene.scene_description || "";
                    
                    if (!imagePromptToShow && scene.visual_prompt_details) {
                        const p = scene.visual_prompt_details;
                        sceneDescToShow = p.scene_description || "";
                        imagePromptToShow = [
                            p.scene_description ? `Scene: ${p.scene_description}.` : '',
                            p.main_character_action ? `Main Subject: ${p.main_character_action}.` : '',
                            p.secondary_character_action ? `Supporting Activity: ${p.secondary_character_action}.` : '',
                            p.environment_motion ? `Environment Activity: ${p.environment_motion}.` : '',
                            p.lighting ? `Lighting: ${p.lighting}.` : '',
                            p.atmosphere ? `Mood: ${p.atmosphere}.` : '',
                        ].filter(b => b !== '').join(' ');
                        videoPromptToShow = p.camera_movement || scene.camera_movement || "";
                    } else if (!imagePromptToShow) {
                        imagePromptToShow = scene.text_to_image || "";
                        videoPromptToShow = scene.camera_movement || "";
                    }

                    card.innerHTML = `
                        <div class="p-6 space-y-5">
                            <!-- Header Info -->
                            <div class="flex items-center justify-between border-b border-slate-855/60 pb-3">
                                <div class="flex items-center gap-2.5">
                                    <span class="w-6 h-6 rounded bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xs font-bold font-mono text-indigo-400">#${scene.scene_number}</span>
                                    <h3 class="text-xs font-bold text-slate-300 font-mono tracking-wider">DETAIL SCANNER</h3>
                                </div>
                                <span class="text-[10px] bg-indigo-500/10 text-indigo-400 font-mono px-2 py-0.5 rounded font-bold uppercase">${scene.estimated_duration || 8} Detik</span>
                            </div>

                            <!-- 1. Scene Description -->
                            <div class="space-y-1.5">
                                <h4 class="text-[10px] font-bold text-indigo-400 uppercase tracking-widest font-mono font-bold">🎬 Deskripsi Adegan (Scene Description)</h4>
                                <p class="text-xs text-slate-300 leading-relaxed bg-[#0c0e14] border border-slate-850 p-3.5 rounded-xl italic">
                                    "${escapeHTML(sceneDescToShow || 'Tidak ada deskripsi adegan.')}"
                                </p>
                            </div>

                            <!-- 2. Narration Text (Voiceover) -->
                            <div class="space-y-1.5">
                                <h4 class="text-[10px] font-bold text-emerald-400 uppercase tracking-widest font-mono font-bold">🎙️ Naskah Narasi (Voiceover Script)</h4>
                                <p class="text-xs text-slate-200 leading-relaxed bg-[#0f111a] border border-slate-855/50 p-3.5 rounded-xl">
                                    ${escapeHTML(scene.narrator_script || 'Tidak ada naskah narasi.')}
                                </p>
                            </div>

                            <!-- 3. Text-to-Image Prompt -->
                            <div class="space-y-2">
                                <div class="flex items-center justify-between">
                                    <h4 class="text-[10px] font-bold text-purple-400 uppercase tracking-widest font-mono font-bold">🎨 Text-to-Image Prompt</h4>
                                    <button class="px-2.5 py-1 bg-purple-550/10 hover:bg-purple-550/20 border border-purple-550/20 text-purple-400 rounded-lg text-[9px] font-bold transition flex items-center gap-1 cursor-pointer" data-action="copy-image-prompt" data-index="${index}">
                                        📋 Copy Prompt Gambar
                                    </button>
                                </div>
                                <p class="text-xs text-slate-300 leading-relaxed bg-[#0c0e14] border border-slate-850 p-3.5 rounded-xl font-mono whitespace-pre-line">
                                    ${escapeHTML(imagePromptToShow || 'Tidak ada prompt gambar.')}
                                </p>
                            </div>

                            <!-- 4. Image-to-Video Prompt -->
                            <div class="space-y-2">
                                <div class="flex items-center justify-between">
                                    <h4 class="text-[10px] font-bold text-teal-400 uppercase tracking-widest font-mono font-bold">🎥 Image-to-Video Prompt</h4>
                                    <button class="px-2.5 py-1 bg-teal-550/10 hover:bg-teal-550/20 border border-teal-550/20 text-teal-400 rounded-lg text-[9px] font-bold transition flex items-center gap-1 cursor-pointer" data-action="copy-video-prompt" data-index="${index}">
                                        📋 Copy Prompt Video
                                    </button>
                                </div>
                                <p class="text-xs text-slate-355 leading-relaxed bg-[#0c0e14] border border-slate-850 p-3.5 rounded-xl font-mono whitespace-pre-line">
                                    ${escapeHTML(videoPromptToShow || 'Tidak ada prompt video.')}
                                </p>
                            </div>

                            <!-- 5. Scene Edit & Regenerate Lab -->
                            <div class="space-y-3 border border-slate-800/70 bg-[#0b0d13] rounded-2xl p-4">
                                <div class="flex flex-col md:flex-row md:items-center justify-between gap-2">
                                    <div>
                                        <h4 class="text-[10px] font-bold text-amber-300 uppercase tracking-widest font-mono">✍️ Scene Edit & Regenerate Lab</h4>
                                        <p class="text-[10px] text-slate-500 mt-1">Edit manual atau beri komentar lalu regenerate scene ini saja.</p>
                                        <p class="text-[9px] text-slate-600 mt-1">Version History: ${getSceneVersionCount(index)} versi tersimpan untuk undo.</p>
                                    </div>
                                    <div class="flex flex-wrap gap-1.5 justify-end">
                                        <button class="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl text-[10px] font-bold transition cursor-pointer" data-action="undo-scene-version" data-index="${index}">
                                            ↩️ Undo Last
                                        </button>
                                        <button class="px-3 py-1.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-500 rounded-xl text-[10px] font-bold transition cursor-pointer" data-action="clear-scene-version-history" data-index="${index}">
                                            Clear History
                                        </button>
                                        <button class="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl text-[10px] font-bold transition cursor-pointer" data-action="toggle-scene-editor" data-index="${index}">
                                            Buka / Tutup Editor
                                        </button>
                                    </div>
                                </div>

                                <div id="sceneEditor_${index}" class="hidden space-y-3 pt-2">
                                    <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
                                        <div class="md:col-span-3 space-y-1.5">
                                            <label class="text-[9px] font-bold text-indigo-300 uppercase tracking-widest">Scene Description</label>
                                            <textarea id="editSceneDescription_${index}" class="w-full min-h-[90px] rounded-xl bg-[#07080d] border border-slate-800 p-3 text-xs text-slate-200 outline-none focus:border-indigo-500 resize-y">${escapeHTML(sceneDescToShow || '')}</textarea>
                                        </div>
                                        <div class="space-y-1.5">
                                            <label class="text-[9px] font-bold text-indigo-300 uppercase tracking-widest">Duration</label>
                                            <input id="editDuration_${index}" type="number" min="3" max="20" value="${scene.estimated_duration || 8}" class="w-full rounded-xl bg-[#07080d] border border-slate-800 p-3 text-xs text-slate-200 outline-none focus:border-indigo-500">
                                        </div>
                                    </div>

                                    <div class="space-y-1.5">
                                        <label class="text-[9px] font-bold text-emerald-300 uppercase tracking-widest">TTS / Narration Script</label>
                                        <textarea id="editNarration_${index}" class="w-full min-h-[90px] rounded-xl bg-[#07080d] border border-slate-800 p-3 text-xs text-slate-200 outline-none focus:border-emerald-500 resize-y">${escapeHTML(scene.narrator_script || '')}</textarea>
                                    </div>

                                    <div class="space-y-1.5">
                                        <label class="text-[9px] font-bold text-purple-300 uppercase tracking-widest">Text-to-Image Prompt</label>
                                        <textarea id="editImagePrompt_${index}" class="w-full min-h-[120px] rounded-xl bg-[#07080d] border border-slate-800 p-3 text-xs text-slate-200 font-mono outline-none focus:border-purple-500 resize-y">${escapeHTML(imagePromptToShow || '')}</textarea>
                                    </div>

                                    <div class="space-y-1.5">
                                        <label class="text-[9px] font-bold text-teal-300 uppercase tracking-widest">Image-to-Video Prompt</label>
                                        <textarea id="editVideoPrompt_${index}" class="w-full min-h-[150px] rounded-xl bg-[#07080d] border border-slate-800 p-3 text-xs text-slate-200 font-mono outline-none focus:border-teal-500 resize-y">${escapeHTML(videoPromptToShow || '')}</textarea>
                                    </div>

                                    <div class="space-y-1.5 border-t border-slate-800/70 pt-3">
                                        <label class="text-[9px] font-bold text-amber-300 uppercase tracking-widest">Komentar Regenerate / Repair Note</label>
                                        <textarea id="regenFeedback_${index}" class="w-full min-h-[80px] rounded-xl bg-[#07080d] border border-amber-500/20 p-3 text-xs text-slate-200 outline-none focus:border-amber-500 resize-y" placeholder="Contoh: ini di Veo failed generate, gerakan kamera terlalu rumit, tolong bikin prompt video lebih simpel dan jelas."></textarea>
                                        <p class="text-[9px] text-slate-500">Pilih preset cepat di bawah, atau tulis komentar manual. Setelah itu klik Fix field tertentu atau Regenerate Full Scene.</p>
                                        <div class="grid grid-cols-2 md:grid-cols-4 gap-1.5 pt-1">
                                            <button class="bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 font-bold py-1.5 px-2 rounded-lg text-[8px] transition cursor-pointer" data-action="apply-regen-preset" data-preset="veo_failed" data-index="${index}">Veo Failed</button>
                                            <button class="bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 border border-orange-500/20 font-bold py-1.5 px-2 rounded-lg text-[8px] transition cursor-pointer" data-action="apply-regen-preset" data-preset="kling_failed" data-index="${index}">Kling Failed</button>
                                            <button class="bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/20 font-bold py-1.5 px-2 rounded-lg text-[8px] transition cursor-pointer" data-action="apply-regen-preset" data-preset="too_static" data-index="${index}">Too Static</button>
                                            <button class="bg-slate-500/10 hover:bg-slate-500/20 text-slate-300 border border-slate-500/20 font-bold py-1.5 px-2 rounded-lg text-[8px] transition cursor-pointer" data-action="apply-regen-preset" data-preset="too_complex" data-index="${index}">Too Complex</button>
                                            <button class="bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 border border-pink-500/20 font-bold py-1.5 px-2 rounded-lg text-[8px] transition cursor-pointer" data-action="apply-regen-preset" data-preset="more_emotional" data-index="${index}">More Emotional</button>
                                            <button class="bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/20 font-bold py-1.5 px-2 rounded-lg text-[8px] transition cursor-pointer" data-action="apply-regen-preset" data-preset="more_viral" data-index="${index}">More Viral</button>
                                            <button class="bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 font-bold py-1.5 px-2 rounded-lg text-[8px] transition cursor-pointer" data-action="apply-regen-preset" data-preset="image_not_match" data-index="${index}">Image Mismatch</button>
                                            <button class="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 font-bold py-1.5 px-2 rounded-lg text-[8px] transition cursor-pointer" data-action="apply-regen-preset" data-preset="tts_flat" data-index="${index}">TTS Flat</button>
                                        </div>
                                    </div>

                                    <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
                                        <button class="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 font-bold py-2 px-3 rounded-xl text-[9px] transition cursor-pointer" data-action="regenerate-scene-field" data-target="description" data-index="${index}">
                                            ✍️ Perbaiki Deskripsi
                                        </button>
                                        <button class="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 font-bold py-2 px-3 rounded-xl text-[9px] transition cursor-pointer" data-action="regenerate-scene-field" data-target="narration" data-index="${index}">
                                            🎙️ Perbaiki Narasi
                                        </button>
                                        <button class="bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 font-bold py-2 px-3 rounded-xl text-[9px] transition cursor-pointer" data-action="regenerate-scene-field" data-target="image" data-index="${index}">
                                            🖼️ Perbaiki Image Prompt
                                        </button>
                                        <button class="bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/20 font-bold py-2 px-3 rounded-xl text-[9px] transition cursor-pointer" data-action="regenerate-scene-field" data-target="video" data-index="${index}">
                                            🎥 Perbaiki Video Prompt
                                        </button>
                                    </div>

                                    <div class="flex flex-wrap justify-end gap-2 pt-1">
                                        <button class="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold py-2 px-4 rounded-xl text-[10px] transition cursor-pointer" data-action="save-scene-edits" data-index="${index}">
                                            💾 Simpan Edit
                                        </button>
                                        <button class="bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/25 font-bold py-2 px-4 rounded-xl text-[10px] transition cursor-pointer" data-action="regenerate-scene" data-index="${index}">
                                            ♻️ Regenerate Scene Full
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- 6. Scene Action Bar (Daily v1 cleanup) -->
                            <div class="pt-3 border-t border-slate-800/60 space-y-2">
                                <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
                                    <div class="flex flex-wrap gap-2">
                                        <button class="bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/25 font-bold py-2 px-4 rounded-xl text-[11px] transition flex items-center gap-1.5 cursor-pointer" data-action="toggle-scene-editor" data-index="${index}">
                                            ✍️ Edit / Perbaiki
                                        </button>
                                        <button class="bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-300 border border-indigo-500/20 font-bold py-2 px-4 rounded-xl text-[11px] transition flex items-center gap-1.5 cursor-pointer" data-action="copy-scene-package" data-index="${index}">
                                            📦 Copy Scene
                                        </button>
                                        <button class="btn-send-scene bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-xl text-[11px] transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/10" data-action="send-scene-script" data-index="${index}">
                                            🎙️ Voice Lab ↗
                                        </button>
                                    </div>

                                    <details class="group relative">
                                        <summary class="list-none select-none cursor-pointer bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 font-bold py-2 px-4 rounded-xl text-[11px] transition flex items-center gap-1.5">
                                            ⋯ Aksi Scene Lainnya
                                        </summary>
                                        <div class="mt-2 lg:absolute lg:right-0 lg:top-full lg:z-30 bg-[#090b11] border border-slate-800 rounded-2xl p-2 shadow-2xl shadow-black/40 min-w-[220px] grid gap-1.5">
                                            <button class="w-full bg-sky-600/15 hover:bg-sky-600/25 text-sky-300 border border-sky-500/20 font-bold py-2 px-3 rounded-xl text-[11px] transition flex items-center gap-1.5 cursor-pointer" data-action="add-scene-after" data-index="${index}">
                                                ➕ Tambah Scene Setelah Ini
                                            </button>
                                            <button class="w-full bg-purple-600/15 hover:bg-purple-600/25 text-purple-300 border border-purple-500/20 font-bold py-2 px-3 rounded-xl text-[11px] transition flex items-center gap-1.5 cursor-pointer" data-action="duplicate-scene" data-index="${index}">
                                                📋 Duplikat Scene
                                            </button>
                                            <button class="w-full bg-rose-600/10 hover:bg-rose-600/20 text-rose-300 border border-rose-500/20 font-bold py-2 px-3 rounded-xl text-[11px] transition flex items-center gap-1.5 cursor-pointer" data-action="delete-scene" data-index="${index}">
                                                🗑️ Hapus Scene
                                            </button>
                                        </div>
                                    </details>
                                </div>
                                <p class="text-[9px] text-slate-600 text-right">Tombol utama tetap terlihat. Aksi tambahan disimpan agar scene tidak terlalu penuh.</p>
                            </div>
                        </div>
                    `;
                    deck.appendChild(card);
                });
            }
        };

        // ==========================================
        // 4. ACTION CONTROLLERS & DATA SYNC
        // ==========================================
        async function syncProjectsAndRender() {
            try {
                const list = await ProjectRepo.getAll();
                const filters = AppStore.state.workflowFilters;
                
                let filtered = list;
                
                // Search filter
                if (filters.search) {
                    const s = filters.search.toLowerCase();
                    filtered = filtered.filter((p: any) => 
                        (p.title && p.title.toLowerCase().includes(s)) ||
                        (p.theme && p.theme.toLowerCase().includes(s))
                    );
                }
                // Tag filter
                if (filters.tag) {
                    const t = filters.tag.toLowerCase();
                    filtered = filtered.filter((p: any) => 
                        p.tags && p.tags.some((tag: string) => tag.toLowerCase().includes(t))
                    );
                }
                // Category filter
                if (filters.category) {
                    filtered = filtered.filter((p: any) => p.category === filters.category);
                }
                // Status filter
                if (filters.status) {
                    filtered = filtered.filter((p: any) => p.status === filters.status);
                }
                // Favorite filter
                if (filters.favoriteOnly) {
                    filtered = filtered.filter((p: any) => p.isFavorite);
                }
                // Archive filter
                if (filters.archiveOnly) {
                    filtered = filtered.filter((p: any) => p.isArchived);
                } else {
                    filtered = filtered.filter((p: any) => !p.isArchived);
                }
                
                const parts = (filters.sortBy || 'created_at').split('-');
                const sortByField = parts[0];
                const sortDir = filters.sortDir || 'desc';

                filtered.sort((a: any, b: any) => {
                    let valA = a[sortByField];
                    let valB = b[sortByField];
                    if (sortByField === 'created_at') {
                        valA = new Date(valA || 0).getTime();
                        valB = new Date(valB || 0).getTime();
                    }
                    if (valA < valB) return sortDir === 'asc' ? -1 : 1;
                    if (valA > valB) return sortDir === 'asc' ? 1 : -1;
                    return 0;
                });
                
                const mappedHistoryList = list
                    .filter((p: any) => p.status === 'Generated' || p.status === 'Voice Generated' || p.status === 'Published' || p.status === 'Exported')
                    .map((p: any) => {
                        const dateObj = new Date(p.created_at);
                        const displayTime = isNaN(dateObj.getTime()) ? '-' : dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        return {
                            id: p.id,
                            theme: p.theme || '',
                            ratio: p.ratio || '16:9',
                            timestamp: displayTime,
                            data: p.data_json || {}
                        };
                    });

                AppStore.setState({ 
                    workflowProjects: list,
                    filteredWorkflowProjects: filtered,
                    storyboardHistory: mappedHistoryList
                });
            } catch (err) {
                console.error("Gagal sinkronisasi data projek:", err);
            }
        }

        async function syncCharactersAndRender() {
            try {
                const list = await CharacterRepo.getAll();
                AppStore.setState({ characterLibrary: list });
            } catch (err) {
                console.error("Gagal sinkronisasi pustaka karakter:", err);
            }
        }

        async function seedDefaultCategoriesAndSettings() {
            let savedKey = localStorage.getItem('kcreator_api_key');
            if (!savedKey) {
                savedKey = await SettingsRepo.get('api_key');
                if (savedKey) {
                    localStorage.setItem('kcreator_api_key', savedKey);
                }
            }
            if (savedKey) {
                AppStore.setState({ globalApiKey: savedKey });
            }
            const savedRatio = await SettingsRepo.get('preferred_ratio');
            if (savedRatio) {
                AppStore.setState({ activeRatio: savedRatio });
            } else {
                await SettingsRepo.put('preferred_ratio', '16:9');
            }
        }

        function syncApiKey(value: string) {
            AppStore.setState({ globalApiKey: value });
            SettingsRepo.put('api_key', value);
            localStorage.setItem('kcreator_api_key', value);
        }

        // ==========================================
        // 5. DB METRICS INSPECTOR HANDLERS
        // ==========================================
        async function dbGetStatistics(): Promise<any> {
            return new Promise((resolve) => {
                const db = dbContainer.db;
                if (!db) {
                    return resolve({ projects: 0, voice_assets: 0, characters: 0, templates: 0, prompts: 0 });
                }
                const stores = ['projects', 'voice_assets', 'characters', 'templates', 'prompts'];
                const stats: any = {};
                
                const activeStores = stores.filter(s => db.objectStoreNames.contains(s));
                if (activeStores.length === 0) {
                    return resolve({ projects: 0, voice_assets: 0, characters: 0, templates: 0, prompts: 0 });
                }

                const tx = db.transaction(activeStores, 'readonly');
                let completed = 0;
                tx.onerror = () => {
                    resolve({ projects: 0, voice_assets: 0, characters: 0, templates: 0, prompts: 0 });
                };

                for (const storeName of stores) {
                    if (!db.objectStoreNames.contains(storeName)) {
                        stats[storeName] = 0;
                        continue;
                    }
                    const store = tx.objectStore(storeName);
                    const req = store.count();
                    req.onsuccess = () => {
                        stats[storeName] = req.result;
                        completed++;
                        if (completed === activeStores.length) resolve(stats);
                    };
                    req.onerror = () => {
                        stats[storeName] = 0;
                        completed++;
                        if (completed === activeStores.length) resolve(stats);
                    };
                }
            });
        }

        async function getStorageUsage(): Promise<any> {
            return new Promise((resolve) => {
                const db = dbContainer.db;
                if (!db) {
                    return resolve({ total: 0, text: 0, audio: 0, image: 0 });
                }
                const storeNames = Array.from(db.objectStoreNames);
                const usage = { total: 0, text: 0, audio: 0, image: 0 };
                if (storeNames.length === 0) {
                    return resolve(usage);
                }
                const tx = db.transaction(storeNames, 'readonly');
                let processedStores = 0;

                for (const storeName of storeNames) {
                    const store = tx.objectStore(storeName);
                    const req = store.getAll();
                    req.onsuccess = () => {
                        const records = req.result || [];
                        let sizeBytes = 0;
                        for (const item of records) {
                            if (storeName === 'characters' && item.image_blob instanceof Blob) {
                                usage.image += item.image_blob.size;
                            } else if (storeName === 'characters' && typeof item.image_base64 === 'string') {
                                usage.image += item.image_base64.length;
                            } else if (storeName === 'voice_assets' && item.audio_blob instanceof Blob) {
                                usage.audio += item.audio_blob.size;
                            } else {
                                sizeBytes += encodeURIComponent(JSON.stringify(item)).length;
                            }
                        }
                        usage.text += sizeBytes;
                        processedStores++;
                        if (processedStores === storeNames.length) {
                            usage.total = usage.text + usage.audio + usage.image;
                            resolve(usage);
                        }
                    };
                    req.onerror = () => {
                        processedStores++;
                        if (processedStores === storeNames.length) {
                            resolve(usage);
                        }
                    };
                }
            });
        }

        async function updateInspectorMetrics() {
            if (!dbContainer.db) return;

            const inspectConn = document.getElementById('inspectConnStatus');
            if (inspectConn) {
                inspectConn.innerText = "Connected";
                inspectConn.className = "font-bold text-emerald-400";
            }
            const inspectRatio = document.getElementById('inspectPreferredRatio');
            if (inspectRatio) inspectRatio.innerText = AppStore.state.activeRatio;
            
            const migrationStatus = localStorage.getItem('k_v2_migration_done') === 'true' ? "Completed" : "Pending";
            const inspectMig = document.getElementById('inspectMigrationStatus');
            if (inspectMig) inspectMig.innerText = migrationStatus;

            const stats = await dbGetStatistics();
            const inspectProj = document.getElementById('inspectProjCount');
            const inspectChar = document.getElementById('inspectCharCount');
            const inspectVoice = document.getElementById('inspectVoiceCount');
            const inspectTemp = document.getElementById('inspectTemplateCount');
            const inspectPrompt = document.getElementById('inspectPromptCount');

            if (inspectProj) inspectProj.innerText = stats.projects || 0;
            if (inspectChar) inspectChar.innerText = stats.characters || 0;
            if (inspectVoice) inspectVoice.innerText = stats.voice_assets || 0;
            if (inspectTemp) inspectTemp.innerText = stats.templates || 0;
            if (inspectPrompt) inspectPrompt.innerText = stats.prompts || 0;

            const memory = await getStorageUsage();
            const toMB = (bytes: number) => (bytes / (1024 * 1024)).toFixed(3) + " MB";

            const textSizeEl = document.getElementById('inspectTextSize');
            const audioSizeEl = document.getElementById('inspectAudioSize');
            const imageSizeEl = document.getElementById('inspectImageSize');
            const totalSizeEl = document.getElementById('inspectTotalSize');

            if (textSizeEl) textSizeEl.innerText = toMB(memory.text);
            if (audioSizeEl) audioSizeEl.innerText = toMB(memory.audio);
            if (imageSizeEl) imageSizeEl.innerText = toMB(memory.image);
            if (totalSizeEl) totalSizeEl.innerText = toMB(memory.total);
        }

        function toggleDatabaseInspector() {
            const drawer = document.getElementById('databaseInspectorDrawer');
            if (!drawer) return;
            if (drawer.classList.contains('translate-x-full')) {
                drawer.classList.remove('translate-x-full');
                drawer.classList.add('translate-x-0');
                updateInspectorMetrics();
                addDBLog("Database Inspector Panel dibuka.", "info");
            } else {
                drawer.classList.remove('translate-x-0');
                drawer.classList.add('translate-x-full');
            }
        }

        // ==========================================
        // 6. DB ACTION TESTING BACKUPS
        // ==========================================
        async function testSaveProject() {
            if (!dbContainer.db) return;
            try {
                addDBLog("Memulai uji simpan dummy project...", "warning");
                const dummyId = generateSecureId();
                const dummyProj = {
                    id: dummyId,
                    title: `Uji Coba Projek ${dummyId.substring(0, 8)}`,
                    theme: "Pengujian stabilitas database K Creator Suite Pro 2.2.",
                    status: 'Draft',
                    category: 'Storyboard',
                    source_project_id: null,
                    tags: ['Test', 'Demo'],
                    isFavorite: false,
                    isArchived: false,
                    data_json: {
                        youtube_title: `Shorts Uji Coba ${dummyId.substring(0, 8)}`,
                        youtube_description: "Ini draf tiruan untuk menguji database.",
                        scenes: [
                            { scene_number: 1, narrator_script: "Testing.", estimated_duration: 5, visual_prompt_details: { scene_description: "Dummy test.", main_character_action: "None", secondary_character_action: "None", environment_motion: "None", camera_movement: "None", lighting: "None", atmosphere: "None", technical_notes: "None" } }
                        ]
                    }
                };
                await ProjectRepo.put(dummyProj);
                showToast("Uji coba simpan projek sukses!", "success");
                await logWorkflowActivity(`Uji coba simpan dummy project: "${dummyProj.title}"`, 'success');
                updateInspectorMetrics();
                syncProjectsAndRender();
            } catch (err: any) {
                console.error("Test save project failed:", err);
                addDBLog(`Gagal uji simpan projek: ${err.message}`, "error");
                showToast("Uji coba simpan projek gagal.", "error");
            }
        }

        async function testSaveAudio() {
            if (!dbContainer.db) return;
            try {
                addDBLog("Memulai uji simpan dummy audio...", "warning");
                const sampleRate = 22050;
                const dummyPCM = new Int16Array(sampleRate);
                const dummyWavBlob = pcmToWav(dummyPCM, sampleRate);

                await VoiceRepo.put({
                    id: generateSecureId(),
                    project_id: null,
                    voice_name: "Test Zephyr",
                    style_name: "Conversational",
                    text_script: "Uji coba penyimpanan suara tiruan.",
                    audio_blob: dummyWavBlob,
                    created_at: new Date()
                });
                showToast("Uji coba simpan audio sukses!", "success");
                await logWorkflowActivity("Uji coba penyimpanan biner dummy audio sukses", 'success');
                
                const voiceAssets = await VoiceRepo.getAll();
                voiceAssets.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                AppStore.setState({ generationHistory: voiceAssets });
                updateInspectorMetrics();
            } catch (err: any) {
                console.error("Test save audio failed:", err);
                addDBLog(`Gagal uji simpan audio: ${err.message}`, "error");
                showToast("Uji coba simpan audio gagal.", "error");
            }
        }

        async function exportDatabaseToJSON() {
            if (!dbContainer.db) return;
            try {
                showToast("Menyiapkan file cadangan...", "success");
                addDBLog("Memulai ekspor database...", "warning");
                
                const storeNames = Array.from(dbContainer.db.objectStoreNames);
                const memoryDump: any = {};
                if (storeNames.length === 0) return;

                const tx = dbContainer.db.transaction(storeNames, 'readonly');
                await new Promise<void>((res, rej) => {
                    let completedStores = 0;
                    for (const storeName of storeNames) {
                        const store = tx.objectStore(storeName);
                        const req = store.getAll();
                        req.onsuccess = () => {
                            memoryDump[storeName] = req.result || [];
                            completedStores++;
                            if (completedStores === storeNames.length) res();
                        };
                        req.onerror = () => rej(req.error);
                    }
                });

                if (memoryDump['characters']) {
                    for (const char of memoryDump['characters']) {
                        if (char.image_blob instanceof Blob) {
                            char._mime = char.image_blob.type;
                            char._base64 = await helperBlobToBase64(char.image_blob);
                            delete char.image_blob;
                        }
                    }
                }
                if (memoryDump['voice_assets']) {
                    for (const voice of memoryDump['voice_assets']) {
                        if (voice.audio_blob instanceof Blob) {
                            voice._mime = voice.audio_blob.type;
                            voice._base64 = await helperBlobToBase64(voice.audio_blob);
                            delete voice.audio_blob;
                        }
                    }
                }

                const payloadString = JSON.stringify(memoryDump, null, 2);
                const payloadBlob = new Blob([payloadString], { type: 'application/json' });
                const exportUrl = URL.createObjectURL(payloadBlob);

                const today = new Date();
                const dateTag = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

                const downloader = document.createElement('a');
                downloader.href = exportUrl;
                downloader.download = `KCreatorSuite_Backup_${dateTag}.json`;
                document.body.appendChild(downloader);
                downloader.click();
                document.body.removeChild(downloader);
                URL.revokeObjectURL(exportUrl);

                showToast("Database Studio berhasil diekspor!", "success");
                addDBLog("Database berhasil diekspor menjadi cadangan JSON.", "success");
                updateInspectorMetrics();
            } catch (err: any) {
                console.error("Export process failed:", err);
                addDBLog(`Proses ekspor gagal: ${err.message}`, "error");
                showToast("Proses ekspor data gagal.", "error");
            }
        }

        async function importDatabaseFromJSON(jsonString: string) {
            if (!dbContainer.db) return;
            try {
                const dump = JSON.parse(jsonString);
                const storeNames = Array.from(dbContainer.db.objectStoreNames);
                
                showToast("Pemulihan cadangan data...", "success");
                addDBLog("Pemulihan database dari file cadangan...", "warning");
                
                const currentApiKey = await SettingsRepo.get('api_key');
                const currentRatio = await SettingsRepo.get('preferred_ratio');

                for (const storeName of storeNames) {
                    const storeRepo = new BaseRepository(storeName);
                    await storeRepo.clear();
                }

                for (const storeName of storeNames) {
                    if (!dump[storeName]) continue;
                    const records = dump[storeName];
                    const storeRepo = new BaseRepository(storeName);

                    for (const record of records) {
                        if (storeName === 'characters') {
                            if (record._base64) {
                                record.image_blob = helperBase64ToBlob(record._base64, record._mime);
                                delete record._base64;
                                delete record._mime;
                            }
                        } else if (storeName === 'voice_assets') {
                            if (record._base64) {
                                record.audio_blob = helperBase64ToBlob(record._base64, record._mime);
                                delete record._base64;
                                delete record._mime;
                            }
                        }
                        
                        if (record.created_at) record.created_at = new Date(record.created_at);
                        if (record.updated_at) record.updated_at = new Date(record.updated_at);

                        await storeRepo.put(record);
                    }
                }

                if (currentApiKey) await SettingsRepo.put('api_key', currentApiKey);
                if (currentRatio) await SettingsRepo.put('preferred_ratio', currentRatio);

                showToast("Pemulihan data studio selesai! Memulai ulang halaman...", "success");
                addDBLog("Database berhasil dipulihkan secara penuh.", "success");
                setTimeout(() => window.location.reload(), 1500);
            } catch (err: any) {
                console.error("Restore failed:", err);
                addDBLog(`Gagal memulihkan database: ${err.message}`, "error");
                showToast("Gagal memulihkan database.", "error");
            }
        }

        // ==========================================
        // 7. STORYBOARDING PROCEDURES
        // ==========================================
        async function generateStoryboard() {
            if (!ensurePrivateBetaAccess(true)) return;
            const theme = (document.getElementById('themeInput') as HTMLTextAreaElement).value.trim();
            if (!theme) {
                showToast("Isi tema atau topik bahasan konten pada deck kontrol!", "error");
                return;
            }

            clearGenerationFeedback();
            const narratorStyle = (document.getElementById('narratorStyle') as HTMLSelectElement).value;
            let animStyle = (document.getElementById('animationStyle') as HTMLSelectElement).value;
            if (animStyle === "Gaya Kustom") {
                animStyle = (document.getElementById('customStyleInput') as HTMLInputElement).value.trim() || "Cinematic 2D";
            }
            const constraints = (document.getElementById('constraintsInput') as HTMLTextAreaElement).value.trim();
            const includeCta = (document.getElementById('ctaToggle') as HTMLInputElement).checked;

            const btn = document.getElementById('generateBtn') as HTMLButtonElement;
            const progressTexts = [
                "Generating storyboard...",
                "Generating prompt...",
                "Generating narration..."
            ];
            let progressIndex = 0;
            const updateProgressText = () => {
                if (btn) {
                    const text = progressTexts[progressIndex];
                    btn.innerHTML = `<span class="col-span-1 w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin inline-block align-middle mr-2"></span> ${text}`;
                }
            };

            if (btn) {
                btn.disabled = true;
                updateProgressText();
            }
            const progressInterval = setInterval(() => {
                progressIndex = (progressIndex + 1) % progressTexts.length;
                updateProgressText();
            }, 2500);

            updateGlobalStatus("Director Engine Thinking", "amber");

            const sceneCount = (document.getElementById('sceneCountInput') as HTMLInputElement)?.value || '5';
            const sceneDurVal = (document.getElementById('sceneDuration') as HTMLInputElement)?.value || '8';

            let result;
            try {
                result = await GeminiService.generateStoryboard(
                    theme, narratorStyle, animStyle, constraints, includeCta, AppStore.state.activeRatio, AppStore.state.activeSceneMode, sceneCount, sceneDurVal, AppStore.state.globalApiKey, getStoryboardOutputLanguage(), getCharacterConsistencyMode()
                );
            } finally {
                clearInterval(progressInterval);
            }

            if (!result.success) {
                const errorMessage = result.error || "Gagal merumuskan storyboard. Coba lagi atau cek konfigurasi server.";
                showToast(errorMessage, "error");
                showGenerationFeedback(errorMessage, 'generate');
                addDBLog(`Generate gagal: ${errorMessage}`, 'error');
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = "Rumuskan Storyboard (AI)";
                }
                updateGlobalStatus("Director Studio Active", "indigo");
                return;
            }

            const parsedData = result.data;
            parsedData.outputLanguage = getStoryboardOutputLanguage();
            parsedData.characterConsistencyMode = getCharacterConsistencyMode();
            parsedData.video_name = parsedData.video_name || generateSafeVideoFileName(parsedData, theme);
            AppStore.setState({ activeStoryboardData: parsedData, sceneVersionHistory: {} });

            const selectedCategory = (document.getElementById('projectCategorySelect') as HTMLInputElement | HTMLSelectElement | null)?.value || "Storyboard";
            const projectId = generateSecureId();
            const smartProjectTitle = generateSmartProjectTitle(parsedData, theme);
            const newProject = {
                id: projectId,
                title: smartProjectTitle,
                theme: theme,
                status: "Generated",
                category: selectedCategory,
                source_project_id: null,
                ratio: AppStore.state.activeRatio,
                thumbnail_prompt: parsedData.thumbnail_prompt || "",
                data_json: parsedData,
                isFavorite: false,
                isArchived: false,
                tags: [] as string[],
                created_at: new Date(),
                updated_at: new Date()
            };

            try {
                await ProjectRepo.put(newProject);
                await syncProjectsAndRender();
                AppStore.setState({ currentActiveHistoryId: projectId, activeCloudProjectId: null });

                const photoBlob = AppStore.state.characterImageBlob;
                if (photoBlob) {
                    const reader = new FileReader();
                    reader.onloadend = async () => {
                        const base64Data = reader.result;
                        const charRecord = {
                            id: projectId,
                            name: `Actor ${parsedData.youtube_title.substring(0, 15)}`,
                            description: `Consistent main actor for theme: ${theme.substring(0, 30)}...`,
                            image_base64: base64Data,
                            mime_type: AppStore.state.characterImageMime,
                            is_favorite: false
                        };
                        await CharacterRepo.put(charRecord);
                        await syncCharactersAndRender();
                    };
                    reader.readAsDataURL(photoBlob);
                }

                Views.renderStoryboard(parsedData, AppStore.state.activeRatio);
                clearGenerationFeedback();
                setCloudSaveStatus(AppStore.state.authUser?.id ? 'unsaved' : 'guest', AppStore.state.authUser?.id ? 'Unsaved' : 'Guest Draft');
                showToast("Naskah visual storyboard berhasil dirumuskan!", "success");

                if (AppStore.state.authUser?.id && isSupabaseConfigured()) {
                    saveActiveProjectToCloud(true).then((cloudId) => {
                        if (cloudId) {
                            setCloudSaveStatus('saved', 'Auto-saved');
                            showToast("Project otomatis tersimpan ke cloud.", "success");
                        }
                    });
                }
            } catch (err: any) {
                console.error("Gagal memproses pasca-generasi storyboard:", err);
                const errorMessage = err?.message || "Gagal mengamankan draf data ke penyimpanan.";
                showToast(errorMessage, "error");
                showGenerationFeedback(errorMessage, 'generate');
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = "Rumuskan Storyboard (AI)";
                }
                updateGlobalStatus("Director Studio Active", "indigo");
            }
        }

        // ==========================================
        // 8. VOICE LAB SYNTHESIS PROCEDURES
        // ==========================================
        async function generateHumanTTS() {
            if (!ensurePrivateBetaAccess(true)) return;
            const script = (document.getElementById('scriptInput') as HTMLTextAreaElement).value.trim();
            if (!script) {
                showToast("Ketik naskah vokal terlebih dahulu!", "error");
                return;
            }

            AudioEngine.stop();
            updateGlobalStatus("Synthesizing Audio Engine", "amber");

            const btn = document.getElementById('generateVoiceBtn') as HTMLButtonElement;
            if (btn) {
                btn.disabled = true;
                btn.innerText = "Sintesis Suara...";
            }

            const voiceName = (document.getElementById('voiceSelector') as HTMLSelectElement).value;
            const emotionSelect = document.getElementById('voiceEmotion') as HTMLSelectElement;
            const actingPrefix = emotionSelect.options[emotionSelect.selectedIndex].getAttribute('data-prefix') || "";
            const pace = parseFloat((document.getElementById('speechPace') as HTMLInputElement).value) / 10;
            const injectBreaths = (document.getElementById('injectBreaths') as HTMLInputElement).checked;
            const injectSighs = (document.getElementById('injectSighs') as HTMLInputElement).checked;

            const result = await GeminiService.generateTTS(
                script, voiceName, actingPrefix, pace, injectBreaths, injectSighs, AppStore.state.globalApiKey
            );

            if (!result.success) {
                const errorMessage = result.error || "Sintesis audio gagal.";
                showToast(errorMessage, "error");
                showGenerationFeedback(errorMessage, 'tts');
                if (btn) {
                    btn.disabled = false;
                    btn.innerText = "Sintesis Suara (TTS)";
                }
                updateGlobalStatus("Voice Lab Aktif", "emerald");
                return;
            }

            const { pcm16, sampleRate } = result.data;
            try {
                const wavBlob = pcmToWav(pcm16, sampleRate);
                audioState.currentWavBlob = wavBlob;
                
                AudioMemoryRegistry.revoke(audioState.activeAudioUrl);
                audioState.activeAudioUrl = AudioMemoryRegistry.register(wavBlob);
                const audioUrl = audioState.activeAudioUrl;

                AudioEngine.init();

                const wavBuffer = await responseToWavBuffer(wavBlob);
                const audioBufferObject = await AudioEngine.ctx.decodeAudioData(wavBuffer);
                audioState.audioBuffer = audioBufferObject;

                const playPauseBtn = document.getElementById('playPauseBtn') as HTMLButtonElement;
                if (playPauseBtn) {
                    playPauseBtn.disabled = false;
                    playPauseBtn.classList.remove('text-slate-500', 'cursor-not-allowed');
                    playPauseBtn.classList.add('text-emerald-400', 'bg-emerald-500/10', 'border-emerald-500/20');
                }
                document.getElementById('playerActions')?.classList.remove('hidden');
                document.getElementById('visualizerEmpty')?.classList.add('hidden');

                const playerTitle = document.getElementById('playerTitle');
                if (playerTitle) playerTitle.innerText = `${voiceName} (${emotionSelect.options[emotionSelect.selectedIndex].text})`;
                const playerSubtitle = document.getElementById('playerSubtitle');
                if (playerSubtitle) playerSubtitle.innerText = "Klip suara berhasil disintesis.";
                const engineVoiceTag = document.getElementById('engineVoiceTag');
                if (engineVoiceTag) engineVoiceTag.innerText = `Engine: gemini-3.1-flash-tts-preview | Rate: ${sampleRate}Hz`;

                const durationTime = document.getElementById('durationTime');
                if (durationTime) durationTime.innerText = formatTime(audioBufferObject.duration);
                const currentTime = document.getElementById('currentTime');
                if (currentTime) currentTime.innerText = "00:00";

                const downloadBtn = document.getElementById('downloadBtn');
                if (downloadBtn) {
                    downloadBtn.onclick = () => {
                        const link = document.createElement('a');
                        link.href = audioUrl;
                        link.download = `K_Voice_${voiceName}.wav`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    };
                }

                showToast("Sintesis suara manusiawi berhasil dirumuskan!", "success");

                const activeProjectId = AppStore.state.currentActiveHistoryId || null;
                const activeId = generateSecureId();
                const savedAsset = {
                    id: activeId,
                    project_id: activeProjectId,
                    voice_name: voiceName,
                    style_name: emotionSelect.options[emotionSelect.selectedIndex].text,
                    text_script: script,
                    audio_blob: wavBlob,
                    created_at: new Date()
                };
                await VoiceRepo.put(savedAsset);

                if (activeProjectId) {
                    const project = await ProjectRepo.get(activeProjectId);
                    if (project) {
                        project.status = "Voice Generated";
                        project.updated_at = new Date();
                        await ProjectRepo.put(project);
                        await syncProjectsAndRender();
                    }
                }

                const list = [...AppStore.state.generationHistory];
                list.unshift(savedAsset);
                if (list.length > 15) {
                    const removed = list.pop();
                    await VoiceRepo.delete(removed.id);
                }
                AppStore.setState({ generationHistory: list });
            } catch (err) {
                console.error("Gagal mendecode audio data:", err);
                showToast("Gagal memproses sinyal audio.", "error");
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerText = "Sintesis Suara (TTS)";
                }
                updateGlobalStatus("Voice Lab Aktif", "emerald");
            }
        }

        // ==========================================
        // 9. EVENT STREAM REGISTER & SUBSCRIBERS
        // ==========================================
        AppStore.subscribe((state: any, oldState: any) => {
            Views.renderDashboard();
            Views.renderTable();
            Views.renderDrawer();
            Views.renderCharacterList();
            Views.renderHistory();
            Views.renderStoryboardHistoryList();

            if (state.globalApiKey !== oldState.globalApiKey) {
                const dKey = document.getElementById('directorApiKey') as HTMLInputElement;
                const vKey = document.getElementById('voiceApiKey') as HTMLInputElement;
                if (dKey) dKey.value = state.globalApiKey;
                if (vKey) vKey.value = state.globalApiKey;
            }

            if (state.activeRatio !== oldState.activeRatio) {
                document.querySelectorAll('.ratio-btn').forEach(btn => {
                    const r = btn.getAttribute('data-ratio');
                    if (r === state.activeRatio) {
                        btn.className = "ratio-btn py-2 text-[10px] rounded-xl border border-indigo-500 bg-indigo-500/10 text-white transition font-bold cursor-pointer";
                    } else {
                        btn.className = "ratio-btn py-2 text-[10px] rounded-xl border border-slate-800 bg-[#0f111a] text-slate-400 hover:border-slate-700 transition font-bold cursor-pointer";
                    }
                });
            }
        });

        function closeMobileSidebars() {
            const directorAside = document.getElementById('directorAside');
            const voiceAside = document.getElementById('voiceAside');
            const backdrop = document.getElementById('sidebarBackdrop');
            if (directorAside) directorAside.classList.remove('sidebar-open');
            if (voiceAside) voiceAside.classList.remove('sidebar-open');
            if (backdrop) {
                backdrop.classList.add('hidden', 'pointer-events-none');
                backdrop.classList.remove('opacity-100');
                backdrop.classList.add('opacity-0');
            }
        }

        function openMobileSidebar() {
            const tabId = AppStore.state.activeTab || 'director';
            const activeAside = tabId === 'director' ? document.getElementById('directorAside') : document.getElementById('voiceAside');
            const backdrop = document.getElementById('sidebarBackdrop');
            if (activeAside) activeAside.classList.add('sidebar-open');
            if (backdrop) {
                backdrop.classList.remove('hidden', 'pointer-events-none');
                backdrop.classList.remove('opacity-0');
                backdrop.classList.add('opacity-100');
            }
        }

        async function getPrivateBetaAuthHeaders() {
            if (!isSupabaseConfigured()) return { "Content-Type": "application/json" };
            const { data } = await supabase.auth.getSession();
            const token = data?.session?.access_token;
            return token
                ? { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
                : { "Content-Type": "application/json" };
        }

        function getActiveStoryboardTextReference() {
            const data = AppStore.state.activeStoryboardData;
            if (!data || !data.scenes) return "No active storyboard.";
            return data.scenes.map((s: any) => `Scene ${s.scene_number}: ${s.scene_description}\nVoice narration: ${s.narrator_script}`).join("\n\n");
        }

        async function regenerateThumbnailTextOnly() {
            if (!ensurePrivateBetaAccess(true)) return;
            const activeData = AppStore.state.activeStoryboardData;
            if (!activeData) {
                showToast("Belum ada storyboard aktif untuk di-regenerate.", "warning");
                return;
            }

            const btn = document.getElementById('btnRegenThumbnailText') as HTMLButtonElement | null;
            if (btn) {
                btn.disabled = true;
                btn.innerText = "⏳ Generating...";
            }
            updateGlobalStatus("Memperbarui Cover Hook...", "amber");

            try {
                const currentText = getActiveStoryboardTextReference();
                const theme = (document.getElementById('themeInput') as HTMLTextAreaElement)?.value || "";
                const title = activeData.youtube_title || "";

                const response = await fetch("/api/gemini/regenerate-thumbnail-text", {
                    method: "POST",
                    headers: await getPrivateBetaAuthHeaders(),
                    body: JSON.stringify({
                        theme,
                        currentStoryboardText: currentText,
                        currentYoutubeTitle: title
                    })
                });

                if (!response.ok) {
                    throw new Error("Gagal memperoleh respons re-enforcement dari server.");
                }

                const json = await response.json();
                const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
                const cleanedJsonText = sanitizeAndCleanJSON(rawText);
                const parsed = JSON.parse(cleanedJsonText);

                if (parsed.thumbnail_text) {
                    // Update active storyboard data in memory
                    activeData.thumbnail_text = parsed.thumbnail_text;
                    activeData.thumbnail_text_alt = parsed.thumbnail_text_alt || "";
                    activeData.thumbnail_prompt = parsed.thumbnail_prompt || "";

                    const thumbText = document.getElementById('thumbnailTextVal') as HTMLInputElement | null;
                    if (thumbText) thumbText.value = parsed.thumbnail_text;
                    const thumbTextAlt = document.getElementById('thumbnailTextAltVal') as HTMLInputElement | null;
                    if (thumbTextAlt) thumbTextAlt.value = parsed.thumbnail_text_alt || "";
                    const promptText = document.getElementById('thumbnailPromptText');
                    if (promptText) promptText.innerText = parsed.thumbnail_prompt;

                    // Autosave changes
                    const currentId = AppStore.state.currentActiveHistoryId;
                    if (currentId) {
                        const project = await ProjectRepo.get(currentId);
                        if (project) {
                            project.data_json = activeData;
                            project.thumbnail_prompt = parsed.thumbnail_prompt;
                            await ProjectRepo.put(project);
                        }
                    }

                    showToast("Teks & Prompt Thumbnail berhasil diperbarui!", "success");
                    await logWorkflowActivity("Memperbarui data visual cover thumbnail via AI", "success");
                }
            } catch (err: any) {
                console.error("Regen thumbnail error:", err);
                showToast("Gagal memperbarui thumbnail text: " + (err.message || err), "error");
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerText = "🔄 Regen Thumbnail Text";
                }
                updateGlobalStatus("Director Studio Active", "indigo");
            }
        }

        async function regeneratePublishingPackageOnly() {
            if (!ensurePrivateBetaAccess(true)) return;
            const activeData = AppStore.state.activeStoryboardData;
            if (!activeData) {
                showToast("Belum ada storyboard aktif untuk di-regenerate.", "warning");
                return;
            }

            const btn = document.getElementById('btnRegenPublishingPackage') as HTMLButtonElement | null;
            if (btn) {
                btn.disabled = true;
                btn.innerText = "⏳ Generating...";
            }
            updateGlobalStatus("Memperbarui Paket Publishing...", "amber");

            try {
                const currentText = getActiveStoryboardTextReference();
                const theme = (document.getElementById('themeInput') as HTMLTextAreaElement)?.value || "";
                const narratorStyle = (document.getElementById('narratorStyle') as HTMLSelectElement)?.value || "default";
                const animStyle = (document.getElementById('animationStyle') as HTMLSelectElement)?.value || "default";
                const outputLanguage = getStoryboardOutputLanguage();

                const response = await fetch("/api/gemini/regenerate-publishing", {
                    method: "POST",
                    headers: await getPrivateBetaAuthHeaders(),
                    body: JSON.stringify({
                        theme,
                        narratorStyle,
                        animStyle,
                        outputLanguage,
                        currentStoryboardText: currentText
                    })
                });

                if (!response.ok) {
                    throw new Error("Gagal memperoleh respons publishing dari server.");
                }

                const json = await response.json();
                const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
                const cleanedJsonText = sanitizeAndCleanJSON(rawText);
                const parsed = JSON.parse(cleanedJsonText);

                if (parsed.youtube_title) {
                    // Update active storyboard data in memory
                    activeData.video_name = parsed.video_name || generateSafeVideoFileName(parsed, theme);
                    activeData.youtube_title = parsed.youtube_title;
                    activeData.youtube_description = parsed.youtube_description;
                    activeData.tiktok_caption = parsed.tiktok_caption;
                    activeData.instagram_caption = parsed.instagram_caption;
                    activeData.viral_hashtags = parsed.viral_hashtags;
                    activeData.thumbnail_prompt = parsed.thumbnail_prompt;
                    activeData.thumbnail_text = parsed.thumbnail_text;
                    activeData.thumbnail_text_alt = parsed.thumbnail_text_alt || "";

                    // Run standard renderer bindings
                    Views.renderStoryboard(activeData, AppStore.state.activeRatio);

                    // Autosave changes
                    const currentId = AppStore.state.currentActiveHistoryId;
                    if (currentId) {
                        const project = await ProjectRepo.get(currentId);
                        if (project) {
                            project.data_json = activeData;
                            project.thumbnail_prompt = parsed.thumbnail_prompt;
                            await ProjectRepo.put(project);
                        }
                    }

                    showToast("Paket Publishing berhasil di-regenerate secara penuh!", "success");
                    await logWorkflowActivity("Memperbarui asisten optimistis materi publishing", "success");
                }
            } catch (err: any) {
                console.error("Regen publishing package error:", err);
                showToast("Gagal memperbarui publishing package: " + (err.message || err), "error");
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerText = "🔄 Regen Full Package";
                }
                updateGlobalStatus("Director Studio Active", "indigo");
            }
        }

        // Event delegation handlers
        const clickHandler = async (e: MouseEvent) => {
            const target = e.target as HTMLElement;

            if (target.closest('[data-action="dismiss-generation-feedback"]')) {
                clearGenerationFeedback();
                return;
            }

                        if (target.closest('[data-action="close-user-guide"]')) {
                closeUserGuideModal();
                return;
            }

            if (target.closest('[data-action="open-user-guide"]')) {
                openUserGuideModal();
                return;
            }

            if (target.closest('[data-action="close-failure-playbook"]')) {
                closeFailurePlaybookModal();
                return;
            }

            if (target.closest('[data-action="open-failure-playbook"]')) {
                openFailurePlaybookModal();
                return;
            }

            // 1. Toggle Paket Publishing Accordion
            if (target.closest('[data-action="toggle-publishing-package"]')) {
                const content = document.getElementById('publishingPackageContent');
                const icon = document.getElementById('publishingPackageToggleIcon');
                const label = document.getElementById('publishingPackageToggleLabel');
                if (content && icon) {
                    const isHidden = content.classList.contains('hidden');
                    if (isHidden) {
                        content.classList.remove('hidden');
                        icon.style.transform = 'rotate(180deg)';
                        if (label) label.innerText = "Tutup Paket";
                    } else {
                        content.classList.add('hidden');
                        icon.style.transform = 'rotate(0deg)';
                        if (label) label.innerText = "Buka / Tutup";
                    }
                }
                return;
            }

            // 2. Copy Input Field (values from elements instead of innerText)
            const copyInputFieldBtn = target.closest('[data-action="copy-input-field"]');
            if (copyInputFieldBtn) {
                const fieldId = copyInputFieldBtn.getAttribute('data-field-id') || '';
                let elemId = "";
                if (fieldId === "thumbnailTextValue") {
                    elemId = "thumbnailTextVal";
                }
                const inputElem = document.getElementById(elemId) as HTMLInputElement | null;
                if (inputElem) {
                    await copyTextToClipboard(inputElem.value, `Teks "${inputElem.value}" berhasil disalin!`);
                }
                return;
            }

            // 3. Regen Thumbnail Text action
            if (target.closest('[data-action="regen-thumbnail-text"]')) {
                await regenerateThumbnailTextOnly();
                return;
            }

            // 4. Regen Full Paket Publishing action
            if (target.closest('[data-action="regen-publishing-package"]')) {
                await regeneratePublishingPackageOnly();
                return;
            }

            if (target.closest('[data-action="login-google"]')) {
                await signInWithGoogle();
                return;
            }

            if (target.closest('[data-action="logout-google"]')) {
                await signOutGoogle();
                return;
            }

            if (target.closest('[data-action="save-cloud-project"]')) {
                await saveActiveProjectToCloud();
                return;
            }

            if (target.closest('[data-action="open-cloud-history"]')) {
                await openCloudHistory();
                return;
            }

            if (target.closest('[data-action="refresh-cloud-history"]')) {
                await openCloudHistory();
                return;
            }

            if (target.closest('[data-action="close-cloud-history"]')) {
                closeCloudHistoryModal();
                return;
            }

            const loadCloudBtn = target.closest('[data-action="load-cloud-project"]');
            if (loadCloudBtn) {
                const id = loadCloudBtn.getAttribute('data-id') || '';
                await loadCloudProject(id);
                return;
            }

            const renameCloudBtn = target.closest('[data-action="rename-cloud-project"]');
            if (renameCloudBtn) {
                const id = renameCloudBtn.getAttribute('data-id') || '';
                await renameCloudProject(id);
                return;
            }

            const deleteCloudBtn = target.closest('[data-action="delete-cloud-project"]');
            if (deleteCloudBtn) {
                const id = deleteCloudBtn.getAttribute('data-id') || '';
                await deleteCloudProject(id);
                return;
            }

            if (target.id === 'cloudHistoryModal') {
                closeCloudHistoryModal();
                return;
            }

            // Mobile responsive side controls drawer logic
            const backdropBtn = target.closest('#sidebarBackdrop');
            if (backdropBtn) {
                closeMobileSidebars();
                return;
            }

            const toggleSidebarBtn = target.closest('#btnHamburger');
            if (toggleSidebarBtn) {
                const isDirOpen = document.getElementById('directorAside')?.classList.contains('sidebar-open');
                const isVoiceOpen = document.getElementById('voiceAside')?.classList.contains('sidebar-open');
                if (isDirOpen || isVoiceOpen) {
                    closeMobileSidebars();
                } else {
                    openMobileSidebar();
                }
                return;
            }

            // Save and Clear API Key buttons persistence logic
            const saveApiKeyBtn = target.closest('[data-action="save-api-key"]');
            if (saveApiKeyBtn) {
                const keyToSave = AppStore.state.globalApiKey || "";
                localStorage.setItem("kcreator_api_key", keyToSave);
                SettingsRepo.put('api_key', keyToSave);
                showToast("API key berhasil disimpan", "success");
                return;
            }

            const clearApiKeyBtn = target.closest('[data-action="clear-api-key"]');
            if (clearApiKeyBtn) {
                localStorage.removeItem("kcreator_api_key");
                syncApiKey("");
                showToast("API key berhasil dihapus", "success");
                return;
            }

            // Auto close mobile drawers on selecting buttons, except if uploading/inputs
            if (window.innerWidth < 768) {
                const insideSidebar = target.closest('aside');
                const insideHamburger = target.closest('#btnHamburger');
                const insideCharUpload = target.closest('#characterUploadTrigger') || target.id === 'charFile' || target.id === 'newTagInput';
                if (!insideSidebar && !insideHamburger) {
                    closeMobileSidebars();
                } else if (insideSidebar && !insideCharUpload && (target.tagName === 'BUTTON' || target.closest('[data-action]') || target.tagName === 'SELECT' || target.classList.contains('cursor-pointer'))) {
                    setTimeout(() => {
                        closeMobileSidebars();
                    }, 100);
                }
            }

            const switchTabBtn = target.closest('[data-action="switch-tab"]');
            if (switchTabBtn) {
                const tab = switchTabBtn.getAttribute('data-tab') || 'director';
                switchTab(tab);
                return;
            }

            const setRatioBtn = target.closest('[data-action="set-ratio"]');
            if (setRatioBtn) {
                const ratio = setRatioBtn.getAttribute('data-ratio-val') || '16:9';
                AppStore.setState({ activeRatio: ratio });
                SettingsRepo.put('preferred_ratio', ratio);
                updateInspectorMetrics();
                return;
            }

            const setSceneModeBtn = target.closest('[data-action="set-scene-mode"]');
            if (setSceneModeBtn) {
                const mode = setSceneModeBtn.getAttribute('data-mode') || 'auto';
                AppStore.setState({ activeSceneMode: mode });
                const autoBtn = document.getElementById('modeAutoBtn');
                const manualBtn = document.getElementById('modeManualBtn');
                const manualContainer = document.getElementById('manualSceneContainer');
                const durationInput = document.getElementById('sceneDuration') as HTMLInputElement;
                const durationInfo = document.getElementById('durationInfoText');

                if (mode === 'auto') {
                    if (autoBtn) autoBtn.className = "py-2 text-xs font-medium rounded-xl border border-indigo-500 bg-indigo-500/10 text-white transition cursor-pointer";
                    if (manualBtn) manualBtn.className = "py-2 text-xs font-medium rounded-xl border border-slate-800 bg-[#0f111a] text-slate-400 hover:border-slate-700 transition cursor-pointer";
                    if (manualContainer) manualContainer.classList.add('hidden');
                    if (durationInput) {
                        durationInput.value = '8';
                        durationInput.disabled = true;
                        durationInput.className = "w-full h-1 bg-slate-855 rounded-lg appearance-none cursor-not-allowed accent-indigo-500 transition opacity-50 accent-indigo";
                    }
                    if (durationInfo) durationInfo.innerText = "Terkunci ke 8s untuk keselarasan ritme adegan otomatis terbaik.";
                    const dval = document.getElementById('durationVal');
                    if (dval) dval.innerText = "8 Detik";
                } else {
                    if (autoBtn) autoBtn.className = "py-2 text-xs font-medium rounded-xl border border-slate-800 bg-[#0f111a] text-slate-400 hover:border-slate-700 transition cursor-pointer";
                    if (manualBtn) manualBtn.className = "py-2 text-xs font-medium rounded-xl border border-indigo-500 bg-indigo-500/10 text-white transition cursor-pointer";
                    if (manualContainer) manualContainer.classList.remove('hidden');
                    if (durationInput) {
                        durationInput.disabled = false;
                        durationInput.className = "w-full h-1 bg-slate-855 rounded-lg appearance-none cursor-pointer accent-indigo-500 transition accent-indigo";
                    }
                    if (durationInfo) durationInfo.innerText = "Geser durasi untuk menyesuaikan panjang pergerakan visual video.";
                }
                return;
            }

            if (target.closest('[data-action="toggle-fav-filter"]')) {
                const filters = AppStore.state.workflowFilters;
                filters.favoriteOnly = !filters.favoriteOnly;
                const btn = document.getElementById('filterFavBtn');
                if (btn) {
                    if (filters.favoriteOnly) {
                        btn.className = "px-3 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 transition text-xs font-bold cursor-pointer";
                    } else {
                        btn.className = "px-3 py-2 rounded-xl bg-[#0f111a] border border-slate-800 text-xs text-slate-455 hover:text-yellow-500 transition cursor-pointer";
                    }
                }
                syncProjectsAndRender();
                return;
            }

            if (target.closest('[data-action="toggle-arc-filter"]')) {
                const filters = AppStore.state.workflowFilters;
                filters.archiveOnly = !filters.archiveOnly;
                const btn = document.getElementById('filterArcBtn');
                if (btn) {
                    if (filters.archiveOnly) {
                        btn.className = "px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 transition text-xs font-bold cursor-pointer";
                    } else {
                        btn.className = "px-3 py-2 rounded-xl bg-[#0f111a] border border-slate-800 text-xs text-slate-455 hover:text-blue-400 transition cursor-pointer";
                    }
                }
                syncProjectsAndRender();
                return;
            }

            if (target.closest('[data-action="generate-storyboard"]')) {
                await generateStoryboard();
                return;
            }

            if (target.closest('[data-action="generate-voice"]')) {
                await generateHumanTTS();
                return;
            }

            if (target.closest('[data-action="toggle-play-pause"]')) {
                if (!audioState.audioBuffer) return;
                if (audioState.isPlaying) {
                    audioState.pausedAt = AudioEngine.ctx.currentTime - audioState.playStartTime;
                    AudioEngine.stop();
                } else {
                    AudioEngine.play(audioState.audioBuffer, audioState.pausedAt, () => {
                        const playIcon = document.getElementById('playIcon');
                        const pauseIcon = document.getElementById('pauseIcon');
                        if (playIcon) playIcon.classList.remove('hidden');
                        if (pauseIcon) pauseIcon.classList.add('hidden');
                    });
                }
                return;
            }

            if (target.closest('[data-action="transfer-all-scenes"]')) {
                const scenes = AppStore.state.activeStoryboardData?.scenes;
                if (!scenes || scenes.length === 0) {
                    showToast("Tidak ada adegan untuk ditransfer.", "warning");
                    return;
                }
                const fullScript = scenes.map((s: any) => s.narrator_script).join('\n\n');
                const voiceInput = document.getElementById('scriptInput') as HTMLTextAreaElement;
                if (voiceInput) {
                    voiceInput.value = fullScript;
                    const charCount = document.getElementById('charCounter');
                    if (charCount) charCount.innerText = `${voiceInput.value.length} / 2000 karakter`;
                    switchTab('voice');
                    showToast("Semua narasi berhasil ditransfer!", "success");
                }
                return;
            }

            const jumpSceneBtn = target.closest('[data-action="jump-scene"]');
            if (jumpSceneBtn) {
                const index = parseInt(jumpSceneBtn.getAttribute('data-index') || '0', 10);
                scrollToScene(index);
                return;
            }

            if (target.closest('[data-action="generate-all-narration-only"]')) {
                await regenerateAllNarrationsOnly('rewrite');
                return;
            }

            if (target.closest('[data-action="shorten-all-narration"]')) {
                await regenerateAllNarrationsOnly('shorten');
                return;
            }

            const copyBulkBtn = target.closest('[data-action="copy-bulk-storyboard"]');
            if (copyBulkBtn) {
                const copyType = copyBulkBtn.getAttribute('data-copy-type') || 'full';
                copyActiveStoryboardBulk(copyType as 'full' | 'narration' | 'image' | 'video');
                return;
            }

            if (target.closest('[data-action="copy-all-prompts"]')) {
                const scenes = AppStore.state.activeStoryboardData?.scenes;
                if (!scenes) {
                    showToast("Tidak ada prompt untuk disalin.", "warning");
                    return;
                }
                const allPrompts = scenes.map((s: any) => {
                    let textPrompt = s.imagePrompt || "";
                    if (!textPrompt && s.visual_prompt_details) {
                        const p = s.visual_prompt_details;
                        textPrompt = [
                            p.scene_description ? `Scene: ${p.scene_description}.` : '',
                            p.main_character_action ? `Main Subject: ${p.main_character_action}.` : '',
                            p.secondary_character_action ? `Supporting Activity: ${p.secondary_character_action}.` : '',
                            p.environment_motion ? `Environment Activity: ${p.environment_motion}.` : '',
                            p.lighting ? `Lighting: ${p.lighting}.` : '',
                            p.atmosphere ? `Mood: ${p.atmosphere}.` : '',
                        ].filter(b => b !== '').join(' ');
                    } else if (!textPrompt) {
                        textPrompt = s.text_to_image || "";
                    }
                    return `Scene ${s.scene_number}:\n[IMAGE PROMPT]\n${textPrompt}\n\n[VIDEO PROMPT]\n${s.videoPrompt || s.camera_movement || ""}`;
                }).join('\n\n---\n\n');

                navigator.clipboard.writeText(allPrompts).then(() => {
                    showToast("Semua prompt visual video berhasil disalin!", "success");
                });
                return;
            }

            if (target.closest('[data-action="export-project-txt"]')) {
                exportActiveProjectAsTxt();
                return;
            }

            if (target.closest('[data-action="export-project-json"]')) {
                exportActiveProjectAsJson();
                return;
            }

            if (target.closest('#btnToggleInspector') || target.closest('#btnCloseInspector')) {
                toggleDatabaseInspector();
                return;
            }

            if (target.closest('[data-action="export-db"]')) {
                await exportDatabaseToJSON();
                return;
            }

            if (target.closest('[data-action="trigger-restore"]')) {
                const resInput = document.getElementById('dbRestoreInput') as HTMLInputElement;
                if (resInput) resInput.click();
                return;
            }

            if (target.closest('[data-action="test-save-project"]')) {
                await testSaveProject();
                return;
            }

            if (target.closest('[data-action="test-save-audio"]')) {
                await testSaveAudio();
                return;
            }

            // Document presets
            const loadPresetBtn = target.closest('[data-action="load-preset"]');
            if (loadPresetBtn) {
                const val = loadPresetBtn.getAttribute('data-preset-val') || 'onepiece';
                const themeInput = document.getElementById('themeInput') as HTMLTextAreaElement;
                const animStyle = document.getElementById('animationStyle') as HTMLSelectElement;
                const narratorStyle = document.getElementById('narratorStyle') as HTMLSelectElement;

                if (val === 'onepiece' && themeInput && animStyle && narratorStyle) {
                    themeInput.value = "Pembahasan mendalam dan misteri sejarah gelap di balik Pulau Manusia Ikan dalam cerita One Piece.";
                    animStyle.value = "Vintage Studio Ghibli Anime";
                    narratorStyle.value = "narator_dokumenter";
                } else if (val === 'lambung' && themeInput && animStyle && narratorStyle) {
                    themeInput.value = "Edukasi cara kerja lambung manusia dari makanan masuk sampai asam lambung mencerna.";
                    animStyle.value = "Claymation Animation";
                    narratorStyle.value = "hype_marketing";
                }
                const customStyleContainer = document.getElementById('customStyleContainer');
                if (customStyleContainer) customStyleContainer.className = (animStyle?.value === "Gaya Kustom") ? "block mt-2 font-semibold" : "hidden mt-2";
                showToast("Inspirasi berhasil dimuat!", "success");
                return;
            }

            // Project Selector Click or Row Click
            const row = target.closest('#workflowTableBody tr');
            const preventPropagation = target.closest('[data-action="stop-propagation"]');
            if (row && !preventPropagation) {
                const id = row.getAttribute('data-id');
                AppStore.setState({ currentlyOpenDrawerId: id });
                return;
            }

            // Row buttons
            const favRowBtn = target.closest('[data-action="toggle-project-favorite"]');
            if (favRowBtn) {
                const id = favRowBtn.getAttribute('data-id');
                const project = await ProjectRepo.get(id);
                if (project) {
                    project.isFavorite = !project.isFavorite;
                    await ProjectRepo.put(project);
                    await syncProjectsAndRender();
                }
                return;
            }

            const dupRowBtn = target.closest('[data-action="duplicate-row"]');
            if (dupRowBtn) {
                const id = dupRowBtn.getAttribute('data-id');
                if (confirm("Duplikasikan projek terpilih?")) {
                    const original = await ProjectRepo.get(id);
                    if (original) {
                        const copy = JSON.parse(JSON.stringify(original));
                        copy.id = generateSecureId();
                        copy.title = `${copy.title} (Salinan)`;
                        copy.created_at = new Date().toISOString();
                        copy.updated_at = new Date().toISOString();
                        await ProjectRepo.put(copy);
                        showToast("Projek berhasil diduplikasi!", "success");
                        await logWorkflowActivity(`Menduplikasi projek: "${original.title}"`, 'success');
                        await syncProjectsAndRender();
                    }
                }
                return;
            }

            const delRowBtn = target.closest('[data-action="delete-row"]');
            if (delRowBtn) {
                const id = delRowBtn.getAttribute('data-id');
                if (confirm("Apakah anda yakin ingin menghapus projek ini secara permanen?")) {
                    await ProjectRepo.delete(id);
                    if (AppStore.state.currentlyOpenDrawerId === id) {
                        AppStore.setState({ currentlyOpenDrawerId: null });
                    }
                    showToast("Projek berhasil dihapus!", "success");
                    await logWorkflowActivity(`Menghapus projek id: ${id}`, 'warning');
                    await syncProjectsAndRender();
                }
                return;
            }

            // Drawer commands
            if (target.closest('[data-action="close-drawer"]')) {
                AppStore.setState({ currentlyOpenDrawerId: null });
                return;
            }

            if (target.closest('[data-action="drawer-unfav"]') || target.closest('[data-action="drawer-fav"]')) {
                const id = AppStore.state.currentlyOpenDrawerId;
                const project = await ProjectRepo.get(id);
                if (project) {
                    project.isFavorite = !project.isFavorite;
                    await ProjectRepo.put(project);
                    await syncProjectsAndRender();
                    AppStore.setState({ currentlyOpenDrawerId: id });
                }
                return;
            }

            if (target.closest('[data-action="drawer-archive"]') || target.closest('[data-action="drawer-unarchive"]')) {
                const id = AppStore.state.currentlyOpenDrawerId;
                const project = await ProjectRepo.get(id);
                if (project) {
                    project.isArchived = !project.isArchived;
                    await ProjectRepo.put(project);
                    await syncProjectsAndRender();
                    AppStore.setState({ currentlyOpenDrawerId: id });
                }
                return;
            }

            if (target.closest('[data-action="drawer-duplicate"]')) {
                const id = AppStore.state.currentlyOpenDrawerId;
                if (confirm("Apakah anda yakin ingin menduplikasi dokumen projek ini?")) {
                    const original = await ProjectRepo.get(id);
                    if (original) {
                        const copy = JSON.parse(JSON.stringify(original));
                        copy.id = generateSecureId();
                        copy.title = `${copy.title} (Salinan)`;
                        copy.created_at = new Date().toISOString();
                        copy.updated_at = new Date().toISOString();
                        await ProjectRepo.put(copy);
                        showToast("Projek berhasil diduplikasi!", "success");
                        await logWorkflowActivity(`Menduplikasi projek: "${original.title}"`, 'success');
                        await syncProjectsAndRender();
                    }
                }
                return;
            }

            if (target.closest('[data-action="drawer-load"]')) {
                const id = AppStore.state.currentlyOpenDrawerId;
                const project = await ProjectRepo.get(id);
                if (project && project.data_json) {
                    AppStore.setState({
                        currentActiveHistoryId: id,
                        activeStoryboardData: project.data_json,
                        activeRatio: project.ratio || '16:9',
                        sceneVersionHistory: {},
                        currentlyOpenDrawerId: null
                    });
                    const themeInput = document.getElementById('themeInput') as HTMLTextAreaElement;
                    if (themeInput) themeInput.value = project.theme || "";
                    Views.renderStoryboard(project.data_json, project.ratio || '16:9');
                    document.getElementById('workflowDetailDrawer')?.classList.add('translate-x-full');
                    showToast("Draft storyboard berhasil dimuat ulang ke canvas!", "success");
                }
                return;
            }

            const transBtn = target.closest('[data-action="transition-status"]');
            if (transBtn) {
                const status = transBtn.getAttribute('data-status') || 'Draft';
                const id = AppStore.state.currentlyOpenDrawerId;
                const project = await ProjectRepo.get(id);
                if (project) {
                    project.status = status;
                    project.updated_at = new Date().toISOString();
                    await ProjectRepo.put(project);
                    await logWorkflowActivity(`Mengubah status projek "${project.title}" menjadi [${status}]`, 'success');
                    await syncProjectsAndRender();
                    AppStore.setState({ currentlyOpenDrawerId: id });
                    showToast(`Status diperbarui ke ${status}!`, "success");
                }
                return;
            }

            if (target.closest('[data-action="add-drawer-tag"]')) {
                const input = document.getElementById('newTagInput') as HTMLInputElement;
                const val = input ? input.value.trim() : '';
                if (val) {
                    const id = AppStore.state.currentlyOpenDrawerId;
                    const project = await ProjectRepo.get(id);
                    if (project) {
                        if (!project.tags) project.tags = [];
                        if (!project.tags.includes(val)) {
                            project.tags.push(val);
                            await ProjectRepo.put(project);
                            await syncProjectsAndRender();
                            AppStore.setState({ currentlyOpenDrawerId: id });
                            if (input) input.value = '';
                            showToast(`Tag "${val}" berhasil ditambahkan.`, "success");
                        }
                    }
                }
                return;
            }

            const tagRemoveBtn = target.closest('[data-action="remove-drawer-tag"]');
            if (tagRemoveBtn) {
                const idx = parseInt(tagRemoveBtn.getAttribute('data-index') || '0', 10);
                const id = AppStore.state.currentlyOpenDrawerId;
                const project = await ProjectRepo.get(id);
                if (project && project.tags) {
                    project.tags.splice(idx, 1);
                    await ProjectRepo.put(project);
                    await syncProjectsAndRender();
                    AppStore.setState({ currentlyOpenDrawerId: id });
                    showToast("Tag berhasil dihapus.", "success");
                }
                return;
            }

            // Copy Dynamic fields
            const copyFieldBtn = target.closest('[data-action="copy-field"]');
            if (copyFieldBtn) {
                const fieldId = copyFieldBtn.getAttribute('data-field-id') || '';
                const textElem = document.getElementById(fieldId);
                if (textElem) {
                    await copyTextToClipboard(textElem.innerText || textElem.textContent || '', 'Teks berhasil disalin ke clipboard!');
                }
                return;
            }

            // Scene Visual Frame actions
            const sendSceneBtn = target.closest('[data-action="send-scene-script"]');
            if (sendSceneBtn) {
                const idx = parseInt(sendSceneBtn.getAttribute('data-index') || '0', 10);
                const scene = AppStore.state.activeStoryboardData?.scenes[idx];
                if (scene) {
                    const voiceInput = document.getElementById('scriptInput') as HTMLTextAreaElement;
                    if (voiceInput) {
                        voiceInput.value = scene.narrator_script;
                        const charCount = document.getElementById('charCounter');
                        if (charCount) charCount.innerText = `${voiceInput.value.length} / 2000 karakter`;
                        switchTab('voice');
                        showToast("Narasi scene berhasil dikirim ke Voice Lab!", "success");
                    }
                }
                return;
            }

            const toggleSceneEditorBtn = target.closest('[data-action="toggle-scene-editor"]');
            if (toggleSceneEditorBtn) {
                const idx = toggleSceneEditorBtn.getAttribute('data-index') || '0';
                const editor = document.getElementById(`sceneEditor_${idx}`);
                if (editor) editor.classList.toggle('hidden');
                return;
            }

            const undoSceneVersionBtn = target.closest('[data-action="undo-scene-version"]');
            if (undoSceneVersionBtn) {
                const idx = parseInt(undoSceneVersionBtn.getAttribute('data-index') || '0', 10);
                undoLastSceneVersion(idx);
                return;
            }

            const clearSceneVersionBtn = target.closest('[data-action="clear-scene-version-history"]');
            if (clearSceneVersionBtn) {
                const idx = parseInt(clearSceneVersionBtn.getAttribute('data-index') || '0', 10);
                if (confirm('Hapus version history scene ini? Scene aktif tidak akan ikut terhapus.')) {
                    clearSceneVersionHistory(idx);
                }
                return;
            }

            const saveSceneEditsBtn = target.closest('[data-action="save-scene-edits"]');
            if (saveSceneEditsBtn) {
                const idx = parseInt(saveSceneEditsBtn.getAttribute('data-index') || '0', 10);
                saveSceneManualEdits(idx);
                return;
            }

            const regenPresetBtn = target.closest('[data-action="apply-regen-preset"]');
            if (regenPresetBtn) {
                const idx = parseInt(regenPresetBtn.getAttribute('data-index') || '0', 10);
                const preset = regenPresetBtn.getAttribute('data-preset') || '';
                applyRegenPreset(idx, preset);
                return;
            }

            const regenSceneFieldBtn = target.closest('[data-action="regenerate-scene-field"]');
            if (regenSceneFieldBtn) {
                const idx = parseInt(regenSceneFieldBtn.getAttribute('data-index') || '0', 10);
                const regenTarget = regenSceneFieldBtn.getAttribute('data-target') || 'video';
                await regenerateSceneFieldWithFeedback(idx, regenTarget);
                return;
            }

            const regenSceneBtn = target.closest('[data-action="regenerate-scene"]');
            if (regenSceneBtn) {
                const idx = parseInt(regenSceneBtn.getAttribute('data-index') || '0', 10);
                await regenerateSceneWithFeedback(idx);
                return;
            }


            const addSceneBtn = target.closest('[data-action="add-scene-after"]');
            if (addSceneBtn) {
                const idx = parseInt(addSceneBtn.getAttribute('data-index') || '0', 10);
                addDraftSceneAfterIndex(idx);
                return;
            }

            const duplicateSceneBtn = target.closest('[data-action="duplicate-scene"]');
            if (duplicateSceneBtn) {
                const idx = parseInt(duplicateSceneBtn.getAttribute('data-index') || '0', 10);
                duplicateSceneAtIndex(idx);
                return;
            }

            const deleteSceneBtn = target.closest('[data-action="delete-scene"]');
            if (deleteSceneBtn) {
                const idx = parseInt(deleteSceneBtn.getAttribute('data-index') || '0', 10);
                if (confirm(`Hapus scene ${idx + 1}?`)) {
                    deleteSceneAtIndex(idx);
                }
                return;
            }

            const copyScenePackageBtn = target.closest('[data-action="copy-scene-package"]');
            if (copyScenePackageBtn) {
                const idx = parseInt(copyScenePackageBtn.getAttribute('data-index') || '0', 10);
                const scene = AppStore.state.activeStoryboardData?.scenes[idx];
                if (scene) {
                    const textPackage = buildScenePackageText(scene, idx);
                    await copyTextToClipboard(textPackage, 'Paket scene lengkap berhasil disalin!');
                }
                return;
            }

            const copyImagePromptBtn = target.closest('[data-action="copy-image-prompt"]');
            if (copyImagePromptBtn) {
                const idx = parseInt(copyImagePromptBtn.getAttribute('data-index') || '0', 10);
                const scene = AppStore.state.activeStoryboardData?.scenes[idx];
                if (scene) {
                    let textPrompt = scene.imagePrompt || "";
                    if (!textPrompt && scene.visual_prompt_details) {
                        const p = scene.visual_prompt_details;
                        textPrompt = [
                            p.scene_description ? `Scene: ${p.scene_description}.` : '',
                            p.main_character_action ? `Main Subject: ${p.main_character_action}.` : '',
                            p.secondary_character_action ? `Supporting Activity: ${p.secondary_character_action}.` : '',
                            p.environment_motion ? `Environment Activity: ${p.environment_motion}.` : '',
                            p.lighting ? `Lighting: ${p.lighting}.` : '',
                            p.atmosphere ? `Mood: ${p.atmosphere}.` : '',
                        ].filter(b => b !== '').join(' ');
                    } else if (!textPrompt) {
                        textPrompt = scene.text_to_image || "";
                    }
                    await copyTextToClipboard(textPrompt, 'Prompt Gambar berhasil disalin!');
                }
                return;
            }

            const copyVideoPromptBtn = target.closest('[data-action="copy-video-prompt"]');
            if (copyVideoPromptBtn) {
                const idx = parseInt(copyVideoPromptBtn.getAttribute('data-index') || '0', 10);
                const scene = AppStore.state.activeStoryboardData?.scenes[idx];
                if (scene) {
                    const textPrompt = scene.videoPrompt || scene.camera_movement || "";
                    await copyTextToClipboard(textPrompt, 'Prompt Video berhasil disalin!');
                }
                return;
            }

            // Upload Gesicht aktor triggers and details
            if (target.closest('[data-action="upload-trigger"]') && !target.closest('#btnRemoveCharFile')) {
                document.getElementById('charFile')?.click();
                return;
            }

            if (target.closest('[data-action="remove-char-file"]')) {
                AppStore.setState({
                    characterImageBlob: null,
                    characterImageMime: ''
                });
                const charFile = document.getElementById('charFile') as HTMLInputElement;
                if (charFile) charFile.value = '';
                document.getElementById('uploadPlaceholder')?.classList.remove('hidden');
                document.getElementById('uploadPreviewContainer')?.classList.add('hidden');
                const p = document.getElementById('uploadPreview') as HTMLImageElement;
                if (p) p.src = '';
                return;
            }

            // Characters favorite/delete/edit
            const toggleCharFavBtn = target.closest('[data-action="toggle-char-fav"]');
            if (toggleCharFavBtn) {
                const id = toggleCharFavBtn.getAttribute('data-id');
                const char = await CharacterRepo.get(id);
                if (char) {
                    char.is_favorite = !char.is_favorite;
                    await CharacterRepo.put(char);
                    await syncCharactersAndRender();
                }
                return;
            }

            const editCharBtn = target.closest('[data-action="edit-char"]');
            if (editCharBtn) {
                const id = editCharBtn.getAttribute('data-id');
                const char = await CharacterRepo.get(id);
                if (char) {
                    const newName = prompt("Ubah Nama Karakter/Aktor:", char.name);
                    if (newName !== null) {
                        const newDesc = prompt("Ubah Deskripsi Karakter/Aktor:", char.description);
                        if (newDesc !== null) {
                            char.name = newName.trim() || char.name;
                            char.description = newDesc.trim() || char.description;
                            await CharacterRepo.put(char);
                            await syncCharactersAndRender();
                            showToast("Data karakter berhasil diperbarui!", "success");
                        }
                    }
                }
                return;
            }

            const deleteCharBtn = target.closest('[data-action="delete-char"]');
            if (deleteCharBtn) {
                const id = deleteCharBtn.getAttribute('data-id');
                if (confirm("Apakah anda yakin ingin menghapus data karakter ini?")) {
                    await CharacterRepo.delete(id);
                    showToast("Karakter berhasil dihapus dari perpustakaan.", "success");
                    await syncCharactersAndRender();
                }
                return;
            }

            // Auditory logic load
            const loadHistAudioBtn = target.closest('[data-action="load-history-audio"]');
            if (loadHistAudioBtn) {
                const id = loadHistAudioBtn.getAttribute('data-id');
                const item = AppStore.state.generationHistory.find((v: any) => v.id === id);
                if (item) {
                    AudioEngine.stop();
                    updateGlobalStatus("Memuat Berkas Audio...", "amber");
                    
                    const blob = item.audio_blob;
                    AudioMemoryRegistry.revoke(audioState.activeAudioUrl);
                    audioState.activeAudioUrl = AudioMemoryRegistry.register(blob);
                    const audioUrl = audioState.activeAudioUrl;

                    AudioEngine.init();

                    const wavBuffer = await responseToWavBuffer(blob);
                    const parsedBuf = await AudioEngine.ctx.decodeAudioData(wavBuffer);
                    audioState.audioBuffer = parsedBuf;

                    const playPauseBtn = document.getElementById('playPauseBtn') as HTMLButtonElement;
                    if (playPauseBtn) {
                        playPauseBtn.disabled = false;
                        playPauseBtn.classList.remove('text-slate-500', 'cursor-not-allowed');
                        playPauseBtn.classList.add('text-emerald-400', 'bg-emerald-500/10', 'border-emerald-500/20');
                    }
                    document.getElementById('playerActions')?.classList.remove('hidden');
                    document.getElementById('visualizerEmpty')?.classList.add('hidden');

                    const pTitle = document.getElementById('playerTitle');
                    if (pTitle) pTitle.innerText = `${item.voice_name} (Acoustic Archive)`;
                    const pSub = document.getElementById('playerSubtitle');
                    if (pSub) pSub.innerText = "Klip suara berhasil dimuat dari arsip.";
                    const dTime = document.getElementById('durationTime');
                    if (dTime) dTime.innerText = formatTime(parsedBuf.duration);
                    const cTime = document.getElementById('currentTime');
                    if (cTime) cTime.innerText = "00:00";

                    const downloadBtn = document.getElementById('downloadBtn');
                    if (downloadBtn) {
                        downloadBtn.onclick = () => {
                            const link = document.createElement('a');
                            link.href = audioUrl;
                            link.download = `K_Voice_${item.voice_name}_Archive.wav`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                        };
                    }
                    showToast("Audio berhasil dimuat dari arsip!", "success");
                    updateGlobalStatus("Voice Lab Aktif", "emerald");
                }
                return;
            }

            const delHistAudioBtn = target.closest('[data-action="delete-history-audio"]');
            if (delHistAudioBtn) {
                const id = delHistAudioBtn.getAttribute('data-id');
                if (confirm("Hapus klip audio ini dari arsip?")) {
                    await VoiceRepo.delete(id);
                    const list = AppStore.state.generationHistory.filter((v: any) => v.id !== id);
                    AppStore.setState({ generationHistory: list });
                    showToast("Arsip audio berhasil dihapus.", "success");
                }
                return;
            }

            // Load storyboard drafts
            const loadDraftBtn = target.closest('[data-action="load-storyboard-draft"]');
            const preventDelDraft = target.closest('[data-action="delete-storyboard-draft"]');
            if (loadDraftBtn && !preventDelDraft) {
                const id = loadDraftBtn.getAttribute('data-id') || '';
                const item = AppStore.state.storyboardHistory.find((h: any) => h.id === id);
                if (item) {
                    AppStore.setState({
                        currentActiveHistoryId: id,
                        activeStoryboardData: item.data,
                        activeRatio: item.ratio,
                        sceneVersionHistory: {}
                    });
                    const themeInput = document.getElementById('themeInput') as HTMLTextAreaElement;
                    if (themeInput) themeInput.value = item.theme;
                    Views.renderStoryboardHistoryList();
                    Views.renderStoryboard(item.data, item.ratio);
                    showToast("Draft storyboard berhasil dimuat ulang ke canvas!", "success");
                }
                return;
            }

            const delDraftBtn = target.closest('[data-action="delete-storyboard-draft"]');
            if (delDraftBtn) {
                const id = delDraftBtn.getAttribute('data-id');
                if (id) {
                    await ProjectRepo.delete(id);
                    if (AppStore.state.currentActiveHistoryId === id) {
                        AppStore.setState({
                            currentActiveHistoryId: null,
                            activeStoryboardData: null
                        });
                        document.getElementById('storyboardContainer')?.classList.add('hidden');
                        document.getElementById('emptyState')?.classList.remove('hidden');
                        document.getElementById('exportBar')?.classList.add('hidden');
                    }
                    await syncProjectsAndRender();
                    showToast("Draft berhasil dihapus dari riwayat.", "success");
                }
                return;
            }

            // Bulk options
            if (target.closest('[data-action="clear-bulk-selection"]')) {
                AppStore.setState({ selectedProjects: new Set<string>() });
                const master = document.getElementById('masterSelectCheckbox') as HTMLInputElement;
                if (master) master.checked = false;
                updateBulkActionDeck();
                return;
            }

            if (target.closest('[data-action="bulk-status-update"]')) {
                const sSelect = document.getElementById('bulkStatusSelect') as HTMLSelectElement;
                const status = sSelect?.value;
                if (!status) {
                    showToast("Pilih status target terlebih dahulu!", "error");
                    return;
                }
                const selected = AppStore.state.selectedProjects;
                if (confirm(`Ubah status ${selected.size} projek terpilih menjadi [${status}]?`)) {
                    for (const id of selected) {
                        const project = await ProjectRepo.get(id);
                        if (project) {
                            project.status = status;
                            await ProjectRepo.put(project);
                        }
                    }
                    showToast("Status massal berhasil diperbarui!", "success");
                    await logWorkflowActivity(`Pembaruan status massal (${selected.size} projek) -> [${status}]`, 'success');
                    AppStore.setState({ selectedProjects: new Set<string>() });
                    const master = document.getElementById('masterSelectCheckbox') as HTMLInputElement;
                    if (master) master.checked = false;
                    updateBulkActionDeck();
                    await syncProjectsAndRender();
                }
                return;
            }

            if (target.closest('[data-action="bulk-export"]')) {
                const selected = AppStore.state.selectedProjects;
                if (selected.size === 0) return;
                showToast("Mengekspor berkas pilihan...", "success");
                const exportPayload = [];
                for (const id of selected) {
                    const project = await ProjectRepo.get(id);
                    if (project) exportPayload.push(project);
                }
                const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const downloader = document.createElement('a');
                downloader.href = url;
                downloader.download = `K_Export_Massal_${Date.now()}.json`;
                document.body.appendChild(downloader);
                downloader.click();
                document.body.removeChild(downloader);
                URL.revokeObjectURL(url);
                showToast("Ekspor massal berhasil!", "success");
                AppStore.setState({ selectedProjects: new Set<string>() });
                const master = document.getElementById('masterSelectCheckbox') as HTMLInputElement;
                if (master) master.checked = false;
                updateBulkActionDeck();
                return;
            }

            if (target.closest('[data-action="bulk-delete"]')) {
                const selected = AppStore.state.selectedProjects;
                if (selected.size === 0) return;
                if (confirm(`PERINGATAN: Apakah anda yakin ingin menghapus ${selected.size} projek terpilih secara permanen?`)) {
                    for (const id of selected) {
                        await ProjectRepo.delete(id);
                        if (AppStore.state.currentlyOpenDrawerId === id) {
                            AppStore.setState({ currentlyOpenDrawerId: null });
                        }
                    }
                    showToast("Penghapusan massal berhasil diselesaikan!", "success");
                    await logWorkflowActivity(`Menghapus secara massal ${selected.size} projek dari database`, 'warning');
                    AppStore.setState({ selectedProjects: new Set<string>() });
                    const master = document.getElementById('masterSelectCheckbox') as HTMLInputElement;
                    if (master) master.checked = false;
                    updateBulkActionDeck();
                    await syncProjectsAndRender();
                }
                return;
            }
        };

        const inputHandler = (e: Event) => {
            const target = e.target as HTMLElement;
            if (target.id === 'directorApiKey' || target.id === 'voiceApiKey') {
                syncApiKey((target as HTMLInputElement).value);
            }
            if (target.id === 'workflowSearchInput' || target.id === 'workflowTagSearch') {
                AppStore.state.workflowFilters.search = (document.getElementById('workflowSearchInput') as HTMLInputElement).value;
                AppStore.state.workflowFilters.tag = (document.getElementById('workflowTagSearch') as HTMLInputElement).value;
                AppStore.state.workflowPagination.currentPage = 1;
                syncProjectsAndRender();
            }
            if (target.id === 'characterLibrarySearch') {
                Views.renderCharacterList();
            }
            if (target.id === 'scriptInput') {
                const charCount = document.getElementById('charCounter');
                if (charCount) charCount.innerText = `${(target as HTMLTextAreaElement).value.length} / 2000 karakter`;
            }
            if (target.id === 'speechPace') {
                const label = document.getElementById('paceVal');
                if (label) label.innerText = `Normal (${parseFloat((target as HTMLInputElement).value) / 10}x)`;
            }
            if (target.id === 'sceneDuration') {
                const label = document.getElementById('durationVal');
                if (label) label.innerText = `${(target as HTMLInputElement).value} Detik`;
            }
            if (target.id === 'volumeControl') {
                const vol = parseFloat((target as HTMLInputElement).value);
                if (AudioEngine.gainNode) {
                    AudioEngine.gainNode.gain.setValueAtTime(vol, AudioEngine.ctx.currentTime);
                }
            }
            if (target.id === 'thumbnailTextVal' || target.id === 'thumbnailTextAltVal') {
                const activeData = AppStore.state.activeStoryboardData;
                if (activeData) {
                    const primaryInput = document.getElementById('thumbnailTextVal') as HTMLInputElement | null;
                    const altInput = document.getElementById('thumbnailTextAltVal') as HTMLInputElement | null;
                    activeData.thumbnail_text = primaryInput ? primaryInput.value : activeData.thumbnail_text;
                    activeData.thumbnail_text_alt = altInput ? altInput.value : activeData.thumbnail_text_alt;
                    
                    // Save to active project
                    const currentId = AppStore.state.currentActiveHistoryId;
                    if (currentId) {
                        ProjectRepo.get(currentId).then((project) => {
                            if (project) {
                                project.data_json = activeData;
                                ProjectRepo.put(project);
                            }
                        });
                    }
                }
            }
        };

        const changeHandler = (e: Event) => {
            const target = e.target as HTMLElement;
            if (target.id === 'charFile') {
                const file = (target as HTMLInputElement).files?.[0];
                if (file) {
                    AppStore.setState({
                        characterImageBlob: file,
                        characterImageMime: file.type
                    });
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        const base64Url = ev.target?.result as string;
                        document.getElementById('uploadPlaceholder')?.classList.add('hidden');
                        const pContainer = document.getElementById('uploadPreviewContainer');
                        if (pContainer) pContainer.classList.remove('hidden');
                        const p = document.getElementById('uploadPreview') as HTMLImageElement;
                        if (p) p.src = base64Url;
                    };
                    reader.readAsDataURL(file);
                }
            }
            if (target.id === 'dbRestoreInput') {
                const file = (target as HTMLInputElement).files?.[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = async (ev) => {
                        const jsonString = ev.target?.result as string;
                        await importDatabaseFromJSON(jsonString);
                    };
                    reader.readAsText(file);
                }
                (target as HTMLInputElement).value = '';
            }
            if (target.id === 'workflowFilterStatus' || target.id === 'workflowFilterCategory' || target.id === 'workflowSortSelect') {
                const selectVal = (target as HTMLSelectElement).value;
                const parts = selectVal.split('-');
                if (parts.length === 2) {
                    AppStore.state.workflowFilters.sortBy = parts[0];
                    AppStore.state.workflowFilters.sortDir = parts[1];
                } else {
                    AppStore.state.workflowFilters[target.id === 'workflowFilterStatus' ? 'status' : 'category'] = selectVal;
                }
                AppStore.state.workflowPagination.currentPage = 1;
                syncProjectsAndRender();
            }
            if (target.id === 'animationStyle') {
                const selectVal = (target as HTMLSelectElement).value;
                const customStyleContainer = document.getElementById('customStyleContainer');
                if (customStyleContainer) customStyleContainer.className = selectVal === "Gaya Kustom" ? "block mt-2" : "hidden mt-2";
            }
            if (target.classList.contains('project-selector')) {
                const id = target.getAttribute('data-id') || '';
                const set = new Set(AppStore.state.selectedProjects);
                if ((target as HTMLInputElement).checked) set.add(id);
                else set.delete(id);
                AppStore.setState({ selectedProjects: set });
                updateBulkActionDeck();
            }
            if (target.id === 'masterSelectCheckbox') {
                const isChecked = (target as HTMLInputElement).checked;
                const state = AppStore.state;
                const filtered = state.filteredWorkflowProjects;
                const itemsPerPage = state.workflowPagination.itemsPerPage;
                let curr = state.workflowPagination.currentPage;
                const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
                if (curr > totalPages) curr = totalPages;

                const start = (curr - 1) * itemsPerPage;
                const end = Math.min(start + itemsPerPage, filtered.length);
                const pageItems = filtered.slice(start, end);

                const selected = new Set(state.selectedProjects);
                pageItems.forEach((p: any) => {
                    if (isChecked) {
                        selected.add(p.id);
                    } else {
                        selected.delete(p.id);
                    }
                });

                AppStore.setState({ selectedProjects: selected });
                updateBulkActionDeck();
            }
        };

        const unloadHandler = () => {
            AudioMemoryRegistry.revokeAll();
        };

        function switchTab(tabId: string) {
            AppStore.setState({ activeTab: tabId });
            const tabDirector = document.getElementById('tab-director');
            const tabVoice = document.getElementById('tab-voice');

            const btnDirector = document.getElementById('tabBtn-director');
            const btnVoice = document.getElementById('tabBtn-voice');
            const mobileBtnDirector = document.getElementById('mobileTabBtn-director');
            const mobileBtnVoice = document.getElementById('mobileTabBtn-voice');

            if (tabId === 'director') {
                tabDirector?.classList.remove('hidden');
                tabVoice?.classList.add('hidden');
                if (btnDirector) btnDirector.className = "px-4 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 text-white bg-indigo-600 shadow cursor-pointer";
                if (btnVoice) btnVoice.className = "px-4 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 text-slate-400 hover:text-slate-200 cursor-pointer";
                if (mobileBtnDirector) mobileBtnDirector.className = "flex-1 py-2 text-center text-xs font-bold rounded-lg text-white bg-indigo-600 cursor-pointer";
                if (mobileBtnVoice) mobileBtnVoice.className = "flex-1 py-2 text-center text-xs font-bold rounded-lg text-slate-400 cursor-pointer";

                updateGlobalStatus("Director Studio Active", "indigo");
                AudioEngine.stop();
            } else {
                tabDirector?.classList.add('hidden');
                tabVoice?.classList.remove('hidden');
                if (btnDirector) btnDirector.className = "px-4 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 text-slate-400 hover:text-slate-200 cursor-pointer";
                if (btnVoice) btnVoice.className = "px-4 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 text-white bg-emerald-600 shadow cursor-pointer";
                if (mobileBtnDirector) mobileBtnDirector.className = "flex-1 py-2 text-center text-xs font-bold rounded-lg text-slate-400 cursor-pointer";
                if (mobileBtnVoice) mobileBtnVoice.className = "flex-1 py-2 text-center text-xs font-bold rounded-lg text-white bg-emerald-600 cursor-pointer";

                updateGlobalStatus("Voice Lab Aktif", "emerald");
                const canvasEl = document.getElementById('canvasVisualizer') as HTMLCanvasElement;
                if (canvasEl) {
                    const container = canvasEl.parentElement;
                    if (container) {
                        canvasEl.width = container.clientWidth;
                        canvasEl.height = container.clientHeight || 112; 
                        const ctx = canvasEl.getContext('2d');
                        if (ctx) {
                            ctx.fillStyle = '#040507';
                            ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);
                        }
                    }
                }
            }
        }

        function updateGlobalStatus(text: string, color: string) {
            const badge = document.getElementById('globalEngineStatusBadge');
            const dot = document.getElementById('globalStatusDot');
            const label = document.getElementById('globalStatusText');

            if (!label) return;
            label.innerText = text;
            if (color === 'indigo' && badge && dot) {
                badge.className = "flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20";
                dot.className = "w-2 h-2 rounded-full bg-indigo-400 animate-pulse";
                label.className = "text-[10px] md:text-xs font-semibold text-indigo-400";
            } else if (color === 'emerald' && badge && dot) {
                badge.className = "flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20";
                dot.className = "w-2 h-2 rounded-full bg-emerald-400 animate-pulse";
                label.className = "text-[10px] md:text-xs font-semibold text-emerald-400";
            } else if (color === 'amber' && badge && dot) {
                badge.className = "flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20";
                dot.className = "w-2 h-2 rounded-full bg-amber-400 animate-ping";
                label.className = "text-[10px] md:text-xs font-semibold text-amber-400";
            }
        }

        function updateBulkActionDeck() {
            const deck = document.getElementById('bulkActionDeck');
            const countLabel = document.getElementById('bulkCountLabel');
            const selected = AppStore.state.selectedProjects;
            if (!deck) return;

            if (selected.size > 0) {
                deck.classList.remove('hidden');
                if (countLabel) countLabel.innerText = `${selected.size} Projek Terpilih`;
            } else {
                deck.classList.add('hidden');
            }
        }

        async function renderActivityTimeline() {
            const container = document.getElementById('activityTimelineContainer');
            if (!container) return;
            try {
                const logs = await SettingsRepo.get('activity_log') || [];
                if (logs.length === 0) {
                    container.innerHTML = `<p class="text-[10px] text-slate-500 italic text-center py-4">Belum ada rekaman aktivitas.</p>`;
                    return;
                }
                container.innerHTML = logs.map((l: any) => {
                    const logTime = new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                    let iconColor = "text-slate-400";
                    if (l.type === 'success') iconColor = "text-emerald-400";
                    if (l.type === 'warning') iconColor = "text-rose-400";

                    return `
                        <div class="flex items-start gap-2.5 text-[11px] leading-relaxed border-b border-slate-900/60 pb-2">
                            <span class="${iconColor} select-none">•</span>
                            <div class="flex-1 text-slate-300">
                                <p class="font-semibold text-slate-350">${escapeHTML(l.action)}</p>
                                <span class="text-[9px] text-slate-500 font-mono">${logTime}</span>
                            </div>
                        </div>
                    `;
                }).join('');
            } catch (err) {
                console.error("Gagal render aktivitas timeline:", err);
            }
        }

        // ==========================================
        // 10. SYSTEM MOUNT AND Adapt LOGS
        // ==========================================
        document.addEventListener('click', clickHandler);
        document.addEventListener('input', inputHandler);
        document.addEventListener('change', changeHandler);
        window.addEventListener('unload', unloadHandler);

        initSupabaseAuth();

        // IndexedDB dynamic connection & migrations on first open
        const dbRequest = indexedDB.open(DB_NAME, DB_VERSION);
        dbRequest.onupgradeneeded = (e: any) => {
            const database = e.target.result;
            if (!database.objectStoreNames.contains('projects')) {
                database.createObjectStore('projects', { keyPath: 'id' });
            }
            if (!database.objectStoreNames.contains('characters')) {
                database.createObjectStore('characters', { keyPath: 'id' });
            }
            if (!database.objectStoreNames.contains('voice_assets')) {
                database.createObjectStore('voice_assets', { keyPath: 'id' });
            }
            if (!database.objectStoreNames.contains('settings')) {
                database.createObjectStore('settings', { keyPath: 'key' });
            }
            if (!database.objectStoreNames.contains('templates')) {
                database.createObjectStore('templates', { keyPath: 'id' });
            }
            if (!database.objectStoreNames.contains('prompts')) {
                database.createObjectStore('prompts', { keyPath: 'id' });
            }
        };
        dbRequest.onsuccess = async (e: any) => {
            dbContainer.db = e.target.result;
            
            // Core bootstrap startup values
            await seedDefaultCategoriesAndSettings();
            await syncProjectsAndRender();
            await syncCharactersAndRender();

            // Rehydrate auditory archive
            const voiceAssets = await VoiceRepo.getAll();
            voiceAssets.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            AppStore.setState({ generationHistory: voiceAssets });

            // Timeline bootstrap log
            await logWorkflowActivity("Sistem K Creator Suite Pro 2.2 berhasil dimuat secara penuh.", "success");
            await updateInspectorMetrics();
            addDBLog("Sistem Inisialisasi Berhasil. Database Terkoneksi.", "success");
        };
        dbRequest.onerror = (e: any) => {
            console.error("Database connection failure:", e);
        };

        // UI trigger elements on database load
        return () => {
            document.removeEventListener('click', clickHandler);
            document.removeEventListener('input', inputHandler);
            document.removeEventListener('change', changeHandler);
            window.removeEventListener('unload', unloadHandler);
            AudioMemoryRegistry.revokeAll();
            AudioEngine.stop();
        };
    }, []);

    return (
        <div 
            className="h-screen flex flex-col text-slate-100 overflow-hidden relative bg-[#050609] select-none"
            dangerouslySetInnerHTML={{ __html: HTML_CONTENT }}
        />
    );
}
