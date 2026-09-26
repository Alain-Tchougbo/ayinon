<script setup lang="ts">
import { Shield } from "@lucide/vue";
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
    <Shield :size="32" class="animate-pulse text-primaire" aria-hidden="true" />
  </div>
  <DashboardLayout v-else-if="auth.estConnecte && !route.meta.forcerPublic" />
  <PublicLayout v-else />
</template>
