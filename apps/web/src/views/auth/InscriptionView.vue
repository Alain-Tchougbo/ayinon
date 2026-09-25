<script setup lang="ts">
import { ChevronDown, KeyRound, Shield, UserPlus } from "@lucide/vue";
import { ROLES_INSCRIPTIBLES, StatutDeclarantVendeur } from "@ayinon/shared";
import { ref } from "vue";
import { useRouter } from "vue-router";
import BaseButton from "../../components/ui/BaseButton.vue";
import BaseCard from "../../components/ui/BaseCard.vue";
import BaseInput from "../../components/ui/BaseInput.vue";
import { useAuthStore } from "../../stores/auth.store";

const auth = useAuthStore();
const router = useRouter();

type RoleInscriptible = (typeof ROLES_INSCRIPTIBLES)[number];

const LIBELLE_ROLE_INSCRIPTIBLE: Record<RoleInscriptible, string> = {
  CITOYEN: "Citoyen (gerer mes parcelles, mon passeport foncier)",
  VENDEUR: "Vendeur (publier une parcelle a vendre)",
  ACHETEUR: "Acheteur (parcourir la vitrine, manifester un interet)",
};

const LIBELLE_STATUT_DECLARANT: Record<StatutDeclarantVendeur, string> = {
  PROPRIETAIRE: "Proprietaire",
  HERITIER: "Heritier",
  MANDATAIRE: "Mandataire d'un proprietaire",
  AGENCE: "Agence immobiliere",
};

const etape = ref<"formulaire" | "confirmation">("formulaire");
const nomComplet = ref("");
const email = ref("");
const telephone = ref("");
const motDePasse = ref("");
const role = ref<RoleInscriptible>("CITOYEN");
const statutDeclarant = ref<StatutDeclarantVendeur | "">("");
const code = ref("");
const codeDebug = ref<string | null>(null);
const enCours = ref(false);

async function sInscrire() {
  enCours.value = true;
  const reponse = await auth.inscription({
    nomComplet: nomComplet.value,
    email: email.value,
    telephone: telephone.value.trim() || undefined,
    motDePasse: motDePasse.value,
    role: role.value,
    statutDeclarant: role.value === "VENDEUR" && statutDeclarant.value ? statutDeclarant.value : undefined,
  });
  enCours.value = false;
  if (reponse) {
    codeDebug.value = reponse.codeDebug ?? null;
    etape.value = "confirmation";
  }
}

async function confirmer() {
  enCours.value = true;
  const succes = await auth.confirmerInscription(email.value, code.value);
  enCours.value = false;
  if (succes) {
    router.push("/");
  }
}
</script>

<template>
  <div class="mx-auto max-w-md px-4 py-14">
    <div class="mb-6 flex flex-col items-center text-center">
      <span class="flex h-12 w-12 items-center justify-center rounded-carte bg-primaire text-primaire-contraste">
        <Shield :size="24" aria-hidden="true" />
      </span>
      <h1 class="mt-3 text-xl font-bold text-texte">Creer un compte AYINON</h1>
    </div>

    <BaseCard v-if="etape === 'formulaire'">
      <form class="space-y-4" @submit.prevent="sInscrire">
        <BaseInput id="nom-complet" v-model="nomComplet" label="Nom complet" required />
        <BaseInput id="email" v-model="email" label="Adresse e-mail" type="email" required />
        <BaseInput id="telephone" v-model="telephone" label="Telephone (optionnel)" type="tel" />
        <BaseInput id="mot-de-passe" v-model="motDePasse" label="Mot de passe (8 caracteres minimum)" type="password" required />

        <div>
          <label for="role" class="mb-1 block text-sm font-medium text-texte">Je m'inscris en tant que</label>
          <div class="relative">
            <select
              id="role"
              v-model="role"
              class="w-full appearance-none rounded-carte border border-bordure bg-fond px-3.5 py-2.5 pr-9 text-sm text-texte"
            >
              <option v-for="r in ROLES_INSCRIPTIBLES" :key="r" :value="r">{{ LIBELLE_ROLE_INSCRIPTIBLE[r] }}</option>
            </select>
            <ChevronDown :size="16" class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-texte-attenue" aria-hidden="true" />
          </div>
        </div>

        <div v-if="role === 'VENDEUR'">
          <label for="statut-declarant" class="mb-1 block text-sm font-medium text-texte">Vous declarez etre</label>
          <div class="relative">
            <select
              id="statut-declarant"
              v-model="statutDeclarant"
              class="w-full appearance-none rounded-carte border border-bordure bg-fond px-3.5 py-2.5 pr-9 text-sm text-texte"
            >
              <option value="" disabled>Choisissez une option</option>
              <option v-for="s in StatutDeclarantVendeur" :key="s" :value="s">{{ LIBELLE_STATUT_DECLARANT[s as StatutDeclarantVendeur] }}</option>
            </select>
            <ChevronDown :size="16" class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-texte-attenue" aria-hidden="true" />
          </div>
        </div>

        <p v-if="auth.erreur" class="rounded-carte bg-danger/10 p-3 text-sm text-danger" role="alert">{{ auth.erreur }}</p>

        <BaseButton type="submit" class="w-full" :disabled="enCours">
          <UserPlus :size="18" aria-hidden="true" />
          Creer mon compte
        </BaseButton>
      </form>
    </BaseCard>

    <BaseCard v-else>
      <form class="space-y-4" @submit.prevent="confirmer">
        <p class="text-sm text-texte-attenue">
          Un code a 6 chiffres a ete envoye a <span class="font-medium text-texte">{{ email }}</span> pour activer votre compte.
        </p>
        <p v-if="codeDebug" class="rounded-carte bg-accent/10 p-3 text-xs text-accent">
          (demo : code = {{ codeDebug }})
        </p>
        <BaseInput id="code-confirmation" v-model="code" label="Code de confirmation" :maxlength="6" required />
        <p v-if="auth.erreur" class="rounded-carte bg-danger/10 p-3 text-sm text-danger" role="alert">{{ auth.erreur }}</p>
        <BaseButton type="submit" class="w-full" :disabled="enCours || code.length !== 6">
          <KeyRound :size="18" aria-hidden="true" />
          Confirmer et activer mon compte
        </BaseButton>
      </form>
    </BaseCard>

    <p class="mt-6 text-center text-sm text-texte-attenue">
      Deja un compte ?
      <RouterLink to="/connexion" class="font-medium text-primaire underline underline-offset-2">Se connecter</RouterLink>
    </p>
  </div>
</template>
