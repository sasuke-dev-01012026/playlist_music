/* =====================================================================
   shell/render.js
   Titik masuk render: satu-satunya elemen di <body> adalah <div id="app">.
   Seluruh kerangka halaman dibangun di sini, lalu modul aplikasi (di-load
   sesudahnya, berurutan) mengisi area-areanya.
   ===================================================================== */
'use strict';

(function renderShell() {
  const root = document.getElementById('app');
  if (!root) throw new Error('Elemen #app tidak ditemukan.');
  root.innerHTML = AppShell();

    /* Kerangka layar awal: isi kalimat bisikan (dan tanggal Beranda) persis seperti halaman asli. Sumber teks: window.__ws (di <head>). */
    (function () {
      try {
        var r = document.documentElement, ws = window.__ws, view = r.getAttribute('data-boot-view'), id = r.getAttribute('data-boot-id');
        document.querySelectorAll('#view > .sk-boot [data-whisper]').forEach(function (el) {
          var key = el.getAttribute('data-whisper'), seed = el.getAttribute('data-seed');
          if (key === '@view') key = view === 'artist' ? 'artist' : (view === 'egenre' ? 'genre' : view);
          if (seed === '@id') seed = id;
          else if (seed === '@day') seed = Math.floor(Date.now() / 864e5);
          var t = ws.pick(key, seed);
          if (t) el.textContent = t; else el.hidden = true;
        });
        var d = document.querySelector('#view > .sk-boot [data-date]');
        if (d) d.textContent = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
      } catch (err) { /* teks bawaan tetap dipakai */ }
    })();
})();
