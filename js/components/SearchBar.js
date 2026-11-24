'use strict';

/* ---- components/SearchBar.js ---- */
/** Kolom pencarian. Mengetik -> router.search(); berpindah halaman -> kolom dikosongkan. */
class SearchBar extends Component {
  #timer = null;

  constructor(root, { router, bus }) {
    super(root);
    this.router = router;
    this.bus = bus;
  }

  render() {
    return '<i class="fa-solid fa-magnifying-glass"></i>' +
      '<input id="q" type="search" placeholder="Cari lagu, artis, atau video" aria-label="Cari lagu, artis, atau video" autocomplete="off" enterkeyhint="search">';
  }

  bind() {
    const input = this.$('#q');
    const cancel = () => clearTimeout(this.#timer);
    /* Hasil baru dicari setelah ketikan berhenti sebentar; mengosongkan kolom langsung diproses. */
    this.listen(input, 'input', () => {
      cancel();
      const value = input.value.trim();
      if (!value) return this.router.search('');
      this.#timer = setTimeout(() => this.router.search(value), TIMING.SEARCH_DEBOUNCE_MS);
    });
    /* Mengklik kolom dari halaman lain membuka halaman Search dalam keadaan kosong. */
    this.listen(input, 'focus', () => {
      if (this.router.current.view === 'search') return;
      cancel();
      input.value = '';
      this.router.search('');
    });
    this.subscribe(this.bus, Events.ROUTE_CHANGE, ({ route, source }) => {
      /* Pindah halaman sebelum jeda habis: batalkan pencarian yang tertunda agar tidak menarik kembali ke Search. */
      if (source !== 'search') cancel();
      /* Kolom hanya terisi di halaman Search; mengikuti URL (back/forward, refresh). */
      if (route.view !== 'search') input.value = '';
      else if (source !== 'search' && input.value !== route.query) input.value = route.query;
    });
  }

  unmount() {
    clearTimeout(this.#timer);
    super.unmount();
  }
}
