'use strict';

/* ################ CONFIG       ################ */

/* ---- config/constants.js ---- */
/**
 * Konfigurasi aplikasi: satu-satunya tempat untuk teks, angka, dan daftar tetap.
 * Mengubah label menu, durasi timer, atau pesan toast cukup dilakukan di sini.
 */

const NAV_ITEMS = Object.freeze([
  { view: 'home', label: 'Beranda', icon: 'fa-house' },
  { view: 'explore', label: 'Jelajah', icon: 'fa-compass' },
  { view: 'songs', label: 'Musik', icon: 'fa-music' },
  { view: 'videos', label: 'Video', icon: 'fa-circle-play' },
  { view: 'favorites', label: 'Favorit', icon: 'fa-heart' },
]);


/** Jumlah video di bagian "Video terkait" pada halaman pemutaran video. */
const VIDEO_RELATED_COUNT = 12;
/** Jumlah video di "Video terkait" (halaman pemutaran) dan di daftar "Video selanjutnya" (klik Music Bar). */
const VIDEO_WATCH_COUNT = 100;

/** Jumlah lagu per section di halaman Home. */
const HOME_RECOMMENDED_COUNT = 7;
const HOME_RECENT_COUNT = 11;
/** Rekomendasi Musik di Beranda: total lagu dan jumlah per halaman pagination. */
const HOME_REC_TOTAL = 18;
const HOME_REC_PER_PAGE = 6;
/** Jumlah lagu di section "Penyemangat Harimu" Beranda (tanpa pagination). */
const HOME_ENERGY_COUNT = 6;
/** Jumlah cover playlist di section "Playlist Pilihan" Beranda. */
const HOME_PLAYLIST_COUNT = 8;
/** Jumlah album di section "Album Nostalgia" Beranda, dan id playlist sumbernya (Nostalgia 90-an, Era 2000-an). */
const HOME_NOSTALGIA_COUNT = 7;
const NOSTALGIA_PLAYLIST_IDS = Object.freeze([3, 4]);
/** Jumlah artis di section "Artis Populer" Beranda. */
const HOME_POPULAR_ARTIST_COUNT = 10;
/** Jumlah album di "Sorotan Minggu Ini" dan video di "Video Musik" pada Beranda (hanya tampilan). */
const HOME_FEATURED_COUNT = 3;
const HOME_VIDEO_COUNT = 8;
/** Section tambahan Beranda (tampilan saja): lagu baru, artis layak dikenal, video baru, lagu pengiring waktu. */
const HOME_NEW_COUNT = 11;
const HOME_DISCOVER_ARTIST_COUNT = 10;
const HOME_NEW_VIDEO_COUNT = 8;
const HOME_TIME_COUNT = 6;
/** Playlist pengiring per waktu (id EXPLORE_PLAYLISTS): pagi, siang, sore, malam, larut malam. */
const HOME_TIME_PLAYLISTS = Object.freeze({ pagi: 14, siang: 21, sore: 23, malam: 13, larut: 25 });
/** Section tambahan Jelajah (tampilan saja): jumlah item per carousel. */
const EXPLORE_EXTRA_COUNT = 10;
/** Section tambahan Beranda (tampilan saja): jumlah lagu di daftar "Surat Cinta", kartu lagu per carousel, artis dan klip "Penuh Rasa". */
const HOME_LETTER_COUNT = 6;
const HOME_EXTRA_SONG_COUNT = 10;
const HOME_FEEL_ARTIST_COUNT = 10;
const HOME_FEEL_VIDEO_COUNT = 8;
/** Jumlah item per section (Artis, Album, Playlist) di halaman Jelajah; selebihnya lewat lingkaran Selengkapnya. */
const EXPLORE_PREVIEW_COUNT = 10;
/** Halaman "semua ..." yang dibuka dari Jelajah -> label tombol kembali dari halaman detail yang dibuka di dalamnya. */
const EXPLORE_ORIGINS = Object.freeze({ explore: 'Jelajah', artists: 'Semua Artis', albums: 'Semua Album', playlists: 'Semua Playlist' });
/** Hasil Pencarian: jumlah baris awal per bagian, dan tambahan tiap tombol "Tampilkan lebih banyak" ditekan. */
const SEARCH_INITIAL_COUNT = 30;
const SEARCH_MORE_STEP = 60;
/** Filter kategori di hasil pencarian (urutan = urutan chip dan urutan bagian hasil). */
const SEARCH_FILTERS = Object.freeze([
  { key: 'all', label: 'Semua' },
  { key: 'songs', label: 'Lagu' },
  { key: 'albums', label: 'Album' },
  { key: 'artists', label: 'Artis' },
  { key: 'videos', label: 'Video' },
]);
/** Nama cadangan bila sebuah lagu/video tidak punya data artis. */
const ARTIST_NAME = 'Artis tidak diketahui';

/**
 * Daftar link section "Lainnya untuk Dijelajahi" di Beranda. Satu item = satu halaman tujuan.
 * Menambah kategori baru cukup menambah item di sini (lalu isi kontennya di ExploreView).
 */
const EXPLORE_TITLE = 'Lainnya untuk Dijelajahi';
/** Judul section link di Beranda (di bawah Playlist Pilihan); isinya item EXPLORE_ITEMS bertanda `home: true`. */
const HOME_MORE_TITLE = 'Lainnya';
/** Item pengganti di section Lainnya pada halaman Lainnya yang sedang aktif: kembali ke Beranda. */
const HOME_LINK = Object.freeze({ view: 'home', label: 'Beranda', icon: 'fa-house', desc: 'Kembali ke halaman utama' });
/** Item pengganti di section "Lainnya untuk Dijelajahi" pada halaman kategori Jelajah yang sedang aktif: kembali ke Jelajah. */
const EXPLORE_LINK = Object.freeze({ view: 'explore', label: 'Jelajah', icon: 'fa-compass', desc: 'Kembali ke halaman Jelajah' });
const EXPLORE_ITEMS = Object.freeze([
  { view: 'explore-genre', label: 'Genre', icon: 'fa-guitar', desc: 'Jelajahi berdasarkan aliran musik', home: true,
    banner: { title: 'Jelajahi Genre', text: 'Pilih aliran musik favoritmu, lalu dengarkan lagu-lagu yang cocok dengan suasanamu.' } },
  /* Pilihan kurasi di Lainnya: `pick` = id playlist (EXPLORE_PLAYLISTS) yang ditampilkan di halamannya; tanpa data baru. */
  { view: 'explore-nostalgia', label: 'Nostalgia', icon: 'fa-cassette-tape', desc: 'Kembali ke era 60-an sampai 2000-an', home: true, pick: [1, 2, 3, 4] },
  { view: 'explore-cinta', label: 'Cinta & Rindu', icon: 'fa-heart', desc: 'Manis, galau, dan penuh kenangan', home: true, pick: [12, 11, 13] },
  { view: 'explore-energi', label: 'Energi & Gerak', icon: 'fa-bolt', desc: 'Semangat untuk olahraga dan malam seru', home: true, pick: [14, 22, 24, 34, 35] },
  { view: 'explore-tenang', label: 'Santai & Fokus', icon: 'fa-leaf', desc: 'Pelan dan tenang untuk belajar atau istirahat', home: true, pick: [15, 21, 25, 23] },
  { view: 'explore-hits', label: 'Hits Terkini', icon: 'fa-star', desc: 'Lagu hits dari dekade terbaru dan dunia', home: true, pick: [6, 5, 31, 32] },
  { view: 'explore-dekade', label: 'Dekade', icon: 'fa-hourglass-half', desc: 'Lagu dari era ke era', lede: 'Perjalanan lintas waktu: album, lagu, dan cerita dari tiap dekade.' },
  { view: 'explore-mood', label: 'Suasana Hati', icon: 'fa-face-smile-beam', desc: 'Sesuai perasaanmu saat ini', lede: 'Pilih lagu berdasarkan perasaanmu hari ini, dari yang rapuh sampai yang membara.' },
  { view: 'explore-aktivitas', label: 'Aktivitas', icon: 'fa-person-running', desc: 'Teman untuk setiap kegiatan', lede: 'Soundtrack untuk belajar, berolahraga, bepergian, dan beristirahat.' },
  { view: 'explore-dunia', label: 'Ragam Dunia', icon: 'fa-earth-asia', desc: 'Musik dari berbagai penjuru', lede: 'Artis dan klip dari berbagai penjuru dunia, dari K-Pop sampai hip-hop.' },
]);

/**
 * Playlist per kategori Jelajahi (Dekade, Suasana Hati, Aktivitas, Ragam Dunia).
 * Isi playlist diambil dari katalog lagu yang sudah ada (data musik tidak diubah):
 *   artists = semua lagu artis tsb, songs = id lagu tertentu. Lagu yang belum tersedia di katalog dilewati,
 *   dan playlist tanpa lagu tidak ditampilkan. Menambah playlist = menambah satu baris di sini.
 * cat = nama view kategori (EXPLORE_ITEMS), color = id warna di data `colors`.
 */
const EXPLORE_PLAYLISTS = Object.freeze([
  /* ----- Dekade ----- */
  { id: 1, cat: 'explore-dekade', name: 'Legenda 60-an', info: 'Klasik abadi The Beatles', icon: 'fa-record-vinyl', color: 4, artists: [210] },
  { id: 2, cat: 'explore-dekade', name: 'Hits 80-an', info: 'Rock & balada era 80-an', icon: 'fa-radio', color: 13, songs: [297, 549, 552, 554, 776, 822] },
  { id: 3, cat: 'explore-dekade', name: 'Nostalgia 90-an', info: 'Dari Nike Ardilla sampai Slank', icon: 'fa-cassette-tape', color: 5, artists: [80, 110], songs: [551, 553, 247, 248] },
  { id: 4, cat: 'explore-dekade', name: 'Era 2000-an', info: 'Band-band yang menemani masa remaja', icon: 'fa-guitar', color: 11, artists: [84, 89, 70, 113, 68, 3, 31, 100, 96, 13, 203, 207, 166, 316, 310, 279, 278], songs: [738, 739, 740, 741, 743, 744, 745, 746, 756, 769, 778, 779, 780, 784, 785, 788, 823, 824, 825, 826, 828, 831] },
  { id: 5, cat: 'explore-dekade', name: 'Hits 2010-an', info: 'Lagu-lagu hits satu dekade', icon: 'fa-compact-disc', color: 9, artists: [2, 118, 119, 120, 188, 211, 187, 154, 202, 141, 46, 43, 288, 291, 304, 303, 300], songs: [273, 274, 275, 277, 610, 381, 460, 729, 736, 742, 293, 295, 747, 748, 749, 750, 751, 752, 753, 754, 755, 757, 758, 759, 760, 761, 762, 763, 764, 765, 123, 124, 122, 767, 768, 771, 772, 773, 774, 781, 782, 783, 786, 787] },
  { id: 6, cat: 'explore-dekade', name: 'Terkini 2020-an', info: 'Lagu-lagu paling baru', icon: 'fa-bolt', color: 7, artists: [73, 71, 95, 19, 88, 22, 123, 76, 208, 161, 164, 122, 126, 275, 289, 306, 319, 313], songs: [64, 65, 66, 276, 726, 727, 728, 730, 731, 732, 733, 734, 735, 737, 766, 775, 802] },
  /* ----- Suasana Hati ----- */
  { id: 11, cat: 'explore-mood', name: 'Galau & Patah Hati', info: 'Untuk hati yang sedang rapuh', icon: 'fa-heart-crack', color: 12, songs: [18, 47, 53, 113, 123, 300, 323, 601, 44, 182, 240, 594, 610, 276, 325, 603, 135, 249, 472, 460, 462, 566, 1087, 1086, 1077, 1081, 1052, 1035] },
  { id: 12, cat: 'explore-mood', name: 'Jatuh Cinta', info: 'Manis, hangat, dan berbunga-bunga', icon: 'fa-heart', color: 1, songs: [40, 133, 274, 115, 543, 541, 414, 38, 192, 159, 589, 319, 56, 347, 322, 311, 305, 327, 584, 567, 1034, 1038, 1079, 1083, 1050] },
  { id: 13, cat: 'explore-mood', name: 'Rindu & Kenangan', info: 'Mengenang yang pernah ada', icon: 'fa-hourglass-half', color: 4, songs: [107, 108, 244, 39, 136, 264, 330, 612, 144, 301, 375, 474, 145, 147, 1074, 1060, 1061, 1062, 1063, 1071, 1057, 1072, 1078] },
  { id: 14, cat: 'explore-mood', name: 'Semangat & Energik', info: 'Naikkan mood-mu sekarang', icon: 'fa-bolt', color: 8, songs: [51, 79, 97, 549, 484, 482, 337, 522, 523, 263, 310, 342, 432, 424, 515, 516, 1054, 1041, 1056] },
  { id: 15, cat: 'explore-mood', name: 'Santai & Tenang', info: 'Pelan, lembut, dan menenangkan', icon: 'fa-leaf', color: 16, songs: [145, 146, 226, 277, 273, 559, 558, 463, 464, 542, 557, 547, 428, 295, 301, 1038, 1053, 1055] },
  /* ----- Aktivitas ----- */
  { id: 21, cat: 'explore-aktivitas', name: 'Belajar & Fokus', info: 'Teman tenang saat butuh konsentrasi', icon: 'fa-book-open', color: 11, songs: [145, 146, 147, 273, 277, 428, 435, 547, 548, 301, 612, 107] },
  { id: 22, cat: 'explore-aktivitas', name: 'Olahraga', info: 'Tempo cepat untuk menemani latihan', icon: 'fa-dumbbell', color: 8, songs: [482, 484, 477, 79, 83, 97, 522, 523, 524, 525, 432, 515, 516, 517, 549, 550, 384, 1054, 1041] },
  { id: 23, cat: 'explore-aktivitas', name: 'Perjalanan', info: 'Menikmati jalan, lagu pun ikut', icon: 'fa-car', color: 14, songs: [22, 549, 550, 543, 542, 414, 415, 463, 559, 144, 306, 484, 413, 1102, 1103] },
  { id: 24, cat: 'explore-aktivitas', name: 'Malam Minggu', info: 'Nongkrong bareng, bernyanyi bersama', icon: 'fa-champagne-glasses', color: 17, songs: [332, 586, 70, 133, 40, 310, 340, 341, 342, 338, 339, 247, 263, 267, 1101, 1065, 1068, 1102] },
  { id: 25, cat: 'explore-aktivitas', name: 'Pengantar Tidur', info: 'Lembut sebelum terlelap', icon: 'fa-moon', color: 12, songs: [226, 301, 559, 463, 464, 547, 548, 473, 509, 612, 107] },
  /* ----- Ragam Dunia ----- */
  { id: 31, cat: 'explore-dunia', name: 'Pop Dunia', info: 'Hits pop dari seluruh dunia', icon: 'fa-earth-americas', color: 1, artists: [14, 154, 201, 188, 187, 211, 140, 185, 208, 193, 182, 156, 139, 197, 244, 247, 248, 288, 291, 289, 306, 290, 303] },
  { id: 32, cat: 'explore-dunia', name: 'K-Pop', info: 'Dari Korea untuk dunia', icon: 'fa-star', color: 17, artists: [161, 164, 163] },
  { id: 33, cat: 'explore-dunia', name: 'Rock Dunia', info: 'Dentuman gitar lintas negara', icon: 'fa-guitar', color: 13, artists: [16, 209, 210, 166, 199, 242, 246, 245, 305] },
  { id: 34, cat: 'explore-dunia', name: 'EDM & Elektronik', info: 'Beat elektronik yang menghentak', icon: 'fa-wave-square', color: 9, artists: [202, 201, 304, 302] },
  { id: 35, cat: 'explore-dunia', name: 'Hip-Hop & R&B', info: 'Ritme urban dan vokal soul', icon: 'fa-microphone-lines', color: 10, artists: [141, 194, 203, 289, 301, 276], songs: [477, 484, 573, 784, 785, 786] },
]);

/** Halaman detail/pencarian dipetakan ke menu utama yang harus tampil aktif. */
const SECTION_OF_VIEW = Object.freeze({
  album: 'home',
  artist: 'home',
  genre: 'search',
  egenre: 'home',
  playlist: 'home',
  video: 'videos',
  artists: 'explore',
  albums: 'explore',
  playlists: 'explore',
  ...Object.fromEntries(EXPLORE_ITEMS.map((item) => [item.view, item.home ? 'home' : 'explore'])),
});

/** Detail yang menu aktifnya mengikuti asal pembukaan: dari alur Jelajah tetap menyalakan menu Jelajah (bukan Beranda). */
const ORIGIN_AWARE_VIEWS = new Set(['album', 'artist', 'playlist']);

const TIMING = Object.freeze({
  TOAST_MS: 2600,
  PLAY_NUDGE_MS: 1500,
  PLAY_WARNING_MS: 4000,
  PREFETCH_START_MS: 1500,
  PREFETCH_READY_MS: 6000,
  PREFETCH_TIMEOUT_MS: 10000,
  /** Perubahan pengaturan ditulis ke localStorage setelah jeda ini (digabung, supaya slider volume tidak menulis tiap geseran). */
  STORAGE_FLUSH_MS: 300,
  /** Lagu yang gagal diukur durasinya tidak dicoba lagi selama jangka ini (7 hari). */
  PREFETCH_MISS_TTL_MS: 7 * 24 * 60 * 60 * 1000,
  SEARCH_DEBOUNCE_MS: 150,
  /** Jarak minimum antar perintah seek ke widget saat slider progres digeser. */
  SEEK_THROTTLE_MS: 120,
});

const MESSAGES = Object.freeze({
  NO_SOURCE: 'Link SoundCloud lagu ini belum diisi',
  NOT_STARTED: 'Lagu belum mulai, tekan tombol play sekali lagi',
  NO_PLAYER: 'Pemutar SoundCloud gagal dimuat. Periksa koneksi internet lalu muat ulang halaman.',
  NOTHING_PLAYABLE: 'Tidak ada lagu yang bisa diputar',
  NO_RESULTS: 'Hasil pencarian tidak ditemukan.',
  NO_SONGS: 'Belum ada lagu. Lagu akan muncul di sini.',
  NO_RECENT: 'Belum ada lagu yang diputar. Putar lagu mana pun, nanti muncul di sini.',
  NO_FAVORITES: 'Belum ada lagu favorit. Putar lagu, ketuk bar pemutar untuk membuka Sedang Diputar, lalu tekan ikon love untuk menyimpannya ke sini.',
});

const DEFAULT_VOLUME = 1;
