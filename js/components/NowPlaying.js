'use strict';

/* ---- components/NowPlaying.js ---- */
/** Halaman Now Playing: tampilan detail dari Player Bar. Tidak punya pemutar sendiri, semua lewat PlayerController. */
class NowPlaying extends Component {
  #open = false;
  /** True sejak history.back() dipanggil oleh close() sampai popstate-nya tiba (atau jaring pengaman habis). */
  #pendingBack = false;
  #pendingTimer = null;
  /** Progres terakhir dari pemutar; ditampilkan saat halaman dibuka (selama tertutup, tampilan tidak diperbarui). */
  #progress = { percent: 0, seconds: 0 };

  constructor(root, { player, bus, favorites, router }) {
    super(root);
    this.player = player;
    this.bus = bus;
    this.favorites = favorites;
    this.router = router;
  }

  render() {
    return `
      <img class="np-bg" id="npBg" alt="" referrerpolicy="no-referrer">
      <button type="button" class="pg-back" id="npClose" aria-label="Kembali"><i class="fa-solid fa-arrow-left" aria-hidden="true"></i></button>
      <div class="np-body">
        <div class="np-top">
          <i class="sp"></i>
          <span>Sedang Diputar</span>
          <i class="sp"></i>
        </div>
        <div class="np-art"><img id="npImg" alt="" referrerpolicy="no-referrer"></div>
        <div class="np-queue" id="npQueue"></div>
        <div class="np-head">
          <div class="np-info">
            <div class="np-title" id="npTitle"></div>
            <button class="np-link np-artist" id="npArtist" aria-label="Buka artis"></button>
            <button class="np-link np-album" id="npAlbum" aria-label="Buka album"></button>
          </div>
          <button class="fav-btn" id="npFav" aria-label="Tambah ke Favorit" title="Tambah ke Favorit"><i class="fa-regular fa-heart"></i></button>
        </div>
        <div class="np-seek">
          <span class="time" id="npCur">0:00</span>
          <input type="range" id="npProgress" min="0" max="100" step="0.1" value="0" aria-label="Progress">
          <span class="time" id="npDur">--:--</span>
        </div>
        <div class="np-ctl">
          <button class="ctl" id="npShuffle" aria-label="Shuffle"><i class="fa-solid fa-shuffle"></i></button>
          <button class="ctl" id="npPrev" aria-label="Previous"><i class="fa-solid fa-backward"></i></button>
          <button class="ctl" id="npPlay" aria-label="Play"><i class="fa-solid fa-play"></i></button>
          <button class="ctl" id="npNext" aria-label="Next"><i class="fa-solid fa-forward"></i></button>
          <button class="ctl" id="npRepeat" aria-label="Repeat"><i class="fa-solid fa-repeat"></i></button>
        </div>
        <div class="np-vol">
          <i class="fa-solid fa-volume-low"></i>
          <input type="range" id="npVol" min="0" max="1" step="0.01" value="1" aria-label="Volume">
          <i class="fa-solid fa-volume-high"></i>
        </div>
        <div class="np-extra">
          <a class="sc-credit" href="https://soundcloud.com" target="_blank" rel="noopener">via SoundCloud</a>
          <button class="ctl" id="npQueueBtn" aria-label="Antrean putar" aria-pressed="false" title="Antrean putar"><i class="fa-solid fa-list"></i></button>
        </div>
      </div>`;
  }

  bind() {
    const q = (id) => this.$(id);
    this.el = {
      bg: q('#npBg'), img: q('#npImg'), title: q('#npTitle'), artist: q('#npArtist'), album: q('#npAlbum'),
      progress: q('#npProgress'), cur: q('#npCur'), dur: q('#npDur'),
      play: q('#npPlay'), shuffle: q('#npShuffle'), vol: q('#npVol'), close: q('#npClose'),
      repeat: q('#npRepeat'), fav: q('#npFav'), queue: q('#npQueue'), queueBtn: q('#npQueueBtn'),
    };

    this.listen(this.el.close, 'click', () => this.close());
    this.listen(document, 'keydown', (ev) => { if (ev.key === 'Escape' && this.#open) this.close(); });
    this.listen(window, 'popstate', () => {
      this.#endPendingBack();
      this.#setOpen(Boolean(history.state?.np));
    });
    this.subscribe(this.bus, Events.NOWPLAYING_OPEN, () => this.open());

    this.listen(this.el.play, 'click', () => this.player.toggle());
    this.listen(q('#npNext'), 'click', () => this.player.step(1));
    this.listen(q('#npPrev'), 'click', () => this.player.step(-1));
    this.listen(this.el.repeat, 'click', () => this.player.toggleRepeat());
    this.listen(this.el.fav, 'click', () => {
      const song = this.player.currentSong;
      if (song) this.favorites.toggle(song);
    });
    this.subscribe(this.bus, Events.FAVORITES_CHANGE, () => { if (this.#open) this.#showFavorite(this.player.currentSong); });
    this.listen(this.el.artist, 'click', () => {
      const artist = this.player.currentSong?.artist;
      if (artist) this.#goTo(`artist:${artist.id}`);
    });
    this.listen(this.el.album, 'click', () => {
      const song = this.player.currentSong;
      if (song?.album) this.#goTo(`album:${song.album.id}`);
    });
    this.listen(this.el.queueBtn, 'click', () => this.#toggleQueue());
    const playQueueRow = (ev) => {
      const row = ev.target.closest('.row[data-i]');
      if (row && !row.classList.contains('nosrc')) this.player.playIndex(Number(row.dataset.i));
    };
    this.listen(this.el.queue, 'click', playQueueRow);
    this.listen(this.el.queue, 'keydown', (ev) => {
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      ev.preventDefault();
      playQueueRow(ev);
    });
    this.listen(this.el.shuffle, 'click', () => this.player.toggleShuffle());
    this.seek = bindSeekSlider(this, this.el.progress, (percent) => this.player.seekToPercent(percent));
    this.listen(this.el.vol, 'input', () => {
      const v = Number(this.el.vol.value);
      this.player.setVolume(v);
      this.bus.emit(Events.PLAYER_VOLUME, v);
    });

    /* Selama halaman tertutup (tidak terlihat), tidak ada yang digambar ulang: gambar latar, antrean, dan progres 4x/detik
       tidak berebut waktu dengan tombol di Music Bar. Saat dibuka, #setOpen menyegarkan semuanya dari keadaan pemutar. */
    this.subscribe(this.bus, Events.PLAYER_VOLUME, (v) => {
      if (!this.#open) return;
      this.el.vol.value = v;
      paintRange(this.el.vol, v * 100);
    });
    this.subscribe(this.bus, Events.PLAYER_TRACK, (song) => { if (this.#open) this.#showTrack(song); });
    this.subscribe(this.bus, Events.PLAYER_STATE, (state) => { if (this.#open) this.#showState(state); });
    this.subscribe(this.bus, Events.PLAYER_PROGRESS, (p) => {
      this.#progress = p;
      if (this.#open) this.#showProgress(p);
    });
    this.subscribe(this.bus, Events.PLAYER_DURATION, ({ song, seconds }) => {
      if (this.#open && song.id === this.player.currentSong?.id) this.el.dur.textContent = formatTime(seconds);
    });

    this.#showTrack(this.player.currentSong);
    this.#showState(this.player.state);
    this.el.vol.value = this.player.volume;
    paintRange(this.el.vol, this.player.volume * 100);
  }

  open() {
    /* Selama back dari close() belum selesai, membuka lagi akan membuat entri np baru yang langsung ikut tercabut oleh back itu. */
    if (this.#open || this.#pendingBack || !this.player.currentSong) return;
    try { history.pushState({ np: 1 }, ''); } catch { /* tanpa History API: tetap tampil, tutup lewat tombol */ }
    this.#setOpen(true);
  }

  /**
   * Menutup halaman seketika (tidak menunggu history), lalu melepas entri history-nya di belakang layar
   * agar tombol back browser/HP tetap sejalan. Musik tidak terhenti.
   * Ketukan ganda diabaikan: kedua ketukan tidak boleh memanggil history.back() dua kali (keluar dari halaman).
   */
  close() {
    if (!this.#open) return;
    this.#setOpen(false);
    if (!history.state?.np) return;
    this.#pendingBack = true;
    history.back();
    /* Jaring pengaman bila popstate tidak datang: lepaskan penanda dan netralkan entri np yang tertinggal. */
    this.#pendingTimer = setTimeout(() => {
      this.#endPendingBack();
      if (history.state?.np) {
        try { history.replaceState(null, ''); } catch { /* abaikan */ }
      }
    }, 400);
  }

  #endPendingBack() {
    this.#pendingBack = false;
    clearTimeout(this.#pendingTimer);
  }

  #setOpen(open) {
    if (open && !this.player.currentSong) open = false;
    if (open === this.#open) return;
    this.#open = open;
    this.root.classList.toggle('open', open);
    this.root.inert = !open;
    this.root.setAttribute('aria-hidden', String(!open));
    if (open) {
      this.#showTrack(this.player.currentSong);
      this.#showState(this.player.state);
      this.#showProgress(this.#progress);
      this.el.vol.value = this.player.volume;
      paintRange(this.el.vol, this.player.volume * 100);
      this.el.close.focus({ preventScroll: true });
    }
  }

  /** Tutup halaman ini (tanpa menghentikan musik) lalu buka halaman artist/album. */
  #goTo(token) {
    if (history.state?.np) {
      try { history.replaceState(null, ''); } catch { /* abaikan */ }
    }
    this.#setOpen(false);
    this.router.navigate(token);
  }

  #toggleQueue() {
    const on = !this.root.classList.contains('queue');
    this.root.classList.toggle('queue', on);
    this.el.queueBtn.classList.toggle('active', on);
    this.el.queueBtn.setAttribute('aria-pressed', String(on));
    if (on) this.#renderQueue();
  }

  /** Lagu yang sedang diputar + 50 lagu berikutnya sesuai urutan putar aktual. */
  #renderQueue() {
    if (!this.root.classList.contains('queue')) return;
    const items = this.player.queueItems;
    const cursor = this.player.queueCursor;
    const { shuffle, repeat } = this.player.state;
    const tags = [shuffle && 'Acak', repeat && 'Ulangi'].filter(Boolean).join(' \u2022 ');
    /* Baris antrean = komponen SongRow yang sama dengan Beranda; lagu yang sedang diputar memakai state .playing. */
    const rows = items.slice(cursor, cursor + 51).map((song, i) =>
      SongRow(song, null, { cls: i === 0 ? 'playing' : '', attrs: `data-i="${cursor + i}" tabindex="${song.isPlayable ? 0 : -1}"` })).join('');
    this.el.queue.innerHTML = `<div class="np-q-title">Berikutnya${tags ? ` \u2022 ${tags}` : ''}</div><div role="list">${rows}</div>`;
  }

  #showFavorite(song) {
    const on = this.favorites.has(song);
    this.el.fav.classList.toggle('on', on);
    this.el.fav.disabled = !song;
    this.el.fav.querySelector('i').className = `fa-${on ? 'solid' : 'regular'} fa-heart`;
    const label = on ? 'Hapus dari Favorit' : 'Tambah ke Favorit';
    this.el.fav.setAttribute('aria-label', label);
    this.el.fav.setAttribute('aria-pressed', String(on));
    this.el.fav.title = label;
  }

  #showTrack(song) {
    this.#showFavorite(song);
    this.#renderQueue();
    if (!song) {
      this.el.img.src = this.el.bg.src = PLACEHOLDER_IMG;
      this.el.title.textContent = this.el.artist.textContent = this.el.album.textContent = '';
      this.el.dur.textContent = '--:--';
      return;
    }
    this.el.img.src = this.el.bg.src = song.cover;
    this.el.title.textContent = song.name;
    this.el.artist.textContent = song.artist.name;
    this.el.album.textContent = song.album?.name ?? 'Single';
    this.el.dur.textContent = formatDuration(song.duration);
  }

  #showState({ playing, shuffle, repeat }) {
    this.root.classList.toggle('paused', !playing);
    this.el.repeat.classList.toggle('active', repeat);
    this.el.play.firstElementChild.className = `fa-solid ${playing ? 'fa-pause' : 'fa-play'}`;
    this.el.play.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    this.el.shuffle.classList.toggle('active', shuffle);
    this.#renderQueue();
  }

  /* Progres datang beberapa kali per detik: digabung per frame, dan teks waktu hanya disentuh bila berubah. */
  #showProgress = perFrame(({ percent, seconds }) => {
    if (this.seek?.scrubbing) return; /* slider sedang digeser: jangan ditimpa */
    this.el.progress.value = percent;
    paintRange(this.el.progress, percent);
    const text = formatTime(seconds);
    if (this.el.cur.textContent !== text) this.el.cur.textContent = text;
  });
}
