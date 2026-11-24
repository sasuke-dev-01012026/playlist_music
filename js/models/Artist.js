'use strict';

/* ################ MODELS       ################ */

/* ---- models/Artist.js ---- */
class Artist {
  constructor({ id, name, bio, img, coverImg }) {
    this.id = id;
    this.name = name;
    this.bio = bio;
    const photo = img ?? coverImg;
    /* Tanpa foto: avatar inisial, bukan placeholder polos yang sama untuk semua artis. */
    this.img = !photo || photo === 'undefined' || photo === 'null' ? artistAvatar(name, id) : photo;
    /** Diisi oleh MusicLibrary saat relasi dibangun. */
    this.songs = [];
    this.albums = [];
  }
}
