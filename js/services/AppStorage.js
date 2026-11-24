'use strict';

/* ---- services/AppStorage.js ---- */
/**
 * Pengaturan pengguna di localStorage: halaman terakhir, volume, lagu terakhir, shuffle, repeat.
 * Volume, shuffle, dan repeat juga disimpan di sini.
 */
const AppStorage = (() => {
  const KEY = 'musik-teloor-pengaturan-v1';
  let cache = null; /* salinan di memori: dibaca dari localStorage sekali saja */
  let pending = {}; /* perubahan yang belum ditulis */
  let timer = null;

  const load = () => {
    try {
      const value = JSON.parse(localStorage.getItem(KEY));
      return value && typeof value === 'object' ? value : {};
    } catch { return {}; }
  };

  /** Menulis perubahan yang tertunda. Digabung dengan isi storage terkini, jadi kunci milik tab lain tidak tertimpa. */
  const flush = () => {
    clearTimeout(timer);
    timer = null;
    if (!Object.keys(pending).length) return;
    try { localStorage.setItem(KEY, JSON.stringify({ ...load(), ...pending })); } catch { /* storage tidak tersedia: abaikan */ }
    pending = {};
  };

  /* Tulis segera sebelum halaman ditutup / disembunyikan, supaya jeda penulisan tidak menghilangkan perubahan terakhir. */
  if (typeof window !== 'undefined') window.addEventListener?.('pagehide', flush);
  if (typeof document !== 'undefined') {
    document.addEventListener?.('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
  }

  return {
    KEY,
    read() {
      cache ??= load();
      return { ...cache };
    },
    update(patch) {
      cache = { ...(cache ?? load()), ...patch };
      Object.assign(pending, patch);
      timer ??= setTimeout(flush, TIMING.STORAGE_FLUSH_MS);
    },
    flush,
  };
})();
