'use strict';

/* ---- services/DurationPrefetcher.js ---- */
/**
 * Mengambil durasi asli semua lagu dari SoundCloud di latar belakang (tanpa memutar),
 * memakai widget tersembunyi kedua, satu lagu per giliran. Hasilnya memperbaiki durasi di daftar lagu
 * tanpa harus memutar tiap lagu lebih dulu.
 */
class DurationPrefetcher {
  constructor({ soundCloud, songs, bus }) {
    this.sc = soundCloud;
    this.songs = songs;
    this.bus = bus;
    /* Selama lagu diputar, pengukuran diberi jeda panjang supaya tidak berebut bandwidth dengan streaming audio (4G lambat). */
    this.playing = false;
    bus.on(Events.PLAYER_STATE, (state) => { this.playing = Boolean(state.playing); });
    // READY harus didengarkan sejak widget dibuat; jika baru didengarkan nanti, event-nya sudah terlewat.
    this.ready = new Promise((resolve) => this.sc.onReady(resolve));
  }

  async start() {
    /* Tanpa koneksi, setiap lagu pasti gagal dan menghabiskan waktu tunggu: tidak ada gunanya memulai. */
    if (navigator.onLine === false) return;
    /* Widget yang sempat READY = koneksi ke SoundCloud sehat; timeout = belum terbukti sehat. */
    const ready = await Promise.race([
      this.ready.then(() => true),
      new Promise((resolve) => setTimeout(() => resolve(false), TIMING.PREFETCH_READY_MS)),
    ]);
    // ID berawalan "p" = playlist SoundCloud; durasinya baru jelas saat lagu diputar.
    // Lagu yang durasinya belum diketahui (0) diukur lebih dulu, lalu sisanya.
    /* Durasi yang sudah tersimpan di cache tidak diukur ulang di setiap kunjungan. */
    const cached = DurationCache.read();
    /* Lagu yang gagal diukur baru-baru ini dilewati (cache negatif, berlaku TIMING.PREFETCH_MISS_TTL_MS). */
    const misses = DurationCache.readMisses();
    const queue = this.songs
      .filter((song) => song.isPlayable && !String(song.soundCloudId).startsWith('p')
        && !(cached[song.soundCloudId] > 0) && !(song.soundCloudId in misses))
      .sort((a, b) => (a.duration > 0) - (b.duration > 0));
    /* Kegagalan hanya dicatat bila koneksi terbukti sehat: widget READY, atau minimal satu lagu berhasil diukur.
       Kegagalan sebelum bukti itu ditahan dulu, agar gangguan jaringan tidak menandai lagu yang sebenarnya baik. */
    let healthy = ready;
    const pending = [];
    for (const song of queue) {
      if (this.playing) await new Promise((resolve) => setTimeout(resolve, 20000));
      const seconds = await this.#measure(song);
      if (seconds > 0) {
        DurationCache.save(song.soundCloudId, seconds);
        if (Math.abs(seconds - song.duration) >= 0.5) {
          song.duration = seconds;
          this.bus.emit(Events.PLAYER_DURATION, { song, seconds });
        }
        if (!healthy) {
          healthy = true;
          DurationCache.markMisses(pending.splice(0));
        }
      } else if (healthy) {
        DurationCache.markMisses([song.soundCloudId]);
      } else {
        pending.push(song.soundCloudId);
      }
    }
  }

  /** Dua kali percobaan; hasil hanya dipakai jika track yang terbaca memang lagu yang diminta. */
  async #measure(song) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const seconds = await this.#measureOnce(song);
      if (seconds > 0) return seconds;
    }
    return 0;
  }

  #measureOnce(song) {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(0), TIMING.PREFETCH_TIMEOUT_MS);
      this.sc.load(song.soundCloudId, async () => {
        const sound = await this.sc.getCurrentSound();
        clearTimeout(timeout);
        const matches = sound && String(sound.id) === String(song.soundCloudId);
        resolve(matches && sound.duration > 0 ? sound.duration / 1000 : 0);
      }, false);
    });
  }
}
