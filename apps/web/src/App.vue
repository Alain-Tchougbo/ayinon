<script setup lang="ts">
import { Shield } from "@lucide/vue";
import DashboardLayout from "./layouts/DashboardLayout.vue";
import PublicLayout from "./layouts/PublicLayout.vue";
import { useAuthStore } from "./stores/auth.store";

// Aiguillage strict entre deux habillages : PublicLayout (vitrine, pages accessibles sans compte)
// et DashboardLayout (sidebar + en-tete, uniquement une fois connecte). Jamais de chrome
// "tableau de bord" pour un visiteur, jamais de barre publique pour un utilisateur authentifie —
// la meme route (ex. /carte) change d'habillage selon l'etat de connexion, pas selon l'URL.
//
// L'app est montee avant que le garde de navigation ait fini de verifier la session (voir
// main.ts, qui ne bloque pas sur router.isReady()) : sans le garde ci-dessous, un utilisateur deja
// connecte verrait un flash de PublicLayout avant que DashboardLayout ne prenne le relais.
const auth = useAuthStore();
</script>

<template>
  <div v-if="auth.chargementInitial" class="flex h-screen items-center justify-center bg-fond" role="status" aria-label="Chargement">
    <Shield :size="32" class="animate-pulse text-primaire" aria-hidden="true" />
  </div>
  <DashboardLayout v-else-if="auth.estConnecte" />
  <PublicLayout v-else />
</template>
