'use strict';

/* ################ CORE         ################ */

/* ---- core/EventBus.js ---- */
/** Pola Observer: komponen dan service saling berkomunikasi tanpa saling mengenal. */
class EventBus {
  #listeners = new Map();

  /** Mendaftarkan handler. Mengembalikan fungsi untuk berhenti berlangganan. */
  on(event, handler) {
    if (!this.#listeners.has(event)) this.#listeners.set(event, new Set());
    this.#listeners.get(event).add(handler);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    this.#listeners.get(event)?.delete(handler);
  }

  emit(event, payload) {
    this.#listeners.get(event)?.forEach((handler) => handler(payload));
  }
}
