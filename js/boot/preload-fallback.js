/* Browser lama tanpa dukungan rel=preload: pasang langsung sebagai stylesheet biasa agar font & ikon tetap termuat. */
(function () {
  var l = document.createElement('link');
  if (l.relList && l.relList.supports && l.relList.supports('preload')) return;
  document.querySelectorAll('link[rel=preload][as=style]').forEach(function (x) { x.rel = 'stylesheet'; });
})();
