'use strict';

/* ---- models/Song.js ---- */
class Song {
  constructor({ id, name, dur, sc, yt = '', artistId = null, albumId = null, colorId = 1, year = null }) {
    this.id = id;
    this.name = name;
    this.artistId = artistId;
    this.albumId = albumId;
    /** ID video YouTube dari data (disimpan apa adanya; pemutar aplikasi memakai SoundCloud). */
    this.youtubeId = yt;
    this.colorId = colorId;
    /** Tahun rilis (opsional); ditampilkan di detail album hanya bila diisi di data. */
    this.year = year;
    /** Durasi dalam detik; diperbarui dengan durasi asli dari SoundCloud saat lagu diputar. */
    this.duration = dur;
    /** ID track SoundCloud. null = belum bisa diputar. */
    this.soundCloudId = sc;
    /** Diisi oleh MusicLibrary. */
    this.artist = null;
    /** Album asal lagu (relasi albumId -> albums); diisi oleh MusicLibrary. */
    this.album = null;
    this.searchText = '';
    this.artistText = '';
  }

  /** Cover berwarna sesuai colorId lagu. */
  get cover() {
    return colorfulPlaceholder(this.colorId);
  }

  get isPlayable() {
    return Boolean(this.soundCloudId);
  }

  /** Menyiapkan teks pencarian sekali saja. */
  buildSearchText() {
    this.searchText = String(this.name).toLowerCase();
    this.artistText = String(this.artist?.name ?? '').toLowerCase();
  }

  /** Judul cocok dengan kata kunci. */
  matches(query) {
    return this.searchText.includes(query);
  }

  /** Nama artis cocok dengan kata kunci. */
  matchesArtist(query) {
    return this.artistText.includes(query);
  }
}
