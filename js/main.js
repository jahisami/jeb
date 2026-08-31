// main.js - Application Entry Point
import { init } from "./core/bootstrap.js";
import { initUI } from "./ui.js";

document.addEventListener("DOMContentLoaded", async () => {
  try {
    // 1. Initialize UI bindings first so listeners are ready
    initUI();

    // 2. Initialize database store
    await init();

    // 3. Register PWA Service Worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("./sw.js")
        .then((reg) => {
          console.log("[jeb PWA] ServiceWorker registered:", reg.scope);
        })
        .catch((err) => {
          console.warn("[jeb PWA] ServiceWorker registration failed:", err);
        });
    }
  } catch (error) {
    console.error("[jeb App] Failed to bootstrap app:", error);
  }
});
