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

## Patch: Scene Edit & Regenerate Lab

Tambahan fitur aman untuk workflow review scene:
- Edit manual Scene Description, TTS/Narration, Text-to-Image Prompt, Image-to-Video Prompt, dan Duration per scene.
- Box komentar per scene untuk instruksi perbaikan.
- Regenerate hanya scene terpilih berdasarkan feedback user, tanpa rewrite seluruh storyboard.
- Scene yang diedit/regenerate ditandai sebagai Edited/Unsaved sampai user klik Save / Update Cloud.
- Tidak mengubah GeminiService, api/index.ts, model Gemini, TTS, Supabase Auth, Cloud History, Export, atau fitur generate utama.
