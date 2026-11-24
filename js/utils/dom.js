'use strict';

/* ---- utils/dom.js ---- */
/** Helper kecil untuk DOM dan keamanan teks. */

const byId = (id) => document.getElementById(id);

/**
 * Menjalankan pekerjaan non-kritis setelah halaman selesai dimuat, lalu menunggu browser idle.
 * `delay` = jeda tambahan (ms) setelah load; tanpa event load (mis. ada resource macet) tetap jalan setelah `maxWait`.
 */
/** Koneksi sangat lambat atau Data Saver aktif: pekerjaan latar belakang opsional dilewati. */
const isConstrainedNetwork = () => {
  const c = navigator.connection;
  return Boolean(c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || '')));
};

function whenIdle(task, delay = 0, maxWait = 6000) {
  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    setTimeout(() => ('requestIdleCallback' in window ? requestIdleCallback(task, { timeout: 4000 }) : task()), delay);
  };
  if (document.readyState === 'complete') run();
  else { addEventListener('load', run, { once: true }); setTimeout(run, maxWait); }
}

const HTML_ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Meloloskan teks dinamis sebelum disisipkan ke template HTML. */
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => HTML_ENTITIES[c]);

/** Mengisi bagian "terisi" dari input[type=range] lewat CSS variable --p. */
const paintRange = (input, percent) => input.style.setProperty('--p', `${percent}%`);

/** Menggabungkan pembaruan yang datang beruntun (progres lagu/video) menjadi satu penggambaran per frame; nilai terakhir yang menang. */
const perFrame = (paint) => {
  let latest;
  let queued = false;
  return (value) => {
    latest = value;
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; paint(latest); });
  };
};

/**
 * Slider progres: saat digeser hanya tampilannya yang berubah; perintah seek dikirim sekali saat dilepas (event change,
 * juga berlaku untuk keyboard). Selama digeser `scrubbing` bernilai true agar update progres pemutar tidak menimpa posisi slider.
 */
const bindSeekSlider = (component, input, onSeek) => {
  const state = { scrubbing: false };
  const end = () => { state.scrubbing = false; };
  component.listen(input, 'input', () => {
    state.scrubbing = true;
    paintRange(input, input.value);
  });
  component.listen(input, 'change', () => {
    end();
    onSeek(Number(input.value));
  });
  /* Slider dilepas di nilai awal: change tidak terpicu, jadi akhiri scrubbing dari event ini. */
  ['pointerup', 'pointercancel', 'blur'].forEach((type) => component.listen(input, type, end));
  return state;
};

const e = escapeHtml; /* alias singkat untuk template HTML */
