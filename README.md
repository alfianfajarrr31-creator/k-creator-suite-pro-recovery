# K Creator Suite Pro - Delete Cloud Project Patch

Patch aman setelah auto-save:
- Tambah tombol Delete di Cloud History.
- Menghapus project dari Supabase hanya untuk user yang sedang login.
- Tidak mengubah GeminiService, api/index.ts, atau prompt generator.


## Patch: Cloud History Search

- Menambahkan kolom pencarian pada modal Cloud History.
- Menambahkan counter jumlah project yang tampil.
- Tidak mengubah GeminiService, api/index.ts, model Gemini, atau logic generate utama.


## Patch: Export TXT + JSON

- Tambah tombol Export TXT untuk download paket storyboard lengkap.
- Tambah tombol JSON untuk backup data structured.
- Tidak mengubah GeminiService, api/index.ts, model Gemini, TTS, atau logic generate utama.

## Patch: Targeted Field Regenerate

Menambahkan tombol repair spesifik di Scene Edit & Regenerate Lab:

- Fix Desc
- Fix TTS
- Fix Image Prompt
- Fix Video Prompt
- Regenerate Full Scene tetap tersedia

Fitur ini memakai komentar user di box Regenerate / Repair Note, lalu hanya memperbaiki field yang dipilih. Cocok untuk kasus seperti prompt video gagal di Veo/Kling tanpa perlu regenerate seluruh scene.

Tidak mengubah GeminiService, api/index.ts, model Gemini, Supabase Auth, Cloud History, Export, Bulk Copy, atau flow generate utama.

## Patch: Output Language Selector
- Menambahkan pilihan Bahasa Output Storyboard: Mixed Recommended, Bahasa Indonesia, English.
- Pilihan bahasa dikirim ke backend storyboard dan dipakai saat generate maupun regenerate scene/field.
- Mode Bahasa Indonesia membuat imagePrompt/videoPrompt bisa ditulis dalam Bahasa Indonesia, dengan bracket video tetap standar English agar format stabil.
- Tidak mengubah Gemini model, TTS endpoint, Supabase save/load/history, atau logic core generator.

## Patch: Regenerate Preset Buttons

Added quick repair preset buttons inside each Scene Edit & Regenerate Lab:
- Veo Failed
- Kling Failed
- Too Static
- Too Complex
- More Emotional
- More Viral
- Image Mismatch
- TTS Flat

These presets only fill the repair comment box. Existing targeted regenerate buttons still control what gets regenerated, so users can combine a preset with Fix Video Prompt, Fix Image Prompt, Fix TTS, Fix Desc, or Regenerate Full Scene.


## Patch: Scene Version History / Undo

- Menambahkan snapshot otomatis sebelum manual edit, targeted regenerate, dan full regenerate scene.
- Menambahkan tombol `Undo Last` di setiap Scene Edit & Regenerate Lab.
- Menambahkan tombol `Clear History` untuk membersihkan riwayat versi scene tertentu.
- Maksimal 8 snapshot per scene agar state tetap ringan.
- Tidak mengubah GeminiService, api/index.ts, model Gemini, Supabase Auth, Cloud History, Export, atau Bulk Copy.

## Patch: Scene Management + Category Trim
- Added scene-level actions: Add After, Duplicate, Delete.
- Removed project category selector from the main generator flow to simplify multi-user product UX.
- Simplified auto-title generation so titles no longer depend on project category.
- Fixed scene undo safety bug.


## Patch: Daily Use v1 — Layout Breathing Room

Focus patch untuk menutup Fase **Arc 1: Rescue & Stabilize** menuju **Daily Use v1**.

Perubahan:
- Canvas utama diperlebar dari `max-w-4xl` ke `max-w-7xl` supaya hasil scene lebih lega.
- Header canvas dibuat sticky dan lebih compact.
- Tombol utama tetap terlihat: Save/Update Cloud dan Voice Lab.
- Tombol copy/export dipindahkan ke menu `Output Tools` supaya header tidak terlalu penuh.
- Storyboard Scenes diberi area fokus khusus dan tetap berada sebelum Publishing Package.
- Publishing Package tetap di bawah dan collapsed.

Tidak mengubah:
- GeminiService.ts
- api/index.ts
- model Gemini
- Supabase auth/save/history
- scene editor/regenerate
- export/copy logic

## ARC 3 Final Patch — Scene Action Cleanup
- Merapikan tombol aksi scene agar tidak terlalu ramai.
- Tombol utama yang tetap terlihat: Edit / Repair, Copy Package, Voice Lab.
- Aksi tambahan Add Scene, Duplicate, Delete dipindahkan ke menu More Scene Actions.
- Tidak mengubah GeminiService, API backend, Supabase, prompt generator, TTS, export/copy logic, atau cloud history.

## ARC 3.5 — Private Beta Gate

This patch locks K Creator Suite Pro behind a Google-login email whitelist before public go-live.

### New environment variables

Add these in Vercel Project Settings → Environment Variables:

```env
VITE_ALLOWED_EMAILS=owner@gmail.com,friend@gmail.com
ALLOWED_EMAILS=owner@gmail.com,friend@gmail.com
```

Use comma-separated emails. The frontend uses `VITE_ALLOWED_EMAILS` to show/hide the app UI, while the backend uses `ALLOWED_EMAILS` to reject unauthorized Gemini API calls. For convenience, the backend also falls back to `VITE_ALLOWED_EMAILS` if `ALLOWED_EMAILS` is missing.

Make sure Supabase ENV is also available:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_publishable_or_anon_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_publishable_or_anon_key
```

The backend falls back to the `VITE_*` Supabase variables if the server aliases are missing, but setting both is recommended for clarity.

### Behavior

- Visitor opens app → sees Private Beta login screen.
- Approved email logs in → app workspace opens.
- Unapproved email logs in → Access not granted screen.
- Gemini endpoints now require a valid Supabase session and allowed email.
- Guest mode is effectively disabled for generation while Private Beta Gate is active.


## ARC 4.1 — Reliability Signal Patch

Patch ini menambah sistem feedback pemakaian harian:

- Toast notification dibuat lebih jelas dengan label sukses/gagal/perhatian.
- Suara notifikasi berbeda untuk sukses, warning, dan error.
- Panel error generate ditambahkan di canvas utama agar penyebab gagal lebih mudah dipahami.
- Copy action memakai helper yang lebih aman dan selalu memberi toast berhasil/gagal.
- Generate, TTS, dan regenerate menampilkan alasan gagal yang lebih manusiawi.

Tidak mengubah:

- Model Gemini utama
- Prompt generator utama
- Supabase Auth / Save / History
- Scene editor dan workflow cloud yang sudah stabil

## ARC 4.2 — Prompt Intelligence Patch

Upgrade produksi harian:
- Menambahkan Character Consistency Mode agar prompt karakter lebih detail dan konsisten.
- Menambahkan aturan durasi narasi realistis berdasarkan durasi scene.
- Menambahkan output `video_name` untuk nama file video.
- Merapikan opsi gaya kustom menjadi Other / Ide di luar pilihan.
- Menampilkan Video File Name di Publishing Package dan export/copy package.

Build test: PASS.

## ARC 4.3 — Narration & Scene Navigation
- Added scene shortcut navigation above Storyboard Scenes to reduce copy mix-ups.
- Added Generate All Narration Only for rewriting narration without changing visual scene structure.
- Added Shorten All Narration for fixing narration that is too long for selected scene duration.
- Keeps Gemini visual prompt, Supabase, Private Beta Gate, Cloud History, and export/copy workflows intact.

## ARC 4.4 — User Guide & Quick Help Patch

Patch ini menambahkan panduan pemakaian di dalam aplikasi agar user baru lebih mudah memahami workflow K Creator Suite Pro.

### Perubahan
- Menambahkan tombol `📘 User Guide` di header.
- Menambahkan modal panduan pemakaian sederhana.
- Menambahkan bagian Workflow Cepat.
- Menambahkan penjelasan tombol penting seperti Edit / Repair, Copy Package, Voice Lab, Output Tools, dan More Actions.
- Menambahkan mini playbook kalau Veo/Kling gagal generate.
- Menambahkan checklist produksi harian.

### Yang tidak diubah
- Tidak mengubah model Gemini.
- Tidak mengubah prompt generator utama.
- Tidak mengubah Supabase Auth, Save, Cloud History, atau Private Beta Gate.
- Tidak mengubah scene editor, regenerate tools, export/copy logic, atau TTS endpoint.

### Test checklist
1. Login dengan email whitelist.
2. Klik `📘 User Guide`.
3. Modal guide terbuka.
4. Klik Close.
5. Generate storyboard tetap jalan.
6. Save / Update Cloud tetap jalan.
7. Cloud History tetap jalan.


## ARC 4.5 — Prompt Failure Playbook

Patch ini menambahkan tombol **🚑 Failure Playbook** di header untuk membantu user awam memahami langkah perbaikan saat output gagal.

Yang ditambahkan:
- Modal Prompt Failure Playbook.
- Panduan cepat untuk kasus Veo failed, Kling hasil diam, prompt terlalu rumit, karakter berubah, thumbnail kurang kuat, dan narasi terlalu panjang.
- Cheat sheet tombol repair: Fix Video Prompt, Fix Image Prompt, Fix TTS, dan Regenerate Full Scene.
- Tidak mengubah Gemini model, Supabase Auth, Save/History, scene editor, export/copy, atau API utama.

Tujuan:
User tidak perlu menebak tombol apa yang harus dipakai saat output gagal.


## ARC 4.6 — Final UI Naming Cleanup

Patch ini merapikan wording UI agar lebih mudah dipahami user awam sebelum ARC 4 ditutup.

Perubahan utama:
- User Guide → Panduan
- Failure Playbook → Bantuan Prompt Gagal
- Cloud History → Riwayat Cloud
- Director Studio → Storyboard Studio
- Output Tools → Tools Output
- Edit / Repair → Edit / Perbaiki
- Copy Package → Copy Scene
- More Scene Actions → Aksi Scene Lainnya
- Add / Duplicate / Delete scene diterjemahkan agar lebih jelas
- Fix Desc / Fix TTS / Fix Image Prompt / Fix Video Prompt dibuat lebih mudah dibaca
- Private Beta Gate wording dibuat lebih manusiawi

Tidak ada perubahan engine besar, Gemini model, Supabase logic, prompt generator utama, atau TTS endpoint.

## Hotfix — Mobile Quick Access Bar

Patch ini memperbaiki tombol penting yang hilang/terpotong di tampilan HP portrait.

### Perubahan
- Menambahkan mobile quick access bar khusus HP.
- Menampilkan tombol cepat:
  - Riwayat Cloud
  - Panduan
  - Prompt Gagal
  - Data Tools
- Tombol desktop untuk Panduan/Riwayat/Prompt Gagal/Data Tools disembunyikan di mobile agar header tidak penuh.
- Tidak mengubah logic generate, Gemini, Supabase, Private Beta Gate, atau Cloud History.

### Test
1. Buka dari HP mode portrait.
2. Pastikan tombol Riwayat, Panduan, dan Prompt Gagal muncul tanpa perlu rotate landscape.
3. Test klik Riwayat Cloud.
4. Test klik Prompt Gagal.
5. Generate storyboard tetap jalan.
