# K Creator Suite Pro - Rename Cloud Project Patch

Patch ini menambahkan fitur Rename di Cloud History.

Perubahan aman:
- `src/App.tsx`: tombol Rename di Cloud History dan fungsi update title ke Supabase.

Tidak diubah:
- Gemini prompt engine
- `src/GeminiService.ts`
- `api/index.ts`
- Model Gemini
- TTS engine

Cara test:
1. Login Google.
2. Buka Cloud History.
3. Klik Rename pada salah satu project.
4. Isi nama baru.
5. Cek Supabase Table Editor → projects, kolom title berubah.
6. Generate baru tetap jalan.
