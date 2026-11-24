'use strict';

/* ---- services/SearchService.js ---- */
/**
 * Pencarian lagu berdasarkan judul lagu.
 * Teks pencarian setiap lagu sudah dihitung sekali (Song.searchText),
 * sehingga tiap ketikan hanya satu lintasan O(n) tanpa membangun string ulang.
 */
class SearchService {
  /** Video = lagu yang punya ID YouTube (data video yang sudah ada). Dihitung sekali, teks pencariannya di-cache. */
  #videos = null;
  #videoText = new Map();

  constructor(library) {
    this.library = library;
  }

  /** Teks pencarian satu video: judul, nama artis, lalu album + genre (semua dari data yang ada). */
  #textOf(song) {
    let text = this.#videoText.get(song.id);
    if (!text) {
      const title = String(song.name).toLowerCase();
      const artist = String(song.artist?.name ?? '').toLowerCase();
      const extra = [albumNameOf(this.library, song), ...genreNamesOf(this.library, song)].join(' ').toLowerCase();
      text = { title, titleArtist: `${title} ${artist}`, all: `${title} ${artist} ${extra}` };
      this.#videoText.set(song.id, text);
    }
    return text;
  }

  /**
   * Video yang cocok. Setiap kata kunci (dipisah spasi) harus ada di judul / artis / album / genre,
   * sehingga "dewa 19 satu" atau "armada rock" tetap menemukan videonya.
   * Urutan: cocok di judul, lalu judul + artis, lalu sisanya (album/genre); urutan data dipertahankan.
   */
  #searchVideos(query) {
    this.#videos ??= videosOf(this.library);
    const tokens = query.split(/\s+/).filter(Boolean);
    const buckets = [[], [], []];
    for (const song of this.#videos) {
      const text = this.#textOf(song);
      if (tokens.every((t) => text.title.includes(t))) buckets[0].push(song);
      else if (tokens.every((t) => text.titleArtist.includes(t))) buckets[1].push(song);
      else if (tokens.every((t) => text.all.includes(t))) buckets[2].push(song);
    }
    return buckets.flat();
  }

  /**
   * @param {string} rawQuery teks mentah dari input
   * @returns {{songs: Song[], albums: Album[], artists: Artist[], videos: Song[]}}
   *          songs   = lagu yang judulnya cocok (didahulukan), lalu lagu yang artisnya cocok;
   *          albums  = album (data albums) yang namanya cocok;
   *          artists = artis yang namanya cocok;
   *          videos  = video (lagu ber-ID YouTube) yang judul, artis, album, atau genrenya cocok.
   */
  search(rawQuery) {
    const query = rawQuery.trim().toLowerCase();
    if (!query) return { songs: [], albums: [], artists: [], videos: [] };
    const byTitle = [];
    const byArtist = [];
    for (const song of this.library.songs) {
      if (song.matches(query)) byTitle.push(song);
      else if (song.matchesArtist(query)) byArtist.push(song);
    }
    const artists = this.library.allArtists.filter((artist) => String(artist.name).toLowerCase().includes(query));
    const albums = this.library.albums.filter((album) => String(album.name).toLowerCase().includes(query));
    return { songs: [...byTitle, ...byArtist], albums, artists, videos: this.#searchVideos(query) };
  }
}
