<script setup lang="ts">
import { Award, Banknote, CalendarClock, Check, Download, FileStack, Handshake, Inbox, Landmark, Search, Star, X } from "@lucide/vue";
import { onMounted, ref } from "vue";
import BaseButton from "../../components/ui/BaseButton.vue";
import BaseCard from "../../components/ui/BaseCard.vue";
import BaseInput from "../../components/ui/BaseInput.vue";
import PageHeader from "../../components/ui/PageHeader.vue";
import { ApiError, api } from "../../services/api";

interface Sequestre {
  id: string;
  montantFcfa: number;
  statut: "DEPOT_DECLARE" | "DEPOT_CONFIRME" | "LIBERE" | "REMBOURSE";
}

interface MonInteret {
  id: string;
  statut: "EN_ATTENTE" | "RETENU" | "DECLINE";
  message: string | null;
  createdAt: string;
  annonce: {
    id: string;
    statut: "ACTIVE" | "RETIREE" | "VENDUE";
    prixIndicatifFcfa: number | null;
    parcelle: { nup: string; commune: string; superficieM2: number };
    publieePar: { nomComplet: string };
    cessions: Array<{ id: string; statutCession: string; sequestre: Sequestre | null }>;
  };
}

interface CessionAcquise {
  id: string;
  montantFcfa: number;
  statutCession: "ACCEPTEE" | "VALIDEE" | "REJETEE";
  motifRejet: string | null;
  parcelle: { nup: string; commune: string };
  sequestre: Sequestre | null;
}

interface MonTitre {
  id: string;
  numeroTitre: string;
  dateDelivrance: string;
  hashSha256: string;
  signatureEd25519: string;
  parcelle: { nup: string; commune: string; superficieM2: number };
  convention: { montantFcfa: number; vendeurNom: string };
}

interface PropositionRecue {
  id: string;
  vendeurNom: string;
  montantFcfa: number;
  parcelle: { nup: string; commune: string };
}

interface MaVisite {
  id: string;
  mode: "PRESENTIEL" | "VIDEO";
  dateProposee: string;
  nouvelleDateProposee: string | null;
  statut: "DEMANDEE" | "CONFIRMEE" | "REFUSEE" | "REPROGRAMMEE";
  motifRefus: string | null;
  annonce: { id: string; parcelle: { nup: string; commune: string }; publieePar: { nomComplet: string } };
}

interface DemandeFinancement {
  id: string;
  montantSouhaiteFcfa: number;
  statut: "EN_ATTENTE" | "ACCORD_PRINCIPE" | "REFUSEE";
  montantAccordeFcfa: number | null;
  motifRefus: string | null;
  codeVerification: string | null;
  createdAt: string;
}

const LIBELLE_STATUT: Record<MonInteret["statut"], string> = { EN_ATTENTE: "En attente", RETENU: "Retenu", DECLINE: "Decline" };
const COULEUR_STATUT: Record<MonInteret["statut"], string> = {
  EN_ATTENTE: "bg-accent/10 text-accent",
  RETENU: "bg-succes/10 text-succes",
  DECLINE: "bg-texte-attenue/10 text-texte-attenue",
};
const LIBELLE_STATUT_CESSION: Record<CessionAcquise["statutCession"], string> = {
  ACCEPTEE: "Acceptee — en attente de validation ANDF",
  VALIDEE: "Validee — titre delivre",
  REJETEE: "Rejetee",
};
const COULEUR_STATUT_CESSION: Record<CessionAcquise["statutCession"], string> = {
  ACCEPTEE: "bg-primaire/10 text-primaire",
  VALIDEE: "bg-succes/10 text-succes",
  REJETEE: "bg-danger/10 text-danger",
};
const LIBELLE_STATUT_SEQUESTRE: Record<Sequestre["statut"], string> = {
  DEPOT_DECLARE: "Depot declare — en attente de confirmation par la banque",
  DEPOT_CONFIRME: "Depot confirme par la banque",
  LIBERE: "Depot libere au vendeur",
  REMBOURSE: "Depot rembourse",
};
const LIBELLE_STATUT_VISITE: Record<MaVisite["statut"], string> = {
  DEMANDEE: "En attente du vendeur",
  CONFIRMEE: "Confirmee",
  REFUSEE: "Refusee",
  REPROGRAMMEE: "Nouvelle date proposee par le vendeur",
};
const COULEUR_STATUT_VISITE: Record<MaVisite["statut"], string> = {
  DEMANDEE: "bg-accent/10 text-accent",
  CONFIRMEE: "bg-succes/10 text-succes",
  REFUSEE: "bg-danger/10 text-danger",
  REPROGRAMMEE: "bg-primaire/10 text-primaire",
};
const LIBELLE_STATUT_FINANCEMENT: Record<DemandeFinancement["statut"], string> = {
  EN_ATTENTE: "En attente d'examen par la banque",
  ACCORD_PRINCIPE: "Accord de principe",
  REFUSEE: "Refusee",
};
const COULEUR_STATUT_FINANCEMENT: Record<DemandeFinancement["statut"], string> = {
  EN_ATTENTE: "bg-accent/10 text-accent",
  ACCORD_PRINCIPE: "bg-succes/10 text-succes",
  REFUSEE: "bg-danger/10 text-danger",
};

const mesInterets = ref<MonInteret[]>([]);
const mesTitres = ref<MonTitre[]>([]);
const propositionsRecues = ref<PropositionRecue[]>([]);
const cessionsAcquises = ref<CessionAcquise[]>([]);
const mesVisites = ref<MaVisite[]>([]);
const mesFinancements = ref<DemandeFinancement[]>([]);
const chargement = ref(false);
const erreur = ref<string | null>(null);
const message = ref<string | null>(null);

const formulaireFinancementOuvert = ref(false);
const montantSouhaiteFinancement = ref("");
const fichierFinancement = ref<File | null>(null);

const notationEnCours = ref<string | null>(null);
const noteChoisie = ref<Record<string, number>>({});
const commentaireNotation = ref<Record<string, string>>({});
const notesDeposees = ref<Set<string>>(new Set());
const actionEnCours = ref(false);

const motifRefusParCession = ref<Record<string, string>>({});
const refusEnCoursId = ref<string | null>(null);

const sequestreEnCours = ref<string | null>(null);
const montantSequestre = ref<Record<string, string | number>>({});

onMounted(async () => {
  chargement.value = true;
  try {
    [mesInterets.value, mesTitres.value, propositionsRecues.value, cessionsAcquises.value, mesVisites.value, mesFinancements.value] = await Promise.all([
      api.get<MonInteret[]>("/annonces/mes-interets"),
      api.get<MonTitre[]>("/cessions/mes-titres"),
      api.get<PropositionRecue[]>("/cessions/mes-propositions-recues"),
      api.get<CessionAcquise[]>("/cessions/mes-cessions-acquises"),
      api.get<MaVisite[]>("/visites/mes-demandes"),
      api.get<DemandeFinancement[]>("/financements/mes-demandes"),
    ]);
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Impossible de charger vos manifestations d'interet";
  } finally {
    chargement.value = false;
  }
});

async function declarerSequestre(conventionId: string) {
  erreur.value = null;
  message.value = null;
  const montantFcfa = montantSequestre.value[conventionId];
  if (!montantFcfa) {
    erreur.value = "Indiquez le montant du depot avant de l'envoyer";
    return;
  }
  actionEnCours.value = true;
  try {
    await api.post("/sequestres", { conventionId, montantFcfa });
    message.value = "Depot declare. Une banque partenaire doit maintenant en confirmer l'encaissement.";
    sequestreEnCours.value = null;
    delete montantSequestre.value[conventionId];
    [mesInterets.value, cessionsAcquises.value] = await Promise.all([
      api.get<MonInteret[]>("/annonces/mes-interets"),
      api.get<CessionAcquise[]>("/cessions/mes-cessions-acquises"),
    ]);
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Impossible de declarer ce depot";
  } finally {
    actionEnCours.value = false;
  }
}

async function repondre(cessionId: string, accepter: boolean) {
  erreur.value = null;
  message.value = null;
  const motifRefus = motifRefusParCession.value[cessionId]?.trim();
  if (!accepter && (!motifRefus || motifRefus.length < 10)) {
    erreur.value = "Le motif de refus doit compter au moins 10 caracteres";
    return;
  }
  actionEnCours.value = true;
  try {
    await api.patch(`/cessions/${cessionId}/repondre`, { accepter, motifRefus });
    message.value = accepter ? "Proposition acceptee : elle passe maintenant en validation ANDF." : "Proposition refusee.";
    refusEnCoursId.value = null;
    delete motifRefusParCession.value[cessionId];
    propositionsRecues.value = await api.get<PropositionRecue[]>("/cessions/mes-propositions-recues");
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Reponse impossible";
  } finally {
    actionEnCours.value = false;
  }
}

async function repondreVisite(id: string, decision: "CONFIRMER" | "REFUSER") {
  erreur.value = null;
  message.value = null;
  actionEnCours.value = true;
  try {
    await api.patch(`/visites/${id}/repondre`, { decision });
    message.value = decision === "CONFIRMER" ? "Nouvelle date de visite confirmee." : "Visite refusee.";
    mesVisites.value = await api.get<MaVisite[]>("/visites/mes-demandes");
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Reponse impossible";
  } finally {
    actionEnCours.value = false;
  }
}

function surChoixFichierFinancement(evenement: Event) {
  fichierFinancement.value = (evenement.target as HTMLInputElement).files?.[0] ?? null;
}

async function demanderFinancement() {
  erreur.value = null;
  message.value = null;
  if (!montantSouhaiteFinancement.value) {
    erreur.value = "Indiquez le montant souhaite avant d'envoyer";
    return;
  }
  actionEnCours.value = true;
  try {
    const donnees = new FormData();
    donnees.set("montantSouhaiteFcfa", montantSouhaiteFinancement.value);
    if (fichierFinancement.value) donnees.set("fichier", fichierFinancement.value);
    await api.postForm("/financements", donnees);
    message.value = "Demande de financement envoyee a une banque partenaire.";
    formulaireFinancementOuvert.value = false;
    montantSouhaiteFinancement.value = "";
    fichierFinancement.value = null;
    mesFinancements.value = await api.get<DemandeFinancement[]>("/financements/mes-demandes");
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Impossible d'envoyer la demande de financement";
  } finally {
    actionEnCours.value = false;
  }
}

function telechargerTitre(titre: MonTitre) {
  const blob = new Blob([JSON.stringify(titre, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = `titre-${titre.numeroTitre}.json`;
  lien.click();
  URL.revokeObjectURL(url);
}

function idCession(interet: MonInteret): string | null {
  return interet.annonce.cessions[0]?.id ?? null;
}

async function noter(conventionId: string) {
  erreur.value = null;
  message.value = null;
  const note = noteChoisie.value[conventionId];
  if (!note) {
    erreur.value = "Choisissez une note avant d'envoyer";
    return;
  }
  actionEnCours.value = true;
  try {
    await api.post("/avis", { conventionId, note, commentaire: commentaireNotation.value[conventionId]?.trim() || undefined });
    message.value = "Merci, votre avis a bien ete enregistre.";
    notesDeposees.value.add(conventionId);
    notationEnCours.value = null;
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Impossible d'enregistrer votre avis";
  } finally {
    actionEnCours.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
    <PageHeader
      titre="Acheter un terrain"
      description="Suivez ici les annonces sur lesquelles vous avez manifeste votre interet."
    >
      <template #icone><Handshake :size="22" class="text-primaire" aria-hidden="true" /></template>
    </PageHeader>

    <p v-if="erreur" class="rounded-carte bg-danger/10 p-3 text-sm text-danger" role="alert">{{ erreur }}</p>
    <p v-if="message" class="rounded-carte bg-succes/10 p-3 text-sm text-succes" role="status">{{ message }}</p>

    <BaseCard rembourrage="sm" to="/annonces">
      <p class="flex items-center gap-2 text-sm font-semibold text-primaire">
        <Search :size="16" aria-hidden="true" />
        Parcourir la vitrine des annonces
      </p>
    </BaseCard>

    <section v-if="propositionsRecues.length > 0">
      <h2 class="mb-3 flex items-center gap-2 font-semibold text-texte">
        <Inbox :size="16" class="text-accent" aria-hidden="true" />
        Propositions de cession recues ({{ propositionsRecues.length }})
      </h2>
      <ul class="space-y-3">
        <li v-for="c in propositionsRecues" :key="c.id">
          <BaseCard accentue="accent">
            <p class="font-semibold text-texte">{{ c.parcelle.nup }} — {{ c.parcelle.commune }}</p>
            <p class="mt-0.5 text-sm text-texte-attenue">Proposee par {{ c.vendeurNom }} — {{ c.montantFcfa.toLocaleString("fr-FR") }} FCFA</p>

            <div v-if="refusEnCoursId !== c.id" class="mt-3 flex gap-2">
              <BaseButton taille="sm" :disabled="actionEnCours" @click="repondre(c.id, true)">
                <Check :size="14" aria-hidden="true" />
                Accepter
              </BaseButton>
              <BaseButton taille="sm" variant="secondaire" @click="refusEnCoursId = c.id">
                <X :size="14" aria-hidden="true" />
                Refuser
              </BaseButton>
            </div>
            <div v-else class="mt-3 space-y-2 rounded-carte border border-bordure bg-fond p-3">
              <label :for="`motif-refus-${c.id}`" class="block text-xs font-medium text-texte">Motif du refus (obligatoire)</label>
              <textarea
                :id="`motif-refus-${c.id}`"
                v-model="motifRefusParCession[c.id]"
                rows="2"
                placeholder="Ex. montant propose trop bas"
                class="w-full rounded-carte border border-bordure bg-surface px-3 py-2 text-xs text-texte"
              />
              <div class="flex gap-2">
                <BaseButton taille="sm" variant="danger" :disabled="actionEnCours" @click="repondre(c.id, false)">Confirmer le refus</BaseButton>
                <BaseButton taille="sm" variant="secondaire" @click="refusEnCoursId = null">Annuler</BaseButton>
              </div>
            </div>
          </BaseCard>
        </li>
      </ul>
    </section>

    <section v-if="cessionsAcquises.length > 0">
      <h2 class="mb-3 font-semibold text-texte">Vos cessions directes</h2>
      <ul class="space-y-3">
        <li v-for="c in cessionsAcquises" :key="c.id">
          <BaseCard rembourrage="sm">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p class="font-semibold text-texte">{{ c.parcelle.nup }} — {{ c.parcelle.commune }}</p>
                <p class="text-xs text-texte-attenue">{{ c.montantFcfa.toLocaleString("fr-FR") }} FCFA</p>
              </div>
              <span class="rounded-full px-2.5 py-0.5 text-xs font-semibold" :class="COULEUR_STATUT_CESSION[c.statutCession]">
                {{ LIBELLE_STATUT_CESSION[c.statutCession] }}
              </span>
            </div>
            <p v-if="c.statutCession === 'REJETEE' && c.motifRejet" class="mt-1.5 text-xs text-danger">Motif : {{ c.motifRejet }}</p>

            <!-- E5.4 : depot de reservation, possible des que la cession est acceptee. Reste
                 affiche apres (LIBERE/REMBOURSE) tant qu'un sequestre existe, meme si la cession
                 est ensuite validee ou rejetee — sinon son statut final ne serait plus jamais visible. -->
            <div v-if="c.sequestre || c.statutCession === 'ACCEPTEE'" class="mt-3 border-t border-bordure pt-3">
              <p v-if="c.sequestre" class="flex items-center gap-1.5 text-xs font-semibold text-primaire">
                <Banknote :size="13" aria-hidden="true" />
                {{ LIBELLE_STATUT_SEQUESTRE[c.sequestre.statut] }}
              </p>
              <template v-else>
                <div v-if="sequestreEnCours === c.id" class="flex flex-wrap items-center gap-2">
                  <input
                    v-model="montantSequestre[c.id]"
                    type="number"
                    placeholder="Montant du depot (FCFA)"
                    class="min-w-[10rem] flex-1 rounded-carte border border-bordure bg-surface px-3 py-1.5 text-xs text-texte placeholder:text-texte-attenue"
                  />
                  <BaseButton taille="sm" :disabled="actionEnCours" @click="declarerSequestre(c.id)">Envoyer</BaseButton>
                  <BaseButton taille="sm" variant="secondaire" @click="sequestreEnCours = null">Annuler</BaseButton>
                </div>
                <BaseButton v-else taille="sm" variant="secondaire" @click="sequestreEnCours = c.id">
                  <Banknote :size="12" aria-hidden="true" />
                  Declarer un depot de reservation
                </BaseButton>
              </template>
            </div>
          </BaseCard>
        </li>
      </ul>
    </section>

    <section v-if="mesVisites.length > 0">
      <h2 class="mb-3 flex items-center gap-2 font-semibold text-texte">
        <CalendarClock :size="16" class="text-primaire" aria-hidden="true" />
        Vos demandes de visite
      </h2>
      <ul class="space-y-3">
        <li v-for="v in mesVisites" :key="v.id">
          <BaseCard rembourrage="sm">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p class="font-semibold text-texte">{{ v.annonce.parcelle.nup }} — {{ v.annonce.parcelle.commune }}</p>
                <p class="text-xs text-texte-attenue">
                  {{ v.mode === "PRESENTIEL" ? "Sur place" : "A distance" }} — {{ new Date(v.dateProposee).toLocaleString("fr-FR") }}
                </p>
              </div>
              <span class="rounded-full px-2.5 py-0.5 text-xs font-semibold" :class="COULEUR_STATUT_VISITE[v.statut]">
                {{ LIBELLE_STATUT_VISITE[v.statut] }}
              </span>
            </div>
            <p v-if="v.statut === 'REFUSEE' && v.motifRefus" class="mt-1.5 text-xs text-danger">Motif : {{ v.motifRefus }}</p>

            <div v-if="v.statut === 'REPROGRAMMEE' && v.nouvelleDateProposee" class="mt-3 space-y-2 rounded-carte border border-bordure bg-fond p-3">
              <p class="text-xs text-texte">Nouvelle date proposee : {{ new Date(v.nouvelleDateProposee).toLocaleString("fr-FR") }}</p>
              <div class="flex gap-2">
                <BaseButton taille="sm" :disabled="actionEnCours" @click="repondreVisite(v.id, 'CONFIRMER')">
                  <Check :size="12" aria-hidden="true" />
                  Confirmer cette date
                </BaseButton>
                <BaseButton taille="sm" variant="secondaire" :disabled="actionEnCours" @click="repondreVisite(v.id, 'REFUSER')">
                  <X :size="12" aria-hidden="true" />
                  Refuser
                </BaseButton>
              </div>
            </div>
          </BaseCard>
        </li>
      </ul>
    </section>

    <!-- E4.6-E4.9 : dossier de financement bancaire, independant d'une annonce precise. -->
    <section>
      <h2 class="mb-3 flex items-center gap-2 font-semibold text-texte">
        <Landmark :size="16" class="text-primaire" aria-hidden="true" />
        Dossier de financement bancaire
      </h2>

      <BaseCard v-if="formulaireFinancementOuvert" rembourrage="sm">
        <div class="space-y-2.5">
          <BaseInput id="montant-financement" v-model="montantSouhaiteFinancement" type="number" label="Montant souhaite (FCFA)" />
          <div>
            <label for="fichier-financement" class="mb-1 block text-xs font-medium text-texte">Justificatif (optionnel)</label>
            <input id="fichier-financement" type="file" class="w-full text-xs text-texte" @change="surChoixFichierFinancement" />
          </div>
          <div class="flex gap-2">
            <BaseButton taille="sm" :disabled="actionEnCours || !montantSouhaiteFinancement" @click="demanderFinancement">Envoyer la demande</BaseButton>
            <BaseButton taille="sm" variant="secondaire" @click="formulaireFinancementOuvert = false">Annuler</BaseButton>
          </div>
        </div>
      </BaseCard>
      <BaseCard v-else rembourrage="sm">
        <button type="button" class="flex items-center gap-2 text-sm font-semibold text-primaire" @click="formulaireFinancementOuvert = true">
          <Landmark :size="16" aria-hidden="true" />
          Demander un accord de financement
        </button>
      </BaseCard>

      <ul v-if="mesFinancements.length > 0" class="mt-3 space-y-2.5">
        <li v-for="f in mesFinancements" :key="f.id">
          <BaseCard rembourrage="sm">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <p class="font-semibold text-texte">{{ f.montantSouhaiteFcfa.toLocaleString("fr-FR") }} FCFA souhaites</p>
              <span class="rounded-full px-2.5 py-0.5 text-xs font-semibold" :class="COULEUR_STATUT_FINANCEMENT[f.statut]">
                {{ LIBELLE_STATUT_FINANCEMENT[f.statut] }}
              </span>
            </div>
            <p class="mt-0.5 text-xs text-texte-attenue">Demande envoyee le {{ new Date(f.createdAt).toLocaleDateString("fr-FR") }}</p>
            <template v-if="f.statut === 'ACCORD_PRINCIPE'">
              <p class="mt-2 text-sm text-succes">Montant accorde : {{ f.montantAccordeFcfa?.toLocaleString("fr-FR") }} FCFA</p>
              <p class="mt-1 font-mono text-xs text-texte-attenue">
                Code de verification a transmettre au vendeur : <span class="font-semibold text-texte">{{ f.codeVerification }}</span>
              </p>
            </template>
            <p v-else-if="f.statut === 'REFUSEE' && f.motifRefus" class="mt-1.5 text-xs text-danger">Motif : {{ f.motifRefus }}</p>
          </BaseCard>
        </li>
      </ul>
    </section>

    <section>
      <h2 class="mb-3 font-semibold text-texte">Vos manifestations d'interet</h2>
      <p v-if="chargement" class="text-sm text-texte-attenue" role="status">Chargement…</p>
      <p v-else-if="mesInterets.length === 0" class="text-sm text-texte-attenue">
        Vous n'avez manifeste aucun interet pour le moment.
      </p>
      <ul v-else class="space-y-3">
        <li v-for="i in mesInterets" :key="i.id">
          <BaseCard>
            <div class="flex flex-wrap items-start justify-between gap-2">
              <div>
                <RouterLink :to="`/annonces/${i.annonce.id}`" class="font-semibold text-texte hover:underline">
                  {{ i.annonce.parcelle.nup }} — {{ i.annonce.parcelle.commune }}
                </RouterLink>
                <p class="text-xs text-texte-attenue">
                  {{ i.annonce.parcelle.superficieM2.toLocaleString("fr-FR") }} m² — vendeur {{ i.annonce.publieePar.nomComplet }}
                </p>
              </div>
              <span class="rounded-full px-2.5 py-0.5 text-xs font-semibold" :class="COULEUR_STATUT[i.statut]">{{ LIBELLE_STATUT[i.statut] }}</span>
            </div>
            <p v-if="i.message" class="mt-1.5 text-xs text-texte-attenue">« {{ i.message }} »</p>
            <div v-if="i.statut === 'RETENU'" class="mt-2.5 flex items-center gap-2 rounded-carte bg-succes/10 px-3 py-2 text-xs font-semibold text-succes">
              <Award :size="14" aria-hidden="true" />
              {{ i.annonce.statut === "VENDUE" ? "Vente finalisee : le titre a ete transfere." : "Retenu par le vendeur — cession en cours de validation ANDF." }}
            </div>

            <!-- E5.4 : depot de reservation, possible des que le vendeur a retenu l'interet. Le
                 statut final (LIBERE/REMBOURSE) reste affiche meme une fois l'annonce VENDUE ou
                 le sequestre solde — sinon il ne serait plus jamais visible une fois la vente
                 finalisee ou echouee. cessions[0] est toujours la plus recente (voir
                 AnnoncesService), donc a jour meme si l'annonce a un historique de tentatives. -->
            <div
              v-if="i.statut === 'RETENU' && (i.annonce.cessions[0]?.sequestre || (i.annonce.statut === 'ACTIVE' && idCession(i)))"
              class="mt-3 border-t border-bordure pt-3"
            >
              <p v-if="i.annonce.cessions[0]?.sequestre" class="flex items-center gap-1.5 text-xs font-semibold text-primaire">
                <Banknote :size="13" aria-hidden="true" />
                {{ LIBELLE_STATUT_SEQUESTRE[i.annonce.cessions[0]!.sequestre!.statut] }}
              </p>
              <template v-else>
                <div v-if="sequestreEnCours === idCession(i)" class="flex flex-wrap items-center gap-2">
                  <input
                    v-model="montantSequestre[idCession(i)!]"
                    type="number"
                    placeholder="Montant du depot (FCFA)"
                    class="min-w-[10rem] flex-1 rounded-carte border border-bordure bg-surface px-3 py-1.5 text-xs text-texte placeholder:text-texte-attenue"
                  />
                  <BaseButton taille="sm" :disabled="actionEnCours" @click="declarerSequestre(idCession(i)!)">Envoyer</BaseButton>
                  <BaseButton taille="sm" variant="secondaire" @click="sequestreEnCours = null">Annuler</BaseButton>
                </div>
                <BaseButton v-else taille="sm" variant="secondaire" @click="sequestreEnCours = idCession(i)">
                  <Banknote :size="12" aria-hidden="true" />
                  Declarer un depot de reservation
                </BaseButton>
              </template>
            </div>

            <!-- E7.7 : notation reciproque, possible des que la vente est finalisee. -->
            <div v-if="i.annonce.statut === 'VENDUE' && idCession(i)" class="mt-3 border-t border-bordure pt-3">
              <p v-if="notesDeposees.has(idCession(i)!)" class="text-xs text-texte-attenue">Merci, vous avez deja note ce vendeur.</p>
              <template v-else>
                <BaseButton v-if="notationEnCours !== idCession(i)" taille="sm" variant="secondaire" @click="notationEnCours = idCession(i)">
                  <Star :size="12" aria-hidden="true" />
                  Noter le vendeur
                </BaseButton>
                <div v-else class="space-y-2">
                  <div class="flex gap-1">
                    <button
                      v-for="n in [1, 2, 3, 4, 5]"
                      :key="n"
                      type="button"
                      class="p-0.5"
                      :aria-label="`${n} etoile(s)`"
                      @click="noteChoisie[idCession(i)!] = n"
                    >
                      <Star :size="18" :class="(noteChoisie[idCession(i)!] ?? 0) >= n ? 'fill-accent text-accent' : 'text-texte-attenue'" aria-hidden="true" />
                    </button>
                  </div>
                  <textarea
                    v-model="commentaireNotation[idCession(i)!]"
                    rows="2"
                    placeholder="Commentaire (optionnel)"
                    class="w-full rounded-carte border border-bordure bg-fond px-3 py-2 text-xs text-texte placeholder:text-texte-attenue"
                  />
                  <div class="flex gap-2">
                    <BaseButton taille="sm" :disabled="actionEnCours" @click="noter(idCession(i)!)">Envoyer l'avis</BaseButton>
                    <BaseButton taille="sm" variant="secondaire" @click="notationEnCours = null">Annuler</BaseButton>
                  </div>
                </div>
              </template>
            </div>
          </BaseCard>
        </li>
      </ul>
    </section>

    <!-- E7.1 : coffre numerique - vos titres reellement delivres, en un seul endroit. -->
    <section v-if="mesTitres.length > 0">
      <h2 class="mb-3 flex items-center gap-2 font-semibold text-texte">
        <FileStack :size="16" class="text-primaire" aria-hidden="true" />
        Vos documents ({{ mesTitres.length }})
      </h2>
      <ul class="space-y-2.5">
        <li v-for="t in mesTitres" :key="t.id">
          <BaseCard rembourrage="sm">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p class="font-medium text-texte">Titre {{ t.numeroTitre }}</p>
                <p class="text-xs text-texte-attenue">
                  {{ t.parcelle.nup }} — {{ t.parcelle.commune }} — delivre le {{ new Date(t.dateDelivrance).toLocaleDateString("fr-FR") }}
                </p>
                <p class="mt-0.5 font-mono text-[0.65rem] text-texte-attenue">hash : {{ t.hashSha256.slice(0, 24) }}…</p>
              </div>
              <BaseButton taille="sm" variant="secondaire" @click="telechargerTitre(t)">
                <Download :size="13" aria-hidden="true" />
                Telecharger
              </BaseButton>
            </div>
          </BaseCard>
        </li>
      </ul>
    </section>
  </div>
</template>
