'use strict';

/* ################ VIEWS        ################ */

/* ---- views/BaseView.js ---- */
/**
 * Kelas dasar halaman. Subclass mengimplementasikan render(route) dan mengembalikan:
 *   { html: string, songs: Song[] }
 * `songs` adalah daftar lagu yang tampil di halaman; ia menjadi antrean saat pengguna menekan play.
 */
class BaseView {
  constructor(library) {
    this.library = library;
  }

  render() {
    throw new Error(`${this.constructor.name} harus mengimplementasikan render()`);
  }

  /** Hasil standar untuk halaman tanpa daftar lagu yang bisa diputar. */
  static page(html, songs = []) {
    return { html, songs };
  }
}
