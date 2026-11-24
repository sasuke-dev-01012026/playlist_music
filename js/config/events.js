'use strict';

/* ---- config/events.js ---- */
/** Nama event yang dipakai EventBus. Dipusatkan agar tidak ada string "ajaib" tersebar. */
const Events = Object.freeze({
  ROUTE_CHANGE: 'route:change',
  FAVORITES_CHANGE: 'favorites:change',
  PLAYER_STATE: 'player:state',
  PLAYER_TRACK: 'player:track',
  PLAYER_PROGRESS: 'player:progress',
  PLAYER_DURATION: 'player:duration',
  PLAYER_VOLUME: 'player:volume',
  NOWPLAYING_OPEN: 'nowplaying:open',
  TOAST: 'toast:show',
  VIDEO_STATE: 'video:state',
  VIDEO_PROGRESS: 'video:progress',
  VIDEO_ENDED: 'video:ended',
  VIDEO_ERROR: 'video:error',
  VIDEO_NEXT: 'video:next',
  VIDEO_PREV: 'video:prev',
  VIDEO_UPNEXT: 'video:upnext',
  VIDEO_UPNEXT_STATE: 'video:upnext-state',
  VIDEO_ORDER: 'video:order',
});
