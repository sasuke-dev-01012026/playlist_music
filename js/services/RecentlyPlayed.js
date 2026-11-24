'use strict';

/* ---- services/RecentlyPlayed.js ---- */
/**
 * Riwayat lagu yang terakhir diputar (terbaru di depan, tanpa duplikat, maksimal HOME_RECENT_COUNT).
 * Disimpan di localStorage agar tetap ada setelah refresh.
 */
class RecentlyPlayed {
  static KEY = 'musik-teloor-terakhir-diputar-v1';

  #library;
  #ids;
  #key;

  constructor({ library, bus }) {
    this.#library = library;
    this.#key = RecentlyPlayed.KEY;
    this.#ids = this.#read();
    bus.on(Events.PLAYER_TRACK, (song) => this.add(song));
  }

  /** Lagu yang bisa diputar dan terdaftar di pustaka dimasukkan ke posisi paling depan. */
  add(song) {
    if (!song || !song.isPlayable || this.#library.getSong(song.id) !== song) return;
    this.#ids = [song.id, ...this.#ids.filter((id) => id !== song.id)].slice(0, HOME_RECENT_COUNT);
    try { localStorage.setItem(this.#key, JSON.stringify(this.#ids)); } catch { /* storage tidak tersedia: abaikan */ }
  }

  get songs() {
    return this.#ids.map((id) => this.#library.getSong(id)).filter(Boolean);
  }

  #read() {
    try {
      const saved = JSON.parse(localStorage.getItem(this.#key));
      return Array.isArray(saved) ? saved.filter((id) => this.#library.getSong(id)).slice(0, HOME_RECENT_COUNT) : [];
    } catch { return []; }
  }
}
