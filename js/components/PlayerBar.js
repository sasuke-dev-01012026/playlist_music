'use strict';

/* ---- components/PlayerBar.js ---- */
/** Bilah pemutar di bagian bawah: info lagu, kontrol, progres, dan volume. */
class PlayerBar extends Component {
  /** True selama Bar Musik tampil sebagai Bar Video (ada video yang sedang tampil di halaman pemutaran). */
  videoMode = false;
  /** Progres terakhir lagu; dipulihkan saat Bar Video kembali menjadi Bar Musik. */
  musicProgress = { percent: 0, seconds: 0 };

  constructor(root, { player, bus, favorites, video, router, library }) {
    super(root);
    this.player = player;
    this.bus = bus;
    this.favorites = favorites;
    this.video = video;
    this.router = router;
    this.library = library;
  }

  /** Video yang sedang tampil di Bar Video (null saat Bar Musik). */
  videoSong = null;
  /** True selama daftar "Video selanjutnya" terbuka (diumumkan ViewOutlet). */
  upNextOpen = false;

  render() {
    return `
      <div class="btns">
        <button class="ctl" id="play" aria-label="Play"><i class="fa-solid fa-play"></i></button>
        <button class="ctl" id="forward" aria-label="Next"><i class="fa-solid fa-forward"></i></button>
      </div>
      <div class="now" role="button" tabindex="0" aria-label="Buka Now Playing">
        <img referrerpolicy="no-referrer" id="nowImg" src="" alt="">
        <div class="now-text">
          <div class="now-title" id="nowTitle"></div>
          <div class="now-desc" id="nowDesc"></div>
        </div>
        <div class="seek">
          <span class="time" id="cur">0:00</span>
          <input type="range" id="progressBar" min="0" max="100" step="0.1" value="0" aria-label="Progress">
          <span class="time" id="dur">--:--</span>
        </div>
      </div>
      <div class="extra">
        <a class="sc-credit" href="https://soundcloud.com" target="_blank" rel="noopener">via SoundCloud</a>
        <i class="fa-solid fa-volume-high" id="volIcon"></i>
        <input type="range" id="vol" min="0" max="1" step="0.01" value="1" aria-label="Volume">
      </div>`;
  }

  bind() {
    this.el = {
      img: this.$('#nowImg'), title: this.$('#nowTitle'), desc: this.$('#nowDesc'),
      play: this.$('#play'), forward: this.$('#forward'),
      progress: this.$('#progressBar'), cur: this.$('#cur'), dur: this.$('#dur'),
      vol: this.$('#vol'), volIcon: this.$('#volIcon'),
    };

    this.listen(this.el.play, 'click', () => (this.videoMode ? this.video.toggle() : this.player.toggle()));
    /* Bar Musik membuka Now Playing; Bar Video membuka/menutup daftar "Video selanjutnya" (gaya YouTube Mix). */
    this.listen(this.root, 'click', (ev) => {
      if (!ev.target.closest('button, input, a')) this.bus.emit(this.videoMode ? Events.VIDEO_UPNEXT : Events.NOWPLAYING_OPEN);
    });
    this.listen(this.$('.now'), 'keydown', (ev) => {
      if ((ev.key === 'Enter' || ev.key === ' ') && ev.target === ev.currentTarget) {
        ev.preventDefault();
        this.bus.emit(this.videoMode ? Events.VIDEO_UPNEXT : Events.NOWPLAYING_OPEN);
      }
    });
    this.subscribe(this.bus, Events.VIDEO_ORDER, () => { if (this.videoMode) this.#showNext(); });
    this.subscribe(this.bus, Events.VIDEO_UPNEXT_STATE, ({ open }) => {
      this.upNextOpen = open;
      this.root.classList.toggle('upnext-open', open && this.videoMode);
      if (this.videoMode) this.$('.now').setAttribute('aria-expanded', String(open));
    });
    this.subscribe(this.bus, Events.PLAYER_VOLUME, (v) => { this.el.vol.value = v; this.#paintVolume(v); });
    this.listen(this.$('#forward'), 'click', () => (this.videoMode ? this.bus.emit(Events.VIDEO_NEXT) : this.player.step(1)));
    this.seek = bindSeekSlider(this, this.el.progress, (percent) => {
      if (this.videoMode) this.video.seekToPercent(percent);
      else this.player.seekToPercent(percent);
    });
    this.listen(this.el.vol, 'input', () => this.#applyVolume(Number(this.el.vol.value)));
    this.listen(this.el.volIcon, 'click', () => {
      /* Bisukan lalu nyalakan lagi: kembali ke volume sebelumnya, bukan selalu 100%. */
      if (this.player.volume) this.lastVolume = this.player.volume;
      const next = this.player.volume ? 0 : (this.lastVolume || 1);
      this.el.vol.value = next;
      this.#applyVolume(next);
    });

    /* Selama Bar Video tampil, peristiwa pemutar musik tidak menimpa tampilannya; saat kembali ke Bar Musik
       semuanya digambar ulang dari keadaan pemutar musik terkini. */
    this.subscribe(this.bus, Events.PLAYER_TRACK, (song) => { if (!this.videoMode) this.#showTrack(song); });
    this.subscribe(this.bus, Events.PLAYER_STATE, (state) => { if (!this.videoMode) this.#showState(state); });
    this.subscribe(this.bus, Events.PLAYER_PROGRESS, (p) => {
      this.musicProgress = p;
      if (!this.videoMode) this.#showProgress(p);
    });
    this.subscribe(this.bus, Events.PLAYER_DURATION, ({ song, seconds }) => {
      if (!this.videoMode && song.id === this.player.currentSong?.id) this.el.dur.textContent = formatTime(seconds);
    });

    this.subscribe(this.bus, Events.VIDEO_STATE, (payload) => this.#onVideoState(payload));
    this.subscribe(this.bus, Events.VIDEO_PROGRESS, ({ percent, seconds, duration }) => {
      if (!this.videoMode) return;
      this.#showProgress({ percent, seconds });
      if (duration > 0) this.el.dur.textContent = formatTime(duration);
    });

    this.#showTrack(this.player.currentSong);
    this.#showState(this.player.state);
    this.el.vol.value = this.player.volume;
    this.#applyVolume(this.player.volume);
  }

  #onVideoState({ active, playing, song, info }) {
    if (!active) return this.#leaveVideoMode();
    if (!this.videoMode) this.#enterVideoMode(song, info);
    else if (song && song !== this.videoSong) this.#showVideo(song, info);
    this.#showState({ playing });
  }

  /**
   * Tombol Next menunjuk video yang sama dengan Next/autoplay (videoStep): judulnya ada di label/tooltip, dan tombol
   * nonaktif hanya bila tidak ada video lain, sehingga apa yang diputar berikutnya selalu bisa diketahui.
   */
  #showNext() {
    const next = this.video.manualNext(this.library, this.videoSong) ?? videoStep(this.video.queue, this.library, this.video.position, 1, this.videoSong)?.video;
    const label = next ? `Video berikutnya: ${next.name}` : 'Tidak ada video berikutnya di antrean';
    this.el.forward.disabled = !next;
    this.el.forward.setAttribute('aria-label', label);
    this.el.forward.title = label;
  }

  /** Bar Musik menjadi Bar Video: thumbnail 16:9, judul, info singkat, play/pause, dan progres video. */
  #enterVideoMode(song, info) {
    this.videoMode = true;
    this.root.classList.add('video-mode');
    this.root.classList.remove('is-empty');
    const now = this.$('.now');
    now.setAttribute('role', 'button');
    now.setAttribute('tabindex', '0');
    now.setAttribute('aria-label', 'Daftar video selanjutnya');
    now.setAttribute('aria-expanded', String(this.upNextOpen));
    this.root.classList.toggle('upnext-open', this.upNextOpen);
    this.#showVideo(song, info);
    this.#setCredit('via YouTube', 'https://www.youtube.com');
  }

  /** Menampilkan satu video di Bar Video (thumbnail, judul, info, durasi, progres dari awal). */
  #showVideo(song, info) {
    this.videoSong = song;
    this.el.img.src = videoThumb(song);
    this.el.title.textContent = song.name;
    this.el.desc.textContent = [song.artist?.name ?? ARTIST_NAME, info?.album].filter(Boolean).join(' · ');
    this.el.dur.textContent = song.duration > 0 ? formatTime(song.duration) : '--:--';
    this.#showProgress({ percent: 0, seconds: 0 });
    this.#showNext();
  }

  /** Video tidak lagi tampil: Bar Musik tampil seperti semula. */
  #leaveVideoMode() {
    if (!this.videoMode) return;
    this.videoMode = false;
    this.videoSong = null;
    this.root.classList.remove('video-mode', 'upnext-open');
    this.$('.now').removeAttribute('aria-expanded');
    this.el.forward.setAttribute('aria-label', 'Next');
    this.el.forward.removeAttribute('title');
    this.el.forward.disabled = false;
    const now = this.$('.now');
    now.setAttribute('role', 'button');
    now.setAttribute('tabindex', '0');
    now.setAttribute('aria-label', 'Buka Now Playing');
    this.#setCredit('via SoundCloud', 'https://soundcloud.com');
    this.#showTrack(this.player.currentSong);
    this.#showState(this.player.state);
    this.#showProgress(this.musicProgress);
  }

  #setCredit(text, href) {
    const credit = this.$('.sc-credit');
    credit.textContent = text;
    credit.href = href;
  }

  #showTrack(song) {
    this.root.classList.toggle('is-empty', !song);
    if (!song) {
      this.el.img.src = PLACEHOLDER_IMG;
      this.el.title.textContent = 'Belum ada lagu';
      this.el.desc.textContent = 'Pilih lagu untuk mulai memutar';
      this.el.dur.textContent = '--:--';
      return;
    }
    this.el.img.src = song.cover;
    this.el.title.textContent = song.name;
    this.el.desc.textContent = `${song.artist.name}`;
    this.el.dur.textContent = formatDuration(song.duration);
  }

  #showState({ playing, activeId }) {
    this.el.play.firstElementChild.className = `fa-solid ${playing ? 'fa-pause' : 'fa-play'}`;
    this.el.play.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    /* Penanda tampilan saja: diputar / dijeda / belum diputar. */
    this.root.classList.toggle('is-playing', Boolean(playing));
    this.root.classList.toggle('is-paused', !playing && (this.videoMode || Boolean(activeId)));
    this.root.classList.toggle('is-idle', !playing && !this.videoMode && !activeId);
  }

  /* Progres datang beberapa kali per detik: digabung per frame, dan teks waktu hanya disentuh bila berubah. */
  #showProgress = perFrame(({ percent, seconds }) => {
    if (this.seek?.scrubbing) return; /* slider sedang digeser: jangan ditimpa */
    this.el.progress.value = percent;
    paintRange(this.el.progress, percent);
    const text = formatTime(seconds);
    if (this.el.cur.textContent !== text) this.el.cur.textContent = text;
  });

  #applyVolume(volume) {
    this.player.setVolume(volume);
    this.bus.emit(Events.PLAYER_VOLUME, volume);
  }

  #paintVolume(volume) {
    paintRange(this.el.vol, volume * 100);
    const icon = volume === 0 ? 'fa-volume-xmark' : volume < 0.5 ? 'fa-volume-low' : 'fa-volume-high';
    this.el.volIcon.className = `fa-solid ${icon}`;
  }
}
