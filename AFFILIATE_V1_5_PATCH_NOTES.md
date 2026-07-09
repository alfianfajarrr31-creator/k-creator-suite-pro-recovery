# Affiliate Studio v1.5 — Reference Brain Patch

Fokus patch:
- Affiliate Studio tidak lagi hanya menulis "gunakan foto uploaded".
- Saat user upload foto produk dan/atau model, app mengirim gambar ke endpoint Gemini vision internal.
- AI membaca visual produk dan model, lalu membuat:
  - product_visual_description
  - model_visual_description
  - merged_reference_prompt
  - product_specific_benefits
  - product_specific_caveat
  - best_visual_demo
  - scene_visual_rules
  - safety_notes
- Output scene memakai merged reference tersebut di Text-to-Image dan Image-to-Video prompt.
- Untuk kategori food/minuman/pemanis, ada storyboard khusus demo kopi/teh/minuman, cek label/takaran, dan safety anti klaim diet/medis.

Validasi:
- npm install berhasil
- npm run lint berhasil
- npm run build berhasil

Catatan:
- Endpoint baru: POST /api/gemini/affiliate-reference
- Membutuhkan GEMINI_API_KEY aktif seperti fitur storyboard lain.
- Jika AI reference analysis gagal, app tetap generate dengan fallback lokal.
