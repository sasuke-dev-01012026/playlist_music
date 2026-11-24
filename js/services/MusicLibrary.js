'use strict';

/* ################ SERVICES     ################ */

/* ---- services/MusicLibrary.js ---- */
/** Repository katalog musik: semua artist dan lagunya, dengan pencarian lagu per id (O(1)). */
class MusicLibrary {
  #artistById;
  #albumById;
  #songById;
  #videoById;

  constructor({ artists, songs, albums = [], genres = [] }) {
    const allArtists = artists.map((row) => new Artist(row));
    const entries = songs.map((row) => ({ row, song: new Song(row) }));
    /* Daftar lagu = semua lagu ber-sc + semua yang punya video YouTube. Yang belum ber-sc tetap tampil tetapi redup dan tidak bisa diputar (isPlayable). */
    this.songs = entries.filter(({ row, song }) => String(row.sc ?? '').trim() !== '' || isVideo(song)).map(({ song }) => song);
    /* yt = khusus halaman Video: hanya yang ber-ID YouTube valid; yang tanpa yt tidak tampil sebagai video. */
    this.videos = entries.filter(({ song }) => isVideo(song)).map(({ song }) => song);
    /* Data pendukung dari JSON (disimpan utuh). Album dibangun di bawah, setelah relasi artis selesai. */
    this.genres = genres;
    const artistById = indexBy(allArtists, (a) => a.id);
    this.#songById = indexBy(this.songs, (s) => s.id);
    this.#videoById = indexBy(this.videos, (s) => s.id);

    /* Setiap lagu/video dihubungkan ke artistnya lewat artistId; hanya lagu (ber-sc) yang masuk ke daftar lagu artis. */
    const musicSongs = new Set(this.songs);
    for (const { song } of entries) {
      const isMusic = musicSongs.has(song);
      if (!isMusic && !isVideo(song)) continue;
      const artist = artistById.get(song.artistId) ?? allArtists[0];
      song.artist = artist;
      if (isMusic) artist.songs.push(song);
      song.buildSearchText();
    }

    /* Artist tanpa lagu yang tampil ikut disembunyikan. */
    this.artists = allArtists.filter((a) => a.songs.length > 0);
    /* Penyanyi yang hanya punya video (belum ada lagu musik, mis. Justin Bieber): datanya ada di database, jadi tetap bisa dibuka
       (halaman artis berisi videonya) dan dicari. Tidak masuk daftar artis musik (this.artists) agar daftar/genre musik tidak berubah. */
    const videoOwners = new Set(this.videos.map((video) => video.artist));
    this.videoArtists = allArtists.filter((a) => a.songs.length === 0 && videoOwners.has(a));
    /* Semua penyanyi untuk daftar "Semua Artis", Jelajah, dan pencarian: penyanyi musik + penyanyi video, digabung menurut abjad
       (urutan penyanyi musik yang sudah ada dipertahankan; tiap penyanyi video disisipkan di tempat abjadnya). */
    this.allArtists = [...this.artists];
    for (const artist of [...this.videoArtists].sort((a, b) => compareText(a.name, b.name))) {
      const at = this.allArtists.findIndex((other) => compareText(other.name, artist.name) > 0);
      this.allArtists.splice(at < 0 ? this.allArtists.length : at, 0, artist);
    }
    this.#artistById = indexBy(this.allArtists, (a) => a.id);

    /* Album = baris data albums + lagu yang albumId-nya sama (relasi ID, bukan kecocokan nama).
       Album tanpa lagu yang tampil disembunyikan. Artis album = artistId data album (cadangan: artis lagu pertamanya). */
    const songsByAlbum = groupBy(this.songs, (song) => song.albumId);
    const videosByAlbum = groupBy(this.videos, (video) => video.albumId);
    this.albums = albums
      .map((row) => new Album(row, songsByAlbum.get(row.id) ?? [], videosByAlbum.get(row.id) ?? []))
      .filter((album) => album.songs.length > 0 || album.videos.length > 0);
    this.#albumById = indexBy(this.albums, (a) => a.id);
    for (const album of this.albums) {
      album.artist = this.#artistById.get(album.artistId) ?? (album.songs[0] ?? album.videos[0]).artist;
      album.artist.albums.push(album);
      for (const song of album.songs) song.album = album;
      for (const video of album.videos) video.album ??= album;
    }
  }

  getSong(id) { return this.#songById.get(id); }
  getVideo(id) { return this.#videoById.get(id); }
  getArtist(id) { return this.#artistById.get(id); }
  getAlbum(id) { return this.#albumById.get(id); }

  /** Album unik dari kumpulan lagu (urutan kemunculan dipertahankan); lagu tanpa album dilewati. */
  albumsOf(songs) {
    const seen = new Set();
    return songs.map((song) => song.album).filter((album) => album && !seen.has(album.id) && seen.add(album.id));
  }

  /** Semua lagu, sesuai urutan di data. */
  sortedSongs() { return this.songs; }
}
