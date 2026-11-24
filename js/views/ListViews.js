'use strict';

/* ---- views/ListViews.js ---- */
/** Halaman daftar (tingkat atas): Home, Songs, Favorites. */

/** Nomor minggu (Senin-Minggu) dari tanggal lokal; berganti tiap Senin 00:00 dan sama di semua perangkat. */
const weekIndex = (date = new Date()) =>
  Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000 + 3) / 7);

/** Pengacak berbenih (mulberry32): benih sama -> urutan acak sama. */
const seededRandom = (seed) => () => {
  seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/**
 * Album Minggu Ini: `count` album berbeda (judul dan artis tidak ada yang sama). Pilihan tetap sepanjang minggu
 * (tidak berubah saat refresh) dan berganti tiap minggu. Bila artis kurang dari `count`, sisanya diisi lagu lain.
 */
const weeklyAlbums = (songs, count) => {
  const rand = seededRandom(weekIndex());
  const pool = [...songs];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const picked = [];
  const artists = new Set();
  const titles = new Set();
  for (const song of pool) {
    if (picked.length === count) break;
    const title = String(song.name).trim().toLowerCase();
    if (artists.has(song.artistId) || titles.has(title)) continue;
    artists.add(song.artistId);
    titles.add(title);
    picked.push(song);
  }
  for (const song of pool) {
    if (picked.length === count) break;
    if (!picked.includes(song)) picked.push(song);
  }
  return picked;
};

/** Kartu lagu di carousel "Terakhir Diputar": tampilan sama dengan item album; klik memutar lagu. */
const HomeSongCard = (song) =>
  `<button type="button" class="album" role="listitem" data-play="${song.id}" aria-label="Putar ${e(song.name)}"><div class="cover">` +
  `<img ${IMG_ATTRS} width="300" height="300" loading="lazy" decoding="async" src="${e(song.cover)}" alt=""></div>` +
  `<div class="card-title">${e(song.name)}</div><div class="card-desc">${e(song.artist.name)}</div></button>`;

/** Kalimat pendek bernuansa romantis (teks saja). Dipilih tetap per konteks (id/hari) agar bervariasi antarhalaman, tidak acak tiap render. */
/* Teks bisikan didefinisikan sekali di <head> (window.__ws) agar kerangka layar awal memakai kalimat yang sama persis dengan halaman asli. */
const WHISPERS = Object.freeze(window.__ws.list);
const hashSeed = window.__ws.hash;

/** Satu baris romantis kecil (serif miring, warna aksen lembut). Kunci tak dikenal -> kosong. */
const Whisper = (key, seed = '') => {
  const list = WHISPERS[key] ?? [];
  return list.length ? `<p class="whisper">${e(list[hashSeed(seed) % list.length])}</p>` : '';
};

/** Header halaman (eyebrow, judul serif besar, kalimat pengantar): kelas sama dengan header Beranda. `whisper` = kunci WHISPERS (opsional). */
const PageHead = (eyebrow, title, lede = '', whisper = '') =>
  `<header class="home-head"><p class="home-eyebrow">${e(eyebrow)}</p><h1>${e(title)}</h1>` +
  (lede ? `<p class="home-lede">${e(lede)}</p>` : '') + (whisper ? Whisper(whisper, title) : '') + '</header>';

/** Beranda: judul section tegas + keterangan singkat + tautan opsional ke halaman lengkap. */
const HomeSection = (title, sub, contentHtml, { cls = '', go = '', goLabel = 'Lihat Semua' } = {}) =>
  `<section class="section hs ${cls}"><header class="hs-head"><div class="hs-titles"><h2>${e(title)}</h2>${sub ? `<p>${e(sub)}</p>` : ''}</div>` +
  (go ? `<button type="button" class="hs-more" data-go="${e(go)}" aria-label="${e(goLabel)}: ${e(title)}">${e(goLabel)}</button>` : '') +
  `</header>${contentHtml}</section>`;

/** Kartu sorotan: artwork besar dengan teks editorial di atasnya. Klik -> detail album. */
const FeaturedItem = (album, index = 1) =>
  `<button type="button" class="feat" role="listitem" data-go="album:${album.id}" aria-label="Buka album ${e(album.name)}">` +
  `<span class="feat-text"><small>Album Pilihan</small><b>${e(album.name)}</b><em>${e(album.artist.name)}</em></span>` +
  `<span class="feat-cover"><img ${IMG_ATTRS} width="600" height="600" decoding="async" ` +
  /* Kartu pertama ada di layar pertama (kandidat LCP): jangan di-lazy, minta prioritas tinggi. Sisanya di luar layar. */
  (index === 0 ? 'fetchpriority="high"' : 'loading="lazy"') +
  ` src="${e(album.cover)}" alt=""></span></button>`;

/** Kartu video di carousel Beranda: thumbnail 16:9, judul, dan artis. Klik -> halaman pemutaran video. */
const HomeVideoItem = (song) => {
  const artist = song.artist?.name ?? ARTIST_NAME;
  const duration = song.duration > 0 ? `<span class="vid-dur">${formatTime(song.duration)}</span>` : '';
  return `<a class="vid vs" role="listitem" href="#/video/${song.id}" data-go="video:${song.id}" aria-label="Tonton ${e(song.name)} - ${e(artist)}">` +
    `<span class="vid-thumb"><img ${IMG_ATTRS} width="480" height="360" loading="lazy" decoding="async" src="${e(videoThumb(song))}" alt="">${duration}` +
    '<span class="vid-hover" aria-hidden="true"><i class="fa-solid fa-play"></i></span></span>' +
    `<span class="vs-title" title="${e(song.name)}">${e(song.name)}</span><span class="vs-by">${e(artist)}</span></a>`;
};

/**
 * Bahan section tambahan Beranda & Jelajah (tampilan saja, tanpa data baru): lagu / klip dari playlist kategori Jelajah
 * (EXPLORE_PLAYLISTS) menurut id. Lagu hanya yang bisa diputar; hasil tanpa duplikat, urutan sesuai definisi playlist.
 */
const playlistSongsOf = (library, ids) => {
  const seen = new Set();
  return ids.flatMap((id) => { const def = EXPLORE_PLAYLISTS.find((pl) => pl.id === id); return def ? resolvePlaylist(library, def).songs : []; })
    .filter((song) => song.isPlayable && !seen.has(song.id) && seen.add(song.id));
};
const playlistVideosOf = (library, ids) => {
  const seen = new Set();
  return ids.flatMap((id) => { const def = EXPLORE_PLAYLISTS.find((pl) => pl.id === id); return def ? resolvePlaylist(library, def).videos : []; })
    .filter((video) => !seen.has(video.id) && seen.add(video.id));
};
/** Urutan acak berbenih mingguan: tetap sepanjang minggu, berganti tiap minggu. */
const weeklyShuffle = (items, seed) => {
  const rand = seededRandom(weekIndex() + seed);
  return items.map((item) => [rand(), item]).sort((a, b) => a[0] - b[0]).map(([, item]) => item);
};

class HomeView extends BaseView {
  #recommended;
  #popularArtists;
  #recs;
  #nostalgia;
  #playlists;
  #moodPlaylists;
  #activityPlaylists;
  #energy;
  #albumsGalau;
  #albumsHits;
  #albumsSantai;
  #albumsCinta;
  #newSongs;
  #discoverArtists;
  #newVideos;
  #videos;
  #letters;
  #tripSongs;
  #weekendSongs;
  #moveSongs;
  #feelArtists;
  #feelVideos;
  #page = 1;

  constructor(library, recent) {
    super(library);
    this.recent = recent;
    /* Diacak sekali saat web dimuat: tetap sama selama berpindah halaman, berganti saat refresh. */
    /* Populer = artis dengan lagu + video terbanyak di katalog (data belum punya angka popularitas); urutan sama dengan nama bila seri. */
    this.#popularArtists = [...library.allArtists]
      .sort((a, b) => artistContentCount(library, b) - artistContentCount(library, a) || compareText(a.name, b.name))
      .slice(0, HOME_POPULAR_ARTIST_COUNT);
    this.#recommended = weeklyAlbums(library.songs.filter((song) => song.isPlayable), HOME_RECOMMENDED_COUNT);
    /* Album Nostalgia: lagu dari playlist Nostalgia 90-an & Era 2000-an, tanpa mengulang Album Minggu Ini; berganti tiap minggu. */
    const nostalgiaPool = NOSTALGIA_PLAYLIST_IDS
      .flatMap((id) => resolvePlaylist(library, EXPLORE_PLAYLISTS.find((pl) => pl.id === id) ?? {}).songs)
      .filter((song, i, all) => song.isPlayable && !this.#recommended.includes(song) && !this.#recommended.some((r) => r.albumId === song.albumId) && all.indexOf(song) === i);
    this.#nostalgia = weeklyAlbums(nostalgiaPool, HOME_NOSTALGIA_COUNT);
    /* Playlist Pilihan: dari semua kategori Jelajah, berganti tiap minggu (benih sama dengan Album Minggu Ini). */
    const rand = seededRandom(weekIndex() + 1);
    this.#playlists = EXPLORE_ITEMS.flatMap((item) => playlistsOf(library, item.view))
      .map((pl) => [rand(), pl]).sort((a, b) => a[0] - b[0]).map(([, pl]) => pl)
      .slice(0, HOME_PLAYLIST_COUNT);
    /* Dua section playlist tambahan di bawah Playlist Pilihan: dari kategori Suasana Hati dan Aktivitas,
       tanpa mengulang playlist yang sudah tampil di Playlist Pilihan; urutan berganti tiap minggu. */
    const picked = new Set(this.#playlists.map((pl) => pl.id));
    const weeklyPick = (cat, seed) => {
      const r = seededRandom(weekIndex() + seed);
      return playlistsOf(library, cat).filter((pl) => !picked.has(pl.id))
        .map((pl) => [r(), pl]).sort((a, b) => a[0] - b[0]).map(([, pl]) => pl);
    };
    this.#moodPlaylists = weeklyPick('explore-mood', 2);
    this.#activityPlaylists = weeklyPick('explore-aktivitas', 3);
    /* Rekomendasi Musik: diacak sekali saat web dimuat (berganti saat refresh), tidak mengulang Album Minggu Ini. */
    this.#recs = shuffle(library.songs.filter((song) => song.isPlayable && !this.#recommended.includes(song)))
      .slice(0, HOME_REC_TOTAL);
    /* Penyemangat Harimu: 6 lagu dari playlist Semangat & Energik, tanpa mengulang Rekomendasi Musik; berganti tiap minggu. */
    const energyDef = EXPLORE_PLAYLISTS.find((pl) => pl.id === 14);
    const energyPool = energyDef ? resolvePlaylist(library, energyDef).songs.filter((song) => song.isPlayable && !this.#recs.includes(song)) : [];
    this.#energy = weeklyAlbums(energyPool, HOME_ENERGY_COUNT);
    /* Dua section album tambahan: dari playlist Galau & Patah Hati dan Hits 2010-an, tanpa mengulang album yang sudah tampil
       di section album lain di Beranda; berganti tiap minggu. */
    const usedAlbums = new Set([...this.#recommended, ...this.#nostalgia].map((song) => song.albumId));
    const albumsFrom = (playlistId) => {
      const def = EXPLORE_PLAYLISTS.find((pl) => pl.id === playlistId);
      const pool = def ? resolvePlaylist(library, def).songs.filter((song) => song.isPlayable && song.album && !usedAlbums.has(song.albumId)) : [];
      const picked = weeklyAlbums(pool, HOME_NOSTALGIA_COUNT);
      picked.forEach((song) => usedAlbums.add(song.albumId));
      return library.albumsOf(picked);
    };
    this.#albumsGalau = albumsFrom(11);
    this.#albumsHits = albumsFrom(5);
    this.#albumsSantai = albumsFrom(15);
    this.#albumsCinta = albumsFrom(12);
    /* Baru di Katalog: lagu yang bisa diputar dengan id terbesar (data terakhir ditambahkan). */
    this.#newSongs = library.songs.filter((song) => song.isPlayable).sort((a, b) => b.id - a.id).slice(0, HOME_NEW_COUNT);
    /* Artis yang Layak Dikenal: artis di luar Artis Populer, dipilih acak berbenih mingguan. */
    const popular = new Set(this.#popularArtists);
    const rest = library.allArtists.filter((a) => !popular.has(a) && artistContentCount(library, a) > 0);
    const rr = seededRandom(weekIndex() + 7);
    this.#discoverArtists = rest.map((a) => [rr(), a]).sort((a, b) => a[0] - b[0]).map(([, a]) => a).slice(0, HOME_DISCOVER_ARTIST_COUNT);
    /* Video Musik: pilihan mingguan dari katalog video yang sudah ada (satu video per artis). */
    this.#videos = weeklyAlbums(videosOf(library), HOME_VIDEO_COUNT);
    /* Video Terbaru: video dengan id terbesar, satu per artis, di luar Video Musik pilihan minggu ini. */
    const shown = new Set(this.#videos.map((v) => v.id));
    const seenArtist = new Set();
    this.#newVideos = [...videosOf(library)].sort((a, b) => b.id - a.id)
      .filter((v) => !shown.has(v.id) && !seenArtist.has(v.artistId) && seenArtist.add(v.artistId))
      .slice(0, HOME_NEW_VIDEO_COUNT);
    /* Section tambahan (tampilan saja, dari playlist Jelajah yang sudah ada; berganti tiap minggu): Surat Cinta, Teman Perjalanan,
       Malam Minggu, dan Tempo untuk Bergerak. Lagu tidak mengulang Rekomendasi Musik / Penyemangat Harimu maupun satu sama lain. */
    const skip = new Set([...this.#recs, ...this.#energy].map((song) => song.id));
    const weeklySongs = (ids, count) => {
      const picked = weeklyAlbums(playlistSongsOf(library, ids).filter((song) => !skip.has(song.id)), count);
      picked.forEach((song) => skip.add(song.id));
      return picked;
    };
    this.#letters = weeklySongs([12, 13], HOME_LETTER_COUNT);
    this.#tripSongs = weeklySongs([23], HOME_EXTRA_SONG_COUNT);
    this.#weekendSongs = weeklySongs([24], HOME_EXTRA_SONG_COUNT);
    this.#moveSongs = weeklySongs([22], HOME_EXTRA_SONG_COUNT);
    /* Suara Penghibur Hati: artis dari playlist Galau & Rindu, di luar Artis Populer dan Artis yang Layak Dikenal. */
    const known = new Set([...this.#popularArtists, ...this.#discoverArtists]);
    this.#feelArtists = artistsOfSongs(playlistSongsOf(library, [11, 13])).filter((a) => !known.has(a)).slice(0, HOME_FEEL_ARTIST_COUNT);
    /* Klip Penuh Rasa: klip dari playlist Jatuh Cinta, Galau, dan Rindu (satu per artis), di luar Video Musik dan Video Terbaru. */
    const shownClips = new Set([...this.#videos, ...this.#newVideos].map((v) => v.id));
    this.#feelVideos = weeklyAlbums(playlistVideosOf(library, [12, 11, 13]).filter((v) => !shownClips.has(v.id)), HOME_FEEL_VIDEO_COUNT);
  }

  render() {
    const genres = visibleGenres(this.library);
    const recommended = this.#recommended.length
      ? AlbumCarousel(this.library.albumsOf(this.#recommended))
      : EmptyState('fa-music', MESSAGES.NO_SONGS);
    const pages = Math.max(1, Math.ceil(this.#recs.length / HOME_REC_PER_PAGE));
    this.#page = Math.min(this.#page, pages);
    const start = (this.#page - 1) * HOME_REC_PER_PAGE;
    const recHtml = this.#recs.length
      ? TrackList(this.#recs.slice(start, start + HOME_REC_PER_PAGE)) + this.#pager(pages)
      : EmptyState('fa-music', MESSAGES.NO_SONGS);
    const recent = this.recent.songs.slice(0, HOME_RECENT_COUNT);
    const genreCards = genres.map((g, i) => GenreCard(g, i, 'egenre').replace('class="genre-card"', 'class="genre-card genre-slide"')).join('')
      + '<button type="button" class="genre-card genre-slide" data-go="explore-genre" aria-label="Lihat semua genre" style="--g:#7a6770">'
      + '<i class="fa-solid fa-arrow-right" aria-hidden="true"></i><span>Semua Genre</span></button>';
    /* Urutan: header, sorotan, terakhir diputar, playlist, artis, album, rekomendasi musik, video, genre,
       lalu section tambahan (album nostalgia, perjalanan, suasana hati, aktivitas, penghibur hati, penyemangat, surat cinta, klip, malam minggu, gerak, album lain) dan link Lainnya. */
    const today = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
    const head = `<header class="home-head"><p class="home-eyebrow">${e(today)}</p><h1>Untukmu dari Sasuke</h1>` +
      '<p class="home-lede">Musik pilihan, artis favorit, dan cerita baru untuk menemani harimu.</p>' +
      Whisper('home', Math.floor(Date.now() / 864e5)) + '</header>';
    const featured = this.library.albumsOf(this.#recommended).slice(0, HOME_FEATURED_COUNT);
    /* Pengiring waktu: playlist sesuai jam saat ini (pagi, siang, sore, malam, larut malam). */
    const hour = new Date().getHours();
    const slot = hour >= 4 && hour < 11 ? ['pagi', 'Pagi'] : hour < 15 && hour >= 11 ? ['siang', 'Siang'] : hour >= 15 && hour < 18 ? ['sore', 'Sore'] : hour >= 18 && hour < 22 ? ['malam', 'Malam'] : ['larut', 'Larut Malam'];
    const timeDef = EXPLORE_PLAYLISTS.find((pl) => pl.id === HOME_TIME_PLAYLISTS[slot[0]]);
    const timePl = timeDef ? resolvePlaylist(this.library, timeDef) : null;
    const timeSongs = timePl ? weeklyAlbums(timePl.songs.filter((song) => song.isPlayable && !this.#recs.includes(song)), HOME_TIME_COUNT) : [];
    const html = '<div class="home">' + head
      + (featured.length ? HomeSection('Sorotan Minggu Ini', 'Album pilihan yang berganti setiap pekan', Carousel(featured.map(FeaturedItem).join('')), { cls: 'hs-feat' }) : '')
      + (recent.length ? HomeSection('Terakhir Diputar', 'Lanjutkan dari lagu yang baru kamu dengar', Carousel(recent.map(HomeSongCard).join('')), { cls: 'hs-recent' }) : '')
      + (timeSongs.length ? HomeSection(`Menemani ${slot[1]} Ini`, timePl.info, `<div class="songs">${TrackList(timeSongs)}</div>`, { go: `playlist:${timePl.id}`, goLabel: 'Buka Playlist' }) : '')
      + (this.#playlists.length ? HomeSection('Playlist Pilihan', 'Koleksi yang diracik untuk berbagai suasana', Carousel(this.#playlists.map(PlaylistCoverItem).join('')), { cls: 'hs-pl' }) : '')
      + (this.#newSongs.length ? HomeSection('Baru di Katalog', 'Lagu yang baru saja ditambahkan', Carousel(this.#newSongs.map(HomeSongCard).join(''))) : '')
      + HomeSection('Artis Populer', 'Artis dengan lagu dan video terbanyak di katalog', ArtistCarousel(this.#popularArtists), { cls: 'hs-artist' })
      + HomeSection('Album Minggu Ini', 'Rilisan pilihan yang diperbarui tiap minggu', recommended)
      + HomeSection('Rekomendasi Musik', 'Lagu untuk kamu dengarkan sekarang', `<div class="songs">${recHtml}</div>`)
      + (this.#videos.length ? HomeSection('Video Musik', 'Tonton klip dari lagu favoritmu', Carousel(this.#videos.map(HomeVideoItem).join('')), { cls: 'hs-vid', go: 'videos' }) : '')
      + (genres.length ? HomeSection('Genre untuk Setiap Cerita', 'Temukan musik berdasarkan nuansa', Carousel(genreCards), { cls: 'hs-genre', go: 'explore-genre' }) : '')
      + (this.#discoverArtists.length ? HomeSection('Artis yang Layak Dikenal', 'Kenalan dengan suara-suara baru', ArtistCarousel(this.#discoverArtists), { cls: 'hs-artist', go: 'artists' }) : '')
      + (this.#nostalgia.length ? HomeSection('Album Nostalgia', 'Kenangan dari era 90-an dan 2000-an', AlbumCarousel(this.library.albumsOf(this.#nostalgia))) : '')
      + (this.#tripSongs.length ? HomeSection('Teman Perjalanan', 'Lagu untuk menikmati jalan, dekat maupun jauh', Carousel(this.#tripSongs.map(HomeSongCard).join('')), { cls: 'hs-recent', go: 'playlist:23', goLabel: 'Buka Playlist' }) : '')
      + (this.#moodPlaylists.length ? HomeSection('Sesuai Suasana Hatimu', 'Playlist untuk setiap perasaan', Carousel(this.#moodPlaylists.map(PlaylistCoverItem).join('')), { cls: 'hs-pl' }) : '')
      + (this.#activityPlaylists.length ? HomeSection('Teman Aktivitasmu', 'Pengiring kerja, olahraga, dan perjalanan', Carousel(this.#activityPlaylists.map(PlaylistCoverItem).join('')), { cls: 'hs-pl' }) : '')
      + (this.#feelArtists.length ? HomeSection('Suara Penghibur Hati', 'Artis yang pas menemani rindu dan galau', ArtistCarousel(this.#feelArtists), { cls: 'hs-artist', go: 'artists' }) : '')
      + (this.#energy.length ? HomeSection('Penyemangat Harimu', 'Lagu berenergi untuk memulai hari', `<div class="songs">${TrackList(this.#energy)}</div>`) : '')
      + (this.#newVideos.length ? HomeSection('Video Terbaru', 'Klip yang baru masuk koleksi', Carousel(this.#newVideos.map(HomeVideoItem).join('')), { cls: 'hs-vid', go: 'videos' }) : '')
      + (this.#letters.length ? HomeSection('Surat Cinta dari Sasuke', 'Lagu manis dan rindu yang kupilih untukmu', `<div class="songs">${TrackList(this.#letters)}</div>`, { go: 'playlist:12', goLabel: 'Buka Playlist' }) : '')
      + (this.#albumsSantai.length ? HomeSection('Album Santai', 'Pelan dan hangat untuk melepas lelah', AlbumCarousel(this.#albumsSantai)) : '')
      + (this.#albumsCinta.length ? HomeSection('Album Jatuh Cinta', 'Manis dan berbunga-bunga', AlbumCarousel(this.#albumsCinta)) : '')
      + (this.#albumsGalau.length ? HomeSection('Album Galau', 'Untuk hati yang sedang butuh teman', AlbumCarousel(this.#albumsGalau)) : '')
      + (this.#feelVideos.length ? HomeSection('Klip Penuh Rasa', 'Tonton klip untuk hati yang sedang jatuh dan rindu', Carousel(this.#feelVideos.map(HomeVideoItem).join('')), { cls: 'hs-vid', go: 'videos' }) : '')
      + (this.#albumsHits.length ? HomeSection('Album Hits 2010-an', 'Lagu-lagu yang menandai satu dekade', AlbumCarousel(this.#albumsHits)) : '')
      + (this.#weekendSongs.length ? HomeSection('Malam Minggu Bersama', 'Nongkrong, bernyanyi, dan berbagi cerita', Carousel(this.#weekendSongs.map(HomeSongCard).join('')), { cls: 'hs-recent', go: 'playlist:24', goLabel: 'Buka Playlist' }) : '')
      + (this.#moveSongs.length ? HomeSection('Tempo untuk Bergerak', 'Ketukan cepat untuk menemani latihanmu', Carousel(this.#moveSongs.map(HomeSongCard).join('')), { cls: 'hs-recent', go: 'playlist:22', goLabel: 'Buka Playlist' }) : '')
      + (EXPLORE_ITEMS.some((item) => item.home && ExploreView.content[item.view]) ? HomeSection(HOME_MORE_TITLE, '', ExploreLinks({ home: true, title: HOME_MORE_TITLE })) : '')
      + '</div>';
    /* Antrean putar = semua lagu yang bisa diputar dari Beranda (tanpa duplikat), bukan hanya 6 yang tampil. */
    const queue = [...recent, ...this.#recs, ...this.#energy, ...timeSongs, ...this.#letters, ...this.#tripSongs, ...this.#weekendSongs, ...this.#moveSongs].filter((song, i, all) => all.findIndex((x) => x.id === song.id) === i);
    return BaseView.page(html, queue);
  }

  setPage(page) {
    this.#page = Math.max(1, Math.floor(page) || 1);
  }

  #pager(pages) {
    if (pages < 2) return '';
    const page = this.#page;
    const nav = (label, target, aria, disabled) =>
      `<button type="button" data-rec-page="${target}" aria-label="${aria}" ${disabled ? 'disabled' : ''}>${label}</button>`;
    const numbers = Array.from({ length: pages }, (_, i) =>
      `<button type="button" data-rec-page="${i + 1}" class="${i + 1 === page ? 'active' : ''}" ${i + 1 === page ? 'aria-current="page"' : ''} aria-label="Halaman ${i + 1}">${i + 1}</button>`).join('');
    return '<div class="pager" role="navigation" aria-label="Halaman rekomendasi">' +
      nav('<i class="fa-solid fa-chevron-left"></i>', page - 1, 'Halaman sebelumnya', page === 1) +
      numbers +
      nav('<i class="fa-solid fa-chevron-right"></i>', page + 1, 'Halaman berikutnya', page === pages) + '</div>';
  }
}

/**
 * Halaman tujuan link "Lainnya untuk Dijelajahi". Satu kelas melayani semua kategori (EXPLORE_ITEMS):
 * kerangka halaman = tombol kembali + banner + area konten. Isi area konten (`#body`) belum tersedia;
 * untuk mengembangkan satu kategori, tambahkan konten di `content[view]` tanpa mengubah kerangkanya.
 */
/** Artis dari sekumpulan lagu, diurutkan dari yang lagunya terbanyak (sama dengan detail Playlist). */
const artistsOfSongs = (songs) => {
  const counts = new Map();
  songs.forEach((song) => song.artist && counts.set(song.artist, (counts.get(song.artist) ?? 0) + 1));
  return [...counts.keys()].sort((a, b) => counts.get(b) - counts.get(a) || compareText(a.name, b.name));
};

class ExploreView extends BaseView {
  /** Konten per kategori: fungsi (library) => HTML. Belum ada = tampil keadaan "segera hadir". */
  static content = {
    /* Dekade: linimasa. Tiap dekade = album + lagu teratas dari periode itu (playlist hanya jalan pintas di ujung halaman). */
    'explore-dekade': (library) => ExploreView.themed(library, 'explore-dekade', 'Playlist Dekade', (pl) => {
      const albums = library.albumsOf(pl.songs).slice(0, 12);
      const top = pl.songs.slice(0, 4);
      return { songs: top, html: (albums.length ? Carousel(albums.map(AlbumItem).join('')) : '')
        + (top.length ? `<div class="songs ex-songs">${TrackList(top)}</div>` : '') };
    }),
    /* Suasana Hati: daftar lagu per perasaan, langsung bisa diputar. */
    'explore-mood': (library) => ExploreView.themed(library, 'explore-mood', 'Playlist Suasana Hati', (pl) => {
      const top = pl.songs.slice(0, 6);
      return { songs: top, html: `<div class="songs">${TrackList(top)}</div>` };
    }),
    /* Aktivitas: kartu lagu bergambar per kegiatan; klik kartu langsung memutar. */
    'explore-aktivitas': (library) => ExploreView.themed(library, 'explore-aktivitas', 'Playlist Aktivitas', (pl) => {
      const top = pl.songs.slice(0, 12);
      return { songs: top, html: Carousel(top.map(HomeSongCard).join('')), cls: 'hs-recent' };
    }),
    /* Ragam Dunia: artis dari tiap penjuru + klip video mereka. */
    'explore-dunia': (library) => ExploreView.themed(library, 'explore-dunia', 'Playlist Ragam Dunia', (pl) => {
      const artists = artistsOfSongs(pl.songs);
      const videos = relatedVideos(library, { songs: pl.songs, artists, limit: 8 });
      return { songs: [], html: (artists.length ? ArtistCarousel(artists.slice(0, 12)) : '')
        + (videos.length ? `<p class="home-eyebrow ex-label">Video pilihan</p>${Carousel(videos.map(HomeVideoItem).join(''))}` : '') };
    }),
    /* Genre: grid card yang sama dengan halaman Pencarian; klik membuka halaman lagu genre tersebut. */
    'explore-genre': (library) => {
      const genres = visibleGenres(library);
      return genres.length
        ? Section('Semua Genre', `<div class="genre-grid" role="list">${genres.map((g, i) => GenreCard(g, i, 'egenre')).join('')}</div>`, `${genres.length} genre`)
        : EmptyState('fa-guitar', 'Belum ada genre.');
    },
  };

  /**
   * Halaman kategori bertema: tiap playlist kategori menjadi satu section (judul, keterangan, tautan "Lihat Semua" ke playlist-nya)
   * yang isinya dibangun oleh `build(pl)` => { html, songs, cls }. Di akhir ada section jalan pintas ke seluruh playlist kategori.
   * Hasil: { html, songs } agar lagu yang tampil bisa diputar sebagai antrean.
   */
  static themed(library, cat, shortcutTitle, build) {
    const lists = playlistsOf(library, cat);
    if (!lists.length) return EmptyState('fa-music', 'Belum ada konten.');
    const songs = [];
    const sections = lists.filter((pl) => pl.songs.length).map((pl) => {
      const part = build(pl);
      songs.push(...part.songs);
      return HomeSection(pl.name, `${pl.info} \u00b7 ${playlistCount(pl)}`, part.html, { cls: part.cls ?? '', go: `playlist:${pl.id}` });
    }).join('');
    const shortcut = HomeSection(shortcutTitle, `${lists.length} playlist lengkap`, Carousel(lists.map(PlaylistCoverItem).join('')), { cls: 'hs-pl' });
    return { html: sections + shortcut, songs: songs.filter((song, i, all) => all.findIndex((x) => x.id === song.id) === i) };
  }

  /** Halaman kurasi: playlist pilihan (berdasarkan id, urutan sesuai daftar) dalam grid card yang sama. */
  static pick(library, ids) {
    const items = ids.map((id) => EXPLORE_PLAYLISTS.find((pl) => pl.id === id)).filter(Boolean)
      .map((def) => resolvePlaylist(library, def)).filter((pl) => playlistSize(pl) >= PLAYLIST_MIN_SONGS);
    return items.length
      ? Section('Playlist', `<div class="genre-grid" role="list">${items.map(PlaylistCard).join('')}</div>`, `${items.length} playlist`)
      : EmptyState('fa-music', 'Belum ada playlist.');
  }

  /** Section "Playlist" sebuah kategori: grid card persegi yang sama dengan grid halaman Genre. */
  static playlists(library, cat) {
    const items = playlistsOf(library, cat);
    return items.length
      ? Section('Playlist', `<div class="genre-grid" role="list">${items.map(PlaylistCard).join('')}</div>`, `${items.length} playlist`)
      : EmptyState('fa-music', 'Belum ada playlist.');
  }

  render(route) {
    const item = EXPLORE_ITEMS.find((it) => it.view === route.view);
    if (!item) return BaseView.page('');
    const banner = PageHead(item.home ? 'Lainnya' : 'Jelajah', item.label, item.lede ?? item.desc);
    const content = ExploreView.content[item.view]?.(this.library)
      ?? EmptyState('fa-seedling', 'Segera hadir. Konten untuk halaman ini sedang disiapkan.');
    /* Konten berupa string HTML, atau { html, songs } bila halaman punya lagu yang bisa diputar. */
    const body = typeof content === 'string' ? content : content.html;
    const songs = typeof content === 'string' ? [] : content.songs;
    /* Semua halaman kategori: tanpa tombol kembali; section link dipakai ulang di bawah, item halaman ini menjadi Beranda (Lainnya) atau Jelajah (Lainnya untuk Dijelajahi). */
    const more = item.home
      ? HomeSection(HOME_MORE_TITLE, '', ExploreLinks({ home: true, title: HOME_MORE_TITLE, active: item.view }))
      : HomeSection(EXPLORE_TITLE, 'Pilih kategori untuk menemukan musik baru', ExploreLinks({ active: item.view }));
    return BaseView.page(banner + body + more, songs);
  }
}

EXPLORE_ITEMS.filter((item) => item.pick).forEach((item) => {
  ExploreView.content[item.view] = (library) => ExploreView.pick(library, item.pick);
});

/** Halaman Jelajah: banner (.love) lalu section Artis, Album, dan Playlist (carousel 10 pertama + lingkaran Selengkapnya di ujung). */
class JelajahView extends BaseView {
  /**
   * Section tambahan Jelajah (tampilan saja, dari playlist kategori yang sudah ada): penelusuran lintas dekade dan lintas negara
   * (playlist, lagu klasik, album, artis dunia, klip). Beda dengan Beranda yang berisi pilihan pribadi (suasana hati, aktivitas, surat cinta).
   * Pilihan tetap sepanjang minggu dan berganti tiap minggu. Hasil: { html, songs } agar kartu lagu ikut menjadi antrean putar.
   */
  #extras() {
    const library = this.library;
    const n = EXPLORE_EXTRA_COUNT;
    const songs = [];
    const songCards = (list) => { songs.push(...list); return Carousel(list.map(HomeSongCard).join('')); };
    const artistsFrom = (ids, seed) => weeklyShuffle(artistsOfSongs(playlistSongsOf(library, ids)), seed).slice(0, n);
    const albumsFrom = (ids) => library.albumsOf(weeklyShuffle(playlistSongsOf(library, ids), 5)).slice(0, n);
    const clipsFrom = (ids) => weeklyAlbums(playlistVideosOf(library, ids), n);

    const dekade = playlistsOf(library, 'explore-dekade');
    const dunia = playlistsOf(library, 'explore-dunia');
    const classic = weeklyAlbums(playlistSongsOf(library, [1, 2, 3]), n);
    const classicAlbums = albumsFrom([1, 2, 3]);
    const popArtists = artistsFrom([31], 11);
    const rockArtists = artistsFrom([33], 12);
    const clips = clipsFrom([31, 32, 34, 35]);
    const urbanArtists = artistsFrom([35], 13);
    const beatArtists = artistsFrom([32, 34], 14);
    const newAlbums = albumsFrom([6]);
    const newSongs = weeklyAlbums(playlistSongsOf(library, [6]), n);

    const html = ''
      + (dekade.length ? HomeSection('Perjalanan Dekade', 'Dari 60-an sampai 2020-an, satu playlist untuk tiap era', Carousel(dekade.map(PlaylistCoverItem).join('')), { cls: 'hs-pl', go: 'explore-dekade' }) : '')
      + (classic.length ? HomeSection('Era Emas 60\u201390-an', 'Lagu klasik yang masih terasa hangat', songCards(classic), { cls: 'hs-recent', go: 'explore-dekade' }) : '')
      + (classicAlbums.length ? HomeSection('Album Klasik', 'Rilisan lawas dari era vinil sampai kaset', AlbumCarousel(classicAlbums), { go: 'albums' }) : '')
      + (popArtists.length ? HomeSection('Pop Dunia', 'Penyanyi pop dari berbagai penjuru', ArtistCarousel(popArtists), { cls: 'hs-artist', go: 'explore-dunia' }) : '')
      + (rockArtists.length ? HomeSection('Rock Lintas Negara', 'Dentuman gitar dari banyak kota', ArtistCarousel(rockArtists), { cls: 'hs-artist', go: 'explore-dunia' }) : '')
      + (clips.length ? HomeSection('Klip Lintas Negara', 'Tonton klip dari K-Pop sampai hip-hop', Carousel(clips.map(HomeVideoItem).join('')), { cls: 'hs-vid', go: 'videos' }) : '')
      + (dunia.length ? HomeSection('Koleksi Ragam Dunia', 'Playlist dari berbagai penjuru dunia', Carousel(dunia.map(PlaylistCoverItem).join('')), { cls: 'hs-pl', go: 'explore-dunia' }) : '')
      + (urbanArtists.length ? HomeSection('Hip-Hop & R&B', 'Ritme urban dan vokal soul', ArtistCarousel(urbanArtists), { cls: 'hs-artist', go: 'explore-dunia' }) : '')
      + (beatArtists.length ? HomeSection('K-Pop & Elektronik', 'Panggung megah dan beat yang menghentak', ArtistCarousel(beatArtists), { cls: 'hs-artist', go: 'explore-dunia' }) : '')
      + (newAlbums.length ? HomeSection('Album Terkini 2020-an', 'Rilisan paling baru dari dekade ini', AlbumCarousel(newAlbums), { go: 'albums' }) : '')
      + (newSongs.length ? HomeSection('Lagu Terkini 2020-an', 'Yang sedang ramai didengar sekarang', songCards(newSongs), { cls: 'hs-recent', go: 'explore-dekade' }) : '');
    return { html, songs: songs.filter((song, i, all) => all.findIndex((x) => x.id === song.id) === i) };
  }

  render() {
    const banner = PageHead('Temukan', 'Jelajah', 'Telusuri artis, album, playlist, dan koleksi pilihan dari berbagai suasana.', 'explore');
    const n = EXPLORE_PREVIEW_COUNT;
    const artists = this.library.allArtists;
    const albums = this.library.albums;
    const playlists = exploreAllPlaylists(this.library);
    const extra = this.#extras();
    return BaseView.page(banner
      + (artists.length ? HomeSection('Artis', `${artists.length} artis untuk dijelajahi`, Carousel(artists.slice(0, n).map(ArtistItem).join('') + MoreAllItem('artists', 'Selengkapnya', 'Semua artis')), { cls: 'hs-artist', go: 'artists' }) : '')
      + (albums.length ? HomeSection('Album', `${albums.length} album dari seluruh katalog`, Carousel(albums.slice(0, n).map(AlbumItem).join('') + MoreAllItem('albums', 'Selengkapnya', 'Semua album')), { go: 'albums' }) : '')
      + (playlists.length ? HomeSection('Playlist', `${playlists.length} playlist untuk setiap suasana`, Carousel(playlists.slice(0, n).map(PlaylistCoverItem).join('') + MoreAllItem('playlists', 'Selengkapnya', 'Semua playlist')), { cls: 'hs-pl', go: 'playlists' }) : '')
      + extra.html
      + HomeSection(EXPLORE_TITLE, 'Pilih kategori untuk menemukan musik baru', ExploreLinks()), extra.songs);
  }
}

/** Tiga kategori utama Jelajah (halaman daftar lengkap). Section "Lainnya untuk Dijelajahi" di tiap halamannya memuat Jelajah, dua kategori lainnya, lalu kategori Jelajah (Dekade dst.). */
const CATEGORY_ITEMS = Object.freeze([
  { view: 'artists', label: 'Artis', icon: 'fa-microphone-lines', desc: 'Semua artis untuk dijelajahi' },
  { view: 'albums', label: 'Album', icon: 'fa-compact-disc', desc: 'Semua album dari seluruh katalog' },
  { view: 'playlists', label: 'Playlist', icon: 'fa-music', desc: 'Semua playlist untuk setiap suasana' },
]);
/** Kategori yang disembunyikan per halaman: hanya berlaku di halaman itu (Artis tanpa Playlist, Album tanpa Artis, Playlist tanpa Album). */
const CATEGORY_HIDDEN = Object.freeze({ artists: 'playlists', albums: 'artists', playlists: 'albums' });
const CategoryMore = (active) => HomeSection(EXPLORE_TITLE, 'Pilih kategori untuk menemukan musik baru',
  ExploreLinks({ items: [EXPLORE_LINK, ...CATEGORY_ITEMS.filter((item) => item.view !== active && item.view !== CATEGORY_HIDDEN[active]),
    ...EXPLORE_ITEMS.filter(({ view, home }) => !home && ExploreView.content[view])] }));

/** Semua playlist dari seluruh kategori Jelajah (urutan sesuai definisi kategori). */
const exploreAllPlaylists = (library) => EXPLORE_ITEMS.flatMap((item) => playlistsOf(library, item.view));

/** Halaman semua album: seluruh album dalam card yang tersusun vertikal ke bawah. */
class AlbumsView extends BaseView {
  render() {
    const songs = this.library.albums;
    const banner = '';
    const body = songs.length ? PageHead('Jelajah', 'Semua Album', `${songs.length} album`, 'allAlbums') + AlbumGrid(songs) : EmptyState('fa-compact-disc', 'Belum ada album.');
    return BaseView.page(banner + body + CategoryMore('albums'));
  }
}

/** Halaman semua playlist: seluruh playlist kategori Jelajah dalam card yang tersusun vertikal ke bawah. */
class PlaylistsView extends BaseView {
  render() {
    const items = exploreAllPlaylists(this.library);
    const banner = '';
    const body = items.length
      ? PageHead('Jelajah', 'Semua Playlist', `${items.length} playlist`, 'allPlaylists') + `<div class="album-grid" role="list">${items.map(PlaylistCard).join('')}</div>`
      : EmptyState('fa-music', 'Belum ada playlist.');
    return BaseView.page(banner + body + CategoryMore('playlists'));
  }
}

/** Halaman semua artis: seluruh data artis dalam card yang tersusun vertikal ke bawah. */
class ArtistsView extends BaseView {
  render() {
    const artists = this.library.allArtists;
    const banner = '';
    const body = artists.length
      ? PageHead('Jelajah', 'Semua Artis', `${artists.length} artis`, 'allArtists') + ArtistGrid(artists)
      : EmptyState('fa-microphone-lines', 'Belum ada artis.');
    return BaseView.page(banner + body + CategoryMore('artists'));
  }
}
