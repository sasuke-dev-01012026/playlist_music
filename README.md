# Web Music

Web Music ini dibuat dengan penuh cinta dan kasih sayang oleh **Sasuke**, untuk seseorang yaitu **Altrx**.

Aplikasi musik satu file (`index.html`) tanpa build tool. Cukup buka file di browser.

## Fitur

- 5 halaman utama: **Beranda**, **Jelajah**, **Lagu**, **Video**, **Suka** (Favorit).
- Pemutar musik (SoundCloud) dan pemutar video (YouTube).
- Pencarian lagu, artis, album, dan video.
- Latar belakang romantis yang berbeda di tiap halaman utama.
- Pilihan tema: Terang Romantis, Gelap Romantis, Terang Polos, Gelap Polos.

## Struktur `index.html`

Semua kode ada di satu file. Bagian-bagiannya ditandai komentar `/* ---- nama ---- */`:

| Bagian | Isi |
|---|---|
| `config/constants.js` | Menu utama (`NAV_ITEMS`), halaman Jelajah (`EXPLORE_ITEMS`), playlist kurasi (`EXPLORE_PLAYLISTS`), relasi artis ke genre (`ARTIST_GENRES`), jumlah item, pesan, dan durasi. |
| `data/music-data.js` | Data mentah katalog: `artists`, `colors`, `genres`, `albums`, `songs`, `playlists` (di `MUSIC_DATA_SECTIONS`). |
| `models/`, `core/`, `services/` | Model data, router, komponen, dan perpustakaan musik. |
| `views/` | Susunan tiap halaman (Beranda, Jelajah, Lagu, Video, Favorit, dan lainnya). |

## Menambah lagu dari YouTube

Tambahkan satu baris di blok `songs` pada `data/music-data.js`:

```js
{ id: 682, name: "Judul Lagu", artistId: 16, albumId: 37, dur: 245, sc: "", yt: "pZYWImtPZ5w", colorId: 2 },
```

| Field | Keterangan |
|---|---|
| `id` | Harus unik. Pakai angka setelah ID lagu tertinggi yang ada. |
| `name` | Judul lagu. |
| `artistId` | ID artis di `artists`. |
| `albumId` | ID album di `albums`. |
| `dur` | Durasi dalam detik. |
| `sc` | ID track SoundCloud. Kosongkan (`""`) jika hanya ada video YouTube. |
| `yt` | ID video YouTube, yaitu 11 karakter setelah `watch?v=` di URL. |
| `colorId` | Nomor warna cover (lihat `colors`). |

Catatan:

- Lagu dengan `yt` terisi otomatis muncul di halaman **Video**.
- Lagu dengan `sc: ""` tidak bisa diputar sebagai audio. Barisnya tampil redup di daftar lagu, tetapi bisa diputar sebagai video.
- Lagu dengan `sc` terisi bisa diputar sebagai musik.
- Format `yt` harus tepat 11 karakter (huruf, angka, `-`, `_`). Format lain tidak dianggap video.

## Menambah artis atau album baru

1. Tambahkan artis di `artists` dengan `id` baru: `{ id: 227, name: "Nama Artis", coverImg: "" }`.
2. Tambahkan album di `albums` dengan `id` baru: `{ id: 401, name: "Nama Album", artistId: 227, coverImg: "" }`.
3. Agar artis muncul di halaman **Genre**, daftarkan di `ARTIST_GENRES`, misalnya `227: [5]` (angka di dalam kurung = ID genre).
4. Genre baru: tambahkan di `genres`, lalu pastikan minimal satu artis menunjuk ke ID genre itu di `ARTIST_GENRES`. Genre tanpa artis disembunyikan.

Sebelum menambah, cek ID tertinggi yang sudah dipakai di tiap blok agar tidak bentrok.

## Apa yang otomatis masuk, apa yang perlu didaftarkan

| Kamu menambah | Otomatis? |
|---|---|
| Lagu/album baru dari artis yang sudah ada | Ya: halaman artis, Album, dan Lagu. |
| Lagu dengan `yt` terisi | Ya: halaman Video. |
| Lagu baru untuk playlist yang memakai `artists: [id]` | Ya. |
| Lagu baru untuk playlist yang memakai `songs: [id]` | Tidak: tambahkan ID lagunya ke playlist. |
| Artis baru ke halaman Genre | Tidak: daftarkan di `ARTIST_GENRES`. |
| Artis atau lagu baru ke playlist Jelajah | Tidak: tambahkan ke `artists:` atau `songs:` di `EXPLORE_PLAYLISTS`. |

## Menambah playlist di Jelajah

Tambahkan satu baris di `EXPLORE_PLAYLISTS` (di `config/constants.js`):

```js
{ id: 16, cat: 'explore-mood', name: 'Album Galau', info: 'Kumpulan album untuk hati yang rapuh',
  icon: 'fa-heart-crack', color: 12, songs: [18, 47, 53] },
```

| Field | Keterangan |
|---|---|
| `id` | Unik di antara playlist kurasi. |
| `cat` | Kategori: `explore-dekade`, `explore-mood`, `explore-aktivitas`, atau `explore-dunia`. |
| `icon` | Ikon Font Awesome (`fa-...`). |
| `color` | ID warna di data `colors`. |
| `artists` / `songs` | Isi playlist: semua lagu dari artis tertentu, dan/atau ID lagu tertentu. Boleh dipakai bersamaan. |

Playlist dengan kurang dari 3 lagu tidak ditampilkan. Untuk memunculkannya juga di halaman kurasi seperti Cinta & Rindu atau Energi & Gerak, tambahkan `id` playlist ke `pick` pada `EXPLORE_ITEMS`.

## Tema dan latar belakang

- Tombol tema ada di navbar atas, di kanan kolom Search.
- Empat pilihan: **Terang Romantis**, **Gelap Romantis**, **Terang Polos**, **Gelap Polos**.
- Mode Polos menyembunyikan hiasan latar romantis.
- Tema diatur lewat atribut `data-theme` (`light` atau `dark`) dan `data-bg` (`romantic` atau `plain`) pada elemen `<html>`.
- Hiasan latar tiap halaman ada di elemen `#bgDeco`, murni CSS, dengan `pointer-events: none`.

## Data yang disimpan di browser

Disimpan di LocalStorage, tidak ada di file:

- Lagu favorit.
- Volume, lagu terakhir, halaman terakhir, shuffle, dan repeat.
- Durasi asli lagu dari SoundCloud.
- Pilihan tema (kunci `wm-theme`).
