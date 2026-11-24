'use strict';

/* ################ APP          ################ */

/* ---- components/PullToRefresh.js ---- */
/**
 * Tarik ke bawah untuk menyegarkan. Area gulir aplikasi adalah <main> (body tidak menggulir), jadi
 * "paling atas" = main.scrollTop === 0. Gestur hanya dimulai bila sentuhan satu jari dimulai di posisi paling atas
 * dan bergerak dominan ke bawah; gulir biasa, geser mendatar, dan slider tidak terpengaruh.
 * Refresh dijalankan lewat onRefresh() (SPA: halaman digambar ulang tanpa memuat ulang, sehingga musik/video tidak terputus).
 */
class PullToRefresh extends Component {
  static THRESHOLD = 72;
  static MAX = 120;
  static HOLD = 56;
  static MIN_SHOW_MS = 700;

  #tracking = false;
  #pulling = false;
  #busy = false;
  #startX = 0;
  #startY = 0;
  #dist = 0;

  constructor(root, { onRefresh }) {
    super(root);
    this.onRefresh = onRefresh;
  }

  bind() {
    this.ptr = document.createElement('div');
    this.ptr.className = 'ptr';
    this.ptr.setAttribute('aria-hidden', 'true');
    this.ptr.innerHTML = '<div class="ptr-c"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/></svg></div>';
    this.chip = this.ptr.firstElementChild;
    document.getElementById('app').appendChild(this.ptr);

    this.listen(this.root, 'touchstart', (ev) => this.#start(ev), { passive: true });
    this.listen(this.root, 'touchmove', (ev) => this.#move(ev), { passive: false });
    this.listen(this.root, 'touchend', () => this.#end());
    this.listen(this.root, 'touchcancel', () => this.#end());
  }

  unmount() {
    this.ptr?.remove();
    super.unmount();
  }

  #start(ev) {
    this.#tracking = false;
    this.#pulling = false;
    if (this.#busy || ev.touches.length !== 1 || this.root.scrollTop > 0) return;
    /* Daftar "Video selanjutnya" menggulir sendiri (main tidak menggulir, scrollTop selalu 0): tarik ke bawah di sana berarti gulir ke atas, bukan refresh. */
    if (this.root.querySelector('.vid-watch.is-upnext')) return;
    /* Slider dan video tersemat punya gestur sendiri. */
    if (ev.target.closest?.('input[type="range"], iframe, .vid-host')) return;
    this.#tracking = true;
    this.#startX = ev.touches[0].clientX;
    this.#startY = ev.touches[0].clientY;
  }

  #move(ev) {
    if (!this.#tracking) return;
    if (ev.touches.length !== 1 || this.root.scrollTop > 0) return this.#cancel();
    const dy = ev.touches[0].clientY - this.#startY;
    const dx = ev.touches[0].clientX - this.#startX;
    if (!this.#pulling) {
      if (dy < 0) { this.#tracking = false; return; } /* gulir ke bawah biasa: bukan tarikan */
      if (dy < 10) return;                            /* zona mati agar ketukan tidak terhitung */
      if (Math.abs(dx) > dy) { this.#tracking = false; return; } /* geseran mendatar */
      this.#pulling = true;
      this.#startY += 10;
      this.ptr.classList.remove('is-anim');
    }
    if (ev.cancelable) ev.preventDefault();
    const raw = Math.max(0, ev.touches[0].clientY - this.#startY);
    this.#dist = Math.min(PullToRefresh.MAX, raw * 0.5);
    this.#paint(this.#dist);
  }

  #end() {
    const wasPulling = this.#pulling;
    this.#tracking = false;
    this.#pulling = false;
    if (!wasPulling) return;
    if (this.#dist >= PullToRefresh.THRESHOLD && !this.#busy) this.#run();
    else this.#hide();
  }

  #cancel() {
    const wasPulling = this.#pulling;
    this.#tracking = false;
    this.#pulling = false;
    if (wasPulling) this.#hide();
  }

  /** Posisi & isi indikator mengikuti jarak tarik. */
  #paint(dist) {
    const progress = Math.min(1, dist / PullToRefresh.THRESHOLD);
    this.chip.style.transform = `translate3d(0, ${dist - 52}px, 0)`;
    this.chip.style.opacity = String(Math.min(1, progress * 1.4));
    this.chip.style.setProperty('--d', `${(progress * 40).toFixed(1)}`);
    this.chip.style.setProperty('--r', `${(progress * 270).toFixed(0)}deg`);
    this.ptr.classList.toggle('is-ready', progress >= 1);
  }

  /** Satu gestur = satu refresh: #busy menahan gestur lain sampai indikator selesai menghilang. */
  #run() {
    this.#busy = true;
    this.ptr.classList.add('is-anim', 'is-refreshing');
    this.chip.style.transform = `translate3d(0, ${PullToRefresh.HOLD - 52}px, 0)`;
    this.chip.style.opacity = '1';
    this.chip.style.setProperty('--d', '40');
    this.chip.style.removeProperty('--r');
    const started = Date.now();
    /* Biarkan indikator sempat terlihat sebelum halaman digambar ulang. */
    setTimeout(() => {
      try { this.onRefresh(); } catch (e) { /* refresh gagal: indikator tetap ditutup */ console.error('Refresh gagal:', e); }
      const rest = Math.max(0, PullToRefresh.MIN_SHOW_MS - (Date.now() - started));
      setTimeout(() => this.#hide(), rest);
    }, 120);
  }

  #hide() {
    this.ptr.classList.add('is-anim');
    this.ptr.classList.remove('is-ready');
    this.chip.style.transform = 'translate3d(0, -52px, 0)';
    this.chip.style.opacity = '0';
    this.#dist = 0;
    setTimeout(() => {
      this.ptr.classList.remove('is-refreshing', 'is-anim');
      this.chip.style.removeProperty('--r');
      this.#busy = false;
    }, 320);
  }
}
