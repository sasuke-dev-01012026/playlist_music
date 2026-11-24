'use strict';

/* ---- services/DurationCache.js ---- */
/** Menyimpan durasi asli dari SoundCloud di browser (localStorage), per ID track SoundCloud, supaya kunjungan berikutnya langsung tepat. */
const DurationCache = {
  KEY: 'musik-durasi-soundcloud-v4',
  read() {
    try { return JSON.parse(localStorage.getItem(this.KEY)) || {}; } catch { return {}; }
  },
  save(soundCloudId, seconds) {
    try {
      const all = this.read();
      all[soundCloudId] = seconds;
      localStorage.setItem(this.KEY, JSON.stringify(all));
    } catch { /* storage tidak tersedia: abaikan */ }
  },
  apply(songs) {
    const all = this.read();
    songs.forEach((song) => { if (all[song.soundCloudId] > 0) song.duration = all[song.soundCloudId]; });
  },

  /* ----- Cache negatif: lagu yang gagal diukur (track dihapus / tidak bisa dimuat) tidak dicoba lagi di tiap kunjungan ----- */
  MISS_KEY: 'musik-durasi-gagal-v1',
  /** { soundCloudId: waktu gagal (ms) } yang masih berlaku; catatan kedaluwarsa diabaikan. */
  readMisses() {
    try {
      const saved = JSON.parse(localStorage.getItem(this.MISS_KEY));
      if (!saved || typeof saved !== 'object') return {};
      const now = Date.now();
      return Object.fromEntries(Object.entries(saved)
        .filter(([, time]) => typeof time === 'number' && now - time < TIMING.PREFETCH_MISS_TTL_MS));
    } catch { return {}; }
  },
  markMisses(soundCloudIds) {
    if (!soundCloudIds.length) return;
    try {
      const misses = this.readMisses();
      const now = Date.now();
      soundCloudIds.forEach((id) => { misses[id] = now; });
      localStorage.setItem(this.MISS_KEY, JSON.stringify(misses));
    } catch { /* storage tidak tersedia: abaikan */ }
  },
};
