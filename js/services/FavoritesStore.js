'use strict';

/* ---- services/FavoritesStore.js ---- */
/**
 * Daftar lagu favorit, disimpan di localStorage (kunci sendiri).
 * Identitas lagu = ID lagu, sehingga tidak ada duplikasi.
 * Menyimpan hanya kuncinya; objek lagu dicari lewat register() dari pustaka.
 */
class FavoritesStore {
  static KEY = 'musik-teloor-favorit-v1';

  #keys;
  #keyOf = new WeakMap();
  #songByKey = new Map();

  constructor({ bus }) {
    this.bus = bus;
    this.#keys = this.#read();
  }

  /** Mendaftarkan semua lagu agar bisa dicari lewat kuncinya. */
  register(library) {
    for (const song of library.songs) {
      this.#keyOf.set(song, song.id);
      this.#songByKey.set(song.id, song);
    }
  }

  keyOf(song) {
    return this.#keyOf.get(song) ?? song.id;
  }

  has(song) {
    return Boolean(song) && this.#keys.includes(this.keyOf(song));
  }

  /** Menambah atau menghapus lagu dari Favorites. Mengembalikan true bila kini menjadi favorit. */
  toggle(song) {
    const key = this.keyOf(song);
    const favorite = !this.#keys.includes(key);
    this.#keys = favorite ? [...this.#keys, key] : this.#keys.filter((k) => k !== key);
    this.#write();
    this.bus.emit(Events.FAVORITES_CHANGE, { song, favorite });
    return favorite;
  }

  /** Lagu favorit dari semua halaman, yang terbaru ditambahkan di paling atas. */
  get songs() {
    return [...this.#keys].reverse().map((key) => this.#songByKey.get(key)).filter(Boolean);
  }

  #read() {
    try {
      const value = JSON.parse(localStorage.getItem(FavoritesStore.KEY));
      return Array.isArray(value)
        ? [...new Set(value.filter((k) => typeof k === 'number' || typeof k === 'string'))]
        : [];
    } catch { return []; }
  }

  #write() {
    try { localStorage.setItem(FavoritesStore.KEY, JSON.stringify(this.#keys)); } catch { /* abaikan */ }
  }
}
