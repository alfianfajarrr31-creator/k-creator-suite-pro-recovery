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


## Patch: Copy Scene Package
- Menambahkan tombol Copy Scene Package pada setiap scene.
- Menyalin deskripsi adegan, narasi/TTS, text-to-image prompt, dan image-to-video prompt dalam satu paket.
- Tidak mengubah GeminiService, api/index.ts, model Gemini, atau logic generator utama.
