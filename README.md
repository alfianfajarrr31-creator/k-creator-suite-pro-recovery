# K Creator Suite Pro - Delete Cloud Project Patch

Patch aman setelah auto-save:
- Tambah tombol Delete di Cloud History.
- Menghapus project dari Supabase hanya untuk user yang sedang login.
- Tidak mengubah GeminiService, api/index.ts, atau prompt generator.


## Patch: Cloud History Search

- Menambahkan kolom pencarian pada modal Cloud History.
- Menambahkan counter jumlah project yang tampil.
- Tidak mengubah GeminiService, api/index.ts, model Gemini, atau logic generate utama.

## Patch: Auto Title + Saved Status
- Menambahkan smart project title untuk Cloud Save dan Local History.
- Menambahkan badge status: Unsaved, Saving, Saved, Updated, Auto-saved, Guest Draft.
- Tidak mengubah GeminiService, api/index.ts, model Gemini, atau prompt generator.
