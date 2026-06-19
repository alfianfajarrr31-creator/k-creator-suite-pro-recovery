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

## UI Cleanup Patch
- API key manual input disembunyikan dari Director dan Voice Lab karena aplikasi memakai server-side `GEMINI_API_KEY` dari Vercel Environment Variables.
- Character Library dan Activity Timeline dipindahkan ke panel `Advanced Tools` yang collapsed by default agar workspace generate lebih bersih.
- Voice TTS tidak lagi meminta API key manual di UI.
