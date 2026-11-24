'use strict';

/* ################ UI TEMPLATES ################ */

/* ---- components/ui/templates.js ---- */
/**
 * Komponen presentasional (stateless): menerima props, mengembalikan string HTML.
 * Dipakai ulang oleh banyak view; tidak tahu apa pun tentang router atau player.
 */

const IMG_ATTRS = 'referrerpolicy="no-referrer"';

/** Gambar header halaman detail (hero, terlihat di layar pertama): dimuat segera dengan prioritas tinggi. */
const Image = (src, alt = '') => `<img ${IMG_ATTRS} decoding="async" fetchpriority="high" src="${e(src)}" alt="${e(alt)}">`;

/** Gambar mini di baris daftar (lagu/album/artis): ukuran dikunci CSS (.t img), dimuat saat mendekati layar. */
const RowImage = (src) => `<img ${IMG_ATTRS} width="54" height="54" loading="lazy" decoding="async" src="${e(src)}" alt="">`;

const EmptyState = (icon, text) =>
  `<div class="empty"><i class="fa-solid ${icon}"></i><strong>${e(text)}</strong></div>`;

const SectionTitle = (text) => `<h2 class="sub">${e(text)}</h2>`;

/** Section standar semua halaman; `sub` (opsional) = keterangan singkat di bawah judul (sama dengan section Beranda). */
const Section = (title, contentHtml, sub = '') => sub
  ? HomeSection(title, sub, contentHtml)
  : `<section class="section"><h2>${e(title)}</h2>${contentHtml}</section>`;

const BackButton = (view, label) =>
  `<button class="back" data-go="${e(view)}"><i class="fa-solid fa-arrow-left"></i> ${e(label)}</button>`;

/** Daftar link "Lainnya untuk Dijelajahi": baris minimalis dengan ikon, label, dan panah. */
/** Urutan khusus section Lainnya: Beranda (bila tampil) paling atas, lalu Genre; item lain mengikuti urutan aslinya (sort stabil). */
const linkRank = ({ view }) => (view === HOME_LINK.view || view === EXPLORE_LINK.view ? 0 : view === 'explore-genre' ? 1 : 2);
const ExploreLinks = ({ home = false, title = EXPLORE_TITLE, active = '', items = null } = {}) =>
  '<nav class="explore" aria-label="' + e(title) + '">' +
  /* Halaman yang belum punya konten (belum terdaftar di ExploreView.content) tidak ditampilkan; muncul sendiri begitu kontennya ditambahkan. */
  /* `active` = halaman Lainnya yang sedang dibuka: itemnya diganti Beranda (di posisi yang sama) agar tidak membuka halaman yang sama. */
  (items ?? EXPLORE_ITEMS.filter(({ view, home: isHome }) => ExploreView.content[view] && Boolean(isHome) === home).map((item) => item.view === active ? (home ? HOME_LINK : EXPLORE_LINK) : item).sort((a, b) => linkRank(a) - linkRank(b))).map(({ view, label, icon, desc }) =>
    `<a class="explore-link" href="#/${e(view)}" data-go="${e(view)}" data-explore aria-label="Buka ${e(label)}">` +
    `<span class="ei"><i class="fa-solid ${icon}" aria-hidden="true"></i></span>` +
    `<span class="et"><b>${e(label)}</b><small>${e(desc)}</small></span>` +
    '<i class="fa-solid fa-chevron-right ea" aria-hidden="true"></i></a>').join('') +
  '</nav>';

/** Item album di carousel: artwork, judul, dan artis; tanpa border/card. Seluruh area bisa diklik -> detail album (id album). */
const AlbumItem = (album) =>
  `<button type="button" class="album" role="listitem" data-go="album:${album.id}" aria-label="Buka album ${e(album.name)}"><div class="cover">` +
  `<img ${IMG_ATTRS} width="300" height="300" loading="lazy" decoding="async" src="${e(album.cover)}" alt="">` +
  `</div><div class="card-title">${e(album.name)}</div><div class="card-desc">${e(album.artist.name)}</div></button>`;

/** Baris album yang bisa digeser ke samping; tombol panah muncul di desktop saat kursor di atasnya. */
const Carousel = (itemsHtml) =>
  '<div class="carousel">' +
  '<button class="carousel-btn prev" data-scroll="-1" aria-label="Geser ke kiri"><i class="fa-solid fa-chevron-left"></i></button>' +
  `<div class="carousel-track" role="list">${itemsHtml}</div>` +
  '<button class="carousel-btn next" data-scroll="1" aria-label="Geser ke kanan"><i class="fa-solid fa-chevron-right"></i></button></div>';

const AlbumCarousel = (albums) => Carousel(albums.map((album) => AlbumItem(album)).join(''));

/** Item artist: sama dengan AlbumItem, tetapi gambar bulat. Seluruh area bisa diklik -> detail artist. */
const ArtistItem = (artist) =>
  `<button type="button" class="album round" role="listitem" data-go="artist:${artist.id}" aria-label="Buka artis ${e(artist.name)}"><div class="cover">` +
  `<img ${IMG_ATTRS} width="300" height="300" loading="lazy" decoding="async" src="${e(artist.img)}" alt=""></div>` +
  `<div class="card-title">${e(artist.name)}</div><div class="card-desc">Artis</div></button>`;

const ArtistCarousel = (artists) => Carousel(artists.map(ArtistItem).join(''));

/** Item penutup carousel: lingkaran berpanah, ukuran sama dengan ArtistItem. Klik -> halaman daftar lengkap. */
const MoreAllItem = (view, title, desc) =>
  `<button type="button" class="album round more-all" role="listitem" data-go="${e(view)}" aria-label="${e(title)}: ${e(desc)}"><div class="cover">` +
  '<i class="fa-solid fa-arrow-right" aria-hidden="true"></i></div>' +
  `<div class="card-title">${e(title)}</div><div class="card-desc">${e(desc)}</div></button>`;

/** Kumpulan card album yang tersusun ke bawah (grid), memakai AlbumItem yang sama dengan carousel. */
const AlbumGrid = (albums) => `<div class="album-grid" role="list">${albums.map((album) => AlbumItem(album)).join('')}</div>`;

/** Kumpulan card artis yang tersusun ke bawah (grid), memakai ArtistItem yang sama dengan carousel. */
const ArtistGrid = (artists) => `<div class="artist-grid" role="list">${artists.map(ArtistItem).join('')}</div>`;

/** Satu-satunya komponen item lagu: dipakai di Beranda, Lagu, Favorit, dan Pencarian. Favorit menambah tombol love di kanan. */
const SongRow = (song, favKey = null, { cls = '', attrs = '' } = {}) =>
  `<div class="row ${favKey !== null ? 'fav' : ''} ${song.isPlayable ? '' : 'nosrc'} ${cls}" role="listitem" ${attrs || `data-play="${song.id}"`}>` +
  `<span class="t">${RowImage(song.cover)}<span><em>${e(song.name)}</em>` +
  `<small>${e(song.artist.name)}</small></span></span>` +
  (favKey !== null
    ? `<button class="fav-btn on" data-fav="${e(String(favKey))}" aria-label="Hapus ${e(song.name)} dari Favorit" title="Hapus dari Favorit">` +
      `<i class="fa-solid fa-heart"></i></button>`
    : '') +
  `<span class="dur" data-song="${song.id}">${formatDuration(song.duration)}</span>` +
  `</div>`;

/** Daftar lagu seragam (tanpa nomor dan header; durasi di kanan). keyOf diisi hanya di Favorit. */
const TrackList = (songs, keyOf = null) =>
  '<div role="list">' + songs.map((song) => SongRow(song, keyOf ? keyOf(song) : null)).join('') + '</div>';


/** Baris hasil pencarian untuk album: bentuk sama dengan SongRow, klik membuka detail album. */
const AlbumRow = (album) =>
  `<div class="row" role="listitem" data-go="album:${album.id}">` +
  `<span class="t">${RowImage(album.cover)}<span><em>${e(album.name)}</em><small>Album · ${e(album.artist.name)}</small></span></span>` +
  `<span class="dur">${[album.songs.length ? `${album.songs.length} lagu` : '', album.videos.length ? `${album.videos.length} video` : ''].filter(Boolean).join(' · ')}</span></div>`;

/** Baris hasil pencarian untuk artist: gambar bulat, klik membuka detail artist. */
const ArtistRow = (artist) =>
  `<div class="row round" role="listitem" data-go="artist:${artist.id}">` +
  `<span class="t">${RowImage(artist.img)}<span><em>${e(artist.name)}</em><small>Artis · ${artist.songs.length ? `${artist.songs.length} lagu` : 'Video'}</small></span></span></div>`;

const EmptyResult = () => EmptyState('fa-magnifying-glass', MESSAGES.NO_RESULTS);
