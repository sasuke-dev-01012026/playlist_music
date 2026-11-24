'use strict';

/* =====================================================================
   Lapisan efek gerak (terpisah dari kode aplikasi; aplikasi hanya mengirim peristiwa 'view:enter').
   Pembagian tanggung jawab:
       Web Animations -> masuknya halaman (stagger), kemunculan section di bawah layar, dan umpan balik tekan baris lagu.
   Semua efek: hanya opacity/transform, dimatikan bila prefers-reduced-motion, dan aplikasi tetap
   berfungsi penuh tanpa efek ini.
   ===================================================================== */
const fxMain = document.getElementById('main');
const fxView = document.getElementById('view');
const fxCalm = matchMedia('(prefers-reduced-motion: reduce)');
const fxEase = 'cubic-bezier(.5, 1, .89, 1)'; /* setara power2.out */
let fxCleanup = null;

/* ---- Halaman masuk + section di bawah layar (Web Animations API) ---- */
const fxIn = (el, y, delay, duration) => el.animate(
  [{ opacity: 0, transform: `translateY(${y}px)` }, { opacity: 1, transform: 'none' }],
  { duration, delay, easing: fxEase, fill: 'backwards' }
);

function enterPage(name, source) {
  fxCleanup?.();
  fxCleanup = null;
  /* Dilewati: render awal (sudah ada cross-fade skeleton), refresh, ketikan pencarian, dan halaman video
     (posisi iframe dihitung dari tata letak). */
  if (!fxView.animate || fxCalm.matches || name === 'video' || ['start', 'refresh', 'search'].includes(source)) return;
  const blocks = [...fxView.querySelectorAll('.home-head, .hero, .section')]
    .filter((el) => !el.parentElement.closest('.home-head, .hero, .section'));
  if (!blocks.length) return;
  const mainTop = fxMain.getBoundingClientRect().top;
  const edge = mainTop + fxMain.clientHeight * 0.9;
  const first = blocks.filter((el) => el.getBoundingClientRect().top < edge);
  let pending = blocks.filter((el) => !first.includes(el));
  const anims = [];
  let raf = 0, timer = 0, ro = null;
  try {
    first.forEach((el, i) => anims.push(fxIn(el, 14, i * 60, 450)));
    pending.forEach((el) => { el.style.opacity = '0'; el.style.transform = 'translateY(18px)'; });
    /* Section di bawah layar muncul saat tepinya melewati 92% tinggi area gulir. */
    const check = () => {
      raf = 0;
      const line = fxMain.getBoundingClientRect().top + fxMain.clientHeight * 0.92;
      const ready = pending.filter((el) => el.getBoundingClientRect().top < line);
      if (!ready.length) return;
      pending = pending.filter((el) => !ready.includes(el));
      ready.forEach((el, i) => {
        el.style.removeProperty('opacity');
        el.style.removeProperty('transform');
        anims.push(fxIn(el, 18, i * 70, 500));
      });
      if (!pending.length) teardownWatch();
    };
    const queue = () => { if (!raf) raf = requestAnimationFrame(check); };
    const teardownWatch = () => {
      fxMain.removeEventListener('scroll', queue);
      ro?.disconnect(); ro = null;
      clearTimeout(timer);
    };
    if (pending.length) {
      fxMain.addEventListener('scroll', queue, { passive: true });
      /* Gambar yang tiba belakangan menggeser tata letak: posisi dihitung ulang. */
      if (window.ResizeObserver) { ro = new ResizeObserver(queue); ro.observe(fxView); }
      timer = setTimeout(queue, 400);
      queue();
    }
    fxCleanup = () => {
      teardownWatch();
      cancelAnimationFrame(raf);
      anims.forEach((a) => a.cancel());
      pending.forEach((el) => { el.style.removeProperty('opacity'); el.style.removeProperty('transform'); });
    };
  } catch (err) {
    anims.forEach((a) => a.cancel());
    blocks.forEach((el) => { el.style.removeProperty('opacity'); el.style.removeProperty('transform'); });
  }
}

document.addEventListener('view:enter', (event) => {
  const { view, source } = event.detail || {};
  enterPage(view, source);
});

/* ---- Umpan balik tekan pada baris lagu (.row; CSS hanya mengubah opacity) ---- */
let pressedRow = null, pressAnim = null;
const releaseRow = () => {
  const row = pressedRow, held = pressAnim;
  pressedRow = pressAnim = null;
  if (!row) return;
  try {
    const back = row.animate({ transform: 'scale(1)' }, { duration: 180, easing: 'ease-out', fill: 'forwards' });
    back.finished.then(() => { back.cancel(); held?.cancel(); }).catch(() => {});
  } catch (err) { held?.cancel(); }
};
fxView?.addEventListener('pointerdown', (event) => {
  if (fxCalm.matches || event.button > 0) return;
  const row = event.target.closest?.('.row');
  if (!row || !row.animate || event.target.closest('.fav-btn, a, input')) return;
  pressedRow = row;
  try { pressAnim = row.animate({ transform: 'scale(0.985)' }, { duration: 120, easing: 'ease-out', fill: 'forwards' }); }
  catch (err) { pressedRow = null; }
}, { passive: true });
['pointerup', 'pointercancel', 'dragstart'].forEach((type) => document.addEventListener(type, releaseRow, { passive: true }));

/* ---- Preferensi gerak: ikut berubah saat pengguna mengganti pengaturan sistem ---- */
fxCalm.addEventListener('change', () => {
  if (fxCalm.matches) { fxCleanup?.(); fxCleanup = null; }
});
