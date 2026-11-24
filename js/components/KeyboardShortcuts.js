'use strict';

/* ---- components/KeyboardShortcuts.js ---- */
/** Spasi = play/pause, kecuali fokus berada di elemen interaktif atau tombolnya sudah ditangani komponen lain. */
const INTERACTIVE_SELECTOR = 'input, button, textarea, select, a[href], [role="button"]';

class KeyboardShortcuts extends Component {
  constructor(root, { player, video }) {
    super(root);
    this.player = player;
    this.video = video;
  }

  bind() {
    this.listen(this.root, 'keydown', (event) => {
      if (event.code !== 'Space' || event.defaultPrevented || document.activeElement?.closest(INTERACTIVE_SELECTOR)) return;
      event.preventDefault();
      /* Saat Bar Video tampil, spasi mengatur video (bukan menyalakan lagu). */
      if (this.video.active) this.video.toggle();
      else this.player.toggle();
    });
  }
}
