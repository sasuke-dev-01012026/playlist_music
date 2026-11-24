'use strict';

/* ---- views/AlbumView.js ---- */
/** Detail album: header + daftar lagu album ini saja (relasi albumId). Tanpa section artis / album lain. */
class AlbumView extends BaseView {
  render({ id }) {
    const album = this.library.getAlbum(id);
    if (!album) return BaseView.page(BackButton('home', 'Beranda') + EmptyState('fa-compact-disc', 'Album tidak ditemukan.'));
    const songs = album.songs;
    const meta = [...[album.artist.name, album.year].filter(Boolean).map(e), songs.length ? HeroTotal(songs) : '', album.videos.length ? e(`${album.videos.length} video`) : ''].filter(Boolean).join(' · ');
    const hero = `<section class="hero">${Image(album.cover, album.name)}<div><small>Album</small>` +
      `<h1 title="${e(album.name)}">${e(album.name)}</h1><p>${meta}</p>${Whisper('album', album.id)}</div></section>`;
    return BaseView.page(BackButton('home', 'Beranda') + hero + (songs.length ? Section('Lagu', TrackList(songs), `${songs.length} lagu`) : '')
      + VideoSection(this.library, relatedVideos(this.library, { albumId: album.id })), songs);
  }
}
