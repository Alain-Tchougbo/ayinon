<script setup lang="ts">
import { useRoute } from "vue-router";
import DashboardLayout from "./layouts/DashboardLayout.vue";
import PublicLayout from "./layouts/PublicLayout.vue";
import { useAuthStore } from "./stores/auth.store";

// Aiguillage strict entre deux habillages : PublicLayout (vitrine, pages accessibles sans compte)
// et DashboardLayout (sidebar + en-tete, uniquement une fois connecte). Jamais de chrome
// "tableau de bord" pour un visiteur, jamais de barre publique pour un utilisateur authentifie -
// la meme route (ex. /carte) change d'habillage selon l'etat de connexion, pas selon l'URL.
// Seule exception deliberee : route.meta.forcerPublic (la vitrine accessible depuis le logo, voir
// router/index.ts) reste sur PublicLayout meme connecte, sans jamais toucher a la session.
//
// L'app est montee avant que le garde de navigation ait fini de verifier la session (voir
// main.ts, qui ne bloque pas sur router.isReady()) : sans le garde ci-dessous, un utilisateur deja
// connecte verrait un flash de PublicLayout avant que DashboardLayout ne prenne le relais.
const auth = useAuthStore();
const route = useRoute();
</script>

<template>
  <div v-if="auth.chargementInitial" class="flex h-screen items-center justify-center bg-fond" role="status" aria-label="Chargement">
    <span class="flex h-14 w-14 animate-pulse items-center justify-center rounded-carte bg-primaire">
      <svg viewBox="0 0 32 32" fill="none" class="h-7 w-7" aria-hidden="true">
        <path d="M6 22L10 8L24 6L27 20L16 27Z" stroke="#F2A93B" stroke-width="1.6" stroke-linejoin="round" />
        <circle cx="10" cy="8" r="1.6" fill="#F2A93B" />
      </svg>
    </span>
  </div>
  <DashboardLayout v-else-if="auth.estConnecte && !route.meta.forcerPublic" />
  <PublicLayout v-else />
</template>
