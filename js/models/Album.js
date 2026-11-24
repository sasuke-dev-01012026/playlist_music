'use strict';

/* ---- models/Album.js ---- */
class Album {
  constructor({ id, name, artistId, coverImg }, songs, videos = []) {
    this.id = id;
    this.name = name;
    this.artistId = artistId;
    this.coverImg = coverImg;
    /** Lagu (yang tampil) dengan albumId = id album ini; diisi oleh MusicLibrary. */
    this.songs = songs;
    /** Video (ID YouTube) dengan albumId = id album ini; ikut menentukan album tampil. */
    this.videos = videos;
    this.artist = null;
  }

  /** Cover dari data bila ada; jika tidak, warna cover lagu pertama album. */
  get cover() {
    const img = this.coverImg;
    return !img || img === 'undefined' || img === 'null' ? colorfulPlaceholder((this.songs[0] ?? this.videos[0])?.colorId ?? 1) : img;
  }

  /** Tahun rilis: dari data lagu bila diisi. */
  get year() {
    return this.songs.find((song) => song.year)?.year ?? null;
  }
}
