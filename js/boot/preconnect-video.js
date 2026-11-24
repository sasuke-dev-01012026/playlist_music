/* Tautan langsung ke halaman pemutaran (#/video/..): iframe YouTube pasti dibutuhkan, jadi sambungan ke embed dibuka sekarang. */
if (/^#\/video\//.test(location.hash)) {
  var pc = document.createElement('link');
  pc.rel = 'preconnect'; pc.href = 'https://www.youtube-nocookie.com';
  document.head.appendChild(pc);
}
