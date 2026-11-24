'use strict';

/* ################ UTILS        ################ */

/* ---- utils/array.js ---- */
/** Helper struktur data & algoritma generik (tidak tahu apa pun tentang domain musik). */

/** Perbandingan teks bahasa Indonesia, tidak peka huruf besar/kecil, angka dibaca sebagai angka. */
const compareText = (a, b) =>
  String(a).localeCompare(String(b), 'id', { sensitivity: 'base', numeric: true });

/**
 * Fisher-Yates shuffle, O(n), menghasilkan salinan baru (array asli tidak berubah).
 * Distribusi acak seragam, tidak seperti `sort(() => Math.random() - .5)`.
 */
function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Membangun Map key -> item untuk pencarian O(1). */
function indexBy(items, keyOf) {
  const index = new Map();
  for (const item of items) index.set(keyOf(item), item);
  return index;
}

/** Mengelompokkan item per key dalam satu kali lintasan O(n); urutan asli tiap grup dipertahankan. */
function groupBy(items, keyOf) {
  const groups = new Map();
  for (const item of items) {
    const key = keyOf(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return groups;
}
