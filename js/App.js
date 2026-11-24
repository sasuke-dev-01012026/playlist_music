'use strict';

/* ---- App.js ---- */
/**
 * Composition root: satu-satunya tempat yang membuat objek dan menyambungkan dependensinya
 * (dependency injection manual). Kelas lain hanya menerima apa yang mereka butuhkan lewat constructor.
 */
class App {
  start() {
    const bus = new EventBus();
    const router = new Router(bus);
    const favorites = new FavoritesStore({ bus });

    /* Thumbnail YouTube WebP yang gagal dimuat -> JPG (satu kali; setelah diganti, alamatnya tidak lagi cocok sehingga tidak berulang). */
    document.addEventListener('error', (event) => {
      const img = event.target;
      if (img instanceof HTMLImageElement && img.src.includes('/vi_webp/')) {
        img.src = img.src.replace('/vi_webp/', '/vi/').replace(/\.webp$/, '.jpg');
      }
    }, true);

    const library = new MusicLibrary(MUSIC_DATA);
    DurationCache.apply(library.songs);
    favorites.register(library);
    const searchService = new SearchService(library);
    const recent = new RecentlyPlayed({ library, bus });
    const views = createViews(library, searchService, recent, favorites);
    const catalog = { library, searchService, recent, views };

    const video = new VideoController({ bus });
    const soundCloud = new SoundCloudPlayer(byId('sc'));
    const player = new PlayerController({
      soundCloud,
      bus,
      songs: library.songs,
    });

    this.#bindMediaSession(player, bus, video);

    const deps = { router, bus };
    const initialComponents = [
      new Navbar(byId('navbar'), deps),
      new BottomNav(byId('sidebar'), deps),
      new ViewOutlet(byId('main'), { catalog, router, player, bus, favorites, video }),
      new PlayerBar(byId('player'), { player, bus, favorites, video, router, library }),
      new NowPlaying(byId('nowPlaying'), { player, bus, favorites, router }),
      new Toast(byId('toast'), { bus }),
      new ImageSkeleton(byId('main')),
      new VideoPager(byId('main'), { views: catalog.views }),
    ];
    /* Pintasan keyboard & tarik-untuk-refresh tidak dibutuhkan untuk render pertama: dipasang sesudah paint (memecah task awal, INP lebih baik). */
    const lateComponents = [
      new KeyboardShortcuts(document, { player, video }),
      new PullToRefresh(byId('main'), {
        onRefresh: () => {
          const route = router.current;
          /* Halaman video: render ulang akan memuat ulang iframe YouTube, jadi dilewati. */
          if (route.view === 'video') return;
          /* Beranda: susunan acak (rekomendasi, dst.) dibuat ulang agar refresh terasa nyata. */
          if (route.view === 'home') views.set('home', new HomeView(library, recent));
          bus.emit(Events.ROUTE_CHANGE, { route, source: 'refresh' });
        },
      }),
    ];
    this.components = [...initialComponents, ...lateComponents];
    initialComponents.forEach((component) => component.mount());

    /* Skeleton layar awal (HTML statis) dilepas dulu agar render pertama menggantikannya, lalu dipudarkan di atas konten. */
    const view = byId('view');
    const boots = [...view.querySelectorAll(':scope > .sk-boot')];
    const boot = boots.find((el) => getComputedStyle(el).display !== 'none') ?? null;
    boots.forEach((el) => el.remove());
    router.start();
    dismissBootSkeleton(view, boot);
    requestAnimationFrame(() => setTimeout(() => lateComponents.forEach((component) => component.mount()), 0));

    /* Widget SoundCloud (iframe + api.js) menyala setelah halaman selesai dimuat, atau lebih awal bila pengguna
       mulai berinteraksi / memutar lagu (perintah play otomatis menyalakannya). */
    this.#warmUpSoundCloud(soundCloud);
    /* Pengukuran durasi di latar belakang menunggu load + idle, supaya tidak berebut jaringan dengan render awal. */
    if (library.songs.length && !isConstrainedNetwork()) whenIdle(() => this.#prefetchDurations(library, bus), 3000, 10000);
  }

  /**
   * Kontrol layar kunci / notifikasi media (Media Session API). Ringan: tidak ada yang dipasang sebelum lagu pertama diputar;
   * sesudahnya hanya ada pembaruan metadata saat lagu berganti dan posisi paling sering sekali per detik.
   */
  #bindMediaSession(player, bus, video) {
    if (!('mediaSession' in navigator)) return;
    const session = navigator.mediaSession;
    let armed = false;
    let lastPosition = 0;

    const setMetadata = (song) => {
      if (!song || typeof MediaMetadata === 'undefined') return;
      try {
        session.metadata = new MediaMetadata({
          title: song.name,
          artist: song.artist?.name ?? '',
          album: song.album?.name ?? '',
          artwork: [{ src: song.cover, sizes: '400x400', type: 'image/svg+xml' }],
        });
      } catch { /* metadata opsional */ }
    };

    const arm = () => {
      if (armed) return;
      armed = true;
      const action = (name, handler) => { try { session.setActionHandler(name, handler); } catch { /* aksi tidak didukung browser ini */ } };
      /* Selama video tampil, tombol media (layar kunci, headset) mengendalikan video dengan urutan antrean video yang sama dengan Bar Video. */
      action('play', () => { if (video.active) { if (!video.playing) video.toggle(); } else if (!player.state.playing) player.toggle(); });
      action('pause', () => { if (video.active) { if (video.playing) video.toggle(); } else if (player.state.playing) player.toggle(); });
      action('previoustrack', () => (video.active ? bus.emit(Events.VIDEO_PREV) : player.step(-1)));
      action('nexttrack', () => (video.active ? bus.emit(Events.VIDEO_NEXT) : player.step(1)));
      action('seekto', (details) => {
        if (video.active) return;
        const duration = player.currentSong?.duration;
        if (duration > 0 && Number.isFinite(details.seekTime)) player.seekToPercent((details.seekTime / duration) * 100);
      });
      setMetadata(player.currentSong);
    };

    bus.on(Events.PLAYER_STATE, ({ playing }) => {
      if (playing) arm();
      if (armed && !video.active) session.playbackState = playing ? 'playing' : 'paused';
    });
    bus.on(Events.PLAYER_TRACK, (song) => { if (armed && !video.active) setMetadata(song); });
    bus.on(Events.VIDEO_STATE, ({ active, playing, song }) => {
      if (active) arm();
      if (!armed) return;
      if (!active) { setMetadata(player.currentSong); session.playbackState = player.state.playing ? 'playing' : 'paused'; return; }
      session.playbackState = playing ? 'playing' : 'paused';
      if (song && typeof MediaMetadata !== 'undefined') {
        try { session.metadata = new MediaMetadata({ title: song.name, artist: song.artist?.name ?? '', artwork: [{ src: videoThumb(song), sizes: '480x360' }] }); } catch { /* metadata opsional */ }
      }
    });
    bus.on(Events.PLAYER_PROGRESS, ({ seconds }) => {
      if (!armed || !(seconds >= 0)) return;
      const now = performance.now();
      if (now - lastPosition < 1000) return;
      lastPosition = now;
      const duration = player.currentSong?.duration;
      if (!(duration > 0) || seconds > duration) return;
      try { session.setPositionState({ duration, position: seconds, playbackRate: 1 }); } catch { /* posisi opsional */ }
    });
  }

  #warmUpSoundCloud(soundCloud) {
    const events = ['pointerdown', 'keydown', 'touchstart'];
    const wake = () => {
      events.forEach((type) => removeEventListener(type, wake, true));
      soundCloud.activate();
    };
    events.forEach((type) => addEventListener(type, wake, { capture: true, passive: true }));
    /* Data Saver / 2G: widget baru menyala saat pengguna berinteraksi (play). 3G: jeda lebih panjang agar render & gambar selesai lebih dulu. */
    if (isConstrainedNetwork()) return;
    whenIdle(wake, navigator.connection?.effectiveType === '3g' ? 4000 : 1500);
  }

  /** Widget SoundCloud kedua (tersembunyi, tanpa suara) khusus untuk membaca durasi asli lagu. */
  async #prefetchDurations(library, bus) {
    /* api.js dimuat dulu: bila gagal (offline/diblokir), pengukuran dibatalkan seperti sebelumnya. */
    if (!(await SoundCloudPlayer.loadApi())) return;
    const probe = document.createElement('iframe');
    probe.title = 'SoundCloud duration probe';
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText = 'position:fixed;right:0;bottom:0;width:300px;height:166px;border:0;opacity:0;pointer-events:none;z-index:-1';
    probe.src = byId('sc').dataset.src || byId('sc').src;
    document.getElementById('app').appendChild(probe);
    const probePlayer = new SoundCloudPlayer(probe);
    if (!probePlayer.available) return probe.remove();
    const prefetcher = new DurationPrefetcher({ soundCloud: probePlayer, songs: library.songs, bus });
    setTimeout(() => prefetcher.start(), TIMING.PREFETCH_START_MS);
  }
}
