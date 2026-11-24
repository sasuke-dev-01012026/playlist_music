'use strict';

/* ---- services/PlayerController.js ---- */
/**
 * Pengendali pemutaran: menggabungkan PlayQueue (apa yang diputar) dengan SoundCloudPlayer
 * (bagaimana diputar), lalu mengabarkan perubahan lewat EventBus.
 * Kelas ini tidak menyentuh DOM sama sekali.
 */
class PlayerController {
  #started = false;
  #playing = false;
  #repeat = false;
  #volume = DEFAULT_VOLUME;
  #loadedSongId = null;
  /** Asal antrean aktif: 'favorites' bila diputar dari halaman Favorites, selain itu null. */
  #queueTag = null;
  #nudgeTimer = null;
  #warningTimer = null;
  /** True bila widget SoundCloud terakhir melaporkan PLAY (bukan sekadar niat pengguna); dasar koreksi toggle(). */
  #audible = false;
  /** Tanda state yang terakhir dipancarkan; state identik tidak perlu memperbarui seluruh UI lagi. */
  #lastStateKey = null;

  /**
   * @param {object} deps
   * @param {import('./SoundCloudPlayer.js').SoundCloudPlayer} deps.soundCloud
   * @param {import('../core/EventBus.js').EventBus} deps.bus
   * @param {import('../models/Song.js').Song[]} deps.songs antrean awal
   */
  constructor({ soundCloud, bus, songs }) {
    this.sc = soundCloud;
    this.bus = bus;
    this.queue = new PlayQueue(songs);
    this.#restoreSaved();
    this.#listenToSoundCloud();
  }

  /** Memulihkan volume, shuffle/repeat, dan lagu terakhir dari localStorage (belum diputar otomatis). */
  #restoreSaved() {
    const saved = AppStorage.read();
    if (typeof saved.volume === 'number' && saved.volume >= 0 && saved.volume <= 1) this.#volume = saved.volume;
    if (saved.shuffle === true) this.queue.setShuffle(true);
    else if (saved.repeat === true) this.#repeat = true;
    const index = this.queue.indexOf(saved.songId);
    if (index !== -1) this.queue.jumpTo(index);
  }

  #persist() {
    AppStorage.update({
      volume: this.#volume,
      songId: this.queue.current?.id,
      shuffle: this.queue.isShuffled,
      repeat: this.#repeat,
    });
  }

  get currentSong() { return this.queue.current; }
  get volume() { return this.#volume; }
  get queueItems() { return this.queue.items; }
  get queueCursor() { return this.queue.cursor; }
  /** Putar lagu pada indeks tertentu di antrean aktif. */
  playIndex(index) { this.#playAt(index); }

  /** True jika lagu ini sudah dimulai dan sedang menjadi lagu aktif. */
  isCurrent(songId) {
    return this.#started && this.queue.isCurrent(songId);
  }

  get state() {
    return {
      activeId: this.#started && this.queue.current ? this.queue.current.id : null,
      playing: this.#playing,
      shuffle: this.queue.isShuffled,
      repeat: this.#repeat,
    };
  }

  /* ---------- Perintah dari UI ---------- */

  playFrom(songs, songId, tag = null) {
    /* Lagu tidak ada di daftar: abaikan, antrean dan lagu yang sedang diputar tidak berubah. */
    if (!songs.some((song) => song.id === songId)) return;
    this.#queueTag = tag;
    this.queue.load(songs, songId);
    this.#playAt(this.queue.indexOf(songId));
  }

  /**
   * Jika antrean berasal dari Favorites, ikuti perubahan daftar favorit (tambah/hapus) tanpa menghentikan lagu.
   * Lagu yang sedang diputar tetap ada di antrean walau baru dihapus dari favorit.
   */
  syncFavoritesQueue(favoriteSongs) {
    if (this.#queueTag !== 'favorites') return;
    const current = this.queue.current;
    const list = current && !favoriteSongs.includes(current) ? [current, ...favoriteSongs] : favoriteSongs;
    this.queue.sync(list, current ? current.id : null);
    this.#persist();
  }

  toggle() {
    const song = this.queue.current;
    if (!song) return this.#toast(MESSAGES.NOTHING_PLAYABLE);
    this.#started = true;
    if (!song.isPlayable) {
      this.#emitState();
      return this.#toast(MESSAGES.NO_SOURCE);
    }
    // Lagu yang tampil di player belum pernah dimuat -> muat dulu, jangan hanya menekan play.
    if (this.#loadedSongId !== song.id) return this.#playAt(this.queue.cursor);
    /* Tampilan langsung berubah saat ditekan; widget (iframe lintas-proses) baru membalas beberapa puluh ms kemudian
       lewat event PLAY/PAUSE, yang hanya mengonfirmasi state ini (state identik tidak dipancarkan ulang). */
    if (this.#playing) {
      /* Jeda manual: batalkan percobaan "dorong play" otomatis agar lagu tidak menyala lagi sendiri. */
      clearTimeout(this.#nudgeTimer);
      clearTimeout(this.#warningTimer);
      this.#playing = false;
      this.#syncState();
      this.sc.pause();
    } else {
      this.#playing = true;
      this.#syncState();
      this.sc.play();
      this.#confirmPlay(song);
    }
  }

  /** Play dari toggle() dianggap berhasil bila widget melapor PLAY; bila tidak, ulangi sekali lalu kembalikan tampilan ke jeda. */
  #confirmPlay(song) {
    const unconfirmed = () => this.queue.current === song && this.#playing && !this.#audible;
    clearTimeout(this.#nudgeTimer);
    this.#nudgeTimer = setTimeout(() => unconfirmed() && this.sc.play(), TIMING.PLAY_NUDGE_MS);
    clearTimeout(this.#warningTimer);
    this.#warningTimer = setTimeout(() => {
      if (!unconfirmed()) return;
      this.#playing = false;
      this.#emitState();
      this.#toast(MESSAGES.NOT_STARTED);
    }, TIMING.PLAY_WARNING_MS);
  }

  /** Jeda audio bila sedang menyala (dipakai saat video dibuka). */
  pausePlayback() {
    if (this.#playing) this.toggle();
  }

  /** direction: 1 = berikutnya, -1 = sebelumnya. Repeat hanya berlaku saat maju. */
  step(direction) {
    if (this.#repeat && direction > 0) {
      const song = this.queue.current;
      /* Lagu aktif belum pernah dimuat (mis. baru dipulihkan): muat dulu, jangan memutar trek bawaan widget. */
      if (!song || this.#loadedSongId !== song.id) return this.#playAt(this.queue.cursor);
      this.sc.seekTo(0);
      this.sc.play();
      return;
    }
    const index = this.queue.findPlayable(direction);
    if (index === -1) return this.#toast(MESSAGES.NOTHING_PLAYABLE);
    this.#playAt(index);
  }

  toggleShuffle() {
    this.queue.setShuffle(!this.queue.isShuffled);
    if (this.queue.isShuffled) this.#repeat = false;
    this.#persist();
    this.#emitState();
  }

  toggleRepeat() {
    this.#repeat = !this.#repeat;
    if (this.#repeat) this.queue.setShuffle(false);
    this.#persist();
    this.#emitState();
  }

  async seekToPercent(percent) {
    if (this.#loadedSongId === null || this.#loadedSongId !== this.queue.current?.id) return;
    const duration = await this.sc.getDuration();
    this.sc.seekTo((percent / 100) * duration);
  }

  setVolume(fraction) {
    this.#volume = fraction;
    this.sc.setVolume(fraction);
    this.#persist();
  }

  /* ---------- Internal ---------- */

  #playAt(index) {
    if (!(index >= 0 && index < this.queue.size)) return; /* indeks di luar antrean (termasuk -1): abaikan */
    const song = this.queue.jumpTo(index);
    this.#started = true;
    const canPlay = song.isPlayable && this.sc.available;
    if (canPlay) {
      /* Perintah ke widget dikirim paling awal: widget (proses terpisah) mulai memuat selagi UI diperbarui di bawah. */
      this.#playing = true;
      this.#loadedSongId = song.id;
      this.sc.load(song.soundCloudId, () => {
        this.sc.setVolume(this.#volume);
        this.sc.play();
      });
    }
    this.#persist();
    this.bus.emit(Events.PLAYER_TRACK, song);
    this.bus.emit(Events.PLAYER_PROGRESS, { percent: 0, seconds: 0 });

    if (!song.isPlayable) {
      this.#playing = false;
      this.sc.pause();
      this.#emitState();
      return this.#toast(MESSAGES.NO_SOURCE);
    }

    if (!this.sc.available) {
      this.#playing = false;
      this.#emitState();
      return this.#toast(MESSAGES.NO_PLAYER);
    }

    this.#syncState();
    this.#watchStart(song);
  }

  /** Beberapa browser menolak autoplay: coba sekali lagi, lalu beri petunjuk ke pengguna. */
  #watchStart(song) {
    const stalled = () => this.queue.current === song && !this.#playing;
    clearTimeout(this.#nudgeTimer);
    this.#nudgeTimer = setTimeout(() => stalled() && this.sc.play(), TIMING.PLAY_NUDGE_MS);
    clearTimeout(this.#warningTimer);
    this.#warningTimer = setTimeout(() => {
      if (!stalled()) return;
      this.#emitState();
      this.#toast(MESSAGES.NOT_STARTED);
    }, TIMING.PLAY_WARNING_MS);
  }

  #listenToSoundCloud() {
    this.sc.onPlay(() => {
      this.#audible = true;
      this.#playing = true;
      this.#syncState();
      this.sc.setVolume(this.#volume);
      this.#syncDuration();
    });
    this.sc.onPause(() => {
      this.#audible = false;
      this.#playing = false;
      this.#syncState();
    });
    this.sc.onFinish(() => {
      this.#audible = false;
      this.#playing = false;
      this.step(1);
    });
    this.sc.onProgress((progress) => this.bus.emit(Events.PLAYER_PROGRESS, progress));
    /* API SoundCloud baru diketahui gagal dimuat setelah pengguna menekan putar: tampilkan pesan yang sama seperti sebelumnya. */
    this.sc.onUnavailable(() => {
      if (!this.#started) return;
      clearTimeout(this.#nudgeTimer);
      clearTimeout(this.#warningTimer);
      this.#playing = false;
      this.#emitState();
      this.#toast(MESSAGES.NO_PLAYER);
    });
  }

  /**
   * Memperbarui durasi lagu aktif dengan durasi asli dari SoundCloud.
   * Data track diverifikasi (id harus cocok) agar event dari lagu sebelumnya tidak menimpa durasi lagu baru.
   */
  async #syncDuration() {
    const song = this.queue.current;
    const sound = await this.sc.getCurrentSound();
    if (!sound || !song || this.queue.current !== song) return;
    const isPlaylist = String(song.soundCloudId).startsWith('p');
    if (!isPlaylist && sound.id !== undefined && String(sound.id) !== String(song.soundCloudId)) return;
    if (!(sound.duration > 0)) return;
    song.duration = sound.duration / 1000;
    DurationCache.save(song.soundCloudId, song.duration);
    this.bus.emit(Events.PLAYER_DURATION, { song, seconds: song.duration });
  }

  #emitState() {
    const state = this.state;
    this.#lastStateKey = `${state.activeId}|${state.playing}|${state.shuffle}|${state.repeat}`;
    this.bus.emit(Events.PLAYER_STATE, state);
  }

  /** Seperti #emitState, tetapi dilewati bila state sama persis dengan yang terakhir dipancarkan (mis. konfirmasi event widget). */
  #syncState() {
    const state = this.state;
    if (this.#lastStateKey === `${state.activeId}|${state.playing}|${state.shuffle}|${state.repeat}`) return;
    this.#emitState();
  }

  #toast(message) {
    this.bus.emit(Events.TOAST, message);
  }
}
