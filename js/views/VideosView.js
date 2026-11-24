'use strict';

/* ---- views/VideosView.js ---- */
/**
 * Halaman Video (gaya YouTube). Sumber data = katalog lagu yang sudah ada: lagu yang punya ID video YouTube (yt)
 * dihitung sebagai satu video. Tidak ada data atau tautan buatan: thumbnail diambil dari ID YouTube asli,
 * judul/artis/durasi dari data lagu. Bila belum ada video, tampil keadaan kosong.
 */
const YT_ID = /^[\w-]{11}$/;
const isVideo = (song) => YT_ID.test(String(song.youtubeId ?? '').trim());
const videoKey = (song) => String(song.youtubeId).trim();
const videosOf = (library) => library.videos;
/* WebP dari YouTube (framing & ukuran sama dengan hqdefault.jpg, byte lebih kecil); bila gagal dimuat, pendengar 'error' di App.start() beralih ke JPG. */
const videoThumb = (song) => `https://i.ytimg.com/vi_webp/${videoKey(song)}/hqdefault.webp`;
/** Alamat embed pemutar video (satu sumber untuk halaman pemutaran dan perpindahan otomatis). */
const videoEmbedSrc = (key) => `https://www.youtube-nocookie.com/embed/${key}?autoplay=1&rel=0&playsinline=1&enablejsapi=1${/^https?:$/.test(location.protocol) ? `&origin=${encodeURIComponent(location.origin)}` : ''}`;
/** ID penyanyi sebuah video: relasi artistId yang sudah diselesaikan MusicLibrary (bukan kecocokan teks nama). */
const videoArtistId = (song) => song.artist?.id ?? song.artistId;
const artistGroups = new WeakMap();
/** Semua video satu penyanyi menurut urutan database (urutan katalog), dihitung sekali per katalog. */
const videosOfArtist = (library, artistId) => {
  let groups = artistGroups.get(library);
  if (!groups) {
    groups = new Map();
    for (const video of videosOf(library)) {
      const id = videoArtistId(video);
      if (!groups.has(id)) groups.set(id, []);
      groups.get(id).push(video);
    }
    artistGroups.set(library, groups);
  }
  return groups.get(artistId) ?? [];
};
const mod = (n, m) => ((n % m) + m) % m;
/** Besar konten seorang penyanyi: lagu musik + video (penyanyi yang hanya punya video ikut dihitung, tidak selalu paling bawah). */
const artistContentCount = (library, artist) => artist.songs.length + videosOfArtist(library, artist.id).length;

/* Benih urutan penyanyi: dibuat SEKALI saat halaman dimuat. Berubah tiap muat ulang, tetap selama pengguna menjelajah
   (buka detail, putar video, kembali ke halaman Video tidak mengacak ulang). */
const VIDEO_ORDER_SEED = crypto.getRandomValues(new Uint32Array(1))[0];
const showOrders = new WeakMap();
/**
 * Urutan TAMPILAN video: penyanyi diacak (Fisher-Yates dengan benih sesi), video tiap penyanyi tetap urutan database.
 * Hanya urutan: semua penyanyi dan video tetap ada tepat satu kali, data tidak berubah. Dipakai halaman Video dan sebagai
 * urutan penyanyi antrean (antrean "semua video"), sehingga antrean selalu searah dengan yang terlihat di halaman Video.
 */
const videosInShowOrder = (library) => {
  let ordered = showOrders.get(library);
  if (!ordered) {
    const ids = [...new Set(videosOf(library).map(videoArtistId))];
    let state = VIDEO_ORDER_SEED;
    const random = () => { /* mulberry32 */
      state = (state + 0x6D2B79F5) >>> 0;
      let t = Math.imul(state ^ (state >>> 15), state | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    ordered = ids.flatMap((id) => videosOfArtist(library, id));
    showOrders.set(library, ordered);
  }
  return ordered;
};

/**
 * SATU aturan urutan untuk Next, Previous, autoplay, dan petunjuk di Bar Video. Seluruh video penyanyi aktif diputar lebih dulu,
 * urutan database, melingkar: dari video pilihan sampai video terakhir, kembali ke video pertama, sampai tepat sebelum video pilihan
 * (satu siklus, tiap video sekali). Setelah itu pindah otomatis ke penyanyi berikutnya menurut urutan antrean (hasil pencarian
 * atau semua video), mulai dari video pertamanya; setelah penyanyi terakhir kembali ke penyanyi pertama (melingkar).
 * Previous mundur dengan urutan yang sama; dari awal siklus ia ke video terakhir penyanyi sebelumnya.
 * Klip yang sama dengan yang sedang diputar (`playing`) tidak diputar dua kali berturut-turut. Hasil: { video, entry } atau null
 * (hanya satu video yang tersedia). Penyanyi di luar antrean (video dipilih dari video terkait) memakai urutan semua video.
 */
const videoStep = (queue, library, position, direction = 1, playing = null) => {
  const current = position?.song;
  if (!current) return null;
  const artistId = videoArtistId(current);
  const group = videosOfArtist(library, artistId);
  const i = group.findIndex((video) => video.id === current.id);
  if (i < 0) return null;
  const n = group.length;
  const blocked = new Set([videoKey(current)]);
  if (playing) blocked.add(videoKey(playing));
  const ok = (video) => !blocked.has(videoKey(video));
  let ring = [...new Set((queue ?? videosInShowOrder(library)).map(videoArtistId))];
  if (!ring.includes(artistId)) ring = [...new Set(videosInShowOrder(library).map(videoArtistId))];
  const at = ring.indexOf(artistId);

  /* Hanya satu penyanyi di antrean: berputar terus di dalam penyanyi itu. */
  if (ring.length === 1) {
    for (let s = 1; s < n; s++) {
      const video = group[mod(i + direction * s, n)];
      if (ok(video)) return { video, entry: video.id };
    }
    return null;
  }

  if (direction > 0) {
    for (let s = 1; s < n; s++) {
      const video = group[(i + s) % n];
      if (video.id === position.entry) break; /* kembali ke video awal: siklus penyanyi selesai */
      if (ok(video)) return { video, entry: position.entry };
    }
    for (let s = 1; s < ring.length; s++) {
      const first = videosOfArtist(library, ring[(at + s) % ring.length]).find(ok);
      if (first) return { video: first, entry: first.id };
    }
    return null;
  }

  if (position.entry !== current.id) {
    for (let s = 1; s < n; s++) {
      const video = group[mod(i - s, n)];
      if (ok(video)) return { video, entry: position.entry };
      if (video.id === position.entry) break;
    }
  }
  for (let s = 1; s < ring.length; s++) {
    const before = videosOfArtist(library, ring[mod(at - s, ring.length)]);
    const first = before.find(ok);
    const last = [...before].reverse().find(ok);
    if (last) return { video: last, entry: first.id };
  }
  return null;
};

/** Nama album lagu dari data (bila ada). */
const albumNameOf = (library, song) => library.getAlbum(song.albumId)?.name ?? '';
/** Genre mengikuti data genre artis (sama dengan halaman artis): maksimal 2; tanpa data, kosong (tidak dikarang). */
const genreNamesOf = (library, song) => (song.artist ? ARTIST_GENRES[song.artist.id] ?? [] : [])
  .map((gid) => library.genres?.find((g) => g.id === gid)?.name)
  .filter(Boolean).slice(0, 2);
/** Satu info beserta ikonnya: dipakai di kartu video (ringkas) dan halaman pemutaran. */
const videoInfo = (library, song) => ({ album: albumNameOf(library, song), genres: genreNamesOf(library, song), count: artistVideoCount(library, song) });

/** Jumlah video per artis (dihitung sekali per katalog): angka yang sama dipakai di kartu, video terkait, hasil pencarian, dan halaman pemutaran. */
const videoCounts = new WeakMap();
const artistVideoCount = (library, song) => {
  let counts = videoCounts.get(library);
  if (!counts) {
    counts = new Map();
    for (const video of videosOf(library)) counts.set(video.artist, (counts.get(video.artist) ?? 0) + 1);
    videoCounts.set(library, counts);
  }
  return counts.get(song.artist) ?? 0;
};

/** Nama artis + jumlah video: satu komponen yang dipakai identik di kartu video, video terkait, hasil pencarian, dan halaman pemutaran. */
const VideoBy = (name, count, cls = '') =>
  `<span class="vid-by ${cls}"><b class="vid-by-name" title="${e(name)}">${e(name)}</b>${count > 0 ? `<small class="vid-by-count">${count} video</small>` : ''}</span>`;

/**
 * Baris info video (artis, album, genre): satu komponen yang dipakai identik di kartu video dan halaman pemutaran.
 * Satu baris mendatar; yang melewati sisi kanan container dipotong dengan "..." (lihat .vid-line). Teks lengkap ada di atribut title.
 */
const VideoInfoLine = (song, info = {}, { artist: showArtist = true } = {}) => {
  const artist = showArtist ? (song.artist?.name ?? ARTIST_NAME) : '';
  const genres = info.genres ?? [];
  const genre = genres.join(', ');
  const item = (icon, text) =>
    `<span class="vid-i"><i class="fa-solid ${icon}" aria-hidden="true"></i>${e(text)}</span>`;
  /* Nama artis tanpa ikon (tebal); album dan genre memakai ikon. Artis bisa dilewati bila sudah tampil di dekatnya. */
  const parts = (artist ? VideoBy(artist, info.count, 'vid-i') : '') +
    (info.album ? item('fa-compact-disc', info.album) : '') +
    (genre ? item(genreIcon(genres[0]), genre) : '');
  if (!parts) return '';
  const full = [artist, artist && info.count > 0 ? `${info.count} video` : '', info.album, genre].filter(Boolean).join(' · ');
  return `<span class="vid-line" title="${e(full)}">${parts}</span>`;
};

/**
 * Satu video di grid: thumbnail 16:9 (durasi di kanan bawah); di bawahnya avatar di kiri dan, di kanannya,
 * judul (maks. 2 baris, ellipsis) lalu satu baris info berikon: artis, album, genre. Info tidak pernah turun baris;
 * yang tidak muat dipotong dengan ellipsis, sehingga tinggi kartu tetap konsisten (baris grid menyamakan tinggi). Penayangan/waktu unggah tidak ada di data, jadi tidak ditampilkan.
 */
const VideoCard = (song, info = {}) => {
  const artist = song.artist?.name ?? ARTIST_NAME;
  const avatar = song.artist?.img ?? artistAvatar(artist, 0);
  const genre = (info.genres ?? []).join(', ');
  const duration = song.duration > 0 ? `<span class="vid-dur">${formatTime(song.duration)}</span>` : '';
  const line = VideoInfoLine(song, info);
  const label = `Tonton ${song.name} - ${artist}${info.album ? ` - ${info.album}` : ''}${genre ? ` - ${genre}` : ''}`;
  return `<a class="vid" role="listitem" href="#/video/${song.id}" data-go="video:${song.id}" aria-label="${e(label)}">` +
    `<span class="vid-thumb"><img ${IMG_ATTRS} width="480" height="360" loading="lazy" decoding="async" src="${e(videoThumb(song))}" alt="">${duration}` +
    '<span class="vid-hover" aria-hidden="true"><i class="fa-solid fa-play"></i></span></span>' +
    '<span class="vid-meta">' +
    `<img class="vid-av" ${IMG_ATTRS} width="40" height="40" loading="lazy" decoding="async" src="${e(avatar)}" alt="">` +
    `<span class="vid-text"><b class="vid-title" title="${e(song.name)}">${e(song.name)}</b>${line}</span>` +
    '</span></a>';
};

/**
 * Baris video di hasil pencarian: thumbnail 16:9 di kiri (durasi di kanan bawah), di kanannya judul lalu satu baris
 * info (artis, album, genre bila ada) yang sama dengan kartu video. Klik membuka halaman pemutaran video.
 */
const VideoSearchRow = (song, info = {}) => {
  const artist = song.artist?.name ?? ARTIST_NAME;
  const genre = (info.genres ?? []).join(', ');
  const duration = song.duration > 0 ? `<span class="vid-dur">${formatTime(song.duration)}</span>` : '';
  const label = `Tonton ${song.name} - ${artist}${info.album ? ` - ${info.album}` : ''}${genre ? ` - ${genre}` : ''}`;
  return `<a class="vid-row" role="listitem" href="#/video/${song.id}" data-go="video:${song.id}" aria-label="${e(label)}">` +
    `<span class="vid-thumb"><img ${IMG_ATTRS} width="480" height="360" loading="lazy" decoding="async" src="${e(videoThumb(song))}" alt="">${duration}` +
    '<span class="vid-hover" aria-hidden="true"><i class="fa-solid fa-play"></i></span></span>' +
    `<span class="vid-row-text"><b class="vid-title" title="${e(song.name)}">${e(song.name)}</b>${VideoInfoLine(song, info)}</span></a>`;
};

/**
 * Video yang relevan dengan konteks halaman detail (artis, album, playlist, genre): lagu/album yang sama didahulukan,
 * lalu video dari artis terkait. Hanya memilih dari data video yang sudah ada; urutan data dipertahankan.
 */
const relatedVideos = (library, { songs = [], artists = [], albumId = null, limit = Infinity } = {}) => {
  const ids = new Set(songs.map((song) => song.id));
  const owners = new Set(artists);
  const direct = [];
  const byArtist = [];
  for (const video of videosOf(library)) {
    if (ids.has(video.id) || (albumId !== null && video.albumId === albumId)) direct.push(video);
    else if (owners.has(video.artist)) byArtist.push(video);
  }
  return [...direct, ...byArtist].slice(0, limit);
};

/** Batas video terkait: dari artis yang sama, dan dari tiap artis lain (agar daftar beragam). */
const RELATED_SAME_ARTIST = 6;
const RELATED_PER_ARTIST = 2;
/** Hash tetap pasangan (video aktif, kandidat): pemecah seri yang berbeda untuk tiap video tetapi stabil saat halaman digambar ulang. */
const relatedTie = (a, b) => Math.imul(Math.imul(a + 1, 73856093) ^ Math.imul(b + 1, 19349663), 2654435761) >>> 0;

/**
 * Video terkait untuk video yang SEDANG DIPUTAR (bukan sekadar urutan katalog). Peringkat: artis yang sama (satu album lebih dulu),
 * lalu album yang sama, lalu genre artis (genre utama sama dan makin banyak genre yang sama makin tinggi). Seri dipecah relatedTie,
 * jadi video tanpa kerabat tetap mendapat daftar yang berbeda dari video lain. Video aktif (dan klip dengan ID YouTube yang sama) tidak pernah masuk.
 */
const relatedVideosFor = (library, song, limit = VIDEO_RELATED_COUNT) => {
  const genres = song.artist ? ARTIST_GENRES[song.artist.id] ?? [] : [];
  const playingKey = videoKey(song);
  const ranked = [];
  for (const video of videosOf(library)) {
    if (video.id === song.id || videoKey(video) === playingKey) continue;
    const sameAlbum = song.albumId != null && video.albumId === song.albumId;
    let score = 0;
    if (video.artist === song.artist) score = 1000 + (sameAlbum ? 100 : 0);
    else {
      const own = video.artist ? ARTIST_GENRES[video.artist.id] ?? [] : [];
      score = (sameAlbum ? 500 : 0) + own.filter((g) => genres.includes(g)).length * 30 + (genres.length && own[0] === genres[0] ? 40 : 0);
    }
    ranked.push({ video, score, tie: relatedTie(song.id, video.id) });
  }
  ranked.sort((a, b) => b.score - a.score || a.tie - b.tie);
  const picked = [];
  const taken = new Set();
  const perArtist = new Map();
  /* Putaran 1 memakai batas per artis agar beragam; putaran 2 hanya mengisi sisa bila katalog terlalu kecil. */
  for (const capped of [true, false]) {
    for (const { video } of ranked) {
      if (picked.length >= limit) return picked;
      if (taken.has(video.id) || picked.some((x) => videoKey(x) === videoKey(video))) continue;
      const count = perArtist.get(video.artist) ?? 0;
      if (capped && count >= (video.artist === song.artist ? RELATED_SAME_ARTIST : RELATED_PER_ARTIST)) continue;
      picked.push(video);
      taken.add(video.id);
      perArtist.set(video.artist, count + 1);
    }
  }
  return picked;
};

/** Section video untuk halaman detail: memakai baris video yang sama persis dengan hasil pencarian (VideoSearchRow). */
const VideoSection = (library, videos, title = 'Video') => videos.length
  ? Section(title,`<div role="list">${videos.map((song) => VideoSearchRow(song, videoInfo(library, song))).join('')}</div>`)
  : '';

/**
 * Daftar "Video selanjutnya": urutan yang persis sama dengan tombol Next/autoplay. videoStep dijalankan berulang dari posisi
 * antrean sekarang; klip yang sama tidak dimasukkan dua kali, dan berhenti bila siklus kembali ke video awal atau tidak ada lanjutan.
 */
const upNextVideos = (queue, library, position, limit = VIDEO_WATCH_COUNT) => {
  const out = [];
  const seen = new Set([videoKey(position.song)]);
  let pos = position;
  for (let i = 0; i < limit * 2 && out.length < limit; i++) {
    const step = videoStep(queue, library, pos, 1, pos.song);
    if (!step || step.video.id === position.song.id) break;
    pos = { song: step.video, entry: step.entry };
    if (seen.has(videoKey(step.video))) continue;
    seen.add(videoKey(step.video));
    out.push(step.video);
  }
  return out;
};

/**
 * Seret & lepas untuk daftar "Video selanjutnya" (satu jalur pointer events: mouse, sentuh, pena).
 * - Pegangan di kanan baris: langsung diseret. Seluruh baris: sentuh-tahan 380 ms lalu geser (menggulir tetap normal); mouse: geser > 6 px.
 * - Baris yang diseret mengikuti jari/kursor, baris lain bergeser dengan animasi, daftar bergulir otomatis di dekat tepi.
 * - Klik yang menyusul seretan diabaikan (video tidak terbuka). Keyboard: Alt + panah atas/bawah pada baris yang fokus.
 * Urutan baru dilaporkan lewat onChange(ids); DOM sudah berubah di tempat, tanpa memuat ulang halaman atau pemutar.
 */
const enableUpNextReorder = (scroller, items, onChange) => {
  const list = scroller.querySelector('[role="list"]');
  if (!list) return;
  const idOf = new WeakMap();
  const rows = () => [...list.children].filter((el) => el.classList?.contains('vid-row'));
  rows().forEach((row, i) => {
    idOf.set(row, items[i]);
    row.insertAdjacentHTML('beforeend', '<span class="vid-grip" aria-hidden="true"><i class="fa-solid fa-grip-lines"></i></span>');
    row.setAttribute('aria-roledescription', 'item yang bisa dipindah');
  });
  const order = () => rows().map((row) => idOf.get(row));
  const LONG_PRESS = 380;
  let pending = null;
  let drag = null;
  let swallow = false;

  const clearPending = () => { if (pending) { clearTimeout(pending.timer); pending = null; } };

  /* Posisi baris yang diseret = posisi pointer; baris lain yang dilewati tengahnya bertukar tempat (FLIP). */
  const place = () => {
    const { row } = drag;
    const top = drag.y - list.getBoundingClientRect().top - drag.grab;
    const center = top + row.offsetHeight / 2;
    const swap = (sib, after) => {
      const before = sib.offsetTop;
      list.insertBefore(row, after ? sib.nextSibling : sib);
      sib.style.transition = 'none';
      sib.style.transform = `translateY(${before - sib.offsetTop}px)`;
      sib.getBoundingClientRect();
      sib.style.transition = 'transform .18s var(--ease, ease)';
      sib.style.transform = '';
      setTimeout(() => { sib.style.transition = ''; }, 220);
    };
    for (let n = row.nextElementSibling; n && center > n.offsetTop + n.offsetHeight / 2; n = row.nextElementSibling) swap(n, true);
    for (let p = row.previousElementSibling; p && center < p.offsetTop + p.offsetHeight / 2; p = row.previousElementSibling) swap(p, false);
    row.style.transform = `translate3d(0, ${top - row.offsetTop}px, 0)`;
  };

  /* Gulir otomatis saat pointer dekat tepi atas/bawah daftar (tepi bawah efektif = di atas Music Bar yang melayang). */
  const tick = () => {
    if (!drag) return;
    const box = scroller.getBoundingClientRect();
    const bar = document.querySelector('.player-bar');
    const bottom = bar && bar.offsetParent !== null ? Math.min(box.bottom, bar.getBoundingClientRect().top) : box.bottom;
    const EDGE = 64;
    let speed = 0;
    if (drag.y < box.top + EDGE) speed = -14 * Math.min(1, (box.top + EDGE - drag.y) / EDGE);
    else if (drag.y > bottom - EDGE) speed = 14 * Math.min(1, (drag.y - (bottom - EDGE)) / EDGE);
    if (speed) scroller.scrollTop += speed;
    place();
    drag.raf = requestAnimationFrame(tick);
  };

  const begin = (row, pid, grabY, y) => {
    drag = { row, pid, y, grab: grabY - row.getBoundingClientRect().top, start: order(), raf: 0 };
    try { scroller.setPointerCapture(pid); } catch { /* pointer sudah lepas */ }
    row.classList.add('is-dragging');
    scroller.classList.add('is-reordering');
    navigator.vibrate?.(12);
    tick();
  };

  const finish = () => {
    const d = drag;
    drag = null;
    cancelAnimationFrame(d.raf);
    try { scroller.releasePointerCapture(d.pid); } catch { /* sudah dilepas */ }
    const row = d.row;
    row.style.transition = 'transform .16s var(--ease, ease), box-shadow .16s';
    row.style.transform = '';
    setTimeout(() => { row.style.transition = ''; row.classList.remove('is-dragging'); scroller.classList.remove('is-reordering'); }, 180);
    swallow = true;
    setTimeout(() => { swallow = false; }, 400);
    const now = order();
    if (now.join() !== d.start.join()) onChange(now);
  };

  scroller.addEventListener('pointerdown', (ev) => {
    if (drag || (ev.pointerType === 'mouse' && ev.button !== 0)) return;
    const row = ev.target.closest('.vid-row');
    if (!row || !list.contains(row)) return;
    if (ev.target.closest('.vid-grip')) { ev.preventDefault(); return begin(row, ev.pointerId, ev.clientY, ev.clientY); }
    pending = { row, pid: ev.pointerId, x: ev.clientX, y: ev.clientY, cy: ev.clientY, type: ev.pointerType, timer: 0 };
    if (ev.pointerType !== 'mouse') {
      pending.timer = setTimeout(() => { const p = pending; pending = null; if (p) begin(p.row, p.pid, p.y, p.cy); }, LONG_PRESS);
    }
  });

  scroller.addEventListener('pointermove', (ev) => {
    if (drag) {
      if (ev.pointerId !== drag.pid) return;
      ev.preventDefault();
      drag.y = ev.clientY;
      return place();
    }
    if (!pending || ev.pointerId !== pending.pid) return;
    pending.cy = ev.clientY;
    const moved = Math.hypot(ev.clientX - pending.x, ev.clientY - pending.y);
    if (pending.type === 'mouse') {
      if (moved > 6) { const p = pending; pending = null; begin(p.row, p.pid, p.y, ev.clientY); }
    } else if (moved > 8) clearPending(); /* bergeser sebelum tahan cukup lama = menggulir biasa */
  });

  const end = (ev) => {
    if (pending && ev.pointerId === pending.pid) clearPending();
    if (drag && ev.pointerId === drag.pid) finish();
  };
  scroller.addEventListener('pointerup', end);
  scroller.addEventListener('pointercancel', end);
  /* Selama diseret, sentuhan tidak boleh menggulir halaman. */
  scroller.addEventListener('touchmove', (ev) => { if (drag) ev.preventDefault(); }, { passive: false });
  scroller.addEventListener('contextmenu', (ev) => { if (pending || drag) ev.preventDefault(); });
  scroller.addEventListener('dragstart', (ev) => ev.preventDefault());
  scroller.addEventListener('click', (ev) => { if (swallow) { ev.preventDefault(); ev.stopPropagation(); } }, true);

  /* Keyboard: Alt + panah memindahkan baris yang fokus satu posisi. */
  scroller.addEventListener('keydown', (ev) => {
    const row = ev.target.closest?.('.vid-row');
    if (!row || !ev.altKey || (ev.key !== 'ArrowUp' && ev.key !== 'ArrowDown')) return;
    const sib = ev.key === 'ArrowUp' ? row.previousElementSibling : row.nextElementSibling;
    if (!sib) return;
    ev.preventDefault();
    list.insertBefore(row, ev.key === 'ArrowUp' ? sib : sib.nextSibling);
    row.focus();
    onChange(order());
  });
};

class VideosView extends BaseView {
  /** Jumlah kartu per tahap: kelipatan 60 = baris grid selalu penuh di 1-5 kolom (kecuali baris terakhir daftar). */
  static BATCH = 60;
  #all = [];
  #shown = 0;

  render() {
    this.#all = videosInShowOrder(this.library);
    this.#shown = Math.min(VideosView.BATCH, this.#all.length);
    const first = this.#all.slice(0, this.#shown);
    const body = this.#all.length
      ? `<div class="vid-grid" role="list">${this.#cards(first)}</div>` +
        /* Penanda akhir daftar: selama masih ada video, cincin berputar menahan ujung daftar sampai tahap berikutnya dimuat (lihat VideoPager). */
        (this.#shown < this.#all.length ? '<div class="vid-more" role="status"><span class="vid-spin" aria-hidden="true"></span><span class="ld-sr">Memuat video lainnya…</span></div>' : '')
      : EmptyState('fa-circle-play', 'Belum ada video. Video akan muncul di sini setelah datanya tersedia.');
    return BaseView.page(`<div class="vid-page vid-list">${PageHead('Tonton', 'Semua Video', this.#all.length ? `${this.#all.length} video musik` : '', 'video')}${body}</div>`);
  }

  #cards(songs) {
    return songs.map((song) => VideoCard(song, videoInfo(this.library, song))).join('');
  }

  /** Tahap berikutnya: HTML kartu + apakah daftar sudah habis. */
  next() {
    const chunk = this.#all.slice(this.#shown, this.#shown + VideosView.BATCH);
    this.#shown += chunk.length;
    return { html: this.#cards(chunk), done: this.#shown >= this.#all.length };
  }
}

/**
 * Halaman pemutaran video: pemutar, judul, artis, deskripsi, lalu video terkait di bawahnya.
 * Audio lagu dijeda saat video dibuka; bila audio menyala lagi, video dihentikan dan diganti tombol putar.
 */
class VideoDetailView extends BaseView {
  #id = null;
  #stopped = false;

  get isOpen() { return this.#id !== null && !this.#stopped; }
  stop() { this.#stopped = true; }
  resume() { this.#stopped = false; }
  /** Keluar dari halaman pemutaran: pemutar dilepas dan status dikembalikan. */
  leave() { this.#id = null; this.#stopped = false; }

  render(route) {
    const song = this.library.getVideo(route.id);
    if (!song || !isVideo(song)) { this.#id = null; return BaseView.page(''); }
    if (route.id !== this.#id) { this.#id = route.id; this.#stopped = false; }

    const artist = song.artist;
    const artistName = artist?.name ?? ARTIST_NAME;
    const others = videosOf(this.library).filter((item) => item.id !== song.id);
    const sameArtist = others.filter((item) => item.artist === artist);
    /* Rekomendasi dihitung dari video yang sedang diputar (artis, album, genre): berubah setiap video berganti. */
    const related = relatedVideosFor(this.library, song, VIDEO_WATCH_COUNT);
    const album = albumNameOf(this.library, song);
    const key = videoKey(song);

    const stage = this.#stopped
      ? `<button type="button" class="vid-poster" data-video="${song.id}" aria-label="${e(`Putar video ${song.name}`)}">` +
        `<img ${IMG_ATTRS} width="480" height="360" decoding="async" fetchpriority="high" src="${e(videoThumb(song))}" alt=""><span class="vid-bigplay"><i class="fa-solid fa-play"></i></span>` +
        '<span class="vid-note">Video dijeda karena audio lagu sedang diputar. Ketuk untuk menonton.</span></button>'
      : `<img class="vid-load" ${IMG_ATTRS} width="480" height="360" decoding="async" fetchpriority="high" src="${e(videoThumb(song))}" alt="" aria-hidden="true">` +
        `<div class="vid-slot" data-key="${e(key)}" data-title="${e(song.name)}" data-src="${e(videoEmbedSrc(key))}"></div>`;

    const channelInner = `<img ${IMG_ATTRS} width="40" height="40" decoding="async" src="${e(artist?.img ?? artistAvatar(artistName, 0))}" alt="">` +
      VideoBy(artistName, sameArtist.length + 1);
    /* Artis yang hanya punya video (belum ada lagu musik) tidak punya halaman artis: tampil tanpa tautan. */
    const channel = artist && this.library.getArtist(artist.id)
      ? `<button type="button" class="vid-artist-link" data-go="artist:${artist.id}" aria-label="${e(`Buka halaman artis ${artistName}`)}">${channelInner}</button>`
      : `<span class="vid-artist-link">${channelInner}</span>`;

    /* Info artis/album/genre: komponen yang sama persis dengan kartu video (satu baris, ellipsis di sisi kanan). */
    const facts = VideoInfoLine(song, videoInfo(this.library, song), { artist: false });

    const desc = `<p>Video lagu “${e(song.name)}” dari ${e(artistName)}.</p>` +
      (song.duration > 0 ? `<p class="m">Durasi lagu: ${formatTime(song.duration)}</p>` : '') + Whisper('video', song.id);

    const relatedHtml = related.length
      ? `<section class="vid-related vid-secondary" aria-label="Video terkait"><h2>Video terkait</h2><div class="vid-grid" role="list">${related.map((song) => VideoCard(song, videoInfo(this.library, song))).join('')}</div></section>`
      : '';

    return BaseView.page('<div class="vid-page vid-watch">' +
      '<div class="vid-layout"><div class="vid-primary">' +
      `<div class="vid-stage">${stage}<button type="button" class="pg-back" data-go="videos" aria-label="Kembali ke Video"><i class="fa-solid fa-arrow-left" aria-hidden="true"></i></button></div>` +
      '<div class="vid-info">' +
      `<h1 class="vid-name">${e(song.name)}</h1>` + facts +
      `<div class="vid-channel">${channel}` +
      `<a class="vid-yt" href="https://www.youtube.com/watch?v=${key}" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-youtube" aria-hidden="true"></i> Buka di YouTube</a></div>` +
      `<section class="vid-desc" aria-label="Deskripsi video">${desc}</section></div></div>` +
      relatedHtml + '</div></div>');
  }
}

class SongsView extends BaseView {
  render() {
    const songs = this.library.sortedSongs();
    /* Header sama dengan Beranda (eyebrow + judul serif + keterangan); daftar memakai pola .songs seperti Beranda. */
    const head = PageHead('Koleksi', 'Semua Lagu', songs.length ? `${songs.length} lagu untuk kamu dengarkan` : '', 'songs');
    const body = songs.length ? `<div class="songs">${TrackList(songs)}</div>` : EmptyState('fa-music', MESSAGES.NO_SONGS);
    return BaseView.page(head + body, songs);
  }
}
