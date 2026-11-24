'use strict';

/* ---- views/ArtistView.js ---- */
/** Detail artist: header bulat + section Album (albumnya) dan Lagu (lagunya), keduanya hanya milik artist ini. */
class ArtistView extends BaseView {
  render({ id }) {
    const artist = this.library.getArtist(id);
    if (!artist) return BaseView.page('');
    const songs = artist.songs;
    /* Label genre: maksimal 2, teks biasa (tidak diklik); artis tanpa genre di data tidak menampilkan label. */
    const genres = (ARTIST_GENRES[artist.id] ?? [])
      .map((gid) => this.library.genres.find((g) => g.id === gid)?.name)
      .filter(Boolean).slice(0, 2).join(', ');
    const albums = artist.albums;
    /* Penyanyi tanpa lagu musik tetapi punya video: halaman berisi videonya. */
    const videos = relatedVideos(this.library, { artists: [artist] });
    const meta = songs.length
      ? [...[genres, albums.length ? `${albums.length} album` : ''].filter(Boolean).map(e), HeroTotal(songs), videos.length ? e(`${videos.length} video`) : ''].filter(Boolean).join(' · ')
      : [genres, albums.length ? `${albums.length} album` : '', `${videos.length} video`].filter(Boolean).map(e).join(' · ');
    const hero = `<section class="hero round">${Image(artist.img, artist.name)}<div><small>Artis</small>` +
      `<h1 title="${e(artist.name)}">${e(artist.name)}</h1><p>${meta}</p>${Whisper('artist', artist.id)}</div></section>`;
    const body = songs.length
      ? (albums.length ? Section(`Semua Album ${artist.name}`, AlbumCarousel(albums)) : '') + Section(`Semua Lagu ${artist.name}`, TrackList(songs))
        + VideoSection(this.library, relatedVideos(this.library, { artists: [artist] }), `Semua Video ${artist.name}`)
      : videos.length ? (albums.length ? Section(`Semua Album ${artist.name}`, AlbumCarousel(albums)) : '') + VideoSection(this.library, videos, `Semua Video ${artist.name}`) : EmptyState('fa-music', MESSAGES.NO_SONGS);
    return BaseView.page(BackButton('home', 'Beranda') + hero + body, songs);
  }
}
