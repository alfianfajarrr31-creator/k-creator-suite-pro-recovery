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


## Patch: Bulk Copy Storyboard Package

Added safe bulk copy actions for the active storyboard:
- Copy Full Storyboard Package
- Copy All Narration
- Copy All Text-to-Image Prompts
- Copy All Image-to-Video Prompts

Changed files:
- `src/App.tsx`
- `src/HtmlContent.ts`

This patch does not touch Gemini service, API endpoints, Supabase save/load logic, auth, TTS, or generation logic.
