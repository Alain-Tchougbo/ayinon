<script setup lang="ts">
import { ShieldOff, ShieldCheck, UserRoundSearch, Users } from "@lucide/vue";
import { onMounted, ref } from "vue";
import { ApiError, api } from "../../services/api";
import { useAuthStore } from "../../stores/auth.store";
import { useVoiceAssistant } from "../../composables/useVoiceAssistant";
import { PHRASES } from "../../voice/phrases";
import BaseButton from "../../components/ui/BaseButton.vue";
import BaseCard from "../../components/ui/BaseCard.vue";
import PageHeader from "../../components/ui/PageHeader.vue";

interface Utilisateur {
  id: string;
  email: string;
  role: string;
  nomComplet: string;
  telephone: string | null;
  poleTerritorial: string | null;
  createdAt: string;
  compteSuspenduLe: string | null;
  motifSuspensionCompte: string | null;
}
interface GroupeComptesLies {
  telephone: string;
  comptes: Array<{ id: string; email: string; nomComplet: string; role: string; createdAt: string }>;
}

const auth = useAuthStore();
const { definirPhraseCourante } = useVoiceAssistant();
const utilisateurs = ref<Utilisateur[]>([]);
const comptesLies = ref<GroupeComptesLies[]>([]);
const chargement = ref(false);
const erreur = ref<string | null>(null);
const message = ref<string | null>(null);
const actionEnCours = ref(false);
const suspensionEnCours = ref<string | null>(null);
const motifSuspension = ref("");

async function charger() {
  chargement.value = true;
  erreur.value = null;
  try {
    [utilisateurs.value, comptesLies.value] = await Promise.all([
      api.get<Utilisateur[]>("/admin/utilisateurs"),
      api.get<GroupeComptesLies[]>("/admin/comptes-lies"),
    ]);
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Chargement impossible";
  } finally {
    chargement.value = false;
  }
}

onMounted(() => {
  definirPhraseCourante(PHRASES.adminUtilisateursIntro);
  charger();
});

async function suspendre(id: string) {
  erreur.value = null;
  message.value = null;
  const motif = motifSuspension.value.trim();
  if (motif.length < 10) {
    erreur.value = "Le motif de suspension doit compter au moins 10 caracteres";
    return;
  }
  actionEnCours.value = true;
  try {
    await api.patch(`/admin/utilisateurs/${id}/statut`, { suspendre: true, motif });
    message.value = "Compte suspendu.";
    suspensionEnCours.value = null;
    motifSuspension.value = "";
    await charger();
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Suspension impossible";
  } finally {
    actionEnCours.value = false;
  }
}

async function reactiver(id: string) {
  erreur.value = null;
  message.value = null;
  actionEnCours.value = true;
  try {
    await api.patch(`/admin/utilisateurs/${id}/statut`, { suspendre: false });
    message.value = "Compte reactive.";
    await charger();
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Reactivation impossible";
  } finally {
    actionEnCours.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
    <PageHeader titre="Utilisateurs" description="Comptes de la plateforme : suspendez un compte en cas d'abus constate.">
      <template #icone><Users :size="22" class="text-primaire" aria-hidden="true" /></template>
    </PageHeader>

    <p v-if="erreur" class="rounded-carte bg-danger/10 p-3 text-sm text-danger" role="alert">{{ erreur }}</p>
    <p v-if="message" class="rounded-carte bg-succes/10 p-3 text-sm text-succes" role="status">{{ message }}</p>
    <p v-if="chargement" class="text-sm text-texte-attenue" role="status">Chargement…</p>

    <div v-if="!chargement" class="space-y-4">
      <!-- E3.9 : detection de comptes multiples, seul critere verifiable dans ce modele de
           donnees (voir docs/decisions.md). L'admin peut agir directement depuis la liste
           ci-dessous (suspension de compte). -->
      <BaseCard v-if="comptesLies.length > 0" accentue="accent" rembourrage="sm">
        <h2 class="mb-2 flex items-center gap-2 text-sm font-semibold text-texte">
          <UserRoundSearch :size="15" class="text-accent" aria-hidden="true" />
          Comptes partageant un numero de telephone ({{ comptesLies.length }})
        </h2>
        <ul class="space-y-2.5">
          <li v-for="g in comptesLies" :key="g.telephone" class="text-sm">
            <p class="font-mono text-xs text-texte-attenue">{{ g.telephone }}</p>
            <p class="text-texte">
              <span v-for="(c, index) in g.comptes" :key="c.id">
                {{ c.nomComplet }} ({{ c.role.replaceAll("_", " ") }})<span v-if="index < g.comptes.length - 1">, </span>
              </span>
            </p>
          </li>
        </ul>
      </BaseCard>

      <ul class="space-y-2.5">
        <li v-for="u in utilisateurs" :key="u.id">
          <BaseCard rembourrage="sm" :accentue="u.compteSuspenduLe ? 'danger' : 'aucun'">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p class="flex items-center gap-1.5 font-medium text-texte">
                  {{ u.nomComplet }}
                  <span
                    v-if="u.compteSuspenduLe"
                    class="inline-flex items-center gap-1 rounded-full bg-danger/10 px-2 py-0.5 text-xs font-semibold text-danger"
                  >
                    <ShieldOff :size="11" aria-hidden="true" />
                    Suspendu
                  </span>
                </p>
                <p class="text-xs text-texte-attenue">
                  {{ u.email }} — {{ u.role.replaceAll("_", " ") }}
                  <span v-if="u.poleTerritorial"> — {{ u.poleTerritorial.replaceAll("_", " ") }}</span>
                </p>
                <p v-if="u.compteSuspenduLe" class="mt-0.5 text-xs italic text-danger">
                  Suspendu le {{ new Date(u.compteSuspenduLe).toLocaleDateString("fr-FR") }}<span v-if="u.motifSuspensionCompte"> — {{ u.motifSuspensionCompte }}</span>
                </p>
              </div>
              <div v-if="u.id !== auth.utilisateur?.id" class="flex shrink-0 gap-2">
                <BaseButton v-if="u.compteSuspenduLe" taille="sm" variant="secondaire" :disabled="actionEnCours" @click="reactiver(u.id)">
                  <ShieldCheck :size="13" aria-hidden="true" />
                  Reactiver
                </BaseButton>
                <BaseButton v-else-if="suspensionEnCours !== u.id" taille="sm" variant="secondaire" @click="suspensionEnCours = u.id">
                  <ShieldOff :size="13" aria-hidden="true" />
                  Suspendre
                </BaseButton>
              </div>
            </div>

            <div v-if="suspensionEnCours === u.id" class="mt-3 space-y-2 rounded-carte border border-bordure bg-fond p-3">
              <label :for="`motif-suspension-${u.id}`" class="block text-xs font-medium text-texte">Motif de la suspension (obligatoire)</label>
              <textarea
                :id="`motif-suspension-${u.id}`"
                v-model="motifSuspension"
                rows="2"
                placeholder="Ex. plusieurs signalements fondes pour usurpation d'identite"
                class="w-full rounded-carte border border-bordure bg-surface px-3 py-2 text-xs text-texte"
              />
              <div class="flex gap-2">
                <BaseButton taille="sm" variant="danger" :disabled="actionEnCours" @click="suspendre(u.id)">Suspendre ce compte</BaseButton>
                <BaseButton taille="sm" variant="secondaire" @click="suspensionEnCours = null">Annuler</BaseButton>
              </div>
            </div>
          </BaseCard>
        </li>
      </ul>
    </div>
  </div>
</template>
