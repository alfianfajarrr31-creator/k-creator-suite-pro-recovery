export const HTML_CONTENT = `
    <!-- Toast Notification System -->
    <div id="toast" class="fixed bottom-6 right-6 px-5 py-3 rounded-xl shadow-2xl transition-all duration-300 transform translate-y-12 opacity-0 text-sm z-50 font-medium border border-slate-800 pointer-events-none"></div>



    <!-- Operation Progress Signal: shows long generate/regenerate status clearly -->
    <div id="operationProgressPanel" class="hidden fixed top-16 left-3 right-3 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-[560px] z-[70] rounded-2xl border border-indigo-500/25 bg-[#08090e]/95 backdrop-blur-xl shadow-2xl shadow-black/50 overflow-hidden">
        <div class="p-4 space-y-3">
            <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                    <div class="flex items-center gap-2">
                        <span id="operationProgressIcon" class="text-lg">⏳</span>
                        <h3 id="operationProgressTitle" class="text-sm font-black text-slate-100 truncate">Sedang memproses...</h3>
                    </div>
                    <p id="operationProgressDetail" class="text-[11px] text-slate-400 mt-1 leading-relaxed">Jangan tutup halaman ini dulu.</p>
                </div>
                <div id="operationProgressPercent" class="shrink-0 text-[11px] font-black text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-2.5 py-1">0%</div>
            </div>
            <div class="h-2.5 rounded-full bg-slate-800 overflow-hidden border border-slate-700/50">
                <div id="operationProgressBar" class="h-full w-[0%] rounded-full bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 transition-all duration-500"></div>
            </div>
            <div class="flex items-center justify-between gap-3 text-[10px] text-slate-500">
                <span id="operationProgressHint">Kalau gagal, aplikasi akan kasih alasan dan tombol bisa dicoba ulang.</span>
                <span id="operationProgressElapsed" class="font-mono text-slate-400">00s</span>
            </div>
        </div>
    </div>

    <!-- Header Block -->
    <header class="h-14 md:h-16 border-b border-slate-855 bg-[#08090e] flex items-center px-2.5 md:px-6 justify-between shrink-0 z-30 overflow-hidden">
        <div class="flex items-center gap-2 md:gap-3">
            <!-- Hamburger menu button on mobile -->
            <button id="btnHamburger" class="md:hidden p-2 rounded-xl hover:bg-slate-800 text-slate-300 focus:outline-none cursor-pointer flex items-center justify-center border border-slate-800/60 bg-[#0c0d12]" aria-label="Menu">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"></path>
                </svg>
            </button>
            <div class="w-8 h-8 md:w-10 md:h-10 overflow-hidden rounded-xl shadow-lg shadow-indigo-600/20">
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
                <h1 class="text-[11px] md:text-sm font-bold tracking-wide bg-gradient-to-r from-indigo-200 to-emerald-200 bg-clip-text text-transparent flex items-center gap-1 leading-tight">
                    K Creator Suite <span class="hidden xs:inline text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/20 font-mono font-semibold ml-1">Daily Pro</span>
                </h1>
                <p class="hidden sm:block text-[9px] md:text-[10px] text-slate-400 font-semibold tracking-wider uppercase">AI Storyboard, Prompt, dan TTS Workspace</p>
            </div>
        </div>

        <!-- Global Navigation Tab Switches -->
        <nav class="hidden md:flex items-center gap-2 bg-[#0e1017] border border-slate-800 p-1 rounded-xl">
            <button id="tabBtn-director" data-action="switch-tab" data-tab="director" class="px-4 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 text-white bg-indigo-600 shadow cursor-pointer">
                🎬 Storyboard Studio
            </button>
            <button id="tabBtn-voice" data-action="switch-tab" data-tab="voice" class="px-4 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 text-slate-400 hover:text-slate-200 cursor-pointer">
                🎙️ Voice Lab
            </button>
            <button id="tabBtn-affiliate" data-action="switch-tab" data-tab="affiliate" class="px-4 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 text-slate-400 hover:text-slate-200 cursor-pointer">
                🛒 Affiliate Studio
            </button>
        </nav>

        <div class="flex items-center gap-2 md:gap-4 min-w-0 shrink-0">
            <div id="authStatusBadge" class="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-slate-500/10 border border-slate-700 text-[10px] font-semibold text-slate-400 max-w-[240px] truncate">
                <span id="authUserLabel">Belum Login</span>
            </div>
            <button id="btnLoginGoogle" data-action="login-google" class="px-3 py-1.5 bg-emerald-600/15 hover:bg-emerald-600/30 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-1.5 transition duration-150 cursor-pointer">
                🔐 Login Google
            </button>
            <button id="btnKeluarGoogle" data-action="logout-google" class="hidden px-3 py-1.5 bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-bold items-center gap-1.5 transition duration-150 cursor-pointer">
                Keluar
            </button>
            <button id="btnUserGuide" data-action="open-user-guide" class="hidden md:flex px-3 py-1.5 bg-amber-600/10 hover:bg-amber-600/25 border border-amber-500/20 text-amber-300 rounded-xl text-xs font-bold items-center gap-1.5 transition duration-150 cursor-pointer">
                📘 Panduan
            </button>
            <button id="btnFailurePlaybook" data-action="open-failure-playbook" class="hidden md:flex px-3 py-1.5 bg-rose-600/10 hover:bg-rose-600/25 border border-rose-500/20 text-rose-300 rounded-xl text-xs font-bold items-center gap-1.5 transition duration-150 cursor-pointer">
                🚑 Bantuan Prompt Gagal
            </button>
            <button id="btnCloudHistory" data-action="open-cloud-history" class="hidden md:flex px-3 py-1.5 bg-sky-600/10 hover:bg-sky-600/25 border border-sky-500/20 text-sky-400 rounded-xl text-xs font-bold items-center gap-1.5 transition duration-150 cursor-pointer">
                ☁️ Riwayat Cloud
            </button>
            <!-- Phase 1.6 DB Inspector Trigger Button -->
            <button id="btnToggleInspector" data-action="toggle-inspector" class="hidden md:flex px-3 py-1.5 bg-[#0f111a] hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs flex items-center gap-1.5 transition duration-150 cursor-pointer">
                🗄️ Data Tools
            </button>
            <div class="hidden sm:flex items-center gap-2 px-2.5 md:px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20" id="globalEngineStatusBadge">
                <span class="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" id="globalStatusDot"></span>
                <span class="text-[10px] md:text-xs font-semibold text-indigo-400" id="globalStatusText">Siap Digunakan</span>
            </div>
        </div>
    </header>

    <!-- Private Beta Gate -->
    <section id="privateBetaGate" class="hidden flex-1 min-h-[calc(100vh-4rem)] bg-[#050609] flex items-center justify-center p-6"></section>

    <!-- Mobile Navigation Tab Switches (moved into floating mobile menu to save vertical workspace) -->
    <div class="hidden border-b border-slate-855 bg-[#0a0b10] p-2 justify-around shrink-0 z-20">
        <button id="mobileTabBtn-director" data-action="switch-tab" data-tab="director" class="flex-1 py-2 text-center text-xs font-bold rounded-lg text-white bg-indigo-600 cursor-pointer">🎬 Storyboard</button>
        <button id="mobileTabBtn-voice" data-action="switch-tab" data-tab="voice" class="flex-1 py-2 text-center text-xs font-bold rounded-lg text-slate-400 cursor-pointer">🎙️ Voice Lab</button>
        <button id="mobileTabBtn-affiliate" data-action="switch-tab" data-tab="affiliate" class="flex-1 py-2 text-center text-xs font-bold rounded-lg text-slate-400 cursor-pointer">🛒 Affiliate</button>
    </div>

    <!-- Mobile Quick Access Bar (disabled in v2; replaced by floating menu so canvas gets more space) -->
    <div id="mobileQuickAccessBar" class="hidden gap-2 px-3 py-2 bg-[#07080d] border-b border-slate-855 overflow-x-auto whitespace-nowrap shrink-0 z-20 scrollbar-hide">
        <button data-action="open-cloud-history" class="shrink-0 px-3 py-2 rounded-xl bg-sky-600/10 hover:bg-sky-600/25 border border-sky-500/20 text-sky-300 text-[11px] font-bold cursor-pointer">☁️ Riwayat</button>
        <button data-action="open-user-guide" class="shrink-0 px-3 py-2 rounded-xl bg-amber-600/10 hover:bg-amber-600/25 border border-amber-500/20 text-amber-300 text-[11px] font-bold cursor-pointer">📘 Panduan</button>
        <button data-action="open-failure-playbook" class="shrink-0 px-3 py-2 rounded-xl bg-rose-600/10 hover:bg-rose-600/25 border border-rose-500/20 text-rose-300 text-[11px] font-bold cursor-pointer">🚑 Prompt Gagal</button>
        <button data-action="toggle-inspector" class="shrink-0 px-3 py-2 rounded-xl bg-slate-800/70 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[11px] font-bold cursor-pointer">🗄️ Data</button>
    </div>



    <!-- Mobile Bottom Navigation: ARC 5.2 Mobile Workflow Navigation -->
    <div id="mobileBottomNav" class="md:hidden fixed inset-x-0 bottom-0 z-50 border-t border-slate-800 bg-[#07080d]/95 backdrop-blur-xl shadow-2xl shadow-black/50 px-2 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.45rem)]">
        <div class="grid grid-cols-4 gap-1.5">
            <button id="mobileNavStudio" data-action="mobile-go-studio" class="py-2 rounded-2xl bg-indigo-600/15 border border-indigo-500/20 text-indigo-200 text-[10px] font-black leading-tight cursor-pointer">🎬<br>Studio</button>
            <button id="mobileNavAffiliate" data-action="mobile-go-affiliate" class="py-2 rounded-2xl bg-orange-600/10 border border-orange-500/20 text-orange-200 text-[10px] font-black leading-tight cursor-pointer">🛒<br>Affiliate</button>
            <button data-action="open-cloud-history" class="py-2 rounded-2xl bg-sky-600/10 border border-sky-500/20 text-sky-200 text-[10px] font-black leading-tight cursor-pointer">☁️<br>Riwayat</button>
            <button data-action="mobile-open-tools" class="py-2 rounded-2xl bg-slate-800/75 border border-slate-700 text-slate-200 text-[10px] font-black leading-tight cursor-pointer">🧰<br>Tools</button>
        </div>
    </div>

    <!-- Mobile Tools Bottom Sheet -->
    <div id="mobileToolsSheet" class="hidden md:hidden fixed inset-0 z-[70]">
        <button data-action="mobile-close-tools" class="absolute inset-0 w-full h-full bg-black/60 cursor-pointer" aria-label="Tutup Tools"></button>
        <div class="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-slate-700 bg-[#08090e] shadow-2xl p-4 pb-[calc(env(safe-area-inset-bottom)+5.25rem)]">
            <div class="mx-auto mb-3 h-1 w-12 rounded-full bg-slate-700"></div>
            <div class="flex items-start justify-between gap-3 mb-3">
                <div>
                    <h3 class="text-sm font-black text-slate-100">Tools Cepat</h3>
                    <p class="text-[10px] text-slate-500 mt-0.5">Akses fitur tambahan tanpa bikin layar kerja sempit.</p>
                </div>
                <button data-action="mobile-close-tools" class="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-[10px] font-bold cursor-pointer">Tutup</button>
            </div>
            <div class="grid grid-cols-2 gap-2">
                <button data-action="switch-tab" data-tab="director" class="text-left px-3 py-3 rounded-2xl bg-indigo-600/12 border border-indigo-500/20 text-indigo-200 text-xs font-bold cursor-pointer">🎬 Storyboard Studio</button>
                <button data-action="switch-tab" data-tab="voice" class="text-left px-3 py-3 rounded-2xl bg-emerald-600/10 border border-emerald-500/20 text-emerald-200 text-xs font-bold cursor-pointer">🎙️ Voice Lab</button>
                <button data-action="switch-tab" data-tab="affiliate" class="text-left px-3 py-3 rounded-2xl bg-orange-600/10 border border-orange-500/20 text-orange-200 text-xs font-bold cursor-pointer">🛒 Affiliate Studio</button>
                <button data-action="toggle-output-tools" class="text-left px-3 py-3 rounded-2xl bg-purple-600/10 border border-purple-500/20 text-purple-200 text-xs font-bold cursor-pointer">📦 Tools Output</button>
                <button data-action="open-user-guide" class="text-left px-3 py-3 rounded-2xl bg-amber-600/10 border border-amber-500/20 text-amber-200 text-xs font-bold cursor-pointer">📘 Panduan</button>
                <button data-action="open-failure-playbook" class="text-left px-3 py-3 rounded-2xl bg-rose-600/10 border border-rose-500/20 text-rose-200 text-xs font-bold cursor-pointer">🚑 Prompt Gagal</button>
                <button data-action="toggle-inspector" class="text-left px-3 py-3 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-200 text-xs font-bold cursor-pointer">🗄️ Data Tools</button>
                <button data-action="logout-google" class="text-left px-3 py-3 rounded-2xl bg-rose-950/35 border border-rose-800/40 text-rose-200 text-xs font-bold cursor-pointer">🚪 Keluar</button>
            </div>
        </div>
    </div>

    <!-- Mobile Scene Navigator: appears when reviewing generated scenes -->
    <div id="mobileSceneNavigator" class="hidden md:hidden fixed left-2 right-2 bottom-[4.65rem] z-40 rounded-2xl border border-indigo-500/20 bg-[#08090e]/95 backdrop-blur-xl shadow-2xl shadow-black/40 p-2">
        <div class="grid grid-cols-4 gap-1.5 items-center">
            <button data-action="mobile-scene-top" class="py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-[10px] font-black cursor-pointer">↑ Atas</button>
            <button id="mobilePrevSceneBtn" data-action="mobile-prev-scene" class="py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-[10px] font-black cursor-pointer">← Prev</button>
            <div id="mobileSceneIndicator" class="py-2 rounded-xl bg-indigo-600/15 border border-indigo-500/25 text-indigo-200 text-[10px] font-black text-center">S1/1</div>
            <button id="mobileNextSceneBtn" data-action="mobile-next-scene" class="py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-[10px] font-black cursor-pointer">Next →</button>
        </div>
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
                    <h2 class="text-xs font-bold text-indigo-400 uppercase tracking-wider font-mono">Panel Generate</h2>
                    <p class="text-xs text-slate-400 leading-relaxed">Isi ide konten, pilih style, durasi, lalu generate storyboard siap produksi.</p>
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
                        <option value="Gaya Kustom">Other / Ide di luar pilihan ini (Tulis Sendiri)</option>
                    </select>
                    <div id="customStyleContainer" class="hidden mt-2">
                        <input type="text" id="customStyleInput" placeholder="Contoh: manga noir, cinematic anime horror, 3D soft clay anime..." class="w-full rounded-xl bg-[#0f111a] border border-slate-800 p-2 text-xs text-slate-300 outline-none focus:border-indigo-500">
                    </div>
                </div>



                <!-- Character Consistency Mode -->
                <div class="space-y-2 border-t border-slate-800/40 pt-3">
                    <div class="flex items-center justify-between gap-3">
                        <div>
                            <label class="block text-xs font-semibold text-slate-400">Detail Karakter Konsisten</label>
                            <p class="text-[9px] text-slate-500 leading-relaxed mt-0.5">Aktifkan agar prompt menyebut ciri visual karakter lebih lengkap, misalnya master character reference, outfit, rambut, ekspresi, dan atribut khas.</p>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer shrink-0">
                            <input type="checkbox" id="characterConsistencyToggle" checked class="sr-only peer">
                            <div class="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600 peer-checked:after:bg-white peer-checked:after:border-purple-600"></div>
                        </label>
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
                                <p class="text-[10px] text-slate-500 mt-0.5">Fitur lanjutan disimpan di sini agar workspace utama tetap bersih.</p>
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
                                        <h3 class="text-xs font-bold text-purple-400 uppercase tracking-widest font-mono">Character Library (Opsional)</h3>
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
                    <div class="md:sticky md:top-0 z-20 -mx-2 md:-mx-3 px-2 md:px-3 py-2 md:py-3 bg-[#05060a]/92 backdrop-blur-xl flex flex-col md:flex-row md:items-start justify-between border-b border-slate-855 gap-2 md:gap-3">
                        <div>
                            <h2 id="storyboardTitle" class="text-base md:text-xl font-bold text-slate-100 tracking-tight">Project Storyboard Canvas</h2>
                            <p id="storyboardSub" class="hidden sm:block text-xs text-slate-400 mt-1">Gunakan formulir kontrol di kiri untuk menghasilkan rancangan tiga pilar teks produksi video Anda.</p>
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
                                    ⚡ Tools Output <span class="text-[9px] text-slate-500">copy/export</span>
                                </summary>
                                <div class="md:absolute md:right-0 mt-2 w-[calc(100vw-3rem)] md:w-72 z-40 rounded-2xl border border-slate-800 bg-[#08090e] shadow-2xl p-3 grid gap-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                    <button id="btnCopyFullStoryboard" data-action="copy-bulk-storyboard" data-copy-type="full" class="w-full bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-400 border border-indigo-500/20 px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer">
                                        📦 Copy Full Package
                                    </button>
                                    <button id="btnCopyAllNarration" data-action="copy-bulk-storyboard" data-copy-type="narration" class="w-full bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 border border-emerald-500/20 px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer">
                                        🎙️ Copy Narration
                                    </button>
                                    <button id="btnGenerateAllNarrationOnly" data-action="generate-all-narration-only" class="w-full bg-amber-600/15 hover:bg-amber-600/25 text-amber-300 border border-amber-500/20 px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer">
                                        ✂️ Generate All Narration Only
                                    </button>
                                    <button id="btnShortenAllNarration" data-action="shorten-all-narration" class="w-full bg-orange-600/15 hover:bg-orange-600/25 text-orange-300 border border-orange-500/20 px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer">
                                        ⏱️ Shorten All Narration
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

                    <!-- Reliability Feedback Panel (ARC 4.1) -->
                    <div id="generationFeedbackPanel" class="hidden"></div>

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
                            <div id="sceneShortcutNav" class="hidden mb-3 rounded-2xl border border-slate-800 bg-[#08090e]/80 p-2 overflow-x-auto custom-scrollbar">
                                <div class="flex items-center gap-2 min-w-max" id="sceneShortcutNavInner"></div>
                            </div>
                            <div id="scenesContainer" class="space-y-4"></div>
                        </div>

                        <!-- Collapsible Paket Publishing Section at the bottom -->
                        <div class="bg-[#08090e] border border-slate-800 rounded-2xl shadow-2xl relative overflow-hidden">
                            <!-- Collapsible Trigger Header -->
                            <button id="btnTogglePublishingPackage" data-action="toggle-publishing-package" class="w-full text-left p-5 flex items-center justify-between hover:bg-slate-900/40 transition cursor-pointer select-none">
                                <div class="flex items-center gap-3">
                                    <span class="text-xl">📦</span>
                                    <div>
                                        <h3 class="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                            Paket Publishing 
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
                                    <span class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">⚡ Asisten Publishing</span>
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
                                                <span class="text-[10px] font-bold text-cyan-400 uppercase font-sans tracking-wide">Video File Name</span>
                                                <button id="btnCopyVideoName" data-action="copy-field" data-field-id="videoNameText" class="text-[9px] text-slate-500 hover:text-indigo-400 font-mono font-bold cursor-pointer">Salin</button>
                                            </div>
                                            <p id="videoNameText" class="text-xs font-bold text-cyan-200 leading-relaxed font-mono"></p>
                                            <p class="text-[9px] text-slate-500 mt-1">Nama file siap pakai agar video export kamu tidak ketuker.</p>
                                        </div>
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
                                                <button id="btnCopyThumbnailText" data-action="copy-input-field" data-field-id="thumbnailTextVal" class="text-[9px] text-slate-400 hover:text-amber-300 font-mono font-bold cursor-pointer transition">Copy Teks</button>
                                            </div>
                                            <div class="space-y-1">
                                                <input type="text" id="thumbnailTextVal" class="w-full text-xs font-bold text-amber-200 bg-black/40 border border-amber-500/15 rounded-lg p-2 focus:border-amber-500/80 focus:outline-none transition" placeholder="Masukkan teks utama thumbnail di sini...">
                                                <input type="text" id="thumbnailTextAltVal" class="w-full text-[11px] text-slate-450 bg-black/20 border border-slate-800/80 rounded-lg p-1.5 focus:border-indigo-500/50 focus:outline-none transition" placeholder="Alternatif teks thumbnail...">
                                            </div>
                                            <p class="text-[9px] text-slate-400 mt-1 italic">Kalau tidak suka, ganti teks thumbnail di sini.</p>
                                        </div>

                                        <div class="bg-gradient-to-tr from-indigo-950/20 to-purple-950/20 p-3 rounded-xl border border-indigo-500/20 font-sans">
                                            <div class="flex justify-between items-center mb-1.5">
                                                <span class="text-[10px] font-bold text-indigo-300 uppercase font-sans tracking-wider flex items-center gap-1">✨ Prompt Thumbnail / Cover</span>
                                                <button id="btnCopyThumbnailPrompt" data-action="copy-field" data-field-id="thumbnailPromptText" class="text-[9px] text-slate-500 hover:text-indigo-400 font-mono font-bold cursor-pointer">Copy Prompt</button>
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

                <!-- Voice Age Profile -->
                <div class="space-y-3 border-t border-slate-800/40 pt-4">
                    <div class="space-y-1">
                        <label class="block text-xs font-semibold text-slate-455">Usia Karakter Suara</label>
                        <p class="text-[10px] leading-relaxed text-slate-500">Arahkan akting suara agar terdengar seperti anak-anak, remaja, dewasa, atau orang tua. Ini adalah arahan performa, bukan meniru suara orang asli.</p>
                    </div>
                    <select id="voiceAgeProfile" class="w-full rounded-xl bg-[#0f111a] border border-slate-855 p-2.5 text-xs text-slate-200 focus:border-emerald-500 outline-none transition">
                        <option value="auto" selected data-instruction="Use a natural age-neutral creator voice that matches the script context.">Auto / Netral</option>
                        <option value="child" data-instruction="Perform as a generic childlike voice, innocent, light, curious, and playful, with simple emotional delivery. Do not imitate a real child or specific person.">Anak Kecil (Ceria & Polos)</option>
                        <option value="teen" data-instruction="Perform as a teenage voice, youthful, energetic, expressive, and casual, but still clear for narration.">Remaja (Muda & Ekspresif)</option>
                        <option value="young_adult" data-instruction="Perform as a young adult creator voice, fresh, confident, natural, and friendly for social media narration.">Dewasa Muda (Fresh & Creator)</option>
                        <option value="adult" data-instruction="Perform as an adult narrator, balanced, clear, mature, and reliable.">Dewasa (Jelas & Stabil)</option>
                        <option value="mature" data-instruction="Perform as a mature older adult voice, slower, wiser, calm, and authoritative, with controlled emotion.">Paruh Baya (Bijak & Berwibawa)</option>
                        <option value="elderly" data-instruction="Perform as a generic elderly voice, slower, warmer, slightly fragile, wise, and reflective. Keep it respectful and natural, not a caricature.">Orang Tua / Lansia (Hangat & Bijak)</option>
                    </select>
                    <p class="text-[9px] text-slate-600">Tips: gabungkan dengan Human Acting Layer, misalnya Lansia + Sad Soft atau Anak Kecil + Smiling Voice.</p>
                </div>

                <!-- Human Voice Acting Layer -->
                <div class="space-y-3 border-t border-slate-800/40 pt-4">
                    <div class="space-y-1">
                        <label class="block text-xs font-semibold text-slate-455">Human Acting Layer</label>
                        <p class="text-[10px] leading-relaxed text-slate-500">Tambahkan rasa manusiawi seperti senyum, hmmm, ketawa kecil, jeda sedih, atau nada penasaran.</p>
                    </div>
                    <select id="voiceHumanCue" class="w-full rounded-xl bg-[#0f111a] border border-slate-855 p-2.5 text-xs text-slate-200 focus:border-emerald-500 outline-none transition">
                        <option value="natural" data-instruction="Keep the delivery natural and human, with subtle emotional color but no exaggerated acting.">Natural Human (Netral Manusiawi)</option>
                        <option value="smiling" data-instruction="Perform with a gentle smile in the voice, warm and friendly, as if speaking to a close audience.">Smiling Voice (Senyum di Suara)</option>
                        <option value="soft_laugh" data-instruction="Add one or two very subtle small laughs only where it feels natural, not comedic or exaggerated.">Soft Laugh (Ketawa Kecil Natural)</option>
                        <option value="thinking" data-instruction="Add a thoughtful tone, tiny hmm moments, and reflective pauses before important lines.">Thinking / Hmm (Mikir, Hmmm)</option>
                        <option value="sad_soft" data-instruction="Perform with a soft sad tone, controlled emotion, slower pauses, and a slight tremble only when appropriate.">Sad Soft (Sedih Halus)</option>
                        <option value="suspense" data-instruction="Perform with suspense, careful pauses, quiet tension, and a slightly lower mysterious tone.">Suspense (Tegang Misterius)</option>
                        <option value="shock" data-instruction="Perform with controlled surprise and urgency, not screaming, with sharper emphasis on reveal words.">Shocked Reveal (Kaget Terungkap)</option>
                    </select>
                    <div class="space-y-1">
                        <div class="flex justify-between items-center">
                            <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Intensitas Akting</label>
                            <span id="humanCueIntensityVal" class="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold">Medium</span>
                        </div>
                        <input type="range" id="humanCueIntensity" min="1" max="3" value="2" class="w-full h-1 bg-slate-855 rounded-lg appearance-none cursor-pointer accent-emerald-500 transition accent-emerald">
                        <p class="text-[9px] text-slate-600">Low = halus, Medium = terasa natural, High = lebih ekspresif tapi tetap tidak berlebihan.</p>
                    </div>
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
                            <button type="button" data-tag="[smile]" class="btn-inject-tag text-[10px] bg-[#11131c] hover:bg-emerald-500/10 text-emerald-400 border border-slate-800 px-2.5 py-1 rounded-lg font-medium transition cursor-pointer font-bold">😊 Senyum</button>
                            <button type="button" data-tag="[hmm]" class="btn-inject-tag text-[10px] bg-[#11131c] hover:bg-emerald-500/10 text-emerald-400 border border-slate-800 px-2.5 py-1 rounded-lg font-medium transition cursor-pointer font-bold">🤔 Hmmm</button>
                            <button type="button" data-tag="[soft laugh]" class="btn-inject-tag text-[10px] bg-[#11131c] hover:bg-emerald-500/10 text-emerald-400 border border-slate-800 px-2.5 py-1 rounded-lg font-medium transition cursor-pointer font-bold">😄 Ketawa Kecil</button>
                            <button type="button" data-tag="[sad pause]" class="btn-inject-tag text-[10px] bg-[#11131c] hover:bg-emerald-500/10 text-emerald-400 border border-slate-800 px-2.5 py-1 rounded-lg font-medium transition cursor-pointer font-bold">😢 Jeda Sedih</button>
                        </div>
                        <p class="text-[10px] text-slate-500 leading-relaxed">Gunakan tag ini secukupnya. Jangan terlalu banyak agar voice over tetap natural.</p>
                        <textarea id="scriptInput" class="w-full h-40 rounded-2xl bg-[#08090d] border border-slate-855 focus:border-emerald-500 p-4 text-sm text-slate-200 outline-none resize-none transition duration-150 leading-relaxed" placeholder="Tulis atau tempel naskah Anda di sini..."></textarea>
                    </div>

                    <!-- Scene Voice Production Queue -->
                    <div id="voiceSceneQueue" class="rounded-2xl border border-emerald-500/10 bg-[#07090e] p-4 space-y-3">
                        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div>
                                <h3 class="text-xs font-black text-emerald-300 uppercase tracking-wider font-mono">🎙️ Scene Voice Queue</h3>
                                <p class="text-[10px] text-slate-500 leading-relaxed mt-1">Generate voice per scene atau semua narasi dari storyboard aktif.</p>
                            </div>
                            <div class="flex flex-wrap gap-2">
                                <button data-action="generate-all-scene-voices" class="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider font-mono transition cursor-pointer">Generate All Voice</button>
                                <button data-action="refresh-voice-queue" class="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-[10px] font-bold uppercase tracking-wider transition cursor-pointer">Refresh</button>
                            </div>
                        </div>
                        <div id="voiceSceneQueueList" class="space-y-2">
                            <div class="rounded-xl border border-slate-855 bg-black/20 p-3 text-[11px] text-slate-500">Belum ada storyboard aktif. Generate storyboard dulu, lalu buka Voice Lab.</div>
                        </div>
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

        <!-- Tab Workspace: Affiliate Content Studio -->
        <section id="tab-affiliate" class="flex-1 flex overflow-hidden hidden">
            <aside id="affiliateAside" class="mobile-sidebar w-80 border-r border-slate-855 bg-[#08090e] p-5 overflow-y-auto space-y-4 flex flex-col shrink-0">
                <div class="space-y-1">
                    <h2 class="text-xs font-bold text-orange-400 uppercase tracking-wider font-mono">Affiliate Studio v1.5</h2>
                    <p class="text-xs text-slate-400 leading-relaxed">Alur baru: upload produk + model dianalisis dulu, lalu digabung jadi merged visual reference prompt yang lebih kuat.</p>
                </div>

                <div class="rounded-xl border border-orange-500/15 bg-orange-500/5 p-3">
                    <div class="flex items-center gap-2 text-[11px] font-bold text-orange-300 uppercase tracking-wider"><span>⚡</span><span>Quick Flow</span></div>
                    <p class="mt-1 text-[10px] leading-relaxed text-slate-500">Minimal isi nama produk. Kalau upload foto produk/model, app akan membaca referensi dan membuat deskripsi gabungan produk + host agar prompt visual lebih akurat.</p>
                </div>

                <div class="space-y-3 border-t border-slate-800/40 pt-3">
                    <div class="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-orange-300"><span>1</span><span>Product Source</span></div>
                    <div class="space-y-2">
                        <label class="block text-xs font-semibold text-slate-400">Nama Produk <span class="text-orange-400">*</span></label>
                        <input id="affiliateProductName" type="text" class="w-full rounded-xl bg-[#0f111a] border border-slate-800 p-2.5 text-xs text-slate-300 placeholder-slate-655 focus:border-orange-500 outline-none transition" placeholder="Contoh: organizer tas mini, gantungan kunci Luffy...">
                    </div>
                    <div class="space-y-2">
                        <label class="block text-xs font-semibold text-slate-400">Link Produk <span class="text-slate-600">opsional</span></label>
                        <input id="affiliateProductLink" type="text" class="w-full rounded-xl bg-[#0f111a] border border-slate-800 p-2.5 text-xs text-slate-300 placeholder-slate-655 focus:border-orange-500 outline-none transition" placeholder="Paste link Shopee / TikTok Shop / marketplace...">
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                        <label class="rounded-xl border border-slate-800 bg-[#0f111a] p-3 cursor-pointer hover:border-orange-500/50 transition">
                            <span class="block text-[10px] font-black uppercase text-slate-400">Upload Produk</span>
                            <span class="block text-[10px] text-slate-600 mt-1">foto produk / packaging</span>
                            <input id="affiliateProductImage" type="file" accept="image/*" class="mt-2 block w-full text-[10px] text-slate-500 file:mr-2 file:rounded-lg file:border-0 file:bg-orange-600/20 file:text-orange-200 file:px-2 file:py-1 file:text-[10px] file:font-bold">
                        </label>
                        <label class="rounded-xl border border-slate-800 bg-[#0f111a] p-3 cursor-pointer hover:border-orange-500/50 transition">
                            <span class="block text-[10px] font-black uppercase text-slate-400">Upload Model</span>
                            <span class="block text-[10px] text-slate-600 mt-1">opsional host/reference</span>
                            <input id="affiliateModelImage" type="file" accept="image/*" class="mt-2 block w-full text-[10px] text-slate-500 file:mr-2 file:rounded-lg file:border-0 file:bg-orange-600/20 file:text-orange-200 file:px-2 file:py-1 file:text-[10px] file:font-bold">
                        </label>
                    </div>
                </div>

                <div class="space-y-3 border-t border-slate-800/40 pt-3">
                    <div class="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-orange-300"><span>2</span><span>Content Type</span></div>
                    <div class="grid grid-cols-2 gap-2">
                        <div class="space-y-2">
                            <label class="block text-xs font-semibold text-slate-400">Marketplace</label>
                            <select id="affiliateMarketplace" class="w-full rounded-xl bg-[#0f111a] border border-slate-800 p-2.5 text-xs text-slate-200 focus:border-orange-500 outline-none transition">
                                <option>Shopee</option><option>TikTok Shop</option><option>Tokopedia</option><option>Lazada</option><option>Marketplace Umum</option>
                            </select>
                        </div>
                        <div class="space-y-2">
                            <label class="block text-xs font-semibold text-slate-400">Platform</label>
                            <select id="affiliatePlatform" class="w-full rounded-xl bg-[#0f111a] border border-slate-800 p-2.5 text-xs text-slate-200 focus:border-orange-500 outline-none transition">
                                <option>TikTok</option><option>Instagram Reels</option><option>YouTube Shorts</option><option>Facebook Pro</option><option>Shopee Video</option>
                            </select>
                        </div>
                    </div>
                    <div class="space-y-2">
                        <label class="block text-xs font-semibold text-slate-400">Tipe Konten</label>
                        <select id="affiliateContentStyle" class="w-full rounded-xl bg-[#0f111a] border border-slate-800 p-2.5 text-xs text-slate-200 focus:border-orange-500 outline-none transition">
                            <option value="auto">Market Trend Auto</option>
                            <option value="honest">Honest Review</option>
                            <option value="problem">Problem–Solution</option>
                            <option value="pov">POV Daily Use</option>
                            <option value="ugc">UGC Natural</option>
                            <option value="beforeafter">Before–After</option>
                            <option value="listicle">Top Recommendation</option>
                            <option value="soft">Soft Selling</option>
                            <option value="hard">Promo / Flash Sale</option>
                            <option value="story">Storytelling Racun</option>
                            <option value="niche">Niche Creator Mode</option>
                        </select>
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                        <div class="space-y-2">
                            <label class="block text-xs font-semibold text-slate-400">Output Mode</label>
                            <select id="affiliateOutputMode" class="w-full rounded-xl bg-[#0f111a] border border-slate-800 p-2.5 text-xs text-slate-200 focus:border-orange-500 outline-none transition">
                                <option value="ai-video">AI Video Package</option>
                                <option value="record-manual">Rekam Manual / UGC</option>
                                <option value="no-face">No Face Product Demo</option>
                                <option value="talking-head">Talking Head Review</option>
                            </select>
                        </div>
                        <div class="space-y-2">
                            <label class="block text-xs font-semibold text-slate-400">Jumlah Scene</label>
                            <select id="affiliateSceneCount" class="w-full rounded-xl bg-[#0f111a] border border-slate-800 p-2.5 text-xs text-slate-200 focus:border-orange-500 outline-none transition">
                                <option value="3">3 Scene Short</option>
                                <option value="5" selected>5 Scene Standard</option>
                                <option value="7">7 Scene Detail</option>
                            </select>
                        </div>
                    </div>
                </div>

                <details class="rounded-2xl border border-slate-800 bg-slate-950/40 p-3 group">
                    <summary class="cursor-pointer text-xs font-black text-slate-300 flex items-center justify-between">Advanced Details <span class="text-slate-600 group-open:hidden">＋</span><span class="text-slate-600 hidden group-open:inline">－</span></summary>
                    <div class="mt-3 space-y-3">
                        <div class="grid grid-cols-2 gap-2">
                            <div class="space-y-2">
                                <label class="block text-xs font-semibold text-slate-400">Kategori</label>
                                <select id="affiliateCategory" class="w-full rounded-xl bg-[#0f111a] border border-slate-800 p-2.5 text-xs text-slate-200 focus:border-orange-500 outline-none transition">
                                    <option value="auto">Auto / belum pasti</option><option value="fashion">Fashion</option><option value="beauty">Beauty / Skincare</option><option value="home">Home Living / Cleaning</option><option value="gadget">Gadget / Aksesoris HP</option><option value="food">Food / Snack</option><option value="hobby">Hobi / Anime / Koleksi</option><option value="baby">Mom & Baby</option><option value="office">Office / Produktivitas</option>
                                </select>
                            </div>
                            <div class="space-y-2">
                                <label class="block text-xs font-semibold text-slate-400">Harga</label>
                                <input id="affiliatePrice" type="text" class="w-full rounded-xl bg-[#0f111a] border border-slate-800 p-2.5 text-xs text-slate-300 focus:border-orange-500 outline-none transition" placeholder="Rp11.900">
                            </div>
                        </div>
                        <div class="space-y-2"><label class="block text-xs font-semibold text-slate-400">Rating / Terjual</label><input id="affiliateSocialProof" type="text" class="w-full rounded-xl bg-[#0f111a] border border-slate-800 p-2.5 text-xs text-slate-300 focus:border-orange-500 outline-none transition" placeholder="4.9 • 1rb+ terjual"></div>
                        <div class="space-y-2"><label class="block text-xs font-semibold text-slate-400">Keunggulan Produk</label><textarea id="affiliateBenefits" class="w-full rounded-xl bg-[#0f111a] border border-slate-800 p-2.5 text-xs text-slate-300 placeholder-slate-655 focus:border-orange-500 outline-none transition h-16 resize-none" placeholder="murah, compact, lucu, bahan tebal, mudah dipakai..."></textarea></div>
                        <div class="space-y-2"><label class="block text-xs font-semibold text-slate-400">Catatan Jujur / Kekurangan</label><textarea id="affiliateCaveat" class="w-full rounded-xl bg-[#0f111a] border border-slate-800 p-2.5 text-xs text-slate-300 placeholder-slate-655 focus:border-orange-500 outline-none transition h-14 resize-none" placeholder="ukuran kecil, warna bisa beda sedikit, cocok penggunaan ringan..."></textarea></div>
                        <div class="space-y-2"><label class="block text-xs font-semibold text-slate-400">Target Audiens</label><input id="affiliateAudience" type="text" class="w-full rounded-xl bg-[#0f111a] border border-slate-800 p-2.5 text-xs text-slate-300 focus:border-orange-500 outline-none transition" placeholder="anak kos, ibu rumah tangga, fans anime..."></div>
                        <div class="space-y-2"><label class="block text-xs font-semibold text-slate-400">CTA</label><select id="affiliateCTA" class="w-full rounded-xl bg-[#0f111a] border border-slate-800 p-2.5 text-xs text-slate-200 focus:border-orange-500 outline-none transition"><option>Cek keranjang / link produk</option><option>Cek etalase / bio</option><option>Simpan dulu biar nggak lupa</option><option>Komen mau versi apa</option><option>Follow untuk rekomendasi lainnya</option></select></div>
                        <div class="space-y-2"><label class="block text-xs font-semibold text-slate-400">Catatan Detail Produk</label><textarea id="affiliateProductNotes" class="w-full rounded-xl bg-[#0f111a] border border-slate-800 p-2.5 text-xs text-slate-300 placeholder-slate-655 focus:border-orange-500 outline-none transition h-14 resize-none" placeholder="warna, ukuran, bahan, packaging, detail penting dari foto..."></textarea></div>
                        <div class="space-y-2"><label class="block text-xs font-semibold text-slate-400">Catatan Model / Host</label><textarea id="affiliateModelNotes" class="w-full rounded-xl bg-[#0f111a] border border-slate-800 p-2.5 text-xs text-slate-300 placeholder-slate-655 focus:border-orange-500 outline-none transition h-14 resize-none" placeholder="vibe host, pose, outfit, ekspresi, gaya ngomong..."></textarea></div>
                    </div>
                </details>

                <button id="btnGenerateAffiliate" data-action="generate-affiliate" class="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-orange-950/30 transition cursor-pointer">Generate Affiliate Package</button>
                <button data-action="clear-affiliate" class="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer">Reset Form</button>
            </aside>

            <section class="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
                <div class="max-w-6xl mx-auto space-y-5">
                    <div class="rounded-3xl border border-orange-500/15 bg-gradient-to-br from-orange-500/10 via-slate-950/50 to-[#08090e] p-5 md:p-6 shadow-2xl">
                        <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                            <div>
                                <p class="text-[10px] font-mono font-bold text-orange-300 uppercase tracking-[0.2em]">Affiliate Reference Brain v1.5</p>
                                <h2 class="mt-2 text-xl md:text-2xl font-black text-white tracking-tight">Affiliate Content Package</h2>
                                <p class="mt-2 text-xs md:text-sm text-slate-400 max-w-2xl leading-relaxed">Hasil dibuat seperti production package dengan product-aware reference brain: produk + model digabung ke prompt scene, lalu setiap prompt bisa dicopy langsung.</p>
                            </div>
                            <div class="flex flex-wrap gap-2">
                                <button data-action="copy-affiliate-output" class="px-4 py-2 rounded-xl bg-orange-600/15 hover:bg-orange-600/25 border border-orange-500/20 text-orange-200 text-xs font-bold cursor-pointer">Copy All Package</button>
                                <button data-action="copy-affiliate-section" data-section="imagePrompts" class="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-bold cursor-pointer">Copy All TTI</button>
                                <button data-action="copy-affiliate-section" data-section="videoPrompts" class="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-bold cursor-pointer">Copy All ITV</button>
                            </div>
                        </div>
                    </div>

                    <div id="affiliateOutputEmpty" class="rounded-3xl border border-dashed border-slate-800 bg-[#08090e] p-10 text-center">
                        <div class="text-4xl mb-3">🛒</div>
                        <h3 class="text-sm font-bold text-slate-300">Belum ada affiliate content package.</h3>
                        <p class="text-xs text-slate-500 mt-1">Isi nama produk, pilih tipe konten, lalu generate. Detail lain opsional.</p>
                    </div>

                    <div id="affiliateOutputPanel" class="hidden space-y-4">
                        <div class="flex flex-wrap gap-2 rounded-2xl border border-slate-800 bg-[#08090e] p-2">
                            <button data-action="affiliate-result-tab" data-tab="scene" class="px-3 py-2 rounded-xl bg-orange-600 text-white text-xs font-black cursor-pointer">Scene Package</button>
                            <button data-action="affiliate-result-tab" data-tab="copy" class="px-3 py-2 rounded-xl bg-slate-900 text-slate-400 text-xs font-black cursor-pointer">Upload Copy</button>
                            <button data-action="affiliate-result-tab" data-tab="bank" class="px-3 py-2 rounded-xl bg-slate-900 text-slate-400 text-xs font-black cursor-pointer">Prompt Bank</button>
                            <button data-action="affiliate-result-tab" data-tab="safe" class="px-3 py-2 rounded-xl bg-slate-900 text-slate-400 text-xs font-black cursor-pointer">Safe Version</button>
                        </div>

                        <section id="affiliateResult-scene" class="space-y-4">
                            <div class="rounded-2xl border border-orange-500/20 bg-[#08090e] p-4">
                                <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-3">
                                    <div>
                                        <h3 class="text-xs font-bold text-orange-300 uppercase tracking-wider">Product Strategy</h3>
                                        <p class="text-[10px] text-slate-500 mt-0.5">Arah jualan, angle, target, dan pemakaian referensi.</p>
                                    </div>
                                    <div class="flex flex-wrap gap-1.5">
                                        <button data-action="copy-affiliate-section" data-section="strategy" class="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-black text-slate-300 cursor-pointer">Copy Strategy</button>
                                        <button data-action="copy-affiliate-section" data-section="angles" class="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-black text-slate-300 cursor-pointer">Copy Angles</button>
                                        <button data-action="copy-affiliate-section" data-section="hook" class="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-black text-slate-300 cursor-pointer">Copy Hooks</button>
                                    </div>
                                </div>
                                <pre id="affiliateStrategyText" class="whitespace-pre-wrap text-xs leading-relaxed text-slate-300 font-sans"></pre>
                                <pre id="affiliateAnglesText" class="hidden"></pre>
                                <pre id="affiliateHookText" class="hidden"></pre>
                            </div>

                            <div class="flex items-center justify-between gap-3">
                                <div>
                                    <h3 class="text-xs font-bold text-orange-300 uppercase tracking-wider">Storyboard Package Per Scene</h3>
                                    <p class="text-[10px] text-slate-500 mt-0.5">Setiap scene punya tombol copy granular.</p>
                                </div>
                                <button data-action="copy-affiliate-section" data-section="scenes" class="px-3 py-2 rounded-xl bg-orange-600/15 hover:bg-orange-600/25 border border-orange-500/20 text-orange-200 text-xs font-bold cursor-pointer">Copy All Scenes</button>
                            </div>
                            <div id="affiliateSceneCards" class="space-y-4"></div>
                            <pre id="affiliateStoryboardText" class="hidden"></pre>
                        </section>

                        <section id="affiliateResult-copy" class="hidden space-y-4">
                            <div class="rounded-2xl border border-slate-800 bg-[#08090e] p-4">
                                <div class="flex items-center justify-between mb-3"><h3 class="text-xs font-bold text-orange-300 uppercase tracking-wider">Upload Copy Package</h3><button data-action="copy-affiliate-section" data-section="uploadCopy" class="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-black text-slate-300 cursor-pointer">Copy All Upload Copy</button></div>
                                <div id="affiliateUploadCopyCards"></div>
                                <pre id="affiliateCaptionText" class="hidden"></pre>
                            </div>
                        </section>

                        <section id="affiliateResult-bank" class="hidden space-y-4">
                            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <div class="rounded-2xl border border-slate-800 bg-[#08090e] p-4">
                                    <div class="flex items-center justify-between mb-2"><h3 class="text-xs font-bold text-orange-300 uppercase tracking-wider">All Text-to-Image Prompts</h3><button data-action="copy-affiliate-section" data-section="imagePrompts" class="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-black text-slate-300 cursor-pointer">Copy All TTI</button></div>
                                    <pre id="affiliateImagePromptsText" class="whitespace-pre-wrap text-xs leading-relaxed text-slate-300 font-mono"></pre>
                                </div>
                                <div class="rounded-2xl border border-slate-800 bg-[#08090e] p-4">
                                    <div class="flex items-center justify-between mb-2"><h3 class="text-xs font-bold text-orange-300 uppercase tracking-wider">All Image-to-Video Prompts</h3><button data-action="copy-affiliate-section" data-section="videoPrompts" class="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-black text-slate-300 cursor-pointer">Copy All ITV</button></div>
                                    <pre id="affiliateVideoPromptsText" class="whitespace-pre-wrap text-xs leading-relaxed text-slate-300 font-mono"></pre>
                                </div>
                            </div>
                            <div class="rounded-2xl border border-slate-800 bg-[#08090e] p-4">
                                <div class="flex items-center justify-between mb-2"><h3 class="text-xs font-bold text-orange-300 uppercase tracking-wider">All Narration / VO</h3><button data-action="copy-affiliate-section" data-section="narrations" class="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-black text-slate-300 cursor-pointer">Copy All VO</button></div>
                                <pre id="affiliateNarrationText" class="whitespace-pre-wrap text-xs leading-relaxed text-slate-300 font-sans"></pre>
                            </div>
                        </section>

                        <section id="affiliateResult-safe" class="hidden space-y-4">
                            <div class="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-4">
                                <div class="flex items-center justify-between mb-2"><h3 class="text-xs font-bold text-emerald-300 uppercase tracking-wider">Safe Claim Version</h3><button data-action="copy-affiliate-section" data-section="safe" class="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-black text-slate-300 cursor-pointer">Copy Safe Version</button></div>
                                <pre id="affiliateSafeText" class="whitespace-pre-wrap text-xs leading-relaxed text-slate-300 font-sans"></pre>
                            </div>
                        </section>
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

