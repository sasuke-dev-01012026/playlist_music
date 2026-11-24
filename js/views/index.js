'use strict';

/* ---- views/index.js ---- */
/**
 * Registry halaman: nama view (Route.view) -> instance View.
 * Menambah halaman baru = membuat kelas View + mendaftarkannya di sini.
 */
/** Halaman Favorit: semua lagu yang ditandai love. Antrean putar = daftar favorit ini. */
class FavoritesView extends BaseView {
  constructor(library, favorites) {
    super(library);
    this.favorites = favorites;
  }

  render() {
    const songs = this.favorites.songs;
    /* Susunan identik halaman Lagu: banner, judul section, lalu daftar lagu. */
    const head = PageHead('Koleksimu', 'Favorit', songs.length ? `${songs.length} lagu yang kamu sukai` : '', 'favorites');
    const html = head + (songs.length ? `<div class="songs">${TrackList(songs, (song) => this.favorites.keyOf(song))}</div>` : EmptyState('fa-heart', MESSAGES.NO_FAVORITES));
    return BaseView.page(html, songs);
  }
}

function createViews(library, searchService, recent, favorites) {
  return new Map([
    ['home', new HomeView(library, recent)],
    ['explore', new JelajahView(library)],
    ['artists', new ArtistsView(library)],
    ['albums', new AlbumsView(library)],
    ['playlists', new PlaylistsView(library)],
    ['songs', new SongsView(library)],
    ['videos', new VideosView(library)],
    ['video', new VideoDetailView(library)],
    ['favorites', new FavoritesView(library, favorites)],
    ['album', new AlbumView(library)],
    ['artist', new ArtistView(library)],
    ['search', new SearchView(library, searchService)],
    ['genre', new GenreView(library)],
    ['egenre', new ExploreGenreView(library)],
    ['playlist', new PlaylistView(library)],
    ...EXPLORE_ITEMS.map((item) => [item.view, new ExploreView(library)]),
  ]);
}
