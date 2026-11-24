'use strict';

/* ---- core/Router.js ---- */
/** Value object: halaman mana yang sedang ditampilkan. Token berbentuk "view" atau "view:id". */
class Route {
  constructor(view, id = null, query = '') {
    this.view = view;
    this.id = id;
    this.query = query;
    /** Menu asal untuk detail album/artist/playlist yang dibuka dari alur Jelajah ('' = ikut SECTION_OF_VIEW). */
    this.origin = '';
  }

  static parse(token) {
    const [view, id] = token.split(':');
    return new Route(view, id ? Number(id) : null);
  }

  static search(query) {
    return new Route('search', null, query);
  }

  /** Halaman utama (daftar) yang valid, dan halaman detail yang wajib punya ID. */
  static #LISTS = new Set([...NAV_ITEMS, ...EXPLORE_ITEMS, { view: 'artists' }, { view: 'albums' }, { view: 'playlists' }].map((item) => item.view));
  static #DETAILS = new Set(['album', 'artist', 'genre', 'egenre', 'playlist', 'video']);

  /**
   * URL hash -> Route. Bentuk: #/home, #/artists, #/artist/5, #/search/kata.
   * Hash tidak dikenal / rusak menghasilkan null (pemanggil memilih halaman cadangan).
   */
  static fromHash(hash) {
    try {
      const raw = String(hash ?? '').replace(/^#\/?/, '');
      if (!raw) return null;
      const [path] = raw.split('?');
      const [view, ...rest] = path.split('/');
      if (view === 'search') {
        return Route.search(decodeURIComponent(rest.join('/')).trim());
      }
      if (Route.#DETAILS.has(view)) {
        const id = Number(rest[0]);
        return Number.isInteger(id) && id > 0 ? new Route(view, id) : null;
      }
      if (Route.#LISTS.has(view)) return new Route(view);
    } catch { /* hash rusak: abaikan */ }
    return null;
  }

  /** Route -> URL hash (kebalikan dari fromHash). */
  toHash() {
    if (this.view === 'search') return this.query ? `#/search/${encodeURIComponent(this.query)}` : '#/search';
    if (this.id !== null) return `#/${this.view}/${this.id}`;
    return `#/${this.view}`;
  }

  /** Halaman daftar tingkat atas, bukan detail atau pencarian. */
  get isList() {
    return this.id === null && this.view !== 'search';
  }

  /** Menu utama yang harus tampil aktif untuk halaman ini. */
  get section() {
    return this.origin || (SECTION_OF_VIEW[this.view] ?? this.view);
  }
}

/**
 * Router berbasis URL hash (#/songs, #/artist/5, #/search/kata) sehingga bekerja juga saat file dibuka
 * langsung (file://). Tombol back/forward browser, refresh, dan link yang dibagikan membuka halaman yang sama.
 * Halaman terakhir (selain pencarian) diingat di localStorage untuk kunjungan tanpa hash.
 * Mengingat halaman terakhir yang dibuka lewat navigasi supaya mengosongkan kolom pencarian
 * bisa kembali ke halaman tersebut.
 */
class Router {
  #current = new Route('home');
  #lastPage = this.#current;
  #hash = '';
  /** Kata pencarian aktif; bertahan saat pindah halaman sampai pengguna menghapusnya. */
  #query = '';
  /** Halaman detail terakhir per menu, mis. { artists: 'artist:2' }; dipulihkan saat menu itu dibuka lagi dari navigasi. */
  #details = {};
  /** Hash detail -> menu asal (mis. '#/playlist/5' -> 'explore'), agar back/forward menyalakan menu yang sama. */
  #origins = new Map();

  constructor(bus) {
    this.bus = bus;
    window.addEventListener('popstate', () => this.#onPopState());
  }

  get current() {
    return this.#current;
  }

  get query() {
    return this.#query;
  }

  /**
   * @param {string} token  "view" atau "view:id"
   * @param {{restore?: boolean}} [options]  restore=true (klik menu utama): bila menu itu punya detail
   *        yang terakhir dibuka (mis. artist Avenged Sevenfold), buka lagi detail tersebut, bukan daftarnya.
   */
  navigate(token, { restore = false } = {}) {
    let target = Route.parse(token);
    if (target.isList) {
      const saved = restore ? this.#details[target.view] : null;
      /* Tombol "kembali" ke daftar (restore=false) menghapus ingatan detail. */
      if (saved) target = Route.parse(saved);
      else {
        delete this.#details[target.view];
        AppStorage.update({ details: this.#details });
      }
    }
    if (ORIGIN_AWARE_VIEWS.has(target.view) && target.id !== null) {
      const key = target.toHash();
      if (this.#current.section === 'explore') {
        target.origin = 'explore';
        this.#origins.set(key, 'explore');
      } else {
        this.#origins.delete(key);
      }
    }
    this.#rememberDetail(target);
    this.#lastPage = target;
    this.#query = target.view === 'search' ? target.query : '';
    this.#current = target;
    this.#writeUrl(false);
    this.bus.emit(Events.ROUTE_CHANGE, { route: this.#current, source: 'navigate' });
  }

  /** Membuka halaman Search. Query kosong = halaman Search kosong (tanpa hasil). */
  search(query) {
    const wasSearch = this.#current.view === 'search';
    this.#query = query;
    AppStorage.update({ query });
    this.#current = Route.search(query);
    /* Mengetik terus tidak menambah riwayat: entri pencarian diganti, bukan ditumpuk. */
    this.#writeUrl(wasSearch);
    this.bus.emit(Events.ROUTE_CHANGE, { route: this.#current, source: 'search' });
  }

  /** Memicu render awal: dari URL, lalu halaman terakhir di localStorage, lalu Home. */
  start() {
    this.#enter(Route.fromHash(location.hash), 'start', true);
  }

  /** Memuat status tersimpan (detail terakhir per menu), menyiapkan route, lalu menampilkannya. */
  #enter(hashRoute, source, replace) {
    const saved = AppStorage.read();
    this.#loadSaved(saved);
    const route = hashRoute
      ?? Route.fromHash(saved.route)
      ?? new Route('home');
    this.#rememberDetail(route);
    this.#query = route.view === 'search' ? route.query : '';
    this.#lastPage = route.view === 'search' ? new Route('home') : route;
    this.#current = route;
    AppStorage.update({ query: this.#query });
    this.#writeUrl(replace);
    this.bus.emit(Events.ROUTE_CHANGE, { route: this.#current, source });
  }

  #loadSaved(saved) {
    this.#details = {};
    if (saved.details && typeof saved.details === 'object') {
      for (const [view, token] of Object.entries(saved.details)) {
        const r = typeof token === 'string' ? Route.parse(token) : null;
        if (r && r.id > 0 && Number.isInteger(r.id) && r.section === view) this.#details[view] = token;
      }
    }
  }

  /** Mengingat detail yang sedang dibuka untuk menu induknya. */
  #rememberDetail(route) {
    /* Detail album/artist tidak diingat: menu Beranda selalu membuka daftar Beranda. */
    if (route.id === null || route.view === 'search' || route.view === 'album' || route.view === 'artist' || route.view === 'genre' || route.view === 'egenre' || route.view === 'playlist' || route.view === 'video') return;
    this.#details[route.section] = `${route.view}:${route.id}`;
    AppStorage.update({ details: this.#details });
  }

  /** Back/forward browser atau hash diubah manual di address bar . */
  #onPopState() {
    const hash = location.hash;
    if (hash === this.#hash) return;
    let hashRoute = Route.fromHash(hash);
    let route = hashRoute ?? new Route('home');
    if (ORIGIN_AWARE_VIEWS.has(route.view) && this.#origins.get(route.toHash()) === 'explore') route.origin = 'explore';
    this.#rememberDetail(route);
    this.#query = route.view === 'search' ? route.query : '';
    if (route.view !== 'search') this.#lastPage = route;
    this.#current = route;
    AppStorage.update({ query: this.#query });
    if (hashRoute) {
      this.#hash = route.toHash();
      AppStorage.update({ route: this.#lastPage.toHash() });
    } else {
      /* Hash tidak dikenal / rusak: halaman cadangan (Beranda) ditampilkan dan URL disamakan dengannya. */
      this.#writeUrl(true);
    }
    this.bus.emit(Events.ROUTE_CHANGE, { route, source: 'popstate' });
  }

  #writeUrl(replace) {
    const hash = this.#current.toHash();
    AppStorage.update({ route: this.#lastPage.toHash() });
    if (hash === this.#hash && !replace) return;
    this.#hash = hash;
    try {
      history[replace ? 'replaceState' : 'pushState'](null, '', hash);
    } catch {
      location.hash = hash; /* cadangan bila History API ditolak */
    }
  }
}
