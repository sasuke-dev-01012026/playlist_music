'use strict';

/* ---- components/ViewOutlet.js ---- */
/**
 * Area konten utama. Memilih View berdasarkan route, menampilkan hasilnya,
 * menangani klik di dalam konten (navigasi / putar lagu), dan menyelaraskan
 * penanda "sedang diputar" dengan state player.
 *
 * root = elemen <main> (berisi tab, #view, dan footer statis dari index.html).
 */
class ViewOutlet extends Component {
  #songs = [];
  #route = null;
  /** Keadaan penanda 'sedang diputar' yang terakhir diterapkan ke halaman (lihat #syncPlayback). */
  #synced = null;
  /** Asal playlist yang sedang dibuka: 'home' bila dari Playlist Pilihan Beranda, null bila dari kategori Jelajah. */
  #playlistFrom = null;
  /** Video yang sedang hidup di wadah permanen (#vidHost): kunci YouTube, id lagu, dan pengamat ukuran. */
  #hostKey = null;
  #videoBack = null;
  #hostSongId = null;
  #hostRO = null;
  /** Autoplay: id video yang dibuka otomatis dan jumlah lompatan berturut-turut karena gagal dimuat. */
  #autoId = null;
  #autoSkips = 0;
  /** Daftar "Video selanjutnya" (dibuka lewat klik Bar Video) sedang tampil di halaman pemutaran. */
  #upNextOpen = false;
  /** Id video pada daftar "Video selanjutnya" yang sedang tampil, sesuai urutan baris. */
  #upNextItems = [];

  constructor(root, { catalog, router, player, bus, favorites, video }) {
    super(root);
    this.favorites = favorites;
    this.video = video;
    /** Katalog aplikasi: pustaka, pencarian, riwayat, dan tampilan. */
    this.catalog = catalog;
    this.router = router;
    this.player = player;
    this.bus = bus;
    this.container = root.querySelector('#view');
  }

  get views() {
    return this.catalog.views;
  }

  bind() {
    this.listen(this.container, 'click', (event) => this.#onClick(event));
    this.listen(this.root.querySelector('#vidHost'), 'click', (event) => this.#onHostClick(event));
    this.#bindSwipe();
    this.subscribe(this.bus, Events.ROUTE_CHANGE, ({ route, source }) => this.show(route, source));
    this.subscribe(this.bus, Events.PLAYER_STATE, (state) => {
      this.#syncPlayback(state);
      /* Audio menyala saat video terbuka: hentikan video agar tidak bersuara bersamaan. */
      const video = this.views.get('video');
      if (state.playing && this.#route?.view === 'video' && video.isOpen) {
        video.stop();
        this.#rerender();
      } else if (state.playing && this.#hostKey && this.#route?.view !== 'video') {
        /* Audio menyala saat video mini tampil: tutup video mini agar tidak bersuara bersamaan. */
        this.#closeMini();
      }
    });
    /* Autoplay: video selesai -> video berikutnya (urutan sama dengan Next: seluruh video penyanyi, melingkar, lalu penyanyi berikutnya). */
    this.subscribe(this.bus, Events.VIDEO_ENDED, ({ song }) => { this.#autoSkips = 0; this.#autoAdvance(song); });
    /* Klik Bar Video: buka/tutup daftar "Video selanjutnya". */
    this.subscribe(this.bus, Events.VIDEO_UPNEXT, () => this.#toggleUpNext());
    /* Tombol Next di Bar Video: aturan yang sama dengan autoplay. */
    this.subscribe(this.bus, Events.VIDEO_NEXT, () => { const song = this.video.song; if (song) this.#playStep(song, 1, false); });
    this.subscribe(this.bus, Events.VIDEO_PREV, () => { const song = this.video.song; if (song) this.#playStep(song, -1, false); });
    /* Video hasil autoplay gagal dimuat: lewati ke berikutnya (maksimal beberapa kali berturut-turut agar tidak berputar). */
    this.subscribe(this.bus, Events.VIDEO_ERROR, ({ song }) => {
      if (song?.id !== this.#autoId || this.#autoSkips >= 3) return;
      this.#autoSkips++;
      this.#autoAdvance(song);
    });
    this.subscribe(this.bus, Events.FAVORITES_CHANGE, () => {
      this.player.syncFavoritesQueue(this.favorites.songs);
      this.#refreshFavorites();
    });
    this.subscribe(this.bus, Events.PLAYER_DURATION, ({ song, seconds }) => {
      this.#updateDuration(song.id, seconds);
      this.#updateTotal();
    });
  }

  /** Geser kiri/kanan untuk pindah antar 5 halaman utama (Beranda, Jelajah, Lagu, Video, Suka). */
  #bindSwipe() {
    const MIN_DISTANCE = 60;
    const MAX_MS = 800;
    let start = null;

    /** True jika sentuhan dimulai di elemen yang bisa digulir mendatar (mis. bar tab), agar gesturnya tidak bentrok. */
    const inHorizontalScroller = (el) => {
      for (let node = el; node && node !== this.root; node = node.parentElement) {
        if (node.scrollWidth > node.clientWidth && /(auto|scroll)/.test(getComputedStyle(node).overflowX)) return true;
      }
      return false;
    };

    this.listen(this.root, 'touchstart', (event) => {
      const touch = event.touches[0];
      start = event.touches.length === 1 && !inHorizontalScroller(event.target)
        ? { x: touch.clientX, y: touch.clientY, time: Date.now() }
        : null;
    }, { passive: true });

    this.listen(this.root, 'touchend', (event) => {
      if (!start) return;
      const touch = event.changedTouches[0];
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      const fast = Date.now() - start.time <= MAX_MS;
      start = null;
      if (!fast || Math.abs(dx) < MIN_DISTANCE || Math.abs(dx) < Math.abs(dy) * 1.5) return;

      /* Geser antarmenu hanya berlaku di halaman utama; detail dan hasil pencarian tidak punya halaman sebelah. */
      const currentView = this.#route?.view;
      const index = NAV_ITEMS.findIndex((item) => item.view === currentView);
      if (index === -1) return;
      const target = NAV_ITEMS[index + (dx < 0 ? 1 : -1)];
      if (target) this.router.navigate(target.view);
    }, { passive: true });

    this.listen(this.root, 'touchcancel', () => { start = null; }, { passive: true });
  }

  show(route, source = 'navigate') {
    /* Daftar "Video selanjutnya" hanya hidup di halaman pemutaran; ke halaman lain ia tertutup. */
    if (route.view !== 'video') this.#upNextOpen = false;
    const view = this.views.get(route.view);
    const rendered = view.render(route);
    const { songs } = rendered;
    /* Detail yang tidak ditemukan (id salah atau sudah dihapus): tampilkan pesan, bukan halaman kosong. */
    const html = rendered.html
      || BackButton('home', 'Beranda') + '<p style="color:var(--muted);margin-top:14px">Halaman tidak ditemukan.</p>';
    const previous = this.#route;
    /* Antrean video = daftar tempat video DIBUKA, dipakai untuk urutan penyanyi: hasil pencarian, atau semua video (halaman Video / tautan langsung).
       Membuka video dari daftar mana pun memulai sesi baru, juga saat video lain berjalan sebagai video mini. Pengecualian: membuka lagi
       video yang sedang berjalan sebagai video mini (perbesar / kembali ke halamannya) melanjutkan sesi yang ada.
       Di dalam sesi: memilih video (mis. video terkait) memulai siklus penyanyinya dari video itu; Next/Previous/autoplay sudah memajukan
       posisi sebelum rute berganti; kembali/maju di riwayat melanjutkan siklus penyanyi video itu. */
    if (route.view === 'video') {
      const song = this.catalog.library.getVideo(route.id);
      const resumesMini = this.#hostKey !== null && this.#hostSongId === route.id;
      if (song && previous?.view !== 'video' && !resumesMini) {
        const fromSearch = previous?.view === 'search' ? this.catalog.searchService.search(previous.query).videos : null;
        this.video.startQueue(fromSearch, song);
      } else if (song && source === 'popstate') this.video.revisit(song);
      else if (song && this.video.position?.song.id !== song.id) {
        const queue = this.video.queue;
        if (queue && !queue.some((item) => videoArtistId(item) === videoArtistId(song))) this.video.startQueue(null, song);
        else this.video.select(song);
      }
      /* Video yang dibuka selain oleh autoplay tidak ikut aturan lompat-karena-gagal milik autoplay. */
      if (route.id !== this.#autoId) { this.#autoId = null; this.#autoSkips = 0; }
    }
    /* Video yang sedang hidup tetap berjalan sebagai video mini; hanya reset bila tidak ada video aktif. */
    if (previous?.view === 'video' && route.view !== 'video' && !this.#hostKey) this.views.get('video').leave();
    /* Membuka video: jeda audio lagu agar tidak bersuara bersamaan. */
    if (route.view === 'video') this.player.pausePlayback();
    this.#route = route;
    /* Latar belakang dekoratif mengikuti menu utama yang aktif. */
    const bg = document.getElementById('bgDeco');
    if (bg) bg.dataset.scene = ['home', 'explore', 'songs', 'videos', 'favorites'].includes(route.section) ? route.section : 'home';
    this.container.innerHTML = html;
    /* Halaman pemutaran: navbar atas disembunyikan (barisnya ikut mengecil); tampil lagi di halaman lain. Sebelum #syncVideo agar posisi video dihitung dari tata letak akhir. */
    this.root.closest('.app')?.classList.toggle('no-nav', Boolean(this.container.querySelector('.vid-watch')));
    this.#syncVideo();
    this.#syncUpNext();
    this.#songs = songs;
    /* Tombol kembali halaman detail: tujuan dan labelnya ditentukan dari halaman asal (lihat backTargetFor). */
    if (route.view === 'playlist') this.#playlistFrom = playlistOriginFor(previous, this.#playlistFrom);
    const back = this.container.querySelector('.back');
    const target = backTargetFor(route, previous, this.#playlistFrom);
    if (back && target) {
      back.dataset.go = target.go;
      back.lastChild.textContent = ` ${target.label}`;
    }
    /* Tombol kembali halaman pemutaran: ke menu utama tempat video dibuka (Beranda, Jelajah, Lagu, Suka, Video);
       dari tempat lain (pencarian, artis, tautan langsung) ke daftar Video. Pindah antar video tidak mengganti asal. */
    if (route.view === 'video') {
      if (previous?.view !== 'video') this.#videoBack = NAV_ITEMS.find((item) => item.view === previous?.view) ?? null;
      const dest = this.#videoBack ?? NAV_ITEMS.find((item) => item.view === 'videos');
      const videoBack = this.container.querySelector('.pg-back');
      if (videoBack && dest) {
        videoBack.dataset.go = dest.view;
        videoBack.setAttribute('aria-label', `Kembali ke ${dest.label}`);
      }
    }
    /* Halaman baru selalu mulai dari atas. */
    this.root.scrollTo({ top: 0, behavior: 'instant' });
    /* Kabar untuk lapisan efek (efek gerak di bawah); aplikasi tidak bergantung padanya. */
    document.dispatchEvent(new CustomEvent('view:enter', { detail: { view: route.view, source } }));
    this.#syncPlayback(this.player.state, true);
  }

  /** Daftar Favorites digambar ulang di tempat (tanpa lompat ke atas) saat ada lagu ditambah/dihapus. */
  #refreshFavorites() {
    if (this.#route?.view === 'favorites') this.#rerender();
  }

  /** Menggambar ulang halaman aktif di tempat (posisi gulir dipertahankan). */
  #rerender() {
    const top = this.root.scrollTop;
    const { html, songs } = this.views.get(this.#route.view).render(this.#route);
    this.container.innerHTML = html;
    this.#songs = songs;
    this.root.scrollTo({ top, behavior: 'instant' });
    this.#syncPlayback(this.player.state, true);
    this.#syncVideo();
    this.#syncUpNext();
  }

  /**
   * Klik Bar Video. Di halaman pemutaran: buka/tutup daftar. Dari halaman lain (video tampil sebagai video mini): kembali ke
   * halaman pemutaran dengan daftar terbuka; video tidak dimuat ulang karena iframe-nya permanen (#vidHost).
   */
  #toggleUpNext() {
    if (!this.video.active) return;
    if (this.#route?.view !== 'video') {
      if (this.#hostSongId === null) return;
      this.#upNextOpen = true;
      return this.router.navigate(`video:${this.#hostSongId}`);
    }
    this.#upNextOpen = !this.#upNextOpen;
    this.#syncUpNext();
  }

  /**
   * Menyamakan halaman pemutaran dengan #upNextOpen. Terbuka: halaman diberi kelas is-upnext (CSS menyembunyikan info lagu dan
   * "Video terkait", pemutar tetap di atas) dan daftar "Video selanjutnya" disisipkan, memakai baris yang sama dengan hasil pencarian.
   * Hanya kelas dan satu section yang berubah; pemutar tidak digambar ulang, jadi video terus berjalan.
   */
  #syncUpNext() {
    const page = this.container.querySelector('.vid-watch');
    const layout = page?.querySelector('.vid-layout');
    if (layout && !this.video.active) this.#upNextOpen = false;
    const open = Boolean(layout) && this.#upNextOpen;
    if (layout) {
      const was = page.classList.contains('is-upnext');
      layout.querySelector('.vid-upnext')?.remove();
      page.classList.toggle('is-upnext', open);
      if (open) {
        layout.insertAdjacentHTML('beforeend', this.#upNextHtml());
        /* Jarak pemutar–konten hanya saat daftar digulir (lihat .vid-upnext.is-scrolled). */
        const upNext = layout.querySelector('.vid-upnext');
        upNext?.addEventListener('scroll', () => upNext.classList.toggle('is-scrolled', upNext.scrollTop > 0), { passive: true });
        /* Seret & lepas: urutan baru disimpan di VideoController (dipakai Next/autoplay), daftar tidak digambar ulang. */
        if (upNext && this.#upNextItems.length) {
          const anchor = this.video.song ?? this.catalog.library.getVideo(this.#route.id);
          enableUpNextReorder(upNext, this.#upNextItems, (ids) => { this.#upNextItems = ids; this.video.setManualOrder(ids, anchor); });
        }
      }
      if (open !== was) {
        /* Tata letak berganti (halaman tidak lagi bergulir, daftar yang bergulir): posisikan ulang pemutar di atas slot-nya. */
        this.root.scrollTo({ top: 0, behavior: 'instant' });
        const slot = page.querySelector('.vid-slot');
        if (slot && this.#hostKey) this.#dockHost('stage', slot);
      }
    }
    this.bus.emit(Events.VIDEO_UPNEXT_STATE, { open });
  }

  #upNextHtml() {
    const library = this.catalog.library;
    const current = this.video.song ?? library.getVideo(this.#route.id);
    const position = this.video.position?.song.id === current.id ? this.video.position : { song: current, entry: current.id };
    let list = upNextVideos(this.video.queue, library, position);
    /* Urutan manual (hasil seret) didahulukan; sisanya dilanjutkan dengan aturan bawaan dari video terakhir di urutan itu. */
    const manual = this.video.manualOrder(position.song);
    if (manual) {
      const head = manual.map((id) => library.getVideo(id)).filter((v) => v && videoKey(v) !== videoKey(position.song));
      const seen = new Set([videoKey(position.song), ...head.map(videoKey)]);
      const last = head[head.length - 1];
      const tail = last ? upNextVideos(this.video.queue, library, { song: last, entry: last.id }) : [];
      list = [...head, ...tail.filter((v) => !seen.has(videoKey(v)))].slice(0, VIDEO_WATCH_COUNT);
    }
    this.#upNextItems = list.map((v) => v.id);
    const body = list.length
      ? `<div role="list">${list.map((song) => VideoSearchRow(song, videoInfo(library, song))).join('')}</div>`
      : EmptyState('fa-circle-play', 'Tidak ada video selanjutnya.');
    return `<section class="vid-related vid-upnext" aria-label="Video selanjutnya"><div class="vid-upnext-in"><h2>Video selanjutnya</h2>${body}${this.root.querySelector('.credit')?.outerHTML ?? ''}</div></section>`;
  }

  /**
   * Video yang sedang tampil (iframe di halaman pemutaran) didaftarkan ke VideoController, sehingga Bar Musik
   * berubah menjadi Bar Video. Tanpa iframe (halaman lain, atau video dijeda karena audio menyala), bar kembali menjadi Bar Musik.
   */
  #syncVideo() {
    const library = this.catalog.library;
    const onVideoPage = this.#route?.view === 'video';
    const slot = onVideoPage ? this.container.querySelector('.vid-slot') : null;
    const song = slot ? library.getVideo(this.#route.id) : null;
    if (slot && song) {
      /* Halaman pemutaran: iframe permanen dilabuhkan tepat di atas slot (tanpa dimuat ulang bila videonya sama). */
      const frame = this.#ensureHostFrame(slot, song);
      this.#dockHost('stage', slot);
      this.video.attach(frame, song, videoInfo(library, song));
    } else if (onVideoPage) {
      /* Poster (video dijeda karena audio menyala) atau video tidak ada: tidak ada video yang berjalan. */
      this.#closeHost();
      this.video.detach();
    } else if (this.#hostKey) {
      /* Halaman lain: video lanjut sebagai video kecil di atas Bar Video; kontrol tetap di bar. */
      this.#dockHost('mini');
    } else {
      this.video.detach();
    }
  }

  /**
   * Memutar video berikutnya setelah `song` selesai. Diabaikan bila video sudah berganti (mis. Next baru ditekan)
   * atau tidak ada video berikutnya. Aturan urutan sama persis dengan Next/Previous (videoStep lewat #playStep).
   */
  #autoAdvance(song) {
    if (!song || this.video.song?.id !== song.id) return;
    this.#playStep(song, 1, true);
  }

  /**
   * Satu jalur untuk Next, Previous, dan autoplay: menghitung video tujuan (videoStep), memajukan posisi antrean, lalu memutarnya.
   * Di halaman pemutaran memakai rute video; saat tampil sebagai video mini, iframe diganti di tempat tanpa memindahkan halaman pengguna.
   */
  #playStep(from, direction, auto) {
    const library = this.catalog.library;
    /* Urutan manual (seret & lepas) didahulukan untuk Next/autoplay; Previous tetap memakai aturan bawaan. */
    const manual = direction > 0 ? this.video.manualNext(library, from) : null;
    const step = manual ? { video: manual, entry: manual.id } : videoStep(this.video.queue, library, this.video.position, direction, from);
    if (!step) return;
    const next = step.video;
    this.#autoId = auto ? next.id : null;
    this.video.advance(step);
    if (this.#route?.view === 'video') return this.router.navigate(`video:${next.id}`);
    if (!this.#hostKey) return;
    const key = videoKey(next);
    const frame = this.#ensureHostFrame({ dataset: { key, title: next.name, src: videoEmbedSrc(key) } }, next);
    this.video.attach(frame, next, videoInfo(library, next));
  }

  get #host() { return this.root.querySelector('#vidHost'); }

  /** Membuat iframe video di wadah permanen, atau memakai yang sudah ada bila videonya sama. */
  #ensureHostFrame(slot, song) {
    const host = this.#host;
    const box = host.querySelector('.vid-frame');
    let frame = box.querySelector('iframe');
    if (!frame || this.#hostKey !== slot.dataset.key) {
      box.textContent = '';
      frame = document.createElement('iframe');
      frame.title = slot.dataset.title || '';
      frame.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
      frame.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      frame.setAttribute('allowfullscreen', '');
      box.appendChild(frame);
      /* Poster dulu: iframe YouTube (berat) baru dimulai setelah poster tampil, atau paling lambat 1,5 dtk, agar tidak berebut
         bandwidth 4G dengan LCP. Poster sudah di cache (sama dengan thumbnail daftar) -> iframe langsung mulai. */
      const src = slot.dataset.src;
      const poster = slot instanceof Element ? slot.parentElement?.querySelector('.vid-load') : null;
      const start = () => { if (frame.isConnected && !frame.getAttribute('src')) frame.src = src; };
      if (poster && !poster.complete) {
        poster.addEventListener('load', start, { once: true });
        poster.addEventListener('error', start, { once: true });
        setTimeout(start, 1500);
      } else start();
      this.#hostKey = slot.dataset.key;
    }
    this.#hostSongId = song.id;
    const title = host.querySelector('#vidMiniTitle');
    if (title) title.textContent = song.name;
    return frame;
  }

  /** stage = menimpa slot di halaman pemutaran; mini = video kecil melayang di atas Bar Video. */
  #dockHost(mode, slot = null) {
    const host = this.#host;
    host.hidden = false;
    this.#hostRO?.disconnect();
    this.#hostRO = null;
    if (mode === 'stage' && slot) {
      host.classList.remove('is-mini');
      host.classList.add('is-stage');
      const place = () => {
        const r = slot.getBoundingClientRect();
        const m = this.root.getBoundingClientRect();
        host.style.left = `${r.left - m.left + this.root.scrollLeft}px`;
        host.style.top = `${r.top - m.top + this.root.scrollTop}px`;
        host.style.width = `${r.width}px`;
        host.style.height = `${r.height}px`;
      };
      place();
      this.#hostRO = new ResizeObserver(place);
      this.#hostRO.observe(slot);
      this.#hostRO.observe(this.root);
    } else if (!host.classList.contains('is-mini')) {
      host.removeAttribute('style');
      host.classList.remove('is-stage');
      host.classList.add('is-mini');
    }
  }

  /** Membuang iframe video dan menyembunyikan wadah. */
  #closeHost() {
    const host = this.#host;
    this.#hostRO?.disconnect();
    this.#hostRO = null;
    host.querySelector('.vid-frame').textContent = '';
    host.className = 'vid-host';
    host.removeAttribute('style');
    host.hidden = true;
    this.#hostKey = null;
    this.#hostSongId = null;
  }

  /** Menutup video mini: video berhenti dan Bar Video kembali menjadi Bar Musik. */
  #closeMini() {
    this.#closeHost();
    this.views.get('video').leave();
    this.video.detach();
  }

  #onHostClick(event) {
    if (event.target.closest('[data-vid-close]')) return this.#closeMini();
    if (event.target.closest('[data-vid-expand]') && this.#hostSongId !== null) this.router.navigate(`video:${this.#hostSongId}`);
  }

  #onClick(event) {
    if (event.target.closest('[data-more]')) {
      this.views.get('search').showMore();
      return this.#rerender();
    }

    const filterBtn = event.target.closest('[data-filter]');
    if (filterBtn) {
      this.views.get('search').setFilter(filterBtn.dataset.filter);
      return this.#rerender();
    }

    const scrollBtn = event.target.closest('[data-scroll]');
    if (scrollBtn) {
      const track = scrollBtn.parentElement.querySelector('.carousel-track');
      track?.scrollBy({ left: Number(scrollBtn.dataset.scroll) * track.clientWidth * 0.8 });
      return;
    }

    const recPage = event.target.closest('[data-rec-page]');
    if (recPage) {
      this.views.get('home').setPage(Number(recPage.dataset.recPage));
      return this.#rerender();
    }

    /* Tombol putar di pemutar video yang sedang dijeda: jeda audio lalu putar videonya lagi. */
    const videoTarget = event.target.closest('[data-video]');
    if (videoTarget) {
      this.player.pausePlayback();
      this.views.get('video').resume();
      return this.#rerender();
    }

    const favTarget = event.target.closest('[data-fav]');
    if (favTarget) {
      const song = this.#songs.find((item) => String(this.favorites.keyOf(item)) === favTarget.dataset.fav);
      if (song) this.favorites.toggle(song);
      return;
    }

    const goTarget = event.target.closest('[data-go]');
    if (goTarget) {
      event.preventDefault();
      /* Feedback klik pada link jelajah: ikon "pop" singkat sebelum pindah halaman. */
      if (goTarget.hasAttribute('data-explore') && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        goTarget.classList.add('clicked');
        return void setTimeout(() => this.router.navigate(goTarget.dataset.go), 140);
      }
      return this.router.navigate(goTarget.dataset.go);
    }

    const playTarget = event.target.closest('[data-play]');
    if (!playTarget) return;
    const songId = Number(playTarget.dataset.play);
    if (this.player.isCurrent(songId)) this.player.toggle();
    else this.player.playFrom(this.#songs, songId, this.#route?.view === 'favorites' ? 'favorites' : null);
  }

  /**
   * Menandai item lagu yang sedang diputar. `full` = halaman baru digambar: semua item disesuaikan.
   * Selain itu hanya item lagu yang sebelumnya aktif dan yang kini aktif yang disentuh (tombol play/pause tidak lagi
   * menyisir ratusan baris di halaman Lagu); item lain sudah berada pada keadaan hasil penyesuaian penuh terakhir.
   */
  #syncPlayback({ activeId, playing }, full = false) {
    const previous = this.#synced;
    this.#synced = { activeId, playing };
    const apply = (el) => {
      const active = activeId !== null && Number(el.dataset.play) === activeId;
      el.classList.toggle('playing', active);
      const icon = el.querySelector('.card-play i');
      if (icon) icon.className = `fa-solid ${active && playing ? 'fa-pause' : 'fa-play'}`;
    };
    if (full || !previous) {
      this.container.querySelectorAll('[data-play]').forEach(apply);
      return;
    }
    if (previous.activeId === activeId && previous.playing === playing) return;
    const changed = [...new Set([previous.activeId, activeId])].filter((id) => id !== null);
    if (changed.length) this.container.querySelectorAll(changed.map((id) => `[data-play="${id}"]`).join(',')).forEach(apply);
  }

  /**
   * Total durasi di header (elemen [data-total], lihat HeroTotal) dihitung ulang dari daftar lagu halaman ini
   * setelah durasi baru masuk. Hanya satu teks yang diganti; halaman tidak digambar ulang.
   */
  #updateTotal() {
    const total = this.container.querySelector('[data-total]');
    if (!total) return;
    const text = formatTotal(this.#songs);
    if (total.textContent !== text) total.textContent = text;
  }

  /** Durasi di setiap item lagu diperbarui di tempat saat durasi asli dari SoundCloud masuk. */
  #updateDuration(songId, seconds) {
    this.container.querySelectorAll(`.dur[data-song="${songId}"]`).forEach((el) => {
      el.textContent = formatDuration(seconds);
    });
  }
}
