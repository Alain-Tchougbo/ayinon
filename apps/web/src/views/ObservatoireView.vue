<script setup lang="ts">
import { FileCheck, Gavel, Globe, Handshake, LandPlot, Ruler } from "@lucide/vue";
import { onMounted, ref } from "vue";
import { api } from "../services/api";
import BaseCard from "../components/ui/BaseCard.vue";
import PageHeader from "../components/ui/PageHeader.vue";

interface StatistiquesObservatoire {
  genereLe: string;
  totalParcelles: number;
  parcellesParStatut: Record<string, number>;
  parcellesParPole: Array<{ pole: string; libelle: string; totalParcelles: number; superficieTotaleM2: number }>;
  conflitsCsafActifs: number;
  conventionsValideesTotal: number;
  conventionsValideesRecentes: number;
  parcellesAvecLimitesCertifiees: number;
}

const REPARTITION = [
  { cle: "TITREE", label: "Titrees", couleur: "bg-statut-titree" },
  { cle: "EN_COURS", label: "En cours", couleur: "bg-statut-en-cours" },
  { cle: "GEL_CSAF", label: "Gel CSAF", couleur: "bg-statut-gel" },
  { cle: "DOMAINE_PUBLIC", label: "Domaine public", couleur: "bg-statut-domaine-public" },
];

const stats = ref<StatistiquesObservatoire | null>(null);
const chargement = ref(true);

onMounted(async () => {
  stats.value = await api.get<StatistiquesObservatoire>("/observatoire");
  chargement.value = false;
});
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
    <PageHeader
      titre="Observatoire foncier"
      description="Indicateurs nationaux agreges en temps reel, sans authentification : aucune donnee affichee ici n'est fabriquee."
    >
      <template #icone><Globe :size="22" class="text-primaire" aria-hidden="true" /></template>
    </PageHeader>

    <p v-if="chargement" class="text-sm text-texte-attenue" role="status">Chargement...</p>

    <template v-else-if="stats">
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <BaseCard>
          <div class="flex items-center gap-2 text-texte-attenue"><LandPlot :size="16" aria-hidden="true" /><span class="text-xs font-semibold uppercase tracking-wide">Parcelles enregistrees</span></div>
          <p class="mt-1.5 text-2xl font-bold text-primaire">{{ stats.totalParcelles.toLocaleString("fr-FR") }}</p>
        </BaseCard>
        <BaseCard>
          <div class="flex items-center gap-2 text-texte-attenue"><Ruler :size="16" aria-hidden="true" /><span class="text-xs font-semibold uppercase tracking-wide">Limites certifiees</span></div>
          <p class="mt-1.5 text-2xl font-bold text-primaire">{{ stats.parcellesAvecLimitesCertifiees.toLocaleString("fr-FR") }}</p>
          <p class="text-xs text-texte-attenue">plan de bornage signe, sans chevauchement</p>
        </BaseCard>
        <BaseCard>
          <div class="flex items-center gap-2 text-texte-attenue"><Handshake :size="16" aria-hidden="true" /><span class="text-xs font-semibold uppercase tracking-wide">Cessions validees</span></div>
          <p class="mt-1.5 text-2xl font-bold text-primaire">{{ stats.conventionsValideesTotal.toLocaleString("fr-FR") }}</p>
          <p class="text-xs text-texte-attenue">{{ stats.conventionsValideesRecentes }} sur les 30 derniers jours</p>
        </BaseCard>
        <BaseCard :accentue="stats.conflitsCsafActifs > 0 ? 'danger' : undefined">
          <div class="flex items-center gap-2 text-texte-attenue"><Gavel :size="16" aria-hidden="true" /><span class="text-xs font-semibold uppercase tracking-wide">Gels judiciaires actifs</span></div>
          <p class="mt-1.5 text-2xl font-bold" :class="stats.conflitsCsafActifs > 0 ? 'text-danger' : 'text-primaire'">{{ stats.conflitsCsafActifs }}</p>
        </BaseCard>
      </div>

      <div>
        <h2 class="mb-3 font-semibold text-texte">Repartition par pole territorial</h2>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <BaseCard v-for="pole in stats.parcellesParPole" :key="pole.pole">
            <h3 class="font-semibold text-texte">{{ pole.libelle }}</h3>
            <p class="mt-1.5 text-2xl font-bold text-primaire">{{ pole.totalParcelles }}</p>
            <p class="text-xs text-texte-attenue">parcelles - {{ Math.round(pole.superficieTotaleM2).toLocaleString("fr-FR") }} m²</p>
          </BaseCard>
        </div>
      </div>

      <div>
        <h2 class="mb-3 font-semibold text-texte">Statuts cadastraux, echelle nationale</h2>
        <div class="overflow-x-auto rounded-carte border border-bordure bg-surface p-4">
          <ul class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <li v-for="ligne in REPARTITION" :key="ligne.cle" class="flex items-center justify-between rounded-carte border border-bordure px-3.5 py-2.5 text-sm">
              <span class="flex items-center gap-1.5 text-texte-attenue">
                <span class="h-2.5 w-2.5 shrink-0 rounded-full" :class="ligne.couleur" aria-hidden="true" />
                {{ ligne.label }}
              </span>
              <span class="font-semibold text-texte">{{ stats.parcellesParStatut[ligne.cle] ?? 0 }}</span>
            </li>
          </ul>
        </div>
      </div>

      <p class="flex items-start gap-2 rounded-carte border border-dashed border-bordure p-3.5 text-xs text-texte-attenue">
        <FileCheck :size="14" class="mt-0.5 shrink-0" aria-hidden="true" />
        Genere le {{ new Date(stats.genereLe).toLocaleString("fr-FR") }}, directement depuis le registre national — cette page peut aussi
        servir de point d'acces en donnees ouvertes (<code>GET /api/observatoire</code>) pour un chercheur ou une ONG, sans compte
        requis.
      </p>
    </template>
  </div>
</template>
