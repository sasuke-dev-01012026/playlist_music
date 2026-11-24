'use strict';

/* ---- services/SoundCloudPlayer.js ---- */
/**
 * Adapter untuk SoundCloud Widget API (satu-satunya sumber audio aplikasi).
 * Seluruh pengetahuan tentang `SC.Widget` dikurung di kelas ini; bagian lain aplikasi
 * hanya berbicara lewat method sederhana (play, pause, load, ...).
 */
class SoundCloudPlayer {
  static API_URL = 'https://w.soundcloud.com/player/api.js';
  static #apiPromise = null;
  /** Pengganti widget bila api.js gagal dimuat: semua perintah diabaikan, durasi dilaporkan 0. */
  static #NOOP = Object.freeze({
    load() {}, play() {}, pause() {}, seekTo() {}, setVolume() {}, bind() {},
    getDuration: (cb) => cb(0), getCurrentSound: (cb) => cb(null),
  });

  #iframe;
  #widget = null;
  #events = {};
  #queue = [];
  #activated = false;
  #failed = false;
  #failHandlers = [];

  /**
   * @param {HTMLIFrameElement} iframe iframe tersembunyi berisi widget SoundCloud
   * @param {object} sc objek global `SC` bila api.js sudah termuat; bila belum, widget dibuat saat activate()
   */
  constructor(iframe, sc = window.SC) {
    this.#iframe = iframe;
    if (sc) {
      this.#activated = true;
      this.#widget = sc.Widget(iframe);
      this.#events = sc.Widget.Events;
    }
  }

  /** False bila API gagal dimuat (offline/diblokir): aplikasi tetap tampil, pemutaran dinonaktifkan. */
  get available() { return !this.#failed; }

  /** Dipanggil bila api.js ternyata gagal dimuat (langsung, jika sudah diketahui gagal). */
  onUnavailable(handler) {
    if (this.#failed) handler();
    else this.#failHandlers.push(handler);
  }

  /** Memuat api.js sekali saja, tanpa memblokir render. Resolve dengan `SC`, atau null bila gagal. */
  static loadApi() {
    if (window.SC) return Promise.resolve(window.SC);
    SoundCloudPlayer.#apiPromise ??= new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = SoundCloudPlayer.API_URL;
      script.async = true;
      script.onload = () => resolve(window.SC ?? null);
      script.onerror = () => { SoundCloudPlayer.#apiPromise = null; resolve(null); };
      document.head.append(script);
    });
    return SoundCloudPlayer.#apiPromise;
  }

  /**
   * Menyalakan widget: mengisi src iframe (dari data-src), memuat api.js, membuat widget, lalu menjalankan
   * perintah yang sudah antre (bind event, load, play, ...) sesuai urutan. Aman dipanggil berulang kali.
   */
  activate() {
    if (this.#activated) return;
    this.#activated = true;
    const { src } = this.#iframe.dataset;
    if (src && !this.#iframe.getAttribute('src')) this.#iframe.src = src;
    SoundCloudPlayer.loadApi().then((sc) => {
      if (sc) {
        this.#widget = sc.Widget(this.#iframe);
        this.#events = sc.Widget.Events;
      } else {
        this.#failed = true;
        this.#widget = SoundCloudPlayer.#NOOP;
        this.#failHandlers.splice(0).forEach((handler) => handler());
      }
      this.#queue.splice(0).forEach((task) => task(this.#widget, this.#events));
    });
  }

  /** Jalankan langsung bila widget siap, selain itu antre. `wake` = perintah nyata (bukan sekadar bind) -> nyalakan widget. */
  #run(task, wake = true) {
    if (this.#widget) return task(this.#widget, this.#events);
    this.#queue.push(task);
    if (wake) this.activate();
  }

  /** Track biasa diberi ID angka; ID berawalan "p" menandakan playlist SoundCloud. */
  static urlFor(id) {
    const value = String(id);
    return value.startsWith('p')
      ? `https://api.soundcloud.com/playlists/soundcloud%3Aplaylists%3A${value.slice(1)}`
      : `https://api.soundcloud.com/tracks/soundcloud%3Atracks%3A${value}`;
  }

  load(id, onReady, autoPlay = true) {
    this.#run((w) => w.load(SoundCloudPlayer.urlFor(id), {
      auto_play: autoPlay,
      show_teaser: false,
      callback: onReady,
    }));
  }

  play() { this.#run((w) => w.play()); }
  pause() { this.#run((w) => w.pause()); }
  seekTo(milliseconds) { this.#run((w) => w.seekTo(milliseconds)); }

  /** @param {number} fraction 0..1 */
  /* Volume tidak membangunkan widget (UI memanggilnya saat startup): antre, lalu diterapkan saat widget menyala; volume juga diset ulang tiap lagu mulai. */
  setVolume(fraction) { this.#run((w) => w.setVolume(fraction * 100), false); }

  /** @returns {Promise<number>} durasi track dalam milidetik */
  getDuration() {
    return new Promise((resolve) => this.#run((w) => w.getDuration(resolve)));
  }

  onReady(handler) { this.#run((w, ev) => w.bind(ev.READY, handler), false); }

  /** @returns {Promise<object|null>} data track yang sedang dimuat widget (id, duration dalam ms, ...) */
  getCurrentSound() {
    return new Promise((resolve) => this.#run((w) => w.getCurrentSound((sound) => resolve(sound))));
  }

  onPlay(handler) { this.#run((w, ev) => w.bind(ev.PLAY, handler), false); }
  onPause(handler) { this.#run((w, ev) => w.bind(ev.PAUSE, handler), false); }
  onFinish(handler) { this.#run((w, ev) => w.bind(ev.FINISH, handler), false); }

  /** handler menerima { percent: 0..100, seconds } */
  onProgress(handler) {
    this.#run((w, ev) => w.bind(ev.PLAY_PROGRESS, (e) =>
      handler({ percent: e.relativePosition * 100, seconds: e.currentPosition / 1000 })), false);
  }
}
