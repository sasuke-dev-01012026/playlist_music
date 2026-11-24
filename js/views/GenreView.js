'use strict';

/* ---- views/GenreView.js ---- */
/** Data detail genre (dipakai dua tampilan): genre, artis, lagu, dan banner. */
const genreData = (library, id) => {
  const genre = visibleGenres(library).find((g) => g.id === id);
  if (!genre) return null;
  const artists = library.allArtists.filter((a) => (ARTIST_GENRES[a.id] ?? []).includes(id));
  const songs = artists.flatMap((a) => a.songs);
  const allVideos = relatedVideos(library, { artists });
  const albums = library.albumsOf([...songs, ...allVideos]);
  /* Header identik detail Playlist (.hero + cover persegi berwarna), isinya mengikuti genre. */
  const index = visibleGenres(library).findIndex((g) => g.id === id);
  const hero = '<section class="hero">' +
    `<div class="pl-cover" style="--g:${colorHex((index % 6) + 1) ?? '#d9709a'}"><i class="fa-solid ${genreIcon(genre.name)}" aria-hidden="true"></i></div>` +
    `<div><small>Genre</small><h1 title="${e(genre.name)}">${e(genre.name)}</h1>` +
    `<p>${e(`${artists.length} artis \u00b7 ${albums.length} album`)}${songs.length ? e(' \u00b7 ') + HeroTotal(songs) : ''}${allVideos.length ? e(` \u00b7 ${allVideos.length} video`) : ''}</p>${Whisper('genre', genre.id ?? genre.name)}</div></section>`;
  return { genre, artists, albums, songs, hero, allVideos };
};

/** Detail genre: susunan identik detail Playlist (tombol kembali, hero, lalu Artis, Album, Lagu); isinya hanya milik genre ini. */
const genreDetailPage = (library, id, backView, backLabel) => {
  const data = genreData(library, id);
  if (!data) return BaseView.page('');
  const { artists, albums, songs, hero, allVideos } = data;
  if (!songs.length && !artists.length && !allVideos.length) return BaseView.page(BackButton(backView, backLabel) + hero + EmptyState('fa-music', 'Belum ada lagu di genre ini.'));
  /* Seluruh artis dan album genre ini (bukan hanya 10 teratas); artis terbanyak lagunya di depan. */
  const sortedArtists = [...artists].sort((a, b) => artistContentCount(library, b) - artistContentCount(library, a) || compareText(a.name, b.name));
  return BaseView.page(BackButton(backView, backLabel) + hero
    + Section('Artis', ArtistCarousel(sortedArtists), `${sortedArtists.length} artis`)
    + (albums.length ? Section('Album', AlbumCarousel(albums), `${albums.length} album`) : '')
    + (songs.length ? Section('Lagu', TrackList(songs), `${songs.length} lagu`) : '')
    + VideoSection(library, relatedVideos(library, { artists, limit: VIDEO_RELATED_COUNT })), songs);
};

/** Detail genre dari halaman Pencarian: tampilan identik detail Playlist. */
class GenreView extends BaseView {
  render({ id }) { return genreDetailPage(this.library, id, 'search', 'Pencarian'); }
}

/** Detail playlist: tombol kembali ke kategorinya + banner + daftar lagu (komponen daftar yang sama dengan Beranda). */
class PlaylistView extends BaseView {
  render({ id }) {
    const def = EXPLORE_PLAYLISTS.find((pl) => pl.id === id);
    if (!def) return BaseView.page('');
    const pl = resolvePlaylist(this.library, def);
    if (playlistSize(pl) < PLAYLIST_MIN_SONGS) return BaseView.page('');
    const cat = EXPLORE_ITEMS.find((it) => it.view === pl.cat);
    /* Header identik halaman Artist (.hero), bedanya cover persegi (artist: bulat). */
    const hero = '<section class="hero">' +
      `<div class="pl-cover" style="--g:${colorHex(pl.color) ?? '#d9709a'}"><i class="fa-solid ${pl.icon}" aria-hidden="true"></i></div>` +
      `<div><small>Playlist \u00b7 ${e(cat.label)}</small><h1 title="${e(pl.name)}">${e(pl.name)}</h1>` +
      `<p>${e(`${pl.info} \u00b7 `)}${[pl.songs.length ? HeroTotal(pl.songs) : '', pl.videos.length ? e(`${pl.videos.length} video`) : ''].filter(Boolean).join(e(' \u00b7 '))}</p>${Whisper('playlist', pl.id)}</div></section>`;
    /* Susunan seperti Beranda/genre: Artist, Album, Lagu. Artis diurutkan dari yang lagunya terbanyak di playlist ini. */
    const counts = new Map();
    const inSongs = new Set(pl.songs.map((song) => song.id));
    [...pl.songs, ...pl.videos.filter((video) => !inSongs.has(video.id))].forEach((song) => counts.set(song.artist, (counts.get(song.artist) ?? 0) + 1));
    /* Artis dan album diturunkan dari lagu yang benar-benar ada di playlist ini (bukan seluruh katalog). */
    const artists = [...counts.keys()].sort((a, b) => counts.get(b) - counts.get(a) || compareText(a.name, b.name));
    const plAlbums = this.library.albumsOf([...pl.songs, ...pl.videos]);
    return BaseView.page(BackButton(cat.view, cat.label) + hero
      + Section('Artis', ArtistCarousel(artists), `${artists.length} artis`)
      + (plAlbums.length ? Section('Album', AlbumCarousel(plAlbums), `${plAlbums.length} album`) : '')
      + (pl.songs.length ? Section('Lagu', TrackList(pl.songs), `${pl.songs.length} lagu`) : '')
      + VideoSection(this.library, pl.videos), pl.songs);
  }
}

/** Detail genre dari halaman Jelajahi Genre: tampilan identik detail Playlist. */
class ExploreGenreView extends BaseView {
  render({ id }) { return genreDetailPage(this.library, id, 'explore-genre', 'Genre'); }
}

class SearchView extends BaseView {
  #shown = SEARCH_INITIAL_COUNT;
  #lastQuery = null;
  #filter = 'all';

  constructor(library, searchService) {
    super(library);
    this.searchService = searchService;
  }

  /** Menambah jumlah baris yang tampil; kata kunci yang sama dirender ulang oleh pemanggil. */
  showMore() {
    this.#shown += SEARCH_MORE_STEP;
  }

  /** Memilih kategori hasil ('all' | 'songs' | 'albums' | 'artists' | 'videos'); pemanggil merender ulang. */
  setFilter(filter) {
    this.#filter = SEARCH_FILTERS.some((item) => item.key === filter) ? filter : 'all';
    this.#shown = SEARCH_INITIAL_COUNT;
  }

  /** Banner selalu tampil di atas (identik gaya banner Beranda). Query kosong: hanya banner. Hasil: chip filter, lalu Lagu, Album, Artis, Video. */
  render({ query }) {
    /* Kata kunci baru = batas baris kembali ke awal. */
    if (query !== this.#lastQuery) {
      this.#lastQuery = query;
      this.#shown = SEARCH_INITIAL_COUNT;
    }
    const { songs, albums, artists, videos } = this.searchService.search(query);
    const n = this.#shown;
    const list = (rows) => `<div role="list">${rows}</div>`;
    const more = (total) => total > n
      ? `<button type="button" class="more" data-more>Tampilkan lebih banyak (${total - n} lagi)</button>` : '';
    let body = '';
    if (query) {
      const counts = { all: songs.length + albums.length + artists.length + videos.length, songs: songs.length, albums: albums.length, artists: artists.length, videos: videos.length };
      const filter = this.#filter;
      const show = (key) => filter === 'all' || filter === key;
      const chips = '<div class="chips" role="group" aria-label="Filter kategori pencarian">' +
        SEARCH_FILTERS.map(({ key, label }) =>
          `<button type="button" class="chip${filter === key ? ' active' : ''}" data-filter="${key}" aria-pressed="${filter === key}">${e(label)}` +
          (key === 'all' ? '' : ` <small>${counts[key]}</small>`) + '</button>').join('') + '</div>';
      const sections = (show('songs') && songs.length ? SectionTitle('Lagu') + TrackList(songs.slice(0, n)) + more(songs.length) : '')
        + (show('albums') && albums.length ? SectionTitle('Album') + list(albums.slice(0, n).map(AlbumRow).join('')) + more(albums.length) : '')
        + (show('artists') && artists.length ? SectionTitle('Artis') + list(artists.slice(0, n).map(ArtistRow).join('')) + more(artists.length) : '')
        + (show('videos') && videos.length ? SectionTitle('Video') + list(videos.slice(0, n).map((song) => VideoSearchRow(song, videoInfo(this.library, song))).join('')) + more(videos.length) : '');
      body = chips + (sections || EmptyResult());
    }
    const banner = PageHead('Temukan', 'Pencarian', query ? `Hasil untuk \u201c${query}\u201d` : 'Cari lagu, album, artis, atau video.', query ? '' : 'search');
    /* Section Genre tepat di bawah banner, hanya saat belum ada kata kunci. */
    const shownGenres = visibleGenres(this.library);
    const genres = !query && shownGenres.length
      ? Section('Semua Genre', `<div class="genre-grid" role="list">${shownGenres.map((g, i) => GenreCard(g, i)).join('')}</div>`)
      : '';
    /* Antrean putar tetap seluruh hasil, bukan hanya baris yang tampil. */
    return BaseView.page(`${banner}${genres}<div class="search-results">${body}</div>`, songs);
  }
}
