'use strict';

/* ---- utils/format.js ---- */
/** Fungsi murni untuk memformat angka menjadi teks tampilan. */

/** 125 -> "2:05". Nilai tidak valid menghasilkan "0:00". */
function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const rest = String(Math.floor(seconds % 60)).padStart(2, '0');
  return `${minutes}:${rest}`;
}

/** Gambar tanpa sumber valid (kosong / string "undefined") diganti placeholder abu-abu bertema musik. */
const PLACEHOLDER_IMG = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="#fbdde7"/>' +
  '<path d="M230 110v140a45 45 0 1 1-20-37V150l-70 18v110a45 45 0 1 1-20-37V135z" fill="#e9a9bd"/></svg>');
/** Warna cover diambil dari data JSON (COLORS), dirujuk lewat colorId lagu. */
const colorHex = (colorId) => COLORS.find((c) => c.id === colorId)?.hex;

/** Data-URI SVG per kombinasi warna/teks dibuat sekali lalu dipakai ulang (getter cover dipanggil di setiap render). */
const svgCache = new Map();
const cachedSvg = (key, build) => {
  let uri = svgCache.get(key);
  if (uri === undefined) {
    uri = 'data:image/svg+xml,' + encodeURIComponent(build());
    svgCache.set(key, uri);
  }
  return uri;
};

/** Placeholder berwarna (warna ditentukan oleh `colorId` dari data JSON). */
const colorfulPlaceholder = (colorId) => {
  const color = colorHex(colorId) ?? '#e9a9bd';
  return cachedSvg(`cover|${color}`, () =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="${color}"/>` +
    '<path d="M230 110v140a45 45 0 1 1-20-37V150l-70 18v110a45 45 0 1 1-20-37V135z" fill="#ffffff" fill-opacity=".85"/></svg>');
};

/**
 * Avatar artis tanpa foto: inisial (maks. 2 huruf) di atas warna palet cover lagu (colorId 1-6, bergilir menurut id).
 * Nama seperti "Andra & The Backbone" memakai kata bermakna saja (tanda baca dan "The" dilewati).
 */
const initialsOf = (name) => {
  const words = String(name).split(/\s+/).filter((w) => /^[\p{L}\p{N}]/u.test(w) && w.toLowerCase() !== 'the');
  return words.slice(0, 2).map((w) => Array.from(w)[0].toUpperCase()).join('') || '?';
};
const artistAvatar = (name, id) => {
  const color = colorHex((Number(id) % 6) + 1) ?? '#e9a9bd';
  const initials = initialsOf(name);
  return cachedSvg(`avatar|${color}|${initials}`, () =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="${color}"/>` +
    `<text x="200" y="200" dy=".35em" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-weight="700" font-size="170" fill="#ffffff" fill-opacity=".92">${initials}</text></svg>`);
};

/** Durasi lagu untuk tampilan; belum diketahui (0) tampil "--:--", bukan "0:00". */
const formatDuration = (seconds) => (seconds > 0 ? formatTime(seconds) : '--:--');

/** Ringkasan koleksi lagu, mis. "3 lagu · 10 mnt 05 dtk". */
function formatTotal(songs) {
  const total = songs.reduce((sum, song) => sum + song.duration, 0);
  return `${songs.length} lagu · ${formatTime(total).replace(':', ' mnt ')} dtk`;
}

/**
 * Total durasi untuk header halaman detail. Elemen [data-total] dihitung ulang di tempat oleh ViewOutlet
 * setiap durasi asli masuk, tanpa menggambar ulang halaman.
 */
const HeroTotal = (songs) => `<span data-total>${formatTotal(songs)}</span>`;
