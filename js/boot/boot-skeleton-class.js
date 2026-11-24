/* Skeleton layar awal mengikuti halaman yang akan dibuka (hash URL, atau halaman terakhir yang tersimpan),
   bukan selalu Beranda: kelas CSS pada <html> memilih satu kerangka yang bentuknya sama dengan halaman aslinya. */
(function () {
  try {
    var seg = location.hash.replace(/^#\/?/, '').split('?')[0].split('/');
    if (!seg[0]) {
      var st = JSON.parse(localStorage.getItem('musik-teloor-pengaturan-v1') || 'null');
      if (st && typeof st.route === 'string') seg = st.route.replace(/^#\/?/, '').split('?')[0].split('/');
    }
    var v = seg[0];
    var map = { songs: 'songs', favorites: 'songs', search: 'songs', videos: 'videos', video: 'watch', explore: 'explore',
      artists: 'grid-round', albums: 'grid', playlists: 'grid-pl', album: 'detail', playlist: 'detail', genre: 'detail',
      egenre: 'detail', artist: 'detail-round' };
    /* Halaman kategori Jelajah punya susunan berbeda-beda; yang tak terdaftar = grid kartu playlist. */
    var cat = { 'explore-dekade': 'sec-dekade', 'explore-mood': 'sec-mood', 'explore-aktivitas': 'sec-aktivitas', 'explore-dunia': 'sec-dunia', 'explore-genre': 'sec-genre' };
    var kind = map[v] || (/^explore-/.test(v) ? (cat[v] || 'sec-grid') : 'home');
    var root = document.documentElement;
    root.setAttribute('data-boot', kind);
    /* View + id halaman: dipakai kerangka detail/pemutaran untuk memilih bisikan yang sama dengan halaman aslinya. */
    root.setAttribute('data-boot-view', v || '');
    root.setAttribute('data-boot-id', seg[1] || '');
  } catch (err) { /* tanpa penyimpanan: Beranda */ }
})();
