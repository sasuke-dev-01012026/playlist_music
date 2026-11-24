'use strict';

/* ---- views/SearchView.js ---- */
/** Ikon genre dipilih dari kata kunci nama genre (data genre tetap diambil dari library.genres). */
const GENRE_ICONS = [
  ['metal', 'fa-skull'], ['punk', 'fa-burst'], ['hard', 'fa-fire'], ['breakbeat', 'fa-wave-square'],
  ['reggae', 'fa-sun'], ['ska', 'fa-sun'], ['dangdut', 'fa-drum'], ['jawa', 'fa-drum'],
  ['folk', 'fa-leaf'], ['indie', 'fa-leaf'], ['r&b', 'fa-compact-disc'], ['melayu', 'fa-microphone-lines'],
  ['alternat', 'fa-bolt'], ['rock', 'fa-guitar'], ['pop', 'fa-star'],
];
const genreIcon = (name) => {
  const key = String(name).toLowerCase();
  return (GENRE_ICONS.find(([word]) => key.includes(word)) ?? [null, 'fa-music'])[1];
};

const GenreCard = (genre, index, view = 'genre') =>
  `<button type="button" class="genre-card" role="listitem" data-go="${view}:${genre.id}" aria-label="Buka genre ${e(genre.name)}" style="--g:${colorHex((index % 6) + 1) ?? '#d9709a'}">` +
  `<i class="fa-solid ${genreIcon(genre.name)}" aria-hidden="true"></i><span>${e(genre.name)}</span></button>`;

/** Playlist dengan lagu tersedia lebih sedikit dari ini disembunyikan (lagu tanpa link SoundCloud belum tampil). */
const PLAYLIST_MIN_SONGS = 3;

/** Playlist kategori -> daftar lagu (tanpa duplikat, urutan sesuai definisi). Playlist terlalu sedikit lagu dibuang. */
const resolvePlaylist = (library, def) => {
  const seen = new Set();
  const songs = [
    ...(def.artists ?? []).flatMap((id) => library.getArtist(id)?.songs ?? []),
    ...(def.songs ?? []).map((id) => library.getSong(id)),
  ].filter((song) => song && !seen.has(song.id) && seen.add(song.id));
  /* Video (ID YouTube) diperlakukan sama seperti musik: semua video artis playlist + video dari id lagu yang disebut. */
  const seenVideo = new Set();
  const videos = [
    ...(def.artists ?? []).flatMap((id) => videosOfArtist(library, id)),
    ...(def.songs ?? []).map((id) => library.getVideo(id)),
  ].filter((video) => video && !seenVideo.has(video.id) && seenVideo.add(video.id));
  return { ...def, songs, videos };
};
/** Besar playlist = lagu + video (satu lagu yang punya keduanya dihitung sekali). */
const playlistSize = (pl) => new Set([...pl.songs, ...pl.videos].map((item) => item.id)).size;
/** Teks jumlah: hanya bagian yang ada ("12 lagu · 5 video"). */
const playlistCount = (pl) => [pl.songs.length ? `${pl.songs.length} lagu` : '', pl.videos.length ? `${pl.videos.length} video` : ''].filter(Boolean).join(' · ');
const playlistsOf = (library, cat) =>
  EXPLORE_PLAYLISTS.filter((def) => def.cat === cat).map((def) => resolvePlaylist(library, def)).filter((pl) => playlistSize(pl) >= PLAYLIST_MIN_SONGS);

/** Cover playlist: kartu genre (.genre-card) berbentuk persegi, berisi judul + info. Klik -> detail playlist. */
const PlaylistCard = (pl) =>
  `<button type="button" class="genre-card pl-card" role="listitem" data-go="playlist:${pl.id}" aria-label="Buka playlist ${e(pl.name)}" style="--g:${colorHex(pl.color) ?? '#d9709a'}">` +
  `<i class="fa-solid ${pl.icon}" aria-hidden="true"></i>` +
  `<span class="pl-t"><b>${e(pl.name).replace(/\S+-\S+/g, '<span class="nw">$&</span>')}</b><small>${playlistCount(pl)} · ${e(pl.info)}</small></span></button>`;

/** Cover playlist untuk carousel Beranda: kartu bergaya genre (.pl-card) berbentuk persegi, ukuran sama dengan album. */
const PlaylistCoverItem = (pl) =>
  PlaylistCard(pl).replace('genre-card pl-card', 'genre-card pl-card pl-slide');

/**
 * Relasi artis -> genre (id genre mengacu ke data `genres`). Data katalog tidak diubah; relasi ini
 * ditentukan dari nama artis dan bisa disunting di sini. Satu artis boleh masuk lebih dari satu genre.
 */
const ARTIST_GENRES = Object.freeze({
  2: [2, 3], 3: [3, 5], 4: [5, 3], 5: [5, 12], 6: [5, 12], 8: [5], 9: [3, 6], 11: [3], 12: [5, 13],
  13: [3, 5], 14: [5, 12], 16: [7], 19: [5, 13], 22: [5, 13], 23: [5, 12], 26: [5], 27: [3],
  29: [3], 31: [3, 6], 32: [15], 40: [5], 42: [5], 43: [13], 45: [3], 46: [13], 48: [5, 3], 50: [6, 3],
  51: [12, 5], 55: [5], 60: [13, 6], 67: [2], 68: [3], 69: [3], 70: [3, 4], 71: [5], 73: [5], 74: [5],
  76: [13], 78: [3, 4], 80: [3, 6], 81: [3, 4], 84: [3, 4], 87: [13], 88: [4, 9], 89: [3], 92: [5],
  93: [5], 95: [13], 96: [3, 6], 98: [2], 99: [3], 100: [3, 4], 102: [6, 15], 103: [15], 106: [5],
  108: [3], 110: [15], 112: [5, 13], 113: [3], 114: [3], 117: [3], 118: [5], 119: [2], 120: [5],
  122: [4, 9], 123: [9, 13], 124: [5], 125: [5], 126: [5], 127: [5], 129: [5], 135: [5], 137: [5],
  140: [5], 141: [12, 5], 154: [5], 161: [5], 164: [5], 166: [8, 3], 185: [5, 13], 187: [5],
  188: [5, 12], 194: [16], 201: [5], 202: [5], 203: [12, 16], 204: [5], 207: [5], 208: [5, 9], 209: [11, 6],
  210: [6, 5], 211: [5, 12], 212: [5], 214: [5], 215: [5], 216: [5], 217: [5], 218: [5], 219: [5],
  220: [5], 221: [5], 222: [5], 223: [5], 224: [5],
  37: [4, 13], 38: [3], 39: [5], 41: [5], 44: [3], 49: [5], 53: [14], 54: [3], 61: [3, 6], 63: [5], 64: [5], 65: [5], 66: [5], 139: [5], 156: [5], 163: [5], 182: [5], 193: [5, 13], 197: [5], 199: [8, 6], 239: [15, 5], 240: [13, 5], 241: [13], 242: [4, 6], 243: [5], 244: [5], 245: [9, 5], 246: [6], 247: [5, 13], 248: [5, 12],
  /* Genre artis video yang sebelumnya kosong (id genre dari data `genres`; yang belum pasti sengaja dikosongkan). */
  18: [4, 13], 24: [5], 25: [5], 30: [14], 77: [3], 82: [3], 86: [5], 128: [5], 134: [5, 12], 143: [14], 155: [5], 160: [5], 177: [5], 181: [5], 183: [5], 189: [5], 190: [16], 191: [9, 5], 206: [5], 225: [5], 227: [16], 228: [3], 230: [5], 231: [5], 232: [5], 233: [6], 234: [5], 236: [5], 237: [5], 238: [5], 250: [5], 251: [5], 252: [5], 253: [5, 12], 254: [14], 255: [5], 256: [9, 6], 259: [5], 262: [3], 264: [14], 265: [5], 266: [5], 267: [5], 268: [5], 269: [9, 6], 270: [6], 271: [9, 6], 272: [5], 273: [13, 5], 274: [12, 5],
  /* Tebakan terbaik dari nama artis (belum diverifikasi); ganti bila keliru. */
  15: [5], 17: [5], 21: [3], 35: [3], 36: [5], 83: [3], 90: [3], 133: [5], 174: [4, 6], 180: [3], 226: [3], 229: [5], 235: [5], 249: [5], 257: [5], 258: [13, 5], 260: [5], 261: [3], 263: [5],
  /* Artis dari penambahan data TXT (video YouTube). Genre = tebakan terbaik dari nama artis (belum diverifikasi); artis tanpa genre pasti sengaja dikosongkan. */
  278: [3], 279: [3], 277: [13], 280: [5], 281: [5], 282: [5], 283: [5], 284: [5], 285: [5], 287: [3,13], 288: [5], 289: [12], 290: [5,13], 291: [5], 292: [5], 293: [3], 296: [13,5], 297: [3], 299: [3], 300: [5], 301: [16], 303: [5], 304: [5], 305: [6,9], 306: [5,9], 307: [5], 308: [3], 309: [3], 310: [3], 311: [3,6], 312: [3], 313: [13,5], 315: [5], 316: [5,3], 317: [3], 318: [3], 319: [13,5], 320: [3], 321: [3,4], 322: [5], 323: [14], 324: [15], 275: [5,13], 276: [16], 314: [13,5], 298: [9], 295: [14],
});

/** Hanya genre yang punya artis (dan lagu) yang tampil di web; genre kosong disembunyikan. */
const visibleGenres = (library) => library.genres.filter((genre) =>
  library.allArtists.some((artist) => (ARTIST_GENRES[artist.id] ?? []).includes(genre.id)));
