import { createPinia } from "pinia";
import { createApp } from "vue";
import App from "./App.vue";
import "./assets/styles/tokens.css";
import router from "./router";
import { rafraichirClePubliqueDepuisServeur } from "./services/edVerify";
import { initialiserSynchronisationAutomatique } from "./services/syncService";

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount("#app");

initialiserSynchronisationAutomatique();

// Cle publique du registre d'audit : mise en cache locale pour permettre au Scanner Anti-Fraude
// de verifier une signature Ed25519 meme sans reseau (voir services/edVerify.ts).
rafraichirClePubliqueDepuisServeur();
window.addEventListener("online", rafraichirClePubliqueDepuisServeur);
