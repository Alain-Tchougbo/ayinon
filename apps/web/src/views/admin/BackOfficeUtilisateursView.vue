<script setup lang="ts">
import { ShieldOff, ShieldCheck, UserRoundSearch, Users } from "@lucide/vue";
import { onMounted, ref } from "vue";
import { ApiError, api } from "../../services/api";
import { useAuthStore } from "../../stores/auth.store";
import { useVoiceAssistant } from "../../composables/useVoiceAssistant";
import { PHRASES } from "../../voice/phrases";
import BaseButton from "../../components/ui/BaseButton.vue";
import BaseCard from "../../components/ui/BaseCard.vue";
import BaseModal from "../../components/ui/BaseModal.vue";
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
  <div class="w-full space-y-6 p-4 sm:p-6">
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

      <div class="overflow-x-auto rounded-carte border border-bordure bg-surface">
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="border-b border-bordure bg-fond/60 text-xs font-semibold uppercase tracking-wide text-texte-attenue">
              <th class="px-4 py-3 font-semibold">Utilisateur</th>
              <th class="px-4 py-3 font-semibold">Statut</th>
              <th class="px-4 py-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-bordure">
            <template v-for="u in utilisateurs" :key="u.id">
              <tr class="align-top">
                <td class="px-4 py-3">
                  <p class="font-medium text-texte">{{ u.nomComplet }}</p>
                  <p class="text-xs text-texte-attenue">
                    {{ u.email }} — {{ u.role.replaceAll("_", " ") }}
                    <span v-if="u.poleTerritorial"> — {{ u.poleTerritorial.replaceAll("_", " ") }}</span>
                  </p>
                </td>
                <td class="px-4 py-3">
                  <span
                    v-if="u.compteSuspenduLe"
                    class="inline-flex items-center gap-1 rounded-full bg-danger/10 px-2 py-0.5 text-xs font-semibold text-danger"
                  >
                    <ShieldOff :size="11" aria-hidden="true" />
                    Suspendu
                  </span>
                  <p v-if="u.compteSuspenduLe" class="mt-1 text-xs italic text-danger">
                    Le {{ new Date(u.compteSuspenduLe).toLocaleDateString("fr-FR") }}<span v-if="u.motifSuspensionCompte"> — {{ u.motifSuspensionCompte }}</span>
                  </p>
                </td>
                <td class="px-4 py-3">
                  <div v-if="u.id !== auth.utilisateur?.id" class="flex shrink-0 gap-2">
                    <BaseButton v-if="u.compteSuspenduLe" taille="sm" variant="secondaire" :disabled="actionEnCours" @click="reactiver(u.id)">
                      <ShieldCheck :size="13" aria-hidden="true" />
                      Reactiver
                    </BaseButton>
                    <BaseButton v-else taille="sm" variant="secondaire" @click="suspensionEnCours = u.id">
                      <ShieldOff :size="13" aria-hidden="true" />
                      Suspendre
                    </BaseButton>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>

    <BaseModal :model-value="suspensionEnCours !== null" titre="Suspendre le compte" @update:model-value="suspensionEnCours = null">
      <div class="space-y-2">
        <label for="motif-suspension" class="block text-xs font-medium text-texte">Motif de la suspension (obligatoire)</label>
        <textarea
          id="motif-suspension"
          v-model="motifSuspension"
          rows="3"
          placeholder="Ex. plusieurs signalements fondes pour usurpation d'identite"
          class="w-full rounded-carte border border-bordure bg-fond px-3 py-2 text-xs text-texte"
        />
        <div class="flex gap-2">
          <BaseButton taille="sm" variant="danger" :disabled="actionEnCours" @click="suspendre(suspensionEnCours!)">Suspendre ce compte</BaseButton>
          <BaseButton taille="sm" variant="secondaire" @click="suspensionEnCours = null">Annuler</BaseButton>
        </div>
      </div>
    </BaseModal>
  </div>
</template>
