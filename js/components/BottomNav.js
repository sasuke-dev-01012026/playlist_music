'use strict';

/* ---- components/BottomNav.js ---- */
/** Navigasi bawah (bottom navigation bar) untuk semua ukuran layar. */
class BottomNav extends NavMenu {
  render() {
    return `<nav class="side-nav" id="sideNav" aria-label="Menu utama">${this.renderItems()}</nav>`;
  }
}
