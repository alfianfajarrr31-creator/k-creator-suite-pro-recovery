# KCS AI Design Studio — Sprint 1

## Fitur baru
- Menu baru: AI Design Studio.
- Preset aktif pertama: Recruitment Poster.
- Form recruitment: perusahaan, industri, posisi, tipe kerja, mode kerja, lokasi, gaji, requirement, jobdesk, benefit, deadline, kontak, CTA, rasio, gaya visual, dan catatan tambahan.
- Recruitment DNA V1 dipisahkan ke modul baru.
- Generate prompt poster tanpa AI/API (cost Rp0).
- Validasi field wajib.
- Copy prompt.
- Simpan, muat, dan reset draft di browser melalui localStorage.
- Responsif untuk desktop dan mobile.

## File utama yang ditambahkan
- src/modules/design/RecruitmentDNA.ts
- src/modules/design/DesignStudio.ts

## File yang diperbarui
- src/App.tsx
- src/HtmlContent.ts

## Pemeriksaan
- npm run lint: LULUS
- npm run build: LULUS

## Catatan
- Belum ada generate gambar otomatis.
- Belum ada upload logo/QR/foto.
- Belum ada preset CV dan kategori lain.
- Semua fungsi Sprint 1 tidak menambah biaya operasional.
