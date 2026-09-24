<script setup lang="ts">
import { RoleUtilisateur } from "@ayinon/shared";
import { computed, onMounted, ref } from "vue";
import { RouterLink, RouterView, useRouter } from "vue-router";
import VoiceAssistantBar from "./components/accessibility/VoiceAssistantBar.vue";
import { useOnlineStatus } from "./composables/useOnlineStatus";
import { useAuthStore } from "./stores/auth.store";

const auth = useAuthStore();
const router = useRouter();
const { enLigne } = useOnlineStatus();

type Theme = "clair" | "sombre" | "contraste-eleve";
const theme = ref<Theme>((localStorage.getItem("ayinon_theme") as Theme | null) ?? "clair");

function appliquerTheme(nouveau: Theme) {
  theme.value = nouveau;
  localStorage.setItem("ayinon_theme", nouveau);
  document.documentElement.setAttribute("data-theme", nouveau);
}

// Le chargement de la session est deja assure par le garde de navigation (router/index.ts)
// avant la toute premiere resolution de route ; l'appeler de nouveau ici doublerait inutilement
// la requete /auth/moi (et son eventuelle tentative de rafraichissement) a chaque montage.
onMounted(() => {
  appliquerTheme(theme.value);
});

const liensRole = computed(() => {
  const liens: Array<{ to: string; label: string }> = [{ to: "/carte", label: "Carte cadastrale" }];
  liens.push({ to: "/scanner", label: "Scanner anti-fraude" });
  liens.push({ to: "/simulateur-frais", label: "Simulateur de frais" });
  if (auth.role === RoleUtilisateur.CITOYEN) {
    liens.push({ to: "/passeport-foncier", label: "Passeport foncier" });
    liens.push({ to: "/famille", label: "Terre familiale" });
  }
  if (auth.role === RoleUtilisateur.MANDATAIRE_FAMILIAL) {
    liens.push({ to: "/famille", label: "Mes mandats familiaux" });
  }
  if (auth.role === RoleUtilisateur.GEOMETRE) {
    liens.push({ to: "/geometre", label: "Bornage & chevauchement" });
  }
  if (auth.role === RoleUtilisateur.AGENT_ANDF || auth.role === RoleUtilisateur.ADMIN) {
    liens.push({ to: "/andf", label: "Console des poles" });
  }
  if (auth.role === RoleUtilisateur.MAGISTRAT_CSAF) {
    liens.push({ to: "/andf", label: "Console des poles" });
    liens.push({ to: "/csaf", label: "Gel conservatoire CSAF" });
  }
  return liens;
});

async function seDeconnecter() {
  await auth.deconnexion();
  router.push({ name: "accueil" });
}
</script>

<template>
  <div class="flex min-h-full flex-col bg-fond text-texte">
    <header class="border-b border-bordure bg-surface">
      <div class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <RouterLink to="/" class="flex items-center gap-2 text-lg font-bold text-primaire">
          <span aria-hidden="true">🛡️</span>
          AYINON
        </RouterLink>

        <nav class="flex flex-wrap items-center gap-1 text-sm" aria-label="Navigation principale">
          <RouterLink
            v-for="lien in liensRole"
            :key="lien.to"
            :to="lien.to"
            class="rounded-carte px-3 py-2 font-medium text-texte hover:bg-fond"
            active-class="bg-primaire text-primaire-contraste hover:bg-primaire"
          >
            {{ lien.label }}
          </RouterLink>
        </nav>

        <div class="flex items-center gap-2">
          <span
            class="rounded-full px-2 py-1 text-xs font-semibold"
            :class="enLigne ? 'bg-succes/10 text-succes' : 'bg-danger/10 text-danger'"
          >
            {{ enLigne ? "En ligne" : "Hors-ligne" }}
          </span>

          <select
            v-model="theme"
            aria-label="Theme d'affichage"
            class="rounded-carte border border-bordure bg-surface px-2 py-1 text-xs"
            @change="appliquerTheme(theme)"
          >
            <option value="clair">Clair</option>
            <option value="sombre">Sombre</option>
            <option value="contraste-eleve">Plein-soleil</option>
          </select>

          <template v-if="auth.estConnecte">
            <span class="hidden text-xs text-texte-attenue sm:inline">{{ auth.utilisateur?.nomComplet }}</span>
            <button
              class="rounded-carte bg-fond px-3 py-2 text-xs font-semibold text-texte hover:bg-bordure"
              @click="seDeconnecter"
            >
              Se deconnecter
            </button>
          </template>
          <RouterLink
            v-else
            to="/connexion"
            class="rounded-carte bg-primaire px-3 py-2 text-xs font-semibold text-primaire-contraste"
          >
            Se connecter
          </RouterLink>
        </div>
      </div>
    </header>

    <main class="flex-1">
      <RouterView />
    </main>

    <VoiceAssistantBar />

    <footer class="border-t border-bordure bg-surface py-4 text-center text-xs text-texte-attenue">
      AYINON — Le Gardien Numerique de la Terre · Republique du Benin
    </footer>
  </div>
</template>
