'use strict';

/* ---- components/VideoPager.js ---- */
/**
 * Pemuatan bertahap daftar video (infinite scroll): daftar hanya merender satu tahap; cincin berputar di ujung daftar
 * adalah penandanya. Saat penanda terlihat (pengguna mencapai ujung), tahap berikutnya ditambahkan sesudah jeda singkat,
 * sehingga scroll cepat tertahan di cincin dulu, lalu kartu baru muncul sebagai skeleton (lihat ImageSkeleton) dan terisi.
 * Hanya satu tahap diproses sekaligus, dan IntersectionObserver dipakai (bukan event scroll) agar scroll tidak terbebani.
 */
class VideoPager extends Component {
  /** Jeda minimum cincin tampil: cukup agar terbaca, cukup singkat agar tidak terasa lambat. */
  static MIN_MS = 350;

  #views;
  #host;
  #watch = null;
  #io = null;
  #busy = false;
  #timer = 0;

  constructor(root, { views }) {
    super(root);
    this.#views = views;
    this.#host = root.querySelector('#view');
  }

  bind() {
    this.#watch = new MutationObserver(() => this.#attach());
    this.#watch.observe(this.#host, { childList: true });
    this.#attach();
  }

  unmount() {
    this.#watch?.disconnect();
    this.#io?.disconnect();
    clearTimeout(this.#timer);
    super.unmount();
  }

  /** Dipanggil tiap halaman diganti: pasang pengamat ke penanda baru (bila ada), lepas yang lama. */
  #attach() {
    this.#io?.disconnect();
    clearTimeout(this.#timer);
    this.#busy = false;
    const sentinel = this.#host.querySelector('.vid-more');
    if (!sentinel || !('IntersectionObserver' in window)) return;
    this.#io = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) this.#load(sentinel);
    }, { root: this.root, rootMargin: '0px 0px 24px 0px' });
    this.#io.observe(sentinel);
  }

  #load(sentinel) {
    if (this.#busy) return;
    this.#busy = true;
    this.#timer = setTimeout(() => requestAnimationFrame(() => {
      const view = this.#views.get('videos');
      const grid = this.#host.querySelector('.vid-list > .vid-grid');
      if (!view?.next || !grid || !sentinel.isConnected) { this.#busy = false; return; }
      const { html, done } = view.next();
      grid.insertAdjacentHTML('beforeend', html);
      this.#busy = false;
      if (done) { this.#io?.disconnect(); sentinel.remove(); return; }
      /* Pengamat diperbarui agar memeriksa ulang (bila penanda masih di layar, tahap berikutnya langsung dijadwalkan). */
      this.#io.unobserve(sentinel);
      this.#io.observe(sentinel);
    }), VideoPager.MIN_MS);
  }
}

/**
 * Skeleton layar awal dilepas dari #view sebelum halaman asli dirender (render menimpa isi #view), lalu dipasang
 * kembali sebagai lapisan di atas konten dan dipudarkan: pergantiannya cross-fade, tanpa kedipan dan tanpa menggeser tata letak.
 */
function dismissBootSkeleton(host, boot) {
  /* Penanda pemilih kerangka (kerangka, view, id) dilepas bersamaan dengan kerangkanya. */
  const clearBoot = () => ['data-boot', 'data-boot-view', 'data-boot-id'].forEach((name) => document.documentElement.removeAttribute(name));
  host.removeAttribute('aria-busy'); /* konten asli sudah dirender: pembaca layar tidak lagi diberi tahu "sedang memuat" */
  if (!boot || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    clearBoot();
    return;
  }
  host.classList.add('sk-host');
  boot.classList.add('sk-out');
  host.append(boot);
  const done = () => { boot.remove(); host.classList.remove('sk-host'); clearBoot(); };
  boot.addEventListener('animationend', (event) => { if (event.target === boot) done(); });
  setTimeout(done, 600);
}
