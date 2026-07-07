# K Creator Suite Pro — ARC 5.3.3 Voice Lab Production Flow

Patch ini melanjutkan ARC 5.3.2 Voice Age Profile dengan fokus produksi voice over per scene.

## Yang ditambahkan

- Voice Lab lebih rapi untuk desktop dan mobile dengan Scene Voice Queue.
- Generate voice per scene dari narasi storyboard aktif.
- Generate All Voice untuk semua narasi scene.
- Status audio per scene:
  - Belum dibuat
  - Proses
  - Selesai
  - Gagal
- Download audio per scene dengan nama file otomatis.
- Error per scene ditampilkan langsung di queue, sehingga scene gagal mudah diulang.
- Audio hasil scene bisa diputar langsung dari queue.

## Catatan format file

Engine saat ini menghasilkan WAV dari PCM audio. Karena itu file otomatis memakai ekstensi `.wav`, contohnya:

- `scene-01-narration.wav`
- `judul-video-scene-01-zephyr.wav`

## Build test

Sudah dites lokal:

```bash
npm install --package-lock=false
npm run build
```

Hasil: build sukses.

## Tidak diubah

- Gemini storyboard model
- Supabase login / cloud history
- Private Beta Gate
- Affiliate logic
- Scene regenerate logic
- Mobile bottom navigation
