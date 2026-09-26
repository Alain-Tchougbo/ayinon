<script setup lang="ts">
import { LifeBuoy, Mail, Phone } from "@lucide/vue";
import { RoleUtilisateur } from "@ayinon/shared";
import { computed } from "vue";
import BaseCard from "../components/ui/BaseCard.vue";
import PageHeader from "../components/ui/PageHeader.vue";
import { useAuthStore } from "../stores/auth.store";

type Categorie = "grand-public" | "professionnel" | "institution";

const ROLES_PROFESSIONNELS: RoleUtilisateur[] = [
  RoleUtilisateur.GEOMETRE,
  RoleUtilisateur.NOTAIRE,
  RoleUtilisateur.AGENT_BANQUE,
  RoleUtilisateur.MANDATAIRE_FAMILIAL,
];
const ROLES_INSTITUTIONS: RoleUtilisateur[] = [RoleUtilisateur.AGENT_ANDF, RoleUtilisateur.MAGISTRAT_CSAF, RoleUtilisateur.ADMIN];

const CANAUX: Record<Categorie, { titre: string; description: string; email: string; telephone: string; delai: string }> = {
  "grand-public": {
    titre: "Assistance grand public",
    description: "Pour toute question sur votre compte, une annonce, une visite ou un signalement.",
    email: "aide@ayinon.bj",
    telephone: "+229 21 00 00 00",
    delai: "Reponse indicative sous 48h ouvrees",
  },
  professionnel: {
    titre: "Assistance professionnels",
    description: "Pour les geometres, notaires, mandataires familiaux et agents bancaires partenaires.",
    email: "professionnels@ayinon.bj",
    telephone: "+229 21 00 00 01",
    delai: "Reponse indicative sous 24h ouvrees",
  },
  institution: {
    titre: "Assistance institutions",
    description: "Pour les agents ANDF, magistrats CSAF et l'equipe d'administration de la plateforme.",
    email: "institutions@ayinon.bj",
    telephone: "+229 21 00 00 02",
    delai: "Reponse indicative prioritaire sous 4h ouvrees",
  },
};

const auth = useAuthStore();

/** ET.4 : support differencie par type d'acteur (CA), pas un canal unique pour tous. */
const categorie = computed<Categorie>(() => {
  if (auth.role && ROLES_INSTITUTIONS.includes(auth.role)) return "institution";
  if (auth.role && ROLES_PROFESSIONNELS.includes(auth.role)) return "professionnel";
  return "grand-public";
});

const canal = computed(() => CANAUX[categorie.value]);
</script>

<template>
  <div class="mx-auto max-w-xl space-y-6 p-4 sm:p-6">
    <PageHeader :titre="canal.titre" :description="canal.description">
      <template #icone><LifeBuoy :size="22" class="text-primaire" aria-hidden="true" /></template>
    </PageHeader>

    <BaseCard>
      <a :href="`mailto:${canal.email}`" class="flex items-center gap-2.5 text-sm font-medium text-texte hover:underline">
        <Mail :size="16" class="text-primaire" aria-hidden="true" />
        {{ canal.email }}
      </a>
      <p class="mt-2.5 flex items-center gap-2.5 text-sm font-medium text-texte">
        <Phone :size="16" class="text-primaire" aria-hidden="true" />
        {{ canal.telephone }}
      </p>
      <p class="mt-3 text-xs text-texte-attenue">{{ canal.delai }}, non garanti contractuellement.</p>
      <p class="mt-3 border-t border-bordure pt-3 text-xs italic text-texte-attenue">
        Coordonnees de demonstration : aucune boite mail ni ligne telephonique reelle n'est connectee a ce prototype.
      </p>
    </BaseCard>
  </div>
</template>
