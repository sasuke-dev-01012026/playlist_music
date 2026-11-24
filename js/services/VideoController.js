'use strict';

/* ---- services/VideoController.js ---- */
/**
 * Pengendali video YouTube yang sedang tampil di halaman pemutaran. Berbicara dengan iframe lewat postMessage
 * (enablejsapi=1) tanpa memuat skrip tambahan: perintah play/pause/seek dikirim ke iframe, status dan progres
 * dibaca dari pesan yang dikirim balik. Selama ada video aktif, Bar Musik berubah menjadi Bar Video (PlayerBar).
 * Kelas ini tidak menyentuh DOM selain iframe yang diberikan.
 */
class VideoController {
  #frame = null;
  #song = null;
  #info = null;
  #playing = false;
  #seconds = 0;
  #duration = 0;
  #pingTimer = null;
  #queue = null;
  #cursor = null;
  /* Urutan manual "Video selanjutnya" (hasil seret & lepas): id video yang menyusul video `#manualFor`.
     Dipakai Next/autoplay lebih dulu; hilang bila posisi antrean berpindah ke luar daftar itu. */
  #manual = null;
  #manualFor = null;
  /* Video awal siklus tiap penyanyi (id penyanyi -> id video): penanda kapan satu siklus penyanyi selesai. */
  #entries = new Map();
  /* Penjaga: 'selesai' dan 'error' dilaporkan paling banyak sekali per pemutaran, walau iframe mengirim status yang sama berulang. */
  #ended = false;
  #failed = false;

  constructor({ bus }) {
    this.bus = bus;
    window.addEventListener('message', (event) => this.#onMessage(event));
  }

  /** Antrean Next video: daftar asal video dibuka (hasil pencarian); null = semua video sesuai urutan halaman Video. */
  get queue() { return this.#queue; }

  /**
   * Posisi antrean: video yang sedang jadi patokan urutan dan video awal siklus penyanyinya (entry). Satu siklus = seluruh video
   * penyanyi itu sekali, mulai dari entry, melingkar (lihat videoStep). Berpindah oleh: membuka video (startQueue / select),
   * Next/Previous/autoplay (advance), dan kembali/maju di riwayat (revisit). Null bila belum ada video yang dibuka.
   */
  get position() {
    return this.#cursor ? { song: this.#cursor, entry: this.#entries.get(videoArtistId(this.#cursor)) ?? this.#cursor.id } : null;
  }

  /** Sesi antrean baru: `song` dibuka dari daftar `list` (hasil pencarian) atau dari semua video (null). */
  startQueue(list, song) {
    this.#queue = list?.length ? list : null;
    this.#entries.clear();
    this.#manual = null;
    this.select(song);
  }

  /** Urutan manual yang berlaku setelah video `song` (null = urutan bawaan). */
  manualOrder(song) { return this.#manual && song && this.#manualFor === song.id ? this.#manual : null; }

  /** Menyimpan urutan hasil seret: `ids` = id video yang menyusul `song`. */
  setManualOrder(ids, song) {
    this.#manual = ids.length ? [...ids] : null;
    this.#manualFor = song.id;
    this.bus.emit(Events.VIDEO_ORDER);
  }

  /** Video berikutnya menurut urutan manual (yang pertama bukan klip yang sama dengan yang sedang/baru diputar), atau null. */
  manualNext(library, from = null) {
    const order = this.manualOrder(this.#cursor);
    if (!order) return null;
    const blocked = new Set([this.#cursor, from].filter(Boolean).map(videoKey));
    for (const id of order) {
      const video = library.getVideo(id);
      if (video && isVideo(video) && !blocked.has(videoKey(video))) return video;
    }
    return null;
  }

  /** Posisi pindah ke `song`: sisa urutan manual setelah video itu tetap berlaku, bila `song` memang ada di daftar manual. */
  #rebase(song) {
    const order = this.#manual;
    if (!order) return;
    const i = order.indexOf(song.id);
    const rest = i >= 0 && this.#cursor && this.#manualFor === this.#cursor.id ? order.slice(i + 1) : [];
    this.#manual = rest.length ? rest : null;
    this.#manualFor = song.id;
  }

  /** Pilihan langsung pengguna (daftar, video terkait): siklus penyanyinya dimulai dari video ini. */
  select(song) {
    this.#rebase(song);
    this.#cursor = song;
    this.#entries.set(videoArtistId(song), song.id);
  }

  /** Hasil videoStep (Next, Previous, autoplay): pindah ke `step.video` dengan awal siklus `step.entry`. */
  advance(step) {
    this.#rebase(step.video);
    this.#cursor = step.video;
    this.#entries.set(videoArtistId(step.video), step.entry);
  }

  /** Kembali/maju di riwayat: siklus penyanyi video itu dilanjutkan bila pernah berjalan, selain itu dimulai dari video ini. */
  revisit(song) {
    if (this.#entries.has(videoArtistId(song))) { this.#rebase(song); this.#cursor = song; }
    else this.select(song);
  }

  /** True saat video sedang diputar (bukan dijeda). */
  get playing() { return this.#playing; }

  /** True selama ada video yang tampil di halaman pemutaran (iframe aktif). */
  get active() { return this.#frame !== null; }

  /** Video yang sedang tampil (null bila tidak ada). */
  get song() { return this.#song; }

  /** Mendaftarkan iframe video yang baru ditampilkan; Bar Musik berganti menjadi Bar Video. */
  attach(frame, song, info) {
    if (this.#frame === frame) return;
    clearInterval(this.#pingTimer);
    this.#frame = frame;
    this.#song = song;
    this.#info = info;
    /* Video dibuka dengan autoplay; status sebenarnya dikoreksi oleh pesan dari pemutar. */
    this.#playing = true;
    this.#ended = false;
    this.#failed = false;
    this.#seconds = 0;
    this.#duration = song.duration > 0 ? song.duration : 0;
    this.#emitState();
    this.bus.emit(Events.VIDEO_PROGRESS, { percent: 0, seconds: 0, duration: this.#duration });
    /* Pemutar baru mau mengirim status setelah diberi salam "listening"; diulang sampai ada balasan. */
    frame.addEventListener('load', () => this.#handshake());
    let tries = 0;
    this.#pingTimer = setInterval(() => {
      if (this.#frame !== frame || ++tries > 20) return clearInterval(this.#pingTimer);
      this.#handshake();
    }, 500);
  }

  /** Video tidak lagi tampil (halaman ditinggalkan atau video dihentikan): Bar Video kembali menjadi Bar Musik. */
  detach() {
    if (!this.#frame) return;
    clearInterval(this.#pingTimer);
    this.#frame = null;
    this.#song = null;
    this.#info = null;
    this.#playing = false;
    this.bus.emit(Events.VIDEO_STATE, { active: false });
  }

  toggle() {
    if (!this.#frame) return;
    this.#playing = !this.#playing;
    this.#command(this.#playing ? 'playVideo' : 'pauseVideo');
    this.#emitState();
  }

  seekToPercent(percent) {
    if (!this.#frame || !(this.#duration > 0)) return;
    this.#seconds = (percent / 100) * this.#duration;
    this.#command('seekTo', [this.#seconds, true]);
    this.bus.emit(Events.VIDEO_PROGRESS, { percent, seconds: this.#seconds, duration: this.#duration });
  }

  #post(message) {
    try { this.#frame?.contentWindow?.postMessage(JSON.stringify(message), '*'); } catch { /* iframe belum siap: abaikan */ }
  }

  #command(func, args = []) {
    this.#post({ event: 'command', func, args });
  }

  #handshake() {
    this.#post({ event: 'listening', id: 1, channel: 'widget' });
    this.#command('addEventListener', ['onStateChange']);
    this.#command('addEventListener', ['onError']);
  }

  #onMessage(event) {
    if (!this.#frame || event.source !== this.#frame.contentWindow) return;
    let data = event.data;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch { return; }
    }
    if (!data || typeof data !== 'object') return;
    clearInterval(this.#pingTimer);
    if (data.event === 'onStateChange') return this.#setState(data.info);
    if (data.event === 'onError') return this.#fail();
    if (data.event !== 'infoDelivery' || !data.info) return;
    const { playerState, duration, currentTime } = data.info;
    if (typeof playerState === 'number') this.#setState(playerState);
    if (typeof duration === 'number' && duration > 0) this.#duration = duration;
    if (typeof currentTime === 'number') {
      this.#seconds = currentTime;
      const percent = this.#duration > 0 ? Math.min(100, (currentTime / this.#duration) * 100) : 0;
      this.bus.emit(Events.VIDEO_PROGRESS, { percent, seconds: currentTime, duration: this.#duration });
    }
  }

  /** Kode status YouTube: 1 = diputar, 3 = memuat (buffering), lainnya = berhenti/jeda. */
  #setState(state) {
    if (state === 0) return this.#finish();
    const playing = state === 1 || state === 3;
    if (playing) this.#ended = false; /* diputar lagi (mis. ulang manual): selesai berikutnya boleh memicu autoplay lagi */
    if (playing === this.#playing) return;
    this.#playing = playing;
    this.#emitState();
  }

  /**
   * Video benar-benar selesai (status YouTube 0). Autoplay hanya dipicu bila video sebelumnya sedang berjalan:
   * video yang dijeda pengguna (atau digeser ke akhir saat jeda) tidak memicu perpindahan.
   */
  #finish() {
    if (this.#ended || !this.#frame) return;
    this.#ended = true;
    if (!this.#playing) return;
    this.#playing = false;
    this.#emitState();
    const seconds = this.#duration;
    this.bus.emit(Events.VIDEO_PROGRESS, { percent: seconds > 0 ? 100 : 0, seconds, duration: this.#duration });
    this.bus.emit(Events.VIDEO_ENDED, { song: this.#song });
  }

  /** Video gagal dimuat/diputar (mis. embed dilarang): pemutar tetap utuh, status menjadi berhenti. */
  #fail() {
    if (this.#failed || !this.#frame) return;
    this.#failed = true;
    this.#ended = true;
    if (this.#playing) { this.#playing = false; this.#emitState(); }
    this.bus.emit(Events.VIDEO_ERROR, { song: this.#song });
  }

  #emitState() {
    this.bus.emit(Events.VIDEO_STATE, { active: true, playing: this.#playing, song: this.#song, info: this.#info });
  }
}
