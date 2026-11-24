/* Bisikan romantis per halaman: sumber tunggal untuk komponen asli (Whisper) dan kerangka layar awal.
   Dipilih tetap per konteks (id/hari) agar bervariasi antarhalaman, tidak acak tiap render. */
window.__ws = {
  list: {
  home: [
    'Setiap lagu di sini kupilih sambil memikirkanmu.',
    'Semoga ada satu lagu hari ini yang terasa seperti pelukan.',
    'Aku tak pandai mengucap rindu, jadi kutitipkan pada nada.',
    'Pelan-pelan saja. Aku di sini, bersama lagu-lagu ini.',
    'Kalau hari ini terasa berat, biarkan musik menemanimu sebentar.',
    'Dari semua lagu yang ada, aku hanya ingin kamu mendengarnya.',
  ],
  explore: [
    'Jelajahilah sesukamu. Semua jalan di sini kutulis untukmu.',
    'Mungkin lagu yang kamu cari sudah lama menunggu di sini.',
    'Tak perlu terburu-buru. Yang indah sering datang saat kita berjalan pelan.',
    'Semoga kamu menemukan lagu yang mirip dengan ceritamu.',
  ],
  allAlbums: ['Setiap album adalah kenangan yang dijilid rapi.', 'Ada rindu yang tersimpan di balik tiap sampulnya.'],
  allPlaylists: ['Daftar lagu untuk setiap rasa yang belum sempat terucap.', 'Kususun tiap suasana agar kamu tak perlu mencari jauh.'],
  allArtists: ['Suara-suara yang diam-diam menemani kita.', 'Mereka bernyanyi, aku hanya menumpang merindukanmu.'],
  songs: ['Setiap lagu menyimpan satu kenangan. Ambil yang kamu butuhkan hari ini.', 'Dengarkan satu per satu, seperti membaca surat-surat lama.'],
  favorites: ['Lagu-lagu yang kamu simpan diam-diam menjadi rumah.', 'Dari yang kamu sukai, aku belajar mengenalmu lebih dekat.'],
  search: ['Cari lagu yang mewakili perasaan yang belum sempat terucap.', 'Kalau belum ketemu, cari lagi. Aku sabar menunggu.'],
  video: [
    'Ada rindu yang lebih mudah ditonton daripada diucapkan.',
    'Semoga gambar dan lagu ini membawamu pulang sebentar.',
    'Tontonlah pelan-pelan. Anggap saja kita duduk berdampingan.',
  ],
  album: [
    'Putar dari lagu pertama, seperti membaca surat dari awal.',
    'Seperti kenangan, album lebih indah bila didengar sampai habis.',
    'Ada banyak kisah di sini. Semoga salah satunya terasa seperti kita.',
    'Dengarkan pelan-pelan; ada rindu di sela setiap lagunya.',
  ],
  playlist: [
    'Kususun lagu-lagu ini seperti menyusun kata untukmu.',
    'Untuk saat-saat ketika kata-kata tidak cukup.',
    'Semoga daftar ini menemani harimu, sepelan dan sehangat itu.',
    'Tiap lagu di sini adalah salam kecil dariku.',
  ],
  genre: [
    'Apa pun nadanya, semoga tetap terasa seperti pulang.',
    'Berbeda aliran, rasa yang kutuju tetap sama: kamu.',
    'Setiap nada punya caranya sendiri untuk mengatakan sayang.',
  ],
  artist: [
    'Suara yang diam-diam mewakili perasaan yang sulit kuucapkan.',
    'Lewat suaranya, semoga rindu ini sampai kepadamu.',
    'Ada lagu yang lebih jujur daripada aku. Semuanya ada di sini.',
    'Sebagian perasaan hanya bisa dititipkan pada suara orang lain.',
  ],
},
  hash: (value) => [...String(value ?? '')].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) >>> 0, 7),
  pick: function (key, seed) { var l = this.list[key]; return l && l.length ? l[this.hash(seed) % l.length] : ''; }
};
