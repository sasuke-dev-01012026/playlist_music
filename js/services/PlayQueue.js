'use strict';

/* ---- services/PlayQueue.js ---- */
/**
 * Antrean putar.
 *
 *  - #source   : daftar asal (urutan tampilan di halaman)
 *  - #order    : urutan putar aktual (sama dengan source, atau hasil Fisher-Yates jika shuffle)
 *  - #cursor   : indeks lagu yang sedang aktif di #order
 *  - #position : Map<songId, indeks> untuk mencari posisi lagu O(1)
 *
 * Navigasi next/previous bersifat melingkar (circular buffer) dan melewati lagu yang belum
 * punya sumber SoundCloud.
 */
class PlayQueue {
  #source = [];
  #order = [];
  #position = new Map();
  #cursor = 0;
  #shuffled = false;

  constructor(songs) {
    this.load(songs);
  }

  get current() {
    return this.#order[this.#cursor];
  }

  get cursor() {
    return this.#cursor;
  }

  get size() {
    return this.#order.length;
  }

  /** Urutan putar aktual (sudah teracak bila shuffle aktif). */
  get items() {
    return this.#order;
  }

  get isShuffled() {
    return this.#shuffled;
  }

  /** Mengganti antrean dengan `songs`. Jika startId diberikan, kursor diarahkan ke lagu itu. */
  load(songs, startId = null) {
    this.#source = songs;
    this.#rebuildOrder();
    if (startId !== null) this.#cursor = this.indexOf(startId);
    return this;
  }

  /**
   * Mengganti daftar asal (mis. favorit ditambah/dihapus) tanpa mengacak ulang urutan yang sudah berjalan:
   * saat shuffle aktif, lagu yang masih ada tetap pada urutannya, yang dihapus dibuang, dan yang baru
   * disisipkan di posisi acak setelah lagu aktif. Kursor tetap menunjuk `currentId`.
   */
  sync(songs, currentId = null) {
    this.#source = songs;
    if (!this.#shuffled) {
      this.#rebuildOrder();
    } else {
      const wanted = new Set(songs.map((song) => song.id));
      const kept = this.#order.filter((song) => wanted.has(song.id));
      const known = new Set(kept.map((song) => song.id));
      const from = currentId === null ? kept.length : kept.findIndex((song) => song.id === currentId) + 1;
      songs.filter((song) => !known.has(song.id)).forEach((song) => {
        kept.splice(from + Math.floor(Math.random() * (kept.length - from + 1)), 0, song);
      });
      this.#order = kept;
      this.#position = new Map(kept.map((song, index) => [song.id, index]));
      this.#cursor = Math.min(this.#cursor, Math.max(kept.length - 1, 0));
    }
    const index = currentId === null ? -1 : this.indexOf(currentId);
    if (index !== -1) this.#cursor = index;
  }

  setShuffle(enabled) {
    const currentId = this.current?.id;
    this.#shuffled = enabled;
    this.#rebuildOrder();
    if (currentId !== undefined) this.#cursor = this.indexOf(currentId);
  }

  indexOf(songId) {
    return this.#position.get(songId) ?? -1;
  }

  isCurrent(songId) {
    return this.current?.id === songId;
  }

  jumpTo(index) {
    this.#cursor = index;
    return this.current;
  }

  /**
   * Indeks lagu berikutnya (direction = 1) atau sebelumnya (-1) yang bisa diputar,
   * dengan wrap-around. Mengembalikan -1 bila tidak ada satu pun yang bisa diputar.
   */
  findPlayable(direction) {
    const n = this.#order.length;
    for (let step = 1; step <= n; step++) {
      const index = (((this.#cursor + direction * step) % n) + n) % n;
      if (this.#order[index].isPlayable) return index;
    }
    return -1;
  }

  #rebuildOrder() {
    this.#order = this.#shuffled ? shuffle(this.#source) : [...this.#source];
    this.#position = new Map(this.#order.map((song, index) => [song.id, index]));
    this.#cursor = Math.min(this.#cursor, Math.max(this.#order.length - 1, 0));
  }
}
