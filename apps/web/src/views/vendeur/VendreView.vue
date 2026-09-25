<script setup lang="ts">
import { Check, Handshake, Megaphone, ShieldCheck, Store, X } from "@lucide/vue";
import { computed, onMounted, ref } from "vue";
import BaseButton from "../../components/ui/BaseButton.vue";
import BaseCard from "../../components/ui/BaseCard.vue";
import BaseInput from "../../components/ui/BaseInput.vue";
import PageHeader from "../../components/ui/PageHeader.vue";
import { ApiError, api } from "../../services/api";
import { useAuthStore } from "../../stores/auth.store";
import { useParcellesStore } from "../../stores/parcelles.store";

interface InteretResume {
  id: string;
  statut: "EN_ATTENTE" | "RETENU" | "DECLINE";
  message: string | null;
  createdAt: string;
  acheteur: { id: string; nomComplet: string };
}
interface MonAnnonce {
  id: string;
  parcelleId: string;
  prixIndicatifFcfa: number | null;
  description: string | null;
  statut: "ACTIVE" | "RETIREE" | "VENDUE";
  verifieeParAndfId: string | null;
  parcelle: { nup: string; commune: string; superficieM2: number };
  interets: InteretResume[];
  limitesCertifiees: boolean;
}

const LIBELLE_STATUT: Record<MonAnnonce["statut"], string> = { ACTIVE: "Active", RETIREE: "Retiree", VENDUE: "Vendue" };
const COULEUR_STATUT: Record<MonAnnonce["statut"], string> = {
  ACTIVE: "bg-succes/10 text-succes",
  RETIREE: "bg-texte-attenue/10 text-texte-attenue",
  VENDUE: "bg-primaire/10 text-primaire",
};

const auth = useAuthStore();
const parcelles = useParcellesStore();

const mesAnnonces = ref<MonAnnonce[]>([]);
const chargement = ref(false);
const erreur = ref<string | null>(null);
const message = ref<string | null>(null);

const publicationEnCours = ref(false);
const parcelleChoisie = ref("");
const prixIndicatifFcfa = ref("");
const description = ref("");

const retenueEnCours = ref<string | null>(null);
// L'input natif type="number" fait caster la valeur en number via v-model : le type reflete
// les deux cas reels (vide au depart, number une fois saisi).
const montantParInteret = ref<Record<string, string | number>>({});
const actionEnCours = ref(false);

const parcellesSansAnnonceActive = computed(() => {
  const idsAvecAnnonceActive = new Set(mesAnnonces.value.filter((a) => a.statut === "ACTIVE").map((a) => a.parcelleId));
  return parcelles.parcelles.filter((p) => p.proprietaireId === auth.utilisateur?.proprietaireId && !idsAvecAnnonceActive.has(p.id));
});

onMounted(async () => {
  chargement.value = true;
  try {
    await parcelles.chargerToutes();
    mesAnnonces.value = await api.get<MonAnnonce[]>("/annonces/mes-annonces");
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Impossible de charger vos annonces";
  } finally {
    chargement.value = false;
  }
});

async function rafraichir() {
  mesAnnonces.value = await api.get<MonAnnonce[]>("/annonces/mes-annonces");
}

async function publier() {
  erreur.value = null;
  message.value = null;
  actionEnCours.value = true;
  try {
    await api.post("/annonces", {
      parcelleId: parcelleChoisie.value,
      prixIndicatifFcfa: prixIndicatifFcfa.value || undefined,
      description: description.value.trim() || undefined,
    });
    message.value = "Annonce publiee : elle est desormais visible dans la vitrine publique.";
    publicationEnCours.value = false;
    parcelleChoisie.value = "";
    prixIndicatifFcfa.value = "";
    description.value = "";
    await rafraichir();
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Publication impossible";
  } finally {
    actionEnCours.value = false;
  }
}

async function retirer(annonceId: string) {
  erreur.value = null;
  message.value = null;
  actionEnCours.value = true;
  try {
    await api.patch(`/annonces/${annonceId}/retirer`);
    message.value = "Annonce retiree de la vitrine.";
    await rafraichir();
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Retrait impossible";
  } finally {
    actionEnCours.value = false;
  }
}

async function retenir(annonceId: string, interetId: string) {
  erreur.value = null;
  message.value = null;
  // L'input natif type="number" fait caster montantParInteret[interetId] en Number par Vue (pas
  // une string) : pas de .trim() ici, le schema Zod cote API fait deja z.coerce.number().
  const montantFcfa = montantParInteret.value[interetId];
  if (!montantFcfa) {
    erreur.value = "Indiquez le montant convenu avant de retenir cet interet";
    return;
  }
  actionEnCours.value = true;
  try {
    await api.patch(`/annonces/${annonceId}/interets/${interetId}/retenir`, { montantFcfa });
    message.value = "Interet retenu : une cession a ete creee et transmise a l'ANDF pour validation.";
    retenueEnCours.value = null;
    delete montantParInteret.value[interetId];
    await rafraichir();
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Impossible de retenir cet interet";
  } finally {
    actionEnCours.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-8 p-4 sm:p-6">
    <PageHeader
      titre="Vendre un terrain"
      description="Publiez une parcelle que vous possedez dans la vitrine publique, suivez les acheteurs interesses et retenez celui de votre choix."
    >
      <template #icone><Store :size="22" class="text-primaire" aria-hidden="true" /></template>
    </PageHeader>

    <p v-if="erreur" class="rounded-carte bg-danger/10 p-3 text-sm text-danger" role="alert">{{ erreur }}</p>
    <p v-if="message" class="rounded-carte bg-succes/10 p-3 text-sm text-succes" role="status">{{ message }}</p>

    <section>
      <div class="flex items-center justify-between">
        <h2 class="font-semibold text-texte">Publier une nouvelle annonce</h2>
        <BaseButton v-if="!publicationEnCours" taille="sm" variant="secondaire" @click="publicationEnCours = true">
          <Megaphone :size="14" aria-hidden="true" />
          Publier
        </BaseButton>
      </div>

      <BaseCard v-if="publicationEnCours" class="mt-3">
        <div v-if="parcellesSansAnnonceActive.length === 0" class="text-sm text-texte-attenue">
          Aucune de vos parcelles n'est disponible pour une nouvelle annonce (deja publiee, ou aucune parcelle enregistree a votre nom).
        </div>
        <div v-else class="space-y-3">
          <div>
            <label for="parcelle-choisie" class="mb-1 block text-sm font-medium text-texte">Parcelle a publier</label>
            <select
              id="parcelle-choisie"
              v-model="parcelleChoisie"
              class="w-full rounded-carte border border-bordure bg-fond px-3.5 py-2.5 text-sm text-texte"
            >
              <option value="" disabled>Choisissez une parcelle</option>
              <option v-for="p in parcellesSansAnnonceActive" :key="p.id" :value="p.id">
                {{ p.nup }} — {{ p.commune }} ({{ p.superficieM2.toLocaleString("fr-FR") }} m²)
              </option>
            </select>
          </div>
          <BaseInput id="prix-indicatif" v-model="prixIndicatifFcfa" type="number" label="Prix indicatif en FCFA (optionnel)" />
          <div>
            <label for="description-annonce" class="mb-1 block text-sm font-medium text-texte">Description (optionnelle)</label>
            <textarea
              id="description-annonce"
              v-model="description"
              rows="3"
              placeholder="Ex. terrain plat, viabilise, proche de la route principale"
              class="w-full rounded-carte border border-bordure bg-surface px-3 py-2 text-sm text-texte placeholder:text-texte-attenue"
            />
          </div>
          <div class="flex gap-2">
            <BaseButton taille="sm" :disabled="actionEnCours || !parcelleChoisie" @click="publier">Publier l'annonce</BaseButton>
            <BaseButton taille="sm" variant="secondaire" @click="publicationEnCours = false">Annuler</BaseButton>
          </div>
        </div>
      </BaseCard>
    </section>

    <section>
      <h2 class="mb-3 font-semibold text-texte">Vos annonces</h2>
      <p v-if="chargement" class="text-sm text-texte-attenue" role="status">Chargement…</p>
      <p v-else-if="mesAnnonces.length === 0" class="text-sm text-texte-attenue">Aucune annonce publiee pour le moment.</p>
      <ul v-else class="space-y-4">
        <li v-for="a in mesAnnonces" :key="a.id">
          <BaseCard>
            <div class="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p class="font-semibold text-texte">{{ a.parcelle.nup }} — {{ a.parcelle.commune }}</p>
                <p class="text-xs text-texte-attenue">{{ a.parcelle.superficieM2.toLocaleString("fr-FR") }} m²</p>
              </div>
              <span class="rounded-full px-2.5 py-0.5 text-xs font-semibold" :class="COULEUR_STATUT[a.statut]">{{ LIBELLE_STATUT[a.statut] }}</span>
            </div>
            <p v-if="a.verifieeParAndfId" class="mt-2 flex items-center gap-1 text-xs font-semibold text-succes">
              <ShieldCheck :size="12" aria-hidden="true" />
              Situation fonciere controlee par l'ANDF
            </p>
            <BaseButton
              v-if="a.statut === 'ACTIVE'"
              taille="sm"
              variant="secondaire"
              class="mt-3"
              :disabled="actionEnCours"
              @click="retirer(a.id)"
            >
              Retirer l'annonce
            </BaseButton>

            <div v-if="a.interets.length > 0" class="mt-4 space-y-2 border-t border-bordure pt-3">
              <p class="flex items-center gap-1.5 text-xs font-semibold text-texte">
                <Handshake :size="14" class="text-accent" aria-hidden="true" />
                Interets recus ({{ a.interets.length }})
              </p>
              <div v-for="i in a.interets" :key="i.id" class="rounded-carte bg-fond p-3 text-sm">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <p class="font-medium text-texte">{{ i.acheteur.nomComplet }}</p>
                  <span
                    class="rounded-full px-2 py-0.5 text-xs font-semibold"
                    :class="i.statut === 'RETENU' ? 'bg-succes/10 text-succes' : i.statut === 'DECLINE' ? 'bg-texte-attenue/10 text-texte-attenue' : 'bg-accent/10 text-accent'"
                  >
                    {{ i.statut === "RETENU" ? "Retenu" : i.statut === "DECLINE" ? "Decline" : "En attente" }}
                  </span>
                </div>
                <p v-if="i.message" class="mt-1 text-xs text-texte-attenue">« {{ i.message }} »</p>

                <template v-if="i.statut === 'EN_ATTENTE' && a.statut === 'ACTIVE'">
                  <div v-if="retenueEnCours === i.id" class="mt-2 flex flex-wrap items-center gap-2">
                    <input
                      v-model="montantParInteret[i.id]"
                      type="number"
                      placeholder="Montant convenu (FCFA)"
                      class="min-w-[10rem] flex-1 rounded-carte border border-bordure bg-surface px-3 py-1.5 text-xs text-texte placeholder:text-texte-attenue"
                    />
                    <BaseButton taille="sm" :disabled="actionEnCours" @click="retenir(a.id, i.id)">
                      <Check :size="12" aria-hidden="true" />
                      Confirmer
                    </BaseButton>
                    <BaseButton taille="sm" variant="secondaire" @click="retenueEnCours = null">
                      <X :size="12" aria-hidden="true" />
                      Annuler
                    </BaseButton>
                  </div>
                  <BaseButton v-else taille="sm" class="mt-2" @click="retenueEnCours = i.id">Retenir cet acheteur</BaseButton>
                </template>
              </div>
            </div>
          </BaseCard>
        </li>
      </ul>
    </section>
  </div>
</template>
