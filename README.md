# Mahir Bahasa Arab — Kelas 8 🎮

Game edukasi interaktif untuk belajar Bahasa Arab kelas 8, mencakup tiga materi:

- **Dhomir** (ضَمِير) — kata ganti
- **Fi'il** (فِعْل) — kata kerja (madhi, mudhari', amr)
- **Isim** (اِسْم) — kata benda (mudzakkar/muannats, mufrad/mutsanna/jamak)

## Fitur

- 36 soal pilihan ganda (12 per materi) + mode campuran
- Efek suara benar/salah (disintesis langsung di browser, tanpa file audio)
- UI berwarna-warni dan interaktif dengan animasi, progress bar, nyawa, dan skor
- Rekor skor tersimpan otomatis di perangkat (localStorage)
- Font [Open Sauce Sans](https://fontsource.org/fonts/open-sauce-sans) untuk teks UI dan Amiri untuk teks Arab
- Responsif untuk HP dan desktop

## Menjalankan secara lokal

Buka `index.html` langsung di browser, atau jalankan server statis sederhana, contoh:

```bash
npx serve .
```

## Struktur Proyek

```
index.html   — struktur halaman & layar (menu, game, hasil)
style.css    — tema warna, layout, animasi
script.js    — logika game, efek suara, confetti
data.js      — bank soal (dhomir, fi'il, isim)
```

## Hosting (GitHub Pages)

Game ini sudah live di: **https://mubarakparfumstore11-lgtm.github.io/mahir-bahasa-arab-kelas8/**

Dihosting dari branch `master`, folder `/ (root)` via GitHub Pages.
