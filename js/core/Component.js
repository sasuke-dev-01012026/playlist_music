'use strict';

/* ---- core/Component.js ---- */
/**
 * Kelas dasar komponen UI.
 *
 * Siklus hidup:  constructor(root) -> mount() -> [render() -> bind()] -> unmount()
 *  - render(): mengembalikan markup HTML (string). Kembalikan null jika markup sudah ada di halaman.
 *  - bind():   menautkan event DOM dan langganan EventBus. Gunakan listen()/subscribe()
 *              agar semuanya otomatis dibersihkan saat unmount().
 */
class Component {
  #cleanups = [];

  constructor(root) {
    if (!root) throw new Error(`${this.constructor.name}: elemen root tidak ditemukan`);
    this.root = root;
  }

  render() {
    return null;
  }

  bind() {}

  mount() {
    const markup = this.render();
    if (markup !== null) this.root.innerHTML = markup;
    this.bind();
    return this;
  }

  unmount() {
    this.#cleanups.forEach((cleanup) => cleanup());
    this.#cleanups = [];
  }

  /** Mencari elemen di dalam root komponen. */
  $(selector) {
    return this.root.querySelector(selector);
  }

  $$(selector) {
    return this.root.querySelectorAll(selector);
  }

  listen(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    this.#cleanups.push(() => target.removeEventListener(type, handler, options));
  }

  subscribe(bus, event, handler) {
    this.#cleanups.push(bus.on(event, handler));
  }
}
