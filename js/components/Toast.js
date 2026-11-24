'use strict';

/* ---- components/Toast.js ---- */
/** Notifikasi singkat. Tampil setiap ada event TOAST. */
class Toast extends Component {
  #timer = null;

  constructor(root, { bus }) {
    super(root);
    this.bus = bus;
  }

  bind() {
    this.subscribe(this.bus, Events.TOAST, (message) => this.show(message));
  }

  show(message) {
    this.root.textContent = message;
    this.root.classList.add('show');
    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => this.root.classList.remove('show'), TIMING.TOAST_MS);
  }
}
