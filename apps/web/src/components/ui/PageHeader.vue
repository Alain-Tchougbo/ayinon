<script setup lang="ts">
defineProps<{ titre: string; description?: string }>();
</script>

<template>
  <header class="space-y-1">
    <h1 class="flex items-center gap-2.5 text-xl font-bold tracking-tight text-primaire sm:text-2xl">
      <slot name="icone" />
      {{ titre }}
    </h1>
    <p v-if="description" class="max-w-2xl text-sm text-texte-attenue">{{ description }}</p>
  </header>
</template>
