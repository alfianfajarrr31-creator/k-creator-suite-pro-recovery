export const HTML_CONTENT = `
    <!-- Toast Notification System -->
    <div id="toast" class="fixed bottom-6 right-6 px-5 py-3 rounded-xl shadow-2xl transition-all duration-300 transform translate-y-12 opacity-0 text-sm z-50 font-medium border border-slate-800 pointer-events-none"></div>

    <!-- Header Block -->
    <header class="h-16 border-b border-slate-855 bg-[#08090e] flex items-center px-4 md:px-6 justify-between shrink-0 z-30">
        <div class="flex items-center gap-3">
            <!-- Hamburger menu button on mobile -->
            <button id="btnHamburger" class="md:hidden p-2 rounded-xl hover:bg-slate-800 text-slate-300 focus:outline-none cursor-pointer flex items-center justify-center border border-slate-800/60 bg-[#0c0d12]" aria-label="Menu">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"></path>
                </svg>
            </button>
            <div class="w-10 h-10 overflow-hidden rounded-xl shadow-lg shadow-indigo-600/20">
                <svg class="w-full h-full" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="header-logo-g" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="#6366f1" />
                      <stop offset="100%" stop-color="#a855f7" />
                    </linearGradient>
                  </defs>
                  <rect width="100" height="100" rx="22" fill="url(#header-logo-g)" />
                  <rect x="25" y="25" width="12" height="50" rx="3" fill="white" />
                  <path d="M37 50 L65 25 H53 L37 40 Z" fill="white" opacity="0.9" />
                  <path d="M37 50 L65 75 H53 L37 60 Z" fill="white" opacity="0.9" />
                  <polygon points="56,44 68,50 56,56" fill="#050609" opacity="0.85" />
                </svg>
            </div>
            <div>
                <h1 class="text-xs md:text-sm font-bold tracking-wide bg-gradient-to-r from-indigo-200 to-emerald-200 bg-clip-text text-transparent flex items-center gap-1">
                    K Creator Suite <span class="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/20 font-mono font-semibold ml-1">Pro Advanced 2.2</span>
                </h1>
                <p class="text-[9px] md:text-[10px] text-slate-400 font-semibold tracking-wider uppercase">Unified AI Storyboard & Human-Expression TTS Workspace</p>
            </div>
        </div>

        <!-- Global Navigation Tab Switches -->
        <nav class="hidden md:flex items-center gap-2 bg-[#0e1017] border border-slate-800 p-1 rounded-xl">
            <button id="tabBtn-director" data-action="switch-tab" data-tab="director" class="px-4 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 text-white bg-indigo-600 shadow cursor-pointer">
                🎬 Director Studio
            </button>
            <button id="tabBtn-voice" data-action="switch-tab" data-tab="voice" class="px-4 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 text-slate-400 hover:text-slate-200 cursor-pointer">
                🎙️ Voice Studio Pro
            </button>
        </nav>

        <div class="flex items-center gap-2 md:gap-4">
            <div id="authStatusBadge" class="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-slate-500/10 border border-slate-700 text-[10px] font-semibold text-slate-400 max-w-[240px] truncate">
                <span id="authUserLabel">Guest Mode</span>
            </div>
            <button id="btnLoginGoogle" data-action="login-google" class="px-3 py-1.5 bg-emerald-600/15 hover:bg-emerald-600/30 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-1.5 transition duration-150 cursor-pointer">
                🔐 Login Google
            </button>
            <button id="btnLogoutGoogle" data-action="logout-google" class="hidden px-3 py-1.5 bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-bold items-center gap-1.5 transition duration-150 cursor-pointer">
                Logout
            </button>
            <button id="btnCloudHistory" data-action="open-cloud-history" class="px-3 py-1.5 bg-sky-600/10 hover:bg-sky-600/25 border border-sky-500/20 text-sky-400 rounded-xl text-xs font-bold items-center gap-1.5 transition duration-150 cursor-pointer">
                ☁️ Cloud History
            </button>
            <!-- Phase 1.6 DB Inspector Trigger Button -->
            <button id="btnToggleInspector" data-action="toggle-inspector" class="px-3 py-1.5 bg-[#0f111a] hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs flex items-center gap-1.5 transition duration-150 cursor-pointer">
                🗄️ Inspector
            </button>
            <div class="flex items-center gap-2 px-2.5 md:px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20" id="globalEngineStatusBadge">
                <span class="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" id="globalStatusDot"></span>
                <span class="text-[10px] md:text-xs font-semibold text-indigo-400" id="globalStatusText">Ready for Action</span>
            </div>
        </div>
    </header>

    <!-- Mobile Navigation Tab Switches -->
    <div class="flex md:hidden border-b border-slate-855 bg-[#0a0b10] p-2 justify-around shrink-0 z-20">
        <button id="mobileTabBtn-director" data-action="switch-tab" data-tab="director" class="flex-1 py-2 text-center text-xs font-bold rounded-lg text-white bg-indigo-600 cursor-pointer">🎬 Storyboard</button>
        <button id="mobileTabBtn-voice" data-action="switch-tab" data-tab="voice" class="flex-1 py-2 text-center text-xs font-bold rounded-lg text-slate-400 cursor-pointer">🎙️ Voice Lab</button>
    </div>

    <!-- Main Workspace Container -->
    <main class="flex-1 flex overflow-hidden relative">
        <!-- Backdrop for mobile sidebars -->
        <div id="sidebarBackdrop" class="fixed inset-0 bg-[#030406]/75 z-40 hidden md:hidden cursor-pointer transition-opacity opacity-0 pointer-events-none"></div>

        <!-- Tab Workspace: Director Studio (Storyboard) -->
        <section id="tab-director" class="flex-1 flex overflow-hidden">
            <!-- Left Controls Panel (Director Sidebar) -->
            <aside id="directorAside" class="mobile-sidebar w-80 border-r border-slate-855 bg-[#08090e] p-5 overflow-y-auto space-y-4 flex flex-col shrink-0">
                <div class="space-y-1">
                    <h2 class="text-xs font-bold text-indigo-400 uppercase tracking-wider font-mono">Sutradara Kontrol Deck</h2>
                    <p class="text-xs text-slate-400 leading-relaxed">Atur naskah visual, pergerakan kamera, dan durasi video Anda.</p>
                </div>

                <!-- API handled server-side: keep hidden field for legacy sync only -->
                <input type="hidden" id="directorApiKey" value="">
                <div class="space-y-2 border-t border-slate-800/40 pt-3">
                    <div class="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-3">
                        <div class="flex items-center gap-2 text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
                            <span>🔐</span>
                            <span>API aman di server</span>
                        </div>
                        <p class="mt-1 text-[10px] leading-relaxed text-slate-500">Tidak perlu memasukkan API key manual. Gemini diproses lewat Vercel Environment Variables.</p>
                    </div>
                </div>

                <!-- Theme Input -->
                <div class="space-y-2 border-t border-slate-800/40 pt-3">
                    <label class="block text-xs font-semibold text-slate-400">Tema / Bahasan Konten</label>
                    <textarea id="themeInput" class="w-full rounded-xl bg-[#0f111a] border border-slate-800 p-2.5 text-xs text-slate-300 placeholder-slate-655 focus:border-indigo-500 outline-none transition h-20 resize-none" placeholder="Contoh: Pembahasan detail pulau manusia ikan One piece..."></textarea>
                </div>

                <input type="hidden" id="projectCategorySelect" value="Storyboard">

                <!-- Narrator style choice -->
                <div class="space-y-2 border-t border-slate-800/40 pt-3">
                    <label class="block text-xs font-semibold text-slate-400">Gaya Penyampaian Cerita</label>
                    <select id="narratorStyle" class="w-full rounded-xl bg-[#0f111a] border border-slate-800 p-2.5 text-xs text-slate-200 focus:border-indigo-500 outline-none transition">
                        <option value="narator_dokumenter">Narator Dokumenter (Edukatif, Tenang, Berbobot)</option>
                        <option value="monolog_dalam">Monolog Intim (Suara Hati Tokoh Utama, Emosional)</option>
                        <option value="dialog_dramatis">Dialog Karakter (Percakapan Dramatik Antar Tokoh)</option>
                        <option value="hype_marketing">Hype Promosi (Gaya Iklan, Menggebu-gebu, Viral)</option>
                    </select>
                </div>

                <!-- Output Language Selector -->
                <div class="space-y-2 border-t border-slate-800/40 pt-3">
                    <label class="block text-xs font-semibold text-slate-400">Bahasa Output Storyboard</label>
                    <select id="outputLanguage" class="w-full rounded-xl bg-[#0f111a] border border-slate-800 p-2.5 text-xs text-slate-200 focus:border-indigo-500 outline-none transition">
                        <option value="mixed" selected>Mixed Recommended (Narasi Indonesia, Prompt Visual English)</option>
                        <option value="id">Bahasa Indonesia (Semua Output)</option>
                        <option value="en">English (All Output)</option>
                    </select>
                    <p class="text-[9px] text-slate-500 leading-relaxed font-semibold">Pilih Indonesia kalau ingin prompt lebih mudah dikoreksi manual. Mixed lebih aman untuk Veo/Kling.</p>
                </div>

                <!-- Animation Art Style Selector -->
                <div class="space-y-2 border-t border-slate-800/40 pt-3">
                    <label class="block text-xs font-semibold text-slate-400">Gaya Animasi & Visual</label>
                    <select id="animationStyle" class="w-full rounded-xl bg-[#0f111a] border border-slate-800 p-2.5 text-xs text-slate-200 focus:border-indigo-500 outline-none transition">
                        <option value="Claymation Animation">Claymation (Gaya Lempung Plastisin Wallace & Gromit)</option>
                        <option value="3D Pixar Style Animation">3D Pixar Style (Karakter Disney 3D Berwarna Indah)</option>
                        <option value="Vintage Studio Ghibli Anime">Vintage Studio Ghibli Anime (Gaya Gambar Tangan Klasik)</option>
                        <option value="Futuristic Cyberpunk CGI">Futuristic Cyberpunk CGI (Sci-Fi Modern Semi-Realistis)</option>
                        <option value="Water Color Storybook Illustration">Water Color Storybook (Gaya Buku Dongeng Cat Air)</option>
                        <option value="Retro 16-Bit Pixel Art">Retro 16-Bit Pixel Art (Gaya Game Klasik Nostalgia)</option>
                        <option value="Cinematic 2D Vector Illustration">Cinematic 2D Vector (Flat Design Modern, Elegan)</option>
                        <option value="Dark Fantasy Gothic Sketch">Dark Fantasy Gothic Sketch (Arsir Pensil Misterius)</option>
                        <option value="Neon Synthwave Retrofuturism">Neon Synthwave Retrofuturism (Retro 80-an Neon)</option>
                        <option value="Gaya Kustom">Tulis Gaya Kustom Sendiri...</option>
                    </select>
                    <div id="customStyleContainer" class="hidden mt-2">
                        <input type="text" id="customStyleInput" placeholder="Ketik gaya kustom..." class="w-full rounded-xl bg-[#0f111a] border border-slate-800 p-2 text-xs text-slate-300 outline-none focus:border-indigo-500">
                    </div>
                </div>

                <!-- Scene Options (Auto vs Manual) -->
                <div class="space-y-2 border-t border-slate-800/40 pt-3">
                    <label class="block text-xs font-semibold text-slate-400">Pengaturan Jumlah Scene</label>
                    <div class="grid grid-cols-2 gap-2">
                        <button type="button" id="modeAutoBtn" data-action="set-scene-mode" data-mode="auto" class="py-2 text-xs font-medium rounded-xl border border-indigo-500 bg-indigo-500/10 text-white transition cursor-pointer">Otomatis</button>
                        <button type="button" id="modeManualBtn" data-action="set-scene-mode" data-mode="manual" class="py-2 text-xs font-medium rounded-xl border border-slate-800 bg-[#0f111a] text-slate-400 hover:border-slate-700 transition cursor-pointer">Manual</button>
                    </div>
                    <div id="manualSceneContainer" class="hidden mt-2">
                        <input type="number" id="sceneCountInput" value="5" min="3" max="15" class="w-full rounded-xl bg-[#0f111a] border border-slate-800 p-2 text-xs text-slate-300 outline-none focus:border-indigo-500">
                    </div>
                </div>

                <!-- Dynamic Scene Duration Slider -->
                <div class="space-y-2 border-t border-slate-800/40 pt-3">
                    <div class="flex justify-between items-center">
                        <label class="block text-xs font-semibold text-slate-400">Durasi Per Scene</label>
                        <span id="durationVal" class="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded font-mono font-bold">8 Detik</span>
                    </div>
                    <input type="range" id="sceneDuration" min="3" max="15" value="8" disabled class="w-full h-1 bg-slate-855 rounded-lg appearance-none cursor-not-allowed accent-indigo-500 transition opacity-50 accent-indigo">
                    <p id="durationInfoText" class="text-[9px] text-slate-500 leading-relaxed font-semibold">Terkunci ke 8s untuk keselarasan ritme adegan otomatis terbaik.</p>
                </div>

                <!-- Call to Action Options Toggle -->
                <div class="space-y-2 border-t border-slate-800/40 pt-3">
                    <div class="flex items-center justify-between">
                        <label class="block text-xs font-semibold text-slate-400">Sertakan CTA di Akhir Video</label>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" id="ctaToggle" checked class="sr-only peer">
                            <div class="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white peer-checked:after:border-indigo-600"></div>
                        </label>
                    </div>
                    <p class="text-[9px] text-slate-500 leading-relaxed">Menyisipkan instruksi ajakan interaktif (Like, Comment, Follow) alami di akhir klip video.</p>
                </div>

                <!-- Constraints / Visual Exceptions Field -->
                <div class="space-y-2 border-t border-slate-800/40 pt-3">
                    <label class="block text-xs font-semibold text-slate-400">Instruksi Khusus (Karakter / Larangan)</label>
                    <textarea id="constraintsInput" class="w-full rounded-xl bg-[#0f111a] border border-slate-800 p-2.5 text-xs text-slate-300 placeholder-slate-655 focus:border-indigo-500 outline-none transition h-16 resize-none" placeholder="Contoh: Karakter utama harus berambut putih panjang..."></textarea>
                </div>

                <!-- Master Character Photo Consistency -->
                <div class="space-y-2 border-t border-slate-800/40 pt-3">
                    <div class="flex items-center justify-between">
                        <label class="block text-xs font-semibold text-slate-400">Master Karakter Utama</label>
                        <span class="text-[9px] bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded font-mono font-bold">Consistent AI</span>
                    </div>
                    <div id="characterUploadTrigger" data-action="upload-trigger" class="relative group cursor-pointer">
                        <input type="file" id="charFile" accept="image/*" class="hidden">
                        <div id="uploadPlaceholder" class="border border-dashed border-slate-800 hover:border-indigo-500/40 rounded-xl p-3 text-center transition bg-[#0f111a]/50">
                            <span class="text-lg">👤</span>
                            <p class="text-[10px] text-slate-500 mt-1 font-medium">Klik unggah wajah aktor</p>
                        </div>
                        <div id="uploadPreviewContainer" class="hidden relative rounded-xl overflow-hidden border border-slate-800 bg-[#0f111a]">
                            <img id="uploadPreview" src="" class="w-full h-20 object-cover" alt="Preview Karakter">
                            <button id="btnRemoveCharFile" data-action="remove-char-file" class="absolute top-1 right-1 bg-rose-500 hover:bg-rose-600 text-white p-1 rounded-lg transition shadow-md cursor-pointer">❌</button>
                        </div>
                    </div>
                </div>

                <!-- Aspect Ratio Selector -->
                <div class="space-y-2 border-t border-slate-800/40 pt-3">
                    <label class="block text-xs font-semibold text-slate-400">Aspek Rasio Video</label>
                    <div class="grid grid-cols-3 gap-2">
                        <button type="button" data-ratio="16:9" data-action="set-ratio" data-ratio-val="16:9" class="ratio-btn py-2 text-[10px] rounded-xl border border-indigo-500 bg-indigo-500/10 text-white transition font-bold cursor-pointer">16:9</button>
                        <button type="button" data-ratio="9:16" data-action="set-ratio" data-ratio-val="9:16" class="ratio-btn py-2 text-[10px] rounded-xl border border-slate-800 bg-[#0f111a] text-slate-400 hover:border-slate-700 transition font-bold cursor-pointer">9:16</button>
                        <button type="button" data-ratio="1:1" data-action="set-ratio" data-ratio-val="1:1" class="ratio-btn py-2 text-[10px] rounded-xl border border-slate-800 bg-[#0f111a] text-slate-400 hover:border-slate-700 transition font-bold cursor-pointer">1:1</button>
                    </div>
                </div>

                <!-- Draft History Section -->
                <div class="space-y-2 border-t border-slate-800/40 pt-3">
                    <div class="flex items-center justify-between">
                        <div>
                            <label class="block text-xs font-semibold text-slate-400 font-bold text-indigo-400 tracking-wider">Riwayat Draft Sesi Ini</label>
                            <p class="text-[9px] text-slate-500">Klik draf untuk memuat kembali</p>
                        </div>
                        <span id="historyCountBadge" class="text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded font-mono font-bold">0 Draft</span>
                    </div>
                    <div id="historyListContainer" class="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        <p class="text-[10px] text-slate-500 italic text-center py-2">Belum ada draf tersimpan.</p>
                    </div>
                </div>

                <!-- Action button -->
                <div class="pt-2 pb-6">
                    <button id="generateBtn" data-action="generate-storyboard" class="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white py-3 rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/15 transition duration-150 flex items-center justify-center gap-2 glow-button-indigo font-mono uppercase tracking-wider cursor-pointer">
                        Rumuskan Storyboard (AI)
                    </button>
                </div>
            </aside>

            <!-- Right Workspace Panel (Director Canvas Layout) -->
            <section class="flex-1 p-6 overflow-y-auto flex flex-col bg-[#030406] relative">
                
                <!-- ADVANCED CONTENT WORKFLOW MANAGER (PHASE 2.2 SYSTEM) -->
                <div id="advancedWorkflowWrapper" class="max-w-4xl mx-auto w-full space-y-6 mb-8 mt-4 border-b border-slate-855 pb-8">
                    
                    <!-- A. WORKFLOW ANALYTICS DASHBOARD -->
                    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5" id="workflowDashboardContainer">
                        <!-- Dynamic analytics cards injected here -->
                    </div>

                    <!-- B. INTERACTIVE CONTROL & BULK ACTIONS TOOLBAR -->
                    <div class="bg-[#08090e] border border-slate-855 rounded-2xl p-4 space-y-4">
                        <div class="flex flex-col lg:flex-row gap-3 items-center justify-between">
                            <!-- Search & Dynamic Tag Filter -->
                            <div class="flex flex-col sm:flex-row gap-2.5 w-full lg:w-auto">
                                <div class="relative w-full sm:w-64">
                                    <input type="text" id="workflowSearchInput" placeholder="Cari judul, tema, atau naskah..." class="w-full rounded-xl bg-[#0f111a] border border-slate-800 p-2.5 pl-9 text-xs text-slate-300 placeholder-slate-655 focus:border-indigo-500 outline-none transition">
                                    <span class="absolute left-3 top-3.5 text-xs opacity-50">🔍</span>
                                </div>
                                <div class="relative w-full sm:w-48">
                                    <input type="text" id="workflowTagSearch" placeholder="Saring berdasar tag..." class="w-full rounded-xl bg-[#0f111a] border border-slate-800 p-2.5 pl-8 text-xs text-indigo-400 placeholder-slate-655 focus:border-indigo-500 outline-none transition font-semibold">
                                    <span class="absolute left-2.5 top-3.5 text-xs opacity-60">🏷️</span>
                                </div>
                            </div>

                            <!-- Sort, Status & Quick Filter Panel -->
                            <div class="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
                                <button type="button" id="filterFavBtn" data-action="toggle-fav-filter" class="px-3 py-2 rounded-xl bg-[#0f111a] border border-slate-800 text-xs text-slate-455 hover:text-yellow-500 transition cursor-pointer">
                                    ⭐ Favorit
                                </button>
                                <button type="button" id="filterArcBtn" data-action="toggle-arc-filter" class="px-3 py-2 rounded-xl bg-[#0f111a] border border-slate-800 text-xs text-slate-455 hover:text-blue-400 transition cursor-pointer">
                                    📦 Archived
                                </button>
                                <select id="workflowFilterStatus" class="rounded-xl bg-[#0f111a] border border-slate-800 p-2.5 text-xs text-slate-300 focus:border-indigo-500 outline-none">
                                    <option value="">Semua Status</option>
                                    <option value="Draft">Draft</option>
                                    <option value="Generated">Generated</option>
                                    <option value="Voice Generated">Voice Ready</option>
                                    <option value="Exported">Exported</option>
                                    <option value="Published">Published</option>
                                </select>
                                <select id="workflowSortSelect" class="rounded-xl bg-[#0f111a] border border-slate-800 p-2.5 text-xs text-slate-300 focus:border-indigo-500 outline-none">
                                    <option value="created_at-desc">Terbaru (Latest)</option>
                                    <option value="created_at-asc">Terlama (Oldest)</option>
                                    <option value="title-asc">Judul A-Z</option>
                                </select>
                            </div>
                        </div>

                        <!-- BULK ACTION DECK -->
                        <div id="bulkActionDeck" class="hidden flex flex-wrap items-center justify-between border-t border-slate-855 pt-3 gap-2">
                            <div class="flex items-center gap-2">
                                <span class="text-xs text-slate-400 font-semibold" id="bulkCountLabel">0 Terpilih</span>
                                <button id="btnClearBulkSelection" data-action="clear-bulk-selection" class="text-[10px] text-slate-500 hover:text-slate-300 underline transition cursor-pointer">Batalkan Pilihan</button>
                            </div>
                            <div class="flex flex-wrap items-center gap-2">
                                <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Aksi Massal:</span>
                                <select id="bulkStatusSelect" class="rounded-lg bg-[#0f111a] border border-slate-800 p-1.5 text-[11px] text-slate-300 focus:border-indigo-500 outline-none">
                                    <option value="">Ubah Status...</option>
                                    <option value="Draft">Set Draft</option>
                                    <option value="Generated">Set Generated</option>
                                    <option value="Voice Generated">Set Voice Ready</option>
                                    <option value="Exported">Set Exported</option>
                                    <option value="Published">Set Published</option>
                                </select>
                                <button id="btnBulkStatusUpdate" data-action="bulk-status-update" class="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-bold transition cursor-pointer">Terapkan</button>
                                <button id="btnBulkExport" data-action="bulk-export" class="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-bold transition cursor-pointer">📦 Export JSON</button>
                                <button id="btnBulkDelete" data-action="bulk-delete" class="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[11px] font-bold transition cursor-pointer">❌ Hapus Massal</button>
                            </div>
                        </div>

                        <!-- C. PROJECT TABLE WITH PAGINATION & PERFORMANCE OPTIMIZATION -->
                        <div class="overflow-x-auto rounded-xl border border-slate-855 bg-black/20">
                            <table class="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr class="border-b border-slate-855 bg-slate-900/35 text-slate-400 font-semibold">
                                        <th class="p-3 w-8">
                                            <input type="checkbox" id="masterSelectCheckbox" class="rounded border-slate-800 text-indigo-500 bg-slate-900 focus:ring-0 w-3.5 h-3.5">
                                        </th>
                                        <th class="p-3">Judul Projek</th>
                                        <th class="p-3">Tema & Bahasan</th>
                                        <th class="p-3">Tags</th>
                                        <th class="p-3">Status</th>
                                        <th class="p-3">Tanggal Dibuat</th>
                                        <th class="p-3 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody id="workflowTableBody" class="divide-y divide-slate-855/40">
                                    <!-- Dynamic rows from IndexedDB here -->
                                </tbody>
                            </table>
                        </div>

                        <!-- Pagination bar -->
                        <div class="flex items-center justify-between text-[11px] text-slate-500 pt-2" id="workflowPaginationBar">
                            <!-- Injected elements dynamic -->
                        </div>
                    </div>

                    <!-- G. ADVANCED TOOLS: CHARACTER LIBRARY & RECENT ACTIVITY (collapsed by default) -->
                    <details class="group rounded-2xl border border-slate-855 bg-[#08090e]/70 p-4">
                        <summary class="flex cursor-pointer list-none items-center justify-between gap-3">
                            <div>
                                <h3 class="text-xs font-bold text-slate-300 uppercase tracking-widest font-mono">Advanced Tools</h3>
                                <p class="text-[10px] text-slate-500 mt-0.5">Character Library dan Activity Timeline dipindahkan ke sini agar workspace utama lebih bersih.</p>
                            </div>
                            <span class="text-[10px] font-bold text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-1 rounded-lg group-open:hidden">Buka</span>
                            <span class="text-[10px] font-bold text-slate-400 bg-slate-800/70 border border-slate-700 px-2 py-1 rounded-lg hidden group-open:inline">Tutup</span>
                        </summary>
                        <div class="grid grid-cols-1 md:grid-cols-12 gap-6 mt-4">
                        <!-- Left Panel: Character Library (8 Cols) -->
                        <div class="md:col-span-8 bg-[#08090e] border border-slate-855 rounded-2xl p-5 space-y-4">
                            <div class="flex items-center justify-between border-b border-slate-855 pb-3">
                                <div class="flex items-center gap-2">
                                    <span class="text-xl">👥</span>
                                    <div>
                                        <h3 class="text-xs font-bold text-purple-400 uppercase tracking-widest font-mono">Character Library (Optional)</h3>
                                        <p class="text-[10px] text-slate-400 mt-0.5">Opsional. Dipakai hanya kalau butuh referensi karakter berulang.</p>
                                    </div>
                                </div>
                                <div class="relative w-48">
                                    <input type="text" id="characterLibrarySearch" placeholder="Cari karakter..." class="w-full rounded-xl bg-[#0f111a] border border-slate-800 p-2 pl-8 text-[11px] text-slate-355 focus:border-purple-500 outline-none transition font-semibold">
                                    <span class="absolute left-2.5 top-2.5 text-xs opacity-40">🔍</span>
                                </div>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4" id="characterLibraryContainer">
                                <!-- Character records generated here -->
                            </div>
                        </div>

                        <!-- Right Panel: Dynamic Activity Timeline (4 Cols) -->
                        <div class="md:col-span-4 bg-[#08090e] border border-slate-855 rounded-2xl p-5 flex flex-col h-auto">
                            <div class="border-b border-slate-855 pb-3 mb-4 shrink-0">
                                <h3 class="text-xs font-bold text-teal-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                                    <span>🕒 Activity Timeline</span>
                                </h3>
                                <p class="text-[10px] text-slate-400 mt-0.5">Pantau rekaman peristiwa mutakhir sesi ini secara nyata.</p>
                            </div>
                            <div id="activityTimelineContainer" class="flex-1 overflow-y-auto space-y-3.5 max-h-96 pr-1 custom-scrollbar">
                                <p class="text-[10px] text-slate-500 italic text-center py-4">Belum ada rekaman aktivitas.</p>
                            </div>
                        </div>
                        </div>
                    </details>
                </div>

                <div class="max-w-7xl mx-auto w-full flex-1 flex flex-col gap-4">
                    <!-- Heading banner -->
                    <div class="sticky top-0 z-20 -mx-2 md:-mx-3 px-2 md:px-3 py-3 bg-[#05060a]/92 backdrop-blur-xl flex flex-col md:flex-row md:items-start justify-between border-b border-slate-855 gap-3">
                        <div>
                            <h2 id="storyboardTitle" class="text-lg md:text-xl font-bold text-slate-100 tracking-tight">Project Storyboard Canvas</h2>
                            <p id="storyboardSub" class="text-xs text-slate-400 mt-1">Gunakan formulir kontrol di kiri untuk menghasilkan rancangan tiga pilar teks produksi video Anda.</p>
                        </div>
                        <div id="exportBar" class="hidden flex flex-wrap items-center justify-start md:justify-end gap-2 md:max-w-xl">
                            <!-- Primary actions stay visible for daily use -->
                            <button id="btnSaveCloudProject" data-action="save-cloud-project" class="bg-sky-600/15 hover:bg-sky-600/25 text-sky-400 border border-sky-500/20 px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer">
                                ☁️ Save / Update Cloud
                            </button>
                            <span id="cloudSaveStatus" class="hidden px-2.5 py-1 rounded-xl text-[10px] font-bold border bg-slate-900/70 text-slate-500 border-slate-800">Unsaved</span>
                            <button id="btnTransferAllScenes" data-action="transfer-all-scenes" class="bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer">
                                🎙️ Voice Lab
                            </button>

                            <!-- Secondary output tools are grouped to reduce header clutter -->
                            <details class="relative group">
                                <summary class="list-none select-none bg-slate-800/70 hover:bg-slate-800 text-slate-300 border border-slate-700/70 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer">
                                    ⚡ Output Tools <span class="text-[9px] text-slate-500">copy/export</span>
                                </summary>
                                <div class="absolute right-0 mt-2 w-72 z-40 rounded-2xl border border-slate-800 bg-[#08090e] shadow-2xl p-3 grid gap-2">
                                    <button id="btnCopyFullStoryboard" data-action="copy-bulk-storyboard" data-copy-type="full" class="w-full bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-400 border border-indigo-500/20 px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer">
                                        📦 Copy Full Package
                                    </button>
                                    <button id="btnCopyAllNarration" data-action="copy-bulk-storyboard" data-copy-type="narration" class="w-full bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 border border-emerald-500/20 px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer">
                                        🎙️ Copy Narration
                                    </button>
                                    <button id="btnCopyAllImages" data-action="copy-bulk-storyboard" data-copy-type="image" class="w-full bg-purple-600/15 hover:bg-purple-600/25 text-purple-400 border border-purple-500/20 px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer">
                                        🎨 Copy Image Prompts
                                    </button>
                                    <button id="btnCopyAllVideos" data-action="copy-bulk-storyboard" data-copy-type="video" class="w-full bg-teal-600/15 hover:bg-teal-600/25 text-teal-400 border border-teal-500/20 px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer">
                                        🎥 Copy Video Prompts
                                    </button>
                                    <div class="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                                        <button id="btnExportTxt" data-action="export-project-txt" class="bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 border border-emerald-500/20 px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer">
                                            ⬇️ TXT
                                        </button>
                                        <button id="btnExportJson" data-action="export-project-json" class="bg-slate-600/15 hover:bg-slate-600/25 text-slate-300 border border-slate-500/20 px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer">
                                            {} JSON
                                        </button>
                                    </div>
                                </div>
                            </details>
                        </div>
                    </div>

                    <!-- Empty state -->
                    <div id="emptyState" class="flex-1 border border-dashed border-slate-855 rounded-2xl flex flex-col items-center justify-center p-10 text-center text-slate-500 space-y-4">
                        <span class="text-4xl inline-block animate-bounce">🎬</span>
                        <h3 class="font-bold text-slate-300">Belum ada Storyboard yang Dirumuskan</h3>
                        <p class="text-xs max-w-md mx-auto leading-relaxed">Pilih salah satu inspirasi konten cepat di bawah untuk langsung mencoba performa sinergi Creator Suite:</p>

                        <!-- Inspiration presets -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full max-w-2xl pt-4">
                            <div data-inspiration="onepiece" data-action="load-preset" data-preset-val="onepiece" class="group p-4 bg-[#08090d] border border-slate-855 hover:border-indigo-500/30 rounded-xl text-left transition duration-150 cursor-pointer">
                                <span class="text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded font-medium">🎭 Ghibli Anime</span>
                                <h4 class="text-xs font-bold text-slate-200 mt-1">Misteri Pulau Manusia Ikan</h4>
                            </div>
                            <div data-inspiration="lambung" data-action="load-preset" data-preset-val="lambung" class="group p-4 bg-[#08090d] border border-slate-855 hover:border-emerald-500/30 rounded-xl text-left transition duration-150 cursor-pointer">
                                <span class="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-medium">🧩 Claymation</span>
                                <h4 class="text-xs font-bold text-slate-200 mt-1">Cara Kerja Lambung Manusia</h4>
                            </div>
                        </div>
                    </div>

                    <!-- Storyboard Contents Stack (Appears dynamically) -->
                    <div id="storyboardContainer" class="hidden space-y-4">
                        
                        <!-- Scenes deck list (Daily Use main focus) -->
                        <div class="rounded-2xl border border-indigo-500/10 bg-indigo-500/[0.03] p-3 md:p-4">
                            <div class="mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <h3 class="text-xs font-bold text-slate-200 uppercase tracking-widest">🎬 Storyboard Scenes</h3>
                                    <p class="text-[10px] text-slate-500 mt-0.5">Area utama review, edit, regenerate, copy scene, dan susun ulang alur visual.</p>
                                </div>
                                <span class="text-[9px] text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-1 rounded-lg font-bold uppercase tracking-wider">Daily Focus</span>
                            </div>
                            <div id="scenesContainer" class="space-y-4"></div>
                        </div>

                        <!-- Collapsible Publishing Package Section at the bottom -->
                        <div class="bg-[#08090e] border border-slate-800 rounded-2xl shadow-2xl relative overflow-hidden">
                            <!-- Collapsible Trigger Header -->
                            <button id="btnTogglePublishingPackage" data-action="toggle-publishing-package" class="w-full text-left p-5 flex items-center justify-between hover:bg-slate-900/40 transition cursor-pointer select-none">
                                <div class="flex items-center gap-3">
                                    <span class="text-xl">📦</span>
                                    <div>
                                        <h3 class="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                            Publishing Package 
                                            <span class="text-[8px] lowercase bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/20 font-mono">caption, hashtags, hooks & thumbnail</span>
                                        </h3>
                                        <p class="text-[10px] text-slate-400 mt-0.5">Materi asisten publikasi otomatis buatan AI untuk menembus FYP TikTok, Reels, & Shorts.</p>
                                    </div>
                                </div>
                                <div class="flex items-center gap-2">
                                    <span id="publishingPackageToggleLabel" class="text-[10px] text-slate-500 font-bold uppercase tracking-wider bg-slate-900 px-2 py-1 rounded">Buka / Tutup</span>
                                    <span id="publishingPackageToggleIcon" class="text-xs transition-transform duration-200 transform">▼</span>
                                </div>
                            </button>

                            <!-- Collapsible Content (Default: collapsed/hidden) -->
                            <div id="publishingPackageContent" class="hidden border-t border-slate-855/60 p-5 space-y-5 bg-[#0a0b11]">
                                <!-- Action Row for Regeneration -->
                                <div class="flex flex-wrap items-center justify-between gap-3 bg-[#0f111a] p-3 rounded-xl border border-slate-800">
                                    <span class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">⚡ Asisten Optimasi Publishing</span>
                                    <div class="flex items-center gap-2">
                                        <button id="btnRegenThumbnailText" data-action="regen-thumbnail-text" class="bg-amber-600/10 hover:bg-amber-600/20 text-amber-400 border border-amber-500/25 px-2.5 py-1.5 rounded-lg text-[9px] font-bold transition flex items-center gap-1 cursor-pointer">
                                            🔄 Regen Thumbnail Text
                                        </button>
                                        <button id="btnRegenPublishingPackage" data-action="regen-publishing-package" class="bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/25 px-2.5 py-1.5 rounded-lg text-[9px] font-bold transition flex items-center gap-1 cursor-pointer">
                                            🔄 Regen Full Package
                                        </button>
                                    </div>
                                </div>

                                <!-- Distribution Cards Grid -->
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <!-- Col 1: YouTube Shorts and Hashtags -->
                                    <div class="space-y-4">
                                        <div class="bg-[#0f111a] p-3 rounded-xl border border-slate-800">
                                            <div class="flex justify-between items-center mb-1.5">
                                                <span class="text-[10px] font-bold text-rose-455 uppercase font-sans tracking-wide">YouTube Shorts Title</span>
                                                <button id="btnCopyYtTitle" data-action="copy-field" data-field-id="ytTitleText" class="text-[9px] text-slate-500 hover:text-indigo-400 font-mono font-bold cursor-pointer">Salin</button>
                                            </div>
                                            <p id="ytTitleText" class="text-xs font-bold text-slate-200 leading-relaxed"></p>
                                        </div>
                                        <div class="bg-[#0f111a] p-3 rounded-xl border border-slate-800">
                                            <div class="flex justify-between items-center mb-1.5">
                                                <span class="text-[10px] font-bold text-red-500 uppercase font-sans tracking-wide">YouTube Shorts Description</span>
                                                <button id="btnCopyYtDesc" data-action="copy-field" data-field-id="ytDescText" class="text-[9px] text-slate-500 hover:text-indigo-400 font-mono font-bold cursor-pointer">Salin</button>
                                            </div>
                                            <p id="ytDescText" class="text-[11px] text-slate-300 leading-relaxed whitespace-pre-line max-h-24 overflow-y-auto custom-scrollbar"></p>
                                        </div>
                                        <div class="bg-[#0f111a] p-3 rounded-xl border border-slate-800">
                                            <div class="flex justify-between items-center mb-1.5">
                                                <span class="text-[10px] font-bold text-indigo-400 uppercase font-sans tracking-wide">Viral Hashtags</span>
                                                <button id="btnCopyHashtags" data-action="copy-field" data-field-id="hashtagsText" class="text-[9px] text-slate-500 hover:text-indigo-400 font-mono font-bold cursor-pointer">Salin</button>
                                            </div>
                                            <p id="hashtagsText" class="text-xs text-indigo-300 font-semibold font-mono tracking-wide"></p>
                                        </div>
                                    </div>

                                    <!-- Col 2: Social Media & Cover Prompt -->
                                    <div class="space-y-4">
                                        <div class="bg-[#0f111a] p-3 rounded-xl border border-slate-800">
                                            <div class="flex justify-between items-center mb-1.5">
                                                <span class="text-[10px] font-bold text-teal-400 uppercase font-sans tracking-wide">TikTok Caption</span>
                                                <button id="btnCopyTiktokCaption" data-action="copy-field" data-field-id="tiktokCaptionText" class="text-[9px] text-slate-500 hover:text-indigo-400 font-mono font-bold cursor-pointer">Salin</button>
                                            </div>
                                            <p id="tiktokCaptionText" class="text-[11px] text-slate-300 leading-relaxed whitespace-pre-line max-h-24 overflow-y-auto custom-scrollbar"></p>
                                        </div>
                                        <div class="bg-[#0f111a] p-3 rounded-xl border border-slate-800">
                                            <div class="flex justify-between items-center mb-1.5">
                                                <span class="text-[10px] font-bold text-pink-400 uppercase font-sans tracking-wide">Instagram Caption</span>
                                                <button id="btnCopyIgCaption" data-action="copy-field" data-field-id="igCaptionText" class="text-[9px] text-slate-500 hover:text-indigo-400 font-mono font-bold cursor-pointer">Salin</button>
                                            </div>
                                            <p id="igCaptionText" class="text-[11px] text-slate-300 leading-relaxed whitespace-pre-line max-h-24 overflow-y-auto custom-scrollbar"></p>
                                        </div>

                                        <!-- Editable Hook Thumbnail Text (New Feature) -->
                                        <div class="bg-gradient-to-tr from-amber-950/20 to-indigo-950/20 p-3 rounded-xl border border-amber-500/20 space-y-2">
                                            <div class="flex justify-between items-center">
                                                <span class="text-[10px] font-bold text-amber-400 uppercase font-sans tracking-wide flex items-center gap-1">🎟️ Thumbnail Text</span>
                                                <button id="btnCopyThumbnailText" data-action="copy-input-field" data-field-id="thumbnailTextValue" class="text-[9px] text-slate-400 hover:text-amber-300 font-mono font-bold cursor-pointer transition">Salin Teks</button>
                                            </div>
                                            <div class="space-y-1">
                                                <input type="text" id="thumbnailTextVal" class="w-full text-xs font-bold text-amber-200 bg-black/40 border border-amber-500/15 rounded-lg p-2 focus:border-amber-500/80 focus:outline-none transition" placeholder="Masukkan teks utama thumbnail di sini...">
                                                <input type="text" id="thumbnailTextAltVal" class="w-full text-[11px] text-slate-450 bg-black/20 border border-slate-800/80 rounded-lg p-1.5 focus:border-indigo-500/50 focus:outline-none transition" placeholder="Alternatif Teks Hook...">
                                            </div>
                                            <p class="text-[9px] text-slate-400 mt-1 italic">Kalau tidak suka, ganti teks thumbnail di sini.</p>
                                        </div>

                                        <div class="bg-gradient-to-tr from-indigo-950/20 to-purple-950/20 p-3 rounded-xl border border-indigo-500/20 font-sans">
                                            <div class="flex justify-between items-center mb-1.5">
                                                <span class="text-[10px] font-bold text-indigo-300 uppercase font-sans tracking-wider flex items-center gap-1">✨ Cover / Thumbnail Prompt</span>
                                                <button id="btnCopyThumbnailPrompt" data-action="copy-field" data-field-id="thumbnailPromptText" class="text-[9px] text-slate-500 hover:text-indigo-400 font-mono font-bold cursor-pointer">Salin Prompt</button>
                                            </div>
                                            <p id="thumbnailPromptText" class="text-[11px] text-slate-300 leading-relaxed font-mono bg-black/40 p-2.5 rounded-lg border border-slate-800/80 max-h-24 overflow-y-auto custom-scrollbar"></p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </section>

        <!-- Tab Workspace: Voice Studio Pro (TTS) -->
        <section id="tab-voice" class="flex-1 flex overflow-hidden hidden">
            <!-- Left Controls Panel (Voice Sidebar) -->
            <aside id="voiceAside" class="mobile-sidebar w-80 border-r border-slate-855 bg-[#08090e] p-5 overflow-y-auto space-y-5 flex flex-col shrink-0">
                <div class="space-y-1">
                    <h2 class="text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono">Acoustic & Voice Control</h2>
                    <p class="text-xs text-slate-400 leading-relaxed">Atur parameter psikologi vokal, desah napas, dan acting emosional di sini.</p>
                </div>

                <!-- API handled server-side: keep hidden field for legacy sync only -->
                <input type="hidden" id="voiceApiKey" value="">
                <div class="space-y-2 border-t border-slate-800/40 pt-4">
                    <div class="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-3">
                        <div class="flex items-center gap-2 text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
                            <span>🔐</span>
                            <span>Voice API aman di server</span>
                        </div>
                        <p class="mt-1 text-[10px] leading-relaxed text-slate-500">Tidak perlu memasukkan API key manual untuk TTS.</p>
                    </div>
                </div>

                <!-- Voice Emotion -->
                <div class="space-y-2 border-t border-slate-800/40 pt-4">
                    <label class="block text-xs font-semibold text-slate-455">Emotion Acting Lab (Gaya Akting)</label>
                    <select id="voiceEmotion" class="w-full rounded-xl bg-[#0f111a] border border-slate-855 p-2.5 text-xs text-slate-200 focus:border-emerald-500 outline-none transition">
                        <option value="conversational" data-prefix="Say in a completely casual, warm tone...">Casual Friend (Santai, Hangat)</option>
                        <option value="dramatic" data-prefix="Say in a slow, deeply emotional, intimate drama voice...">Deep Drama (Sedih, Dramatik)</option>
                        <option value="energetic" data-prefix="Say with high energy, absolute excitement...">Energetic Hype (Bersemangat)</option>
                        <option value="whisper" data-prefix="Say in an incredibly quiet, breathy whisper...">Mysterious Whisper (Berbisik)</option>
                    </select>
                </div>

                <!-- Voice Character Selector with expanded choices (23 voices) -->
                <div class="space-y-2 border-t border-slate-800/40 pt-4">
                    <label class="block text-xs font-semibold text-slate-455">Aktor Vokal (Voice Character)</label>
                    <select id="voiceSelector" class="w-full rounded-xl bg-[#0f111a] border border-slate-855 p-2.5 text-xs text-slate-200 focus:border-emerald-500 outline-none transition">
                        <optgroup label="Pilihan Utama (Popular & Ekspresif)">
                            <option value="Zephyr" selected>Zephyr (Bright, Populer & Karismatik)</option>
                            <option value="Puck">Puck (Upbeat, Cepat & Ceria)</option>
                            <option value="Kore">Kore (Firm, Berwibawa & Kuat)</option>
                            <option value="Charon">Charon (Informative, Jelas & Tenang)</option>
                            <option value="Leda">Leda (Youthful, Segar & Bersahabat)</option>
                            <option value="Algenib">Algenib (Gravelly, Berat, Serak & Maskulin)</option>
                        </optgroup>
                        <optgroup label="Suara Laki-Laki (Male Profiles)">
                            <option value="Fenrir">Fenrir (Excitable, Berenergi & Menggebu-gebu)</option>
                            <option value="Orus">Orus (Firm, Keras, Tegas & Kokoh)</option>
                            <option value="Iapetus">Iapetus (Clear, Bersih, Profesional & Terang)</option>
                            <option value="Umbriel">Umbriel (Easy-going, Santai & Kasual)</option>
                            <option value="Rasalgethi">Rasalgethi (Informative, Sangat Detail & Akurat)</option>
                            <option value="Alnilam">Alnilam (Firm, Berwibawa & Tenang)</option>
                            <option value="Achird">Achird (Friendly, Hangat & Dekat)</option>
                            <option value="Sadaltager">Sadaltager (Knowledgeable, Bijak & Dewasa)</option>
                            <option value="Schedar">Schedar (Even, Stabil, Netral & Konstan)</option>
                        </optgroup>
                        <optgroup label="Suara Perempuan (Female Profiles)">
                            <option value="Aoede">Aoede (Breezy, Lembut, Mengalir & Santai)</option>
                            <option value="Autonoe">Autonoe (Bright, Ceria, Berpendar & Bahagia)</option>
                            <option value="Enceladus">Enceladus (Breathy, Emosional, Intim & Berbisik)</option>
                            <option value="Despina">Despina (Smooth, Lembut, Elegan & Halus)</option>
                            <option value="Erinome">Erinome (Clear, Sangat Bening & Artikulasinya Tajam)</option>
                            <option value="Laomedeia">Laomedeia (Upbeat, Gembira & Dinamis)</option>
                            <option value="Vindemiatrix">Vindemiatrix (Gentle, Anggun, Keibuan & Penyayang)</option>
                            <option value="Sadachbia">Sadachbia (Lively, Penuh Energi & Segar)</option>
                            <option value="Sulafat">Sulafat (Warm, Ramah, Dekat & Menenangkan)</option>
                        </optgroup>
                    </select>
                </div>

                <!-- Human Imperfections Options -->
                <div class="space-y-3 border-t border-slate-800/40 pt-4">
                    <label class="block text-xs font-semibold text-slate-455">Human Imperfections</label>
                    <div class="space-y-2 bg-[#0f111a] p-3 rounded-xl border border-slate-855">
                        <label class="flex items-center gap-2.5 cursor-pointer text-xs text-slate-300">
                            <input type="checkbox" id="injectBreaths" checked class="rounded border-slate-800 text-emerald-500 bg-slate-900 focus:ring-0 w-4 h-4">
                            <span>Suntikkan Tarikan Napas <span class="text-[9px] text-emerald-400 font-mono">[breath]</span></span>
                        </label>
                        <label class="flex items-center gap-2.5 cursor-pointer text-xs text-slate-300">
                            <input type="checkbox" id="injectSighs" checked class="rounded border-slate-800 text-emerald-500 bg-slate-900 focus:ring-0 w-4 h-4">
                            <span>Suntikkan Desahan Napas <span class="text-[9px] text-emerald-400 font-mono">[sigh]</span></span>
                        </label>
                    </div>
                </div>

                <!-- Speech Pace Slider -->
                <div class="space-y-3 border-t border-slate-800/40 pt-4">
                    <div class="space-y-1">
                        <div class="flex justify-between items-center">
                            <label class="block text-xs font-semibold text-slate-455">Pace / Kecepatan Bicara</label>
                            <span id="paceVal" class="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold">Normal (1.0x)</span>
                        </div>
                        <input type="range" id="speechPace" min="8" max="13" value="10" class="w-full h-1 bg-slate-855 rounded-lg appearance-none cursor-pointer accent-emerald-500 transition accent-emerald">
                    </div>
                </div>

                <!-- Action Button -->
                <div class="pt-2 pb-6">
                    <button id="generateVoiceBtn" data-action="generate-voice" class="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white py-3 rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/15 duration-150 flex items-center justify-center gap-2 glow-button-emerald font-mono uppercase tracking-wider cursor-pointer">
                        Sintesis Suara (TTS)
                    </button>
                </div>
            </aside>

            <!-- Right Workspace Panel (Voice Canvas) -->
            <section class="flex-1 p-6 overflow-y-auto flex flex-col bg-[#030406] relative">
                <div class="max-w-7xl mx-auto w-full flex-1 flex flex-col gap-4">

                    <!-- Voice Banner -->
                    <div class="border-b border-slate-855 pb-5">
                        <h2 class="text-xl font-bold text-slate-100 flex items-center gap-2">
                            <span>Vocal Expression Workspace</span>
                            <span class="text-xs font-normal bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">Expression Engine v2.5</span>
                        </h2>
                        <p class="text-xs text-slate-400 mt-1">Gunakan formula akting psikologi di panel kiri untuk memproduksi suara buatan yang paling ekspresif dan bernyawa.</p>
                    </div>

                    <!-- Script Editor -->
                    <div class="space-y-2">
                        <div class="flex justify-between items-center">
                            <label class="block text-xs font-semibold text-emerald-400 uppercase tracking-wider">Naskah Suara (Script Input)</label>
                            <span id="charCounter" class="text-[10px] text-slate-500 font-mono">0 / 2000 karakter</span>
                        </div>
                        <!-- Expression Tag Quick Injector Bar -->
                        <div class="flex items-center gap-1.5 flex-wrap bg-[#08090d] border border-slate-855 p-2 rounded-xl">
                            <span class="text-[10px] text-slate-500 font-mono uppercase px-2 font-semibold font-bold">Tag Cepat:</span>
                            <button type="button" data-tag="[breath]" class="btn-inject-tag text-[10px] bg-[#11131c] hover:bg-emerald-500/10 text-emerald-400 border border-slate-800 px-2.5 py-1 rounded-lg font-medium transition cursor-pointer font-bold">🫁 Tarik Napas</button>
                            <button type="button" data-tag="[sigh]" class="btn-inject-tag text-[10px] bg-[#11131c] hover:bg-emerald-500/10 text-emerald-400 border border-slate-800 px-2.5 py-1 rounded-lg font-medium transition cursor-pointer font-bold">😮‍💨 Desah Nafas</button>
                        </div>
                        <textarea id="scriptInput" class="w-full h-40 rounded-2xl bg-[#08090d] border border-slate-855 focus:border-emerald-500 p-4 text-sm text-slate-200 outline-none resize-none transition duration-150 leading-relaxed" placeholder="Tulis atau tempel naskah Anda di sini..."></textarea>
                    </div>

                    <!-- Visualizer & Primary Audio Player Card -->
                    <div class="bg-gradient-to-br from-[#07090e] to-[#0a0d14] border border-emerald-500/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden glow-emerald">
                        <div class="flex items-center justify-between border-b border-slate-855 pb-4 mb-4">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-lg">🎧</div>
                                <div>
                                    <h3 id="playerTitle" class="text-xs font-bold text-slate-200">Acoustic Player Studio</h3>
                                    <p id="playerSubtitle" class="text-[10px] text-slate-500">Sintesis naskah Anda terlebih dahulu untuk memulai gelombang pemutaran.</p>
                                </div>
                            </div>
                            <div id="playerActions" class="flex items-center gap-4 hidden">
                                <div class="flex items-center gap-2 bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-xl">
                                    <span class="text-[10px]">🔊</span>
                                    <input type="range" id="volumeControl" min="0" max="1" step="0.05" value="1" class="w-16 h-1 bg-slate-855 rounded-lg appearance-none cursor-pointer accent-emerald-500">
                                </div>
                                <button id="downloadBtn" class="bg-emerald-600/10 hover:bg-emerald-600/25 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer">
                                    📥 Download WAV
                                </button>
                            </div>
                        </div>

                        <!-- Equalizer Canvas -->
                        <div class="h-28 bg-[#040507] border border-slate-855 rounded-xl flex items-center justify-center relative overflow-hidden">
                            <canvas id="canvasVisualizer" class="w-full h-full block absolute inset-0"></canvas>
                            <div id="visualizerEmpty" class="text-center space-y-1 relative z-10 pointer-events-none">
                                <span class="text-xl">📊</span>
                                <p class="text-[10px] text-slate-500 font-mono tracking-wider">WAITING FOR ACOUSTIC SIGNAL</p>
                            </div>
                        </div>

                        <!-- Player Controllers -->
                        <div class="flex items-center justify-between mt-5 gap-4">
                            <div class="flex items-center gap-3">
                                <button id="playPauseBtn" data-action="toggle-play-pause" disabled class="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed flex items-center justify-center transition duration-150 hover:scale-105">
                                    <svg id="playIcon" class="w-5 h-5 translate-x-[1px]" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>
                                    <svg id="pauseIcon" class="w-5 h-5 hidden" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path></svg>
                                </button>
                                <div>
                                    <div class="flex items-center gap-2">
                                        <span id="currentTime" class="text-xs text-slate-400 font-mono">00:00</span>
                                        <span class="text-xs text-slate-600">/</span>
                                        <span id="durationTime" class="text-xs text-slate-400 font-mono">00:00</span>
                                    </div>
                                    <p id="engineVoiceTag" class="text-[9px] text-slate-500 uppercase font-bold tracking-wider mt-0.5">Sintesis Engine: Offline</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Auditory Archive -->
                    <div class="space-y-3">
                        <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <span>Auditory History Archive</span>
                            <span id="historyBadge" class="text-[10px] bg-slate-900 text-slate-500 border border-slate-800 px-2 py-0.5 rounded font-mono font-semibold">0 Saved</span>
                        </h3>
                        <div id="historyEmpty" class="border border-slate-855 border-dashed rounded-2xl p-8 text-center text-slate-500">
                            <span class="text-lg">🗂️</span>
                            <p class="text-xs mt-1">Belum ada klip yang disimpan di sesi ini.</p>
                        </div>
                        <div id="historyList" class="space-y-3 hidden font-semibold"></div>
                    </div>
                </div>
            </section>
        </section>
    </main>

    <!-- Phase 1.6: Sliding Database Inspector Drawer Overlay -->
    <div id="databaseInspectorDrawer" class="fixed top-0 right-0 h-full w-96 bg-[#08090e] border-l border-slate-800 transform translate-x-full transition-transform duration-300 ease-in-out z-50 flex flex-col shadow-2xl">
        <div class="p-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-[#0a0b10]">
            <div class="flex items-center gap-2">
                <span class="text-lg">🗄️</span>
                <div>
                    <h2 class="text-sm font-bold tracking-wide text-indigo-400">Database Inspector</h2>
                    <p class="text-[9px] text-slate-500 uppercase font-semibold font-mono">Stability Panel v2.2</p>
                </div>
            </div>
            <button id="btnCloseInspector" class="p-1 rounded-lg hover:bg-slate-800/80 text-slate-400 hover:text-white transition cursor-pointer">
                ✕
            </button>
        </div>

        <div class="flex-1 overflow-y-auto p-4 space-y-4">
            <!-- Section 1: Connection & Meta Status -->
            <div class="bg-[#0f111a] rounded-xl border border-slate-800 p-3 space-y-2">
                <h3 class="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Metrik Status</h3>
                <div class="grid grid-cols-2 gap-2 text-xs">
                    <div class="bg-black/40 p-2 rounded-lg border border-slate-900">
                        <span class="text-[9px] text-slate-500 block">Koneksi DB</span>
                        <span id="inspectConnStatus" class="font-bold text-rose-500 animate-pulse">Disconnected</span>
                    </div>
                    <div class="bg-black/40 p-2 rounded-lg border border-slate-900">
                        <span class="text-[9px] text-slate-500 block">Versi Database</span>
                        <span id="inspectDBVersion" class="font-bold text-slate-300 font-mono">v3</span>
                    </div>
                    <div class="bg-black/40 p-2 rounded-lg border border-slate-900">
                        <span class="text-[9px] text-slate-500 block">Status Migrasi</span>
                        <span id="inspectMigrationStatus" class="font-bold text-slate-300">Pending</span>
                    </div>
                    <div class="bg-black/40 p-2 rounded-lg border border-slate-900">
                        <span class="text-[9px] text-slate-500 block">Rasio Pilihan</span>
                        <span id="inspectPreferredRatio" class="font-bold text-indigo-400 font-mono">16:9</span>
                    </div>
                </div>
            </div>

            <!-- Section 2: Storage Monitor -->
            <div class="bg-[#0f111a] rounded-xl border border-slate-800 p-3 space-y-2">
                <h3 class="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Pemantau Memori</h3>
                <div class="grid grid-cols-3 gap-2 text-xs">
                    <div class="bg-black/40 p-2 rounded-lg border border-slate-900 text-center">
                        <span class="text-[8px] text-slate-500 block">Teks / JSON</span>
                        <span id="inspectTextSize" class="font-bold text-slate-200 font-mono">0.00 MB</span>
                    </div>
                    <div class="bg-black/40 p-2 rounded-lg border border-slate-900 text-center">
                        <span class="text-[8px] text-slate-500 block">Audio (WAV)</span>
                        <span id="inspectAudioSize" class="font-bold text-emerald-400 font-mono">0.00 MB</span>
                    </div>
                    <div class="bg-black/40 p-2 rounded-lg border border-slate-900 text-center">
                        <span class="text-[8px] text-slate-500 block">Foto Aktor</span>
                        <span id="inspectImageSize" class="font-bold text-purple-400 font-mono">0.00 MB</span>
                    </div>
                </div>
                <div class="bg-black/40 p-2.5 rounded-lg border border-slate-900 flex justify-between items-center text-xs">
                    <span class="text-slate-400 font-semibold">Total Ukuran Database:</span>
                    <span id="inspectTotalSize" class="font-bold text-indigo-400 font-mono">0.00 MB</span>
                </div>
            </div>

            <!-- Section 3: Entity Count -->
            <div class="bg-[#0f111a] rounded-xl border border-slate-800 p-3 space-y-2">
                <h3 class="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Koleksi Data Aset</h3>
                <div class="grid grid-cols-2 gap-2 text-xs">
                    <div class="bg-black/40 p-2 rounded-lg border border-slate-900 flex justify-between items-center">
                        <span class="text-slate-400">Projek</span>
                        <span id="inspectProjCount" class="font-mono font-bold text-slate-200">0</span>
                    </div>
                    <div class="bg-black/40 p-2 rounded-lg border border-slate-900 flex justify-between items-center">
                        <span class="text-slate-400">Karakter</span>
                        <span id="inspectCharCount" class="font-mono font-bold text-slate-200">0</span>
                    </div>
                    <div class="bg-black/40 p-2 rounded-lg border border-slate-900 flex justify-between items-center">
                        <span class="text-slate-400">Suara (WAV)</span>
                        <span id="inspectVoiceCount" class="font-mono font-bold text-slate-200">0</span>
                    </div>
                    <div class="bg-black/40 p-2 rounded-lg border border-slate-900 flex justify-between items-center">
                        <span class="text-slate-400">Templates</span>
                        <span id="inspectTemplateCount" class="font-mono font-bold text-slate-200">0</span>
                    </div>
                </div>
                <div class="bg-black/40 p-2.5 rounded-lg border border-slate-900 flex justify-between items-center text-xs">
                    <span class="text-slate-400">Pustaka Prompts (Style):</span>
                    <span id="inspectPromptCount" class="font-bold text-slate-200 font-mono">0</span>
                </div>
            </div>

            <!-- Section 4: Action Tools Panel -->
            <div class="bg-[#0f111a] rounded-xl border border-slate-800 p-3 space-y-2.5">
                <h3 class="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Aktivitas & Uji Alat</h3>
                <div class="grid grid-cols-2 gap-2">
                    <button id="btnExportDatabase" data-action="export-db" class="py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition duration-150 cursor-pointer">
                        📥 Backup Database
                    </button>
                    <button id="btnTriggerRestore" data-action="trigger-restore" class="py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition duration-150 cursor-pointer">
                        📤 Restore Database
                    </button>
                    <button id="btnTestSaveProject" data-action="test-save-project" class="py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-indigo-400 rounded-lg text-[10px] font-bold transition duration-150 cursor-pointer">
                        🧪 Test Save Project
                    </button>
                    <button id="btnTestSaveAudio" data-action="test-save-audio" class="py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-emerald-400 rounded-lg text-[10px] font-bold transition duration-150 cursor-pointer">
                        🧪 Test Save Audio
                    </button>
                </div>
                <!-- File Input Handler -->
                <input type="file" id="dbRestoreInput" accept=".json" class="hidden">
            </div>

            <!-- Section 5: Database Logger Container -->
            <div class="bg-[#0f111a] rounded-xl border border-slate-800 p-3 space-y-2 flex flex-col h-60">
                <h3 class="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 font-mono">Database Logs</h3>
                <div id="dbLogsContainer" class="flex-1 bg-black/40 border border-slate-900 rounded-lg p-2 overflow-y-auto text-[10px] font-mono text-slate-400 space-y-1 custom-scrollbar">
                    <div class="text-slate-500 italic">[Sistem Log Inisialisasi]</div>
                </div>
            </div>
        </div>
    </div>

    <!-- D. PROJECT DETAIL DRAWER (SLIDING OVERLAY) -->
    <div id="workflowDetailDrawer" class="fixed top-0 right-0 h-full w-[460px] max-w-full bg-[#08090e] border-l border-slate-800 transform translate-x-full transition-transform duration-300 ease-in-out z-50 flex flex-col shadow-2xl hidden">
        <!-- Structure created dynamically to guarantee safe render -->
    </div>
`;

