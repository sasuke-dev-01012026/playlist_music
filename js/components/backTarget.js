'use strict';

/* ---- components/backTarget.js ---- */
/**
 * Tombol kembali di halaman detail (album, artist, playlist) mengikuti halaman asal pembukaannya.
 * Fungsi di sini murni (tanpa DOM dan tanpa state) sehingga mudah diuji; ViewOutlet hanya menerapkan hasilnya.
 * Satu rute detail hanya cocok dengan satu aturan karena halaman asal tiap aturan berbeda, jadi urutan tidak berpengaruh.
 */

/** Aturan untuk album/artist: `to` = view tujuan, `from` = view asal, `target(previous)` = tombol kembali. */
const DETAIL_BACK_RULES = Object.freeze([
  { to: ['album'], from: ['artist'], target: (p) => ({ go: `artist:${p.id}`, label: 'Artis' }) },
  { to: ['artist'], from: ['video'], target: (p) => ({ go: `video:${p.id}`, label: 'Video' }) },
  { to: ['artist', 'album'], from: Object.keys(EXPLORE_ORIGINS), target: (p) => ({ go: p.view, label: EXPLORE_ORIGINS[p.view] }) },
  { to: ['artist', 'album'], from: ['genre', 'egenre'], target: (p) => ({ go: `${p.view}:${p.id}`, label: 'Genre' }) },
  { to: ['artist', 'album'], from: ['playlist'], target: (p) => ({ go: `playlist:${p.id}`, label: 'Playlist' }) },
]);

/** Label halaman asal playlist: Beranda, halaman "semua ...", atau kategori pilihan Jelajah. */
const playlistOriginLabel = (view) => (view === 'home'
  ? 'Beranda'
  : EXPLORE_ORIGINS[view] ?? EXPLORE_ITEMS.find((item) => item.view === view)?.label);

/**
 * Asal playlist yang diingat: Beranda / halaman "semua ..." / kategori pilihan Jelajah (null = ikut bawaan view).
 * Asal tetap diingat saat pengguna masuk ke artist/album dari playlist itu lalu kembali.
 */
const playlistOriginFor = (previous, remembered) => {
  const from = previous?.view;
  if (from === 'home' || EXPLORE_ORIGINS[from] || EXPLORE_ITEMS.some((item) => item.pick && item.view === from)) return from;
  return from === 'artist' || from === 'album' ? remembered : null;
};

/** Tujuan dan label tombol kembali untuk `route`, atau null bila bawaan view dipakai apa adanya. */
const backTargetFor = (route, previous, playlistFrom) => {
  if (route.view === 'playlist') {
    return playlistFrom ? { go: playlistFrom, label: playlistOriginLabel(playlistFrom) } : null;
  }
  const rule = DETAIL_BACK_RULES.find((r) => r.to.includes(route.view) && r.from.includes(previous?.view));
  return rule ? rule.target(previous) : null;
};
