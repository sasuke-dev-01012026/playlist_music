'use strict';

/* ---- components/ImageSkeleton.js ---- */
/**
 * Skeleton untuk gambar (cover, thumbnail, avatar): hanya gambar yang benar-benar masih dimuat diberi kelas `sk`
 * (kilau di belakangnya, lihat CSS "Skeleton UI"). Gambar yang sudah ada di cache tidak pernah mendapat skeleton.
 * Dasar hitungnya: ukuran gambar sudah ditetapkan CSS (aspect-ratio / width-height), jadi tidak ada layout shift.
 * Mengamati #main lewat MutationObserver sehingga tidak perlu mengubah template atau view mana pun.
 */
class ImageSkeleton extends Component {
  /** Menunggu lebih lama dari ini = pengguna sempat melihat skeleton, sehingga gambar dimunculkan dengan fade. */
  static SLOW_MS = 120;
  /** Gambar di area ini punya latar sendiri (poster video gelap): tidak diberi skeleton. */
  static SKIP = '.vid-poster, .vid-load';
  /** Item video di semua halaman (kartu grid/carousel, baris hasil pencarian/detail/video selanjutnya) dan info artis di halaman pemutaran: seluruh item jadi skeleton selama gambarnya dimuat. */
  static CARD = '.vid, .vid-row, .vid-page .vid-artist-link';

  #observer = null;
  #viewport = null;
  #waiting = new WeakMap();
  #cards = new WeakMap();
  #calm = window.matchMedia('(prefers-reduced-motion: reduce)');

  bind() {
    this.#observer = new MutationObserver((records) => this.#scan(records));
    this.#observer.observe(this.root, { childList: true, subtree: true });
    /* Kilau hanya berjalan untuk kartu yang terlihat (margin kecil agar sudah berjalan sebelum masuk layar). */
    if ('IntersectionObserver' in window) {
      this.#viewport = new IntersectionObserver((entries) => {
        for (const entry of entries) entry.target.classList.toggle('vid-vis', entry.isIntersecting);
      }, { rootMargin: '120px 0px' });
    }
    /* load/error tidak menggelembung: ditangkap di fase capture. */
    this.listen(this.root, 'load', (event) => this.#settle(event.target, true), true);
    this.listen(this.root, 'error', (event) => this.#settle(event.target, false), true);
    this.listen(this.root, 'animationend', (event) => {
      if (event.animationName !== 'skIn') return;
      event.target.classList.remove('sk-in');
      event.target.closest?.('.vid-in')?.classList.remove('vid-in');
    });
  }

  unmount() {
    this.#observer?.disconnect();
    this.#viewport?.disconnect();
    super.unmount();
  }

  #scan(records) {
    for (const { addedNodes } of records) {
      for (const node of addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        if (node.localName === 'img') this.#watch(node);
        else node.querySelectorAll('img').forEach((img) => this.#watch(img));
      }
    }
  }

  #watch(img) {
    /* Sudah tersedia (cache) atau sudah gagal, data-URI (langsung ada), atau area yang dikecualikan: tidak perlu skeleton. */
    if (img.complete || img.src.startsWith('data:') || img.closest(ImageSkeleton.SKIP)) return;
    this.#waiting.set(img, performance.now());
    img.classList.add('sk');
    /* Kartu dihitung per gambar yang masih dimuat (thumbnail + avatar): skeleton kartu dilepas setelah semuanya siap. */
    const card = img.closest(ImageSkeleton.CARD);
    if (!card) return;
    const pending = this.#cards.get(card) ?? 0;
    this.#cards.set(card, pending + 1);
    if (pending === 0) {
      card.classList.add('vid-sk');
      if (this.#viewport) this.#viewport.observe(card);
      else card.classList.add('vid-vis');
    }
  }

  /** Gambar tiba (atau gagal): skeleton dilepas. Gagal = tampilan apa adanya, tidak ada kilau yang menggantung. */
  #settle(img, loaded) {
    if (!(img instanceof HTMLImageElement) || !this.#waiting.has(img)) return;
    const waited = performance.now() - this.#waiting.get(img);
    this.#waiting.delete(img);
    /* Gambar didekode dulu (decoding="async"): skeleton baru dilepas saat piksel siap dicat, jadi tidak ada kotak kosong sesaat. */
    const release = () => this.#release(img, loaded && waited > ImageSkeleton.SLOW_MS && !this.#calm.matches);
    if (loaded && typeof img.decode === 'function') img.decode().then(release, release);
    else release();
  }

  #release(img, fade) {
    img.classList.remove('sk');
    if (fade) img.classList.add('sk-in');
    const card = img.closest(ImageSkeleton.CARD);
    const pending = card ? this.#cards.get(card) : undefined;
    if (pending === undefined) return;
    if (pending > 1) { this.#cards.set(card, pending - 1); return; }
    this.#cards.delete(card);
    this.#viewport?.unobserve(card);
    card.classList.remove('vid-sk', 'vid-vis');
    if (fade) card.classList.add('vid-in');
  }
}
