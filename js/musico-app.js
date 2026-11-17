/*
 * Musico - renderer & data access (KODE, bukan data).
 * Semua data musik/video dibaca dari <script id="musico-data"> di index.html
 * (window.MUSICO_DATA). Pada halaman lain data diambil lewat fetch('index.html').
 *
 * Container yang diisi (atribut data-musico):
 *   data-musico="songs:home-featured|home-latest|track"
 *   data-musico="videos:home|track"
 *   data-musico-video-link="about"   (link popup video pada about.html)
 */
(function (window, document, $) {
  'use strict';

  var DATA_PAGE = 'index.html';
  var DATA_ID = 'musico-data';

  /* ---------- Data loading ---------- */
  function loadData() {
    if (window.MUSICO_DATA) { return Promise.resolve(window.MUSICO_DATA); }
    return fetch(DATA_PAGE, { cache: 'no-cache' })
      .then(function (res) {
        if (!res.ok) { throw new Error('HTTP ' + res.status); }
        return res.text();
      })
      .then(function (html) {
        var el = new DOMParser().parseFromString(html, 'text/html').getElementById(DATA_ID);
        if (!el) { throw new Error('Blok #' + DATA_ID + ' tidak ditemukan di ' + DATA_PAGE); }
        (new Function(el.textContent))();
        if (!window.MUSICO_DATA) { throw new Error('MUSICO_DATA kosong'); }
        return window.MUSICO_DATA;
      });
  }

  /* ---------- Helpers ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fill(tpl, id) { return tpl.replace('{id}', encodeURIComponent(id)); }
  function mmss(sec) {
    if (sec == null) { return ''; }
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }
  function indexBy(list) {
    var m = {};
    list.forEach(function (x) { m[x.id] = x; });
    return m;
  }
  function pick(map, ids) {
    return ids.map(function (id) { return map[id]; }).filter(Boolean);
  }

  function Store(D) {
    this.D = D;
    this.artists = indexBy(D.music.artists);
    this.albums = indexBy(D.music.albums);
    this.songs = indexBy(D.music.songs);
    this.colors = indexBy(D.music.colors);
    this.videos = indexBy(D.video.videos);
  }

  Store.prototype.songIds = function (spec) {
    if (spec === 'all') {
      return this.D.music.songs.filter(function (s) { return s.soundcloudId; })
        .map(function (s) { return s.id; });
    }
    return spec || [];
  };
  Store.prototype.videoIds = function (spec) {
    return spec === 'all' ? this.D.video.videos.map(function (v) { return v.id; }) : (spec || []);
  };

  /* SoundCloud embed URL (diturunkan dari soundcloudId + warna lagu) */
  Store.prototype.soundcloudEmbed = function (song) {
    var sc = this.D.site.soundcloud;
    var id = song.soundcloudId;
    if (!id) { return ''; }
    var isPlaylist = id.charAt(0) === sc.playlistPrefix;
    var api = (isPlaylist ? sc.playlistApiUrl : sc.trackApiUrl) + (isPlaylist ? id.slice(1) : id);
    var color = this.colors[song.colorId];
    var q = 'url=' + encodeURIComponent(api) +
      (color ? '&color=' + encodeURIComponent(color.hex) : '') +
      '&auto_play=false&hide_related=true&show_comments=false&show_user=true' +
      '&show_reposts=false&show_teaser=false&visual=false';
    return sc.playerUrl + '?' + q;
  };
  Store.prototype.youtubeWatch = function (v) { return fill(this.D.site.youtube.watchUrl, v.youtubeId); };
  Store.prototype.youtubeThumb = function (v) {
    return v.thumbnail || fill(this.D.site.youtube.thumbnailUrl, v.youtubeId);
  };

  /* ---------- Rendering ---------- */
  function songRow(store, song, i, opts) {
    var artist = store.artists[song.artistId];
    var album = store.albums[song.albumId];
    var fb = store.D.site.fallbackImages.songThumbs;
    var img = (album && album.coverImg) || (artist && artist.coverImg) || fb[i % fb.length];
    var sub = [artist && artist.name, album && album.name, mmss(song.duration)]
      .filter(Boolean).join(' \u00b7 ');
    var sc = store.D.site.soundcloud;
    var rowCls = 'row align-items-center justify-content-center' + (opts.tight ? '' : ' mb-20');
    return '' +
      '<div class="' + rowCls + '" data-song-id="' + song.id + '">' +
        '<div class="col-xl-10"><div class="row align-items-center">' +
          '<div class="col-xl-9 col-md-9"><div class="music_field">' +
            '<div class="thumb"><img src="' + esc(img) + '" alt="' + esc(song.name) + '" width="148" height="148" style="object-fit:cover" loading="lazy" onerror="this.onerror=null;this.src=\'' + esc(fb[i % fb.length]) + '\'"></div>' +
            '<div class="audio_name">' +
              '<div class="name"><h4>' + esc(song.name) + '</h4><p>' + esc(sub) + '</p></div>' +
              '<iframe title="' + esc(song.name) + '" width="100%" height="' + sc.embedHeight + '" scrolling="no" frameborder="no" allow="autoplay" loading="lazy" src="' + esc(store.soundcloudEmbed(song)) + '"></iframe>' +
            '</div>' +
          '</div></div>' +
          '<div class="col-xl-3 col-md-3"><div class="music_btn"><a href="#" class="boxed-btn">buy albam</a></div></div>' +
        '</div></div>' +
      '</div>';
  }

  function videoTile(store, v, i) {
    var artist = store.artists[v.artistId];
    var fb = store.D.site.fallbackImages.videoThumbs;
    var alt = fb[i % fb.length];
    return '' +
      '<div class="col-xl-3 col-lg-3 col-md-6" data-video-id="' + v.id + '"><div class="single_video">' +
        '<div class="thumb"><img src="' + esc(store.youtubeThumb(v)) + '" alt="' + esc(v.title) + '" style="aspect-ratio:477/440;object-fit:cover" loading="lazy" onerror="this.onerror=null;this.src=\'' + esc(alt) + '\'"></div>' +
        '<div class="hover_elements">' +
          '<div class="video"><a class="popup-video" href="' + esc(store.youtubeWatch(v)) + '"> <i class="fa fa-play"></i></a></div>' +
          '<div class="hover_inner"><span>' + esc(artist ? artist.name : '') + '</span><h3><a href="#">' + esc(v.title) + '</a></h3></div>' +
        '</div>' +
      '</div></div>';
  }

  function bindPopups(scope) {
    if (!$ || !$.fn.magnificPopup) { return; }
    $(scope).find('.popup-video').each(function () {
      if (!$(this).data('magnificPopup')) { $(this).magnificPopup({ type: 'iframe' }); }
    });
  }

  function render(D) {
    var store = new Store(D);
    var pages = D.site.pages;

    [].forEach.call(document.querySelectorAll('[data-musico]'), function (el) {
      var kind = el.getAttribute('data-musico');
      var html = '';
      if (kind === 'songs:home-featured') {
        html = pick(store.songs, [pages.home.featuredSongId]).map(function (s, i) { return songRow(store, s, i, { tight: true }); }).join('');
      } else if (kind === 'songs:home-latest') {
        html = pick(store.songs, pages.home.latestSongIds).map(function (s, i) { return songRow(store, s, i + 1, {}); }).join('');
      } else if (kind === 'songs:track') {
        html = pick(store.songs, store.songIds(pages.track.songIds)).map(function (s, i) { return songRow(store, s, i, {}); }).join('');
      } else if (kind === 'videos:home') {
        html = pick(store.videos, store.videoIds(pages.home.videoIds)).map(function (v, i) { return videoTile(store, v, i); }).join('');
      } else if (kind === 'videos:track') {
        html = pick(store.videos, store.videoIds(pages.track.videoIds)).map(function (v, i) { return videoTile(store, v, i); }).join('');
      }
      el.innerHTML = html;
      bindPopups(el);
    });

    [].forEach.call(document.querySelectorAll('[data-musico-video-link="about"]'), function (a) {
      var v = store.videos[pages.about.videoId];
      if (v) { a.setAttribute('href', store.youtubeWatch(v)); bindPopups(a.parentNode); }
    });

    window.MusicoStore = store;
    document.dispatchEvent(new CustomEvent('musico:ready', { detail: store }));
  }

  function fail(err) {
    if (window.console) { console.error('[Musico] Gagal memuat data pusat dari ' + DATA_PAGE + ':', err); }
    [].forEach.call(document.querySelectorAll('[data-musico]'), function (el) {
      el.innerHTML = '<p style="text-align:center;color:#808080">Data tidak dapat dimuat. Buka situs melalui server web (http/https), bukan file://.</p>';
    });
  }

  loadData().then(render).catch(fail);
})(window, document, window.jQuery);
