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
                activeCloudProjectId: null as string | null
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
        function showToast(message: string, type = "success") {
            const toast = document.getElementById('toast');
            if (!toast) return;
            toast.innerText = message;
            toast.className = `fixed bottom-6 right-6 px-5 py-3 rounded-xl shadow-2xl transition-all duration-300 transform translate-y-12 opacity-0 text-sm z-50 font-medium border ${
                type === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
            }`;
            setTimeout(() => {
                toast.classList.remove('translate-y-12', 'opacity-0');
                toast.classList.add('translate-y-0', 'opacity-100');
            }, 50);
            setTimeout(() => {
                toast.classList.remove('translate-y-0', 'opacity-100');
                toast.classList.add('translate-y-12', 'opacity-0');
            }, 3000);
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


        function renderAuthUI() {
            const user = AppStore.state.authUser;
            const label = document.getElementById('authUserLabel');
            const loginBtn = document.getElementById('btnLoginGoogle');
            const logoutBtn = document.getElementById('btnLogoutGoogle');
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
                label.innerText = displayName;
                badge.className = 'hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-semibold text-emerald-400 max-w-[240px] truncate';
                loginBtn.classList.add('hidden');
                logoutBtn.classList.remove('hidden');
            } else {
                label.innerText = 'Guest Mode';
                badge.className = 'hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-slate-500/10 border border-slate-700 text-[10px] font-semibold text-slate-400';
                loginBtn.classList.remove('hidden');
                logoutBtn.classList.add('hidden');
            }
        }

        async function initSupabaseAuth() {
            renderAuthUI();
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
            } catch (err) {
                console.warn('Auth init Supabase gagal:', err);
                AppStore.setState({ authSession: null, authUser: null });
                renderAuthUI();
            }

            supabase.auth.onAuthStateChange((_event, session) => {
                AppStore.setState({
                    authSession: session || null,
                    authUser: session?.user || null
                });
                renderAuthUI();
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
                showToast('Berhasil logout dari Google.', 'success');
            } catch (err) {
                console.error('Logout gagal:', err);
                showToast('Logout gagal.', 'error');
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
            const title = storyboardData.youtube_title || theme || 'Untitled Project';
            const btn = document.getElementById('btnSaveCloudProject') as HTMLButtonElement | null;
            const originalText = btn?.innerHTML || '☁️ Save to Cloud';
            const existingCloudId = AppStore.state.activeCloudProjectId;
            const contentPayload = {
                title,
                theme,
                ratio: AppStore.state.activeRatio,
                saved_from: 'k-creator-suite-pro',
                saved_at: new Date().toISOString(),
                storyboard: storyboardData
            };

            try {
                if (btn && !silent) {
                    btn.disabled = true;
                    btn.innerHTML = existingCloudId ? '☁️ Updating...' : '☁️ Saving...';
                }

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
                if (!silent) showToast(existingCloudId ? 'Project cloud berhasil diperbarui.' : 'Project berhasil disimpan ke Supabase Cloud.', 'success');
                addDBLog(`${silent ? 'Auto-save cloud' : 'Cloud save'} berhasil: ${title}`, 'success');
                return savedId;
            } catch (err: any) {
                console.error('Cloud save gagal:', err);
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

        function closeCloudHistoryModal() {
            const modal = document.getElementById('cloudHistoryModal');
            if (modal) modal.remove();
        }

        function renderCloudHistoryModal(projects: any[]) {
            closeCloudHistoryModal();

            const modal = document.createElement('div');
            modal.id = 'cloudHistoryModal';
            modal.className = 'fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4';

            const rows = projects.length ? projects.map((item: any) => {
                const title = escapeHTML(item.title || 'Untitled Project');
                const date = escapeHTML(formatCloudDate(item.updated_at || item.created_at));
                const id = escapeHTML(item.id || '');
                const sceneCount = item.content?.storyboard?.scenes?.length || item.content?.scenes?.length || 0;
                const theme = escapeHTML(item.content?.theme || item.content?.storyboard?.youtube_title || 'Cloud project');
                return `
                    <div class="group border border-slate-800 bg-[#0b0d14] hover:bg-slate-900/80 hover:border-sky-500/30 rounded-2xl p-4 transition">
                        <div class="flex items-start justify-between gap-3">
                            <div class="min-w-0 flex-1">
                                <h4 class="text-sm font-bold text-slate-100 truncate">${title}</h4>
                                <p class="text-[11px] text-slate-400 mt-1 line-clamp-2">${theme}</p>
                                <div class="flex flex-wrap items-center gap-2 mt-3 text-[10px] text-slate-500 font-mono">
                                    <span class="px-2 py-1 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/10">${sceneCount} scene</span>
                                    <span>${date}</span>
                                </div>
                            </div>
                            <div class="shrink-0 flex items-center gap-2">
                                <button data-action="load-cloud-project" data-id="${id}" class="px-3 py-1.5 rounded-xl bg-sky-600/15 hover:bg-sky-600/30 border border-sky-500/20 text-sky-300 text-xs font-bold transition cursor-pointer">
                                    Load
                                </button>
                                <button data-action="delete-cloud-project" data-id="${id}" data-title="${title}" class="px-3 py-1.5 rounded-xl bg-rose-600/10 hover:bg-rose-600/25 border border-rose-500/20 text-rose-400 text-xs font-bold transition cursor-pointer">
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('') : `
                <div class="border border-dashed border-slate-800 rounded-2xl p-8 text-center">
                    <div class="text-3xl mb-3">☁️</div>
                    <h4 class="text-sm font-bold text-slate-200">Belum ada project cloud</h4>
                    <p class="text-xs text-slate-500 mt-1">Generate storyboard, lalu klik Save to Cloud.</p>
                </div>
            `;

            modal.innerHTML = `
                <div class="w-full max-w-3xl max-h-[82vh] overflow-hidden rounded-3xl bg-[#08090e] border border-slate-800 shadow-2xl flex flex-col">
                    <div class="p-5 border-b border-slate-800 flex items-center justify-between gap-3">
                        <div>
                            <h3 class="text-lg font-bold text-slate-100">☁️ Cloud History</h3>
                            <p class="text-xs text-slate-400 mt-1">Project tersimpan di Supabase milik akun Google aktif.</p>
                        </div>
                        <div class="flex items-center gap-2">
                            <button data-action="refresh-cloud-history" class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer">Refresh</button>
                            <button data-action="close-cloud-history" class="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/10 text-xs font-semibold transition cursor-pointer">Close</button>
                        </div>
                    </div>
                    <div class="p-5 overflow-y-auto custom-scrollbar space-y-3">
                        ${rows}
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
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
            const originalText = btn?.innerHTML || '☁️ Cloud History';

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
                activeCloudProjectId: item.id
            });

            const themeInput = document.getElementById('themeInput') as HTMLTextAreaElement | null;
            if (themeInput) themeInput.value = theme;

            Views.renderStoryboard(storyboard, ratio);
            closeCloudHistoryModal();
            showToast('Project cloud berhasil dimuat ke canvas.', 'success');
            addDBLog(`Cloud project dimuat: ${item.title || item.id}`, 'success');
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

                const deck = document.getElementById('scenesContainer');
                if (!deck) return;
                deck.innerHTML = "";

                data.scenes.forEach((scene: any, index: number) => {
                    const card = document.createElement('div');
                    card.className = "bg-[#08090e] border border-slate-855 rounded-2xl overflow-hidden shadow-xl transition hover:border-slate-800";
                    
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
                                        📋 Salin Prompt Gambar
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
                                        📋 Salin Prompt Video
                                    </button>
                                </div>
                                <p class="text-xs text-slate-355 leading-relaxed bg-[#0c0e14] border border-slate-850 p-3.5 rounded-xl font-mono whitespace-pre-line">
                                    ${escapeHTML(videoPromptToShow || 'Tidak ada prompt video.')}
                                </p>
                            </div>

                            <!-- 5. Generate TTS Button (Kirim ke Voice Lab) -->
                            <div class="pt-3 border-t border-slate-800/60 flex justify-end">
                                <button class="btn-send-scene bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-xl text-[11px] transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/10" data-action="send-scene-script" data-index="${index}">
                                    🎙️ Kirim ke Voice Lab (Generate TTS) ↗
                                </button>
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
                    category: 'Anime',
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
            const theme = (document.getElementById('themeInput') as HTMLTextAreaElement).value.trim();
            if (!theme) {
                showToast("Isi tema atau topik bahasan konten pada deck kontrol!", "error");
                return;
            }

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
                    theme, narratorStyle, animStyle, constraints, includeCta, AppStore.state.activeRatio, AppStore.state.activeSceneMode, sceneCount, sceneDurVal, AppStore.state.globalApiKey
                );
            } finally {
                clearInterval(progressInterval);
            }

            if (!result.success) {
                showToast(result.error || "Gagal merumuskan storyboard. Coba periksa Kunci API Anda.", "error");
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = "Rumuskan Storyboard (AI)";
                }
                updateGlobalStatus("Director Studio Active", "indigo");
                return;
            }

            const parsedData = result.data;
            AppStore.setState({ activeStoryboardData: parsedData });

            const selectedCategory = (document.getElementById('projectCategorySelect') as HTMLSelectElement)?.value || "Anime";
            const projectId = generateSecureId();
            const newProject = {
                id: projectId,
                title: parsedData.youtube_title || `Project Storyboard ${projectId}`,
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
                showToast("Naskah visual storyboard berhasil dirumuskan!", "success");

                if (AppStore.state.authUser?.id && isSupabaseConfigured()) {
                    saveActiveProjectToCloud(true).then((cloudId) => {
                        if (cloudId) {
                            showToast("Project otomatis tersimpan ke cloud.", "success");
                        }
                    });
                }
            } catch (err) {
                console.error("Gagal memproses pasca-generasi storyboard:", err);
                showToast("Gagal mengamankan draf data ke penyimpanan.", "error");
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
            const script = (document.getElementById('scriptInput') as HTMLTextAreaElement).value.trim();
            if (!script) {
                showToast("Ketik naskah vokal terlebih dahulu!", "error");
                return;
            }

            if (!AppStore.state.globalApiKey) {
                showToast("Ketikkan Kunci API Gemini Anda di kolom sidebar terlebih dahulu!", "error");
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
                showToast(result.error || "Sintesis audio gagal.", "error");
                if (btn) {
                    btn.disabled = false;
                    btn.innerText = "Sintesis Suara (TTS)";
                }
                updateGlobalStatus("Voice Lab Active", "emerald");
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
                updateGlobalStatus("Voice Lab Active", "emerald");
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

        // Event delegation handlers
        const clickHandler = async (e: MouseEvent) => {
            const target = e.target as HTMLElement;

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
                    navigator.clipboard.writeText(textElem.innerText || textElem.textContent || '').then(() => {
                        showToast("Teks berhasil disalin ke clipboard!", "success");
                    });
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
                        showToast("Narasi adegan berhasil dikirim ke Voice Lab!", "success");
                    }
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
                    navigator.clipboard.writeText(textPrompt).then(() => {
                        showToast("Prompt Gambar berhasil disalin!", "success");
                    });
                }
                return;
            }

            const copyVideoPromptBtn = target.closest('[data-action="copy-video-prompt"]');
            if (copyVideoPromptBtn) {
                const idx = parseInt(copyVideoPromptBtn.getAttribute('data-index') || '0', 10);
                const scene = AppStore.state.activeStoryboardData?.scenes[idx];
                if (scene) {
                    const textPrompt = scene.videoPrompt || scene.camera_movement || "";
                    navigator.clipboard.writeText(textPrompt).then(() => {
                        showToast("Prompt Video berhasil disalin!", "success");
                    });
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
                    updateGlobalStatus("Voice Lab Active", "emerald");
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
                        activeRatio: item.ratio
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

                updateGlobalStatus("Voice Lab Active", "emerald");
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
