<script setup lang="ts">
import { Compass } from "@lucide/vue";
</script>

<template>
  <div class="mx-auto max-w-md space-y-4 px-4 py-20 text-center">
    <span class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primaire/10 text-primaire">
      <Compass :size="32" aria-hidden="true" />
    </span>
    <h1 class="text-xl font-bold text-texte">Page introuvable</h1>
    <RouterLink to="/" class="font-medium text-primaire underline underline-offset-4">Retour a l'accueil</RouterLink>
  </div>
</template>
