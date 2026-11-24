'use strict';

/* ################ COMPONENTS   ################ */

/* ---- components/NavMenu.js ---- */
/**
 * Basis menu navigasi: item, klik, dan penanda menu aktif. Dipakai oleh BottomNav.
 */
class NavMenu extends Component {
  constructor(root, { router, bus }) {
    super(root);
    this.router = router;
    this.bus = bus;
  }

  renderItems() {
    return NAV_ITEMS.map(({ view, label, icon }) =>
      `<button class="nav-item" data-go="${view}" aria-label="${label}" title="${label}"><i class="fa-solid ${icon}"></i><span>${label}</span></button>`
    ).join('');
  }

  bind() {
    this.listen(this.root, 'click', (event) => {
      const target = event.target.closest('[data-go]');
      if (!target) return;
      const view = target.dataset.go;
      this.highlight(view); /* penanda aktif langsung berubah saat ditekan, tanpa menunggu render halaman */
      /* Pindah dari menu lain: buka lagi detail terakhir menu ini. Klik menu yang sedang aktif: kembali ke daftarnya. */
      this.router.navigate(view, { restore: this.router.current.section !== view });
    });
    this.subscribe(this.bus, Events.ROUTE_CHANGE, ({ route }) => this.highlight(route.section));
    this.highlight(this.router.current.section);
  }

  highlight(section) {
    this.$$('.nav-item').forEach((item) => {
      const active = item.dataset.go === section;
      item.classList.toggle('active', active);
      if (active) item.setAttribute('aria-current', 'page'); else item.removeAttribute('aria-current');
    });
  }
}
