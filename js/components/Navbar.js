'use strict';

/* ---- components/Navbar.js ---- */
/** Bilah atas: logo + pencarian. Komponen induk dari SearchBar. */
/** Sumber gambar logo Kureng (mis. 'img/kureng.png' atau data:image/...). Kosong = lambang huruf K + teks. */
const KURENG_LOGO = '';

class Navbar extends Component {
  constructor(root, { router, bus }) {
    super(root);
    this.router = router;
    this.bus = bus;
  }

  render() {
    /* Logo Kureng: bila KURENG_LOGO berisi URL/data-URI gambar logo resmi, gambar itu yang tampil; bila kosong, lambang "K" + teks Kureng. */
    const mark = KURENG_LOGO
      ? `<img class="logo-img" src="${e(KURENG_LOGO)}" alt="" decoding="async" draggable="false">`
      : '<span class="logo-icon">K</span><span class="logo-text">Kureng</span>';
    return `<div class="nav-left"><div class="logo" role="img" aria-label="Kureng">${mark}</div></div>` +
      '<label class="search" id="search"></label>';
  }

  bind() {
    this.search = new SearchBar(this.$('#search'), { router: this.router, bus: this.bus }).mount();
  }

  unmount() {
    this.search?.unmount();
    super.unmount();
  }
}
