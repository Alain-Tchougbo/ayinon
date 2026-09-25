<script setup lang="ts">
import { ArrowLeft, CalendarClock, Flag, Handshake, MapPin, Scale, ShieldCheck, Star, Users } from "@lucide/vue";
import { RoleUtilisateur } from "@ayinon/shared";
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import MapCadastral from "../../components/map/MapCadastral.vue";
import type { ParcelleCache } from "../../db/localDb";
import { ApiError, api } from "../../services/api";
import { tuileSatellitePour } from "../../services/tuileSatellite";
import { useAuthStore } from "../../stores/auth.store";

interface AnnonceDetail {
  id: string;
  prixIndicatifFcfa: number | null;
  description: string | null;
  statut: "ACTIVE" | "RETIREE" | "VENDUE";
  verifieeParAndfId: string | null;
  parcelle: { id: string; nup: string; commune: string; arrondissement: string | null; superficieM2: number };
  publieePar: { id: string; nomComplet: string };
  interets: Array<{ acheteur: { id: string } }>;
  limitesCertifiees: boolean;
  enExclusivite: boolean;
  centreParcelle: { lng: number; lat: number } | null;
}

interface ProfilVendeur {
  noteMoyenne: number | null;
  nombreAvis: number;
  ventesConclues: number;
}

interface EvenementJudiciairePublic {
  statut: "ACTIF" | "LEVE";
  dateGel: string;
  dateLevee: string | null;
  motifLevee: string | null;
  typeDecision: string | null;
}

interface MutationProprietePublique {
  vendeurNom: string;
  acquereurNom: string;
  date: string;
}

interface HistoriqueParcellePublic {
  statutJudiciaire: "AUCUN_LITIGE" | "GEL_EN_COURS" | "ANTECEDENT_LEVE";
  evenementsJudiciaires: EvenementJudiciairePublic[];
  proprietairesSuccessifs: MutationProprietePublique[];
}

const route = useRoute();
const auth = useAuthStore();

const annonce = ref<AnnonceDetail | null>(null);
const profilVendeur = ref<ProfilVendeur | null>(null);
// Geometrie reelle de la parcelle (PostGIS -> GeoJSON via GET /parcelles/:id, deja public et
// utilise par la carte cadastrale) : reaffichee ici via le meme composant MapCadastral.vue plutot
// que de dupliquer la logique de rendu cartographique.
const parcelleCarte = ref<ParcelleCache | null>(null);
// Historique public (judiciaire + proprietaires successifs), affiche a l'acheteur pour l'aider a
// evaluer le risque avant de s'engager. Version resumee/anonymisee : le dossier judiciaire complet
// reste reserve aux roles regaliens (voir GET /parcelles/:id/historique cote API).
const historique = ref<HistoriqueParcellePublic | null>(null);
const chargement = ref(false);
const erreur = ref<string | null>(null);
const message = ref<string | null>(null);
const messageInteret = ref("");
const envoiEnCours = ref(false);

const visiteOuverte = ref(false);
const dateVisite = ref("");
const modeVisite = ref<"PRESENTIEL" | "VIDEO">("PRESENTIEL");
const messageVisite = ref("");
const visiteEnvoyee = ref(false);
const visiteEnCours = ref(false);

const ROLES_SIGNALANTS: RoleUtilisateur[] = [
  RoleUtilisateur.CITOYEN,
  RoleUtilisateur.VENDEUR,
  RoleUtilisateur.ACHETEUR,
  RoleUtilisateur.MANDATAIRE_FAMILIAL,
];
const signalementOuvert = ref(false);
const typeSignalement = ref<"ANNONCE" | "LITIGE_FONCIER">("ANNONCE");
const motifSignalement = ref("");
const descriptifSignalement = ref("");
const signalementEnvoye = ref(false);
const signalementEnCours = ref(false);

const dejaManifeste = computed(() => annonce.value?.interets.some((i) => i.acheteur.id === auth.utilisateur?.id) ?? false);
const peutSignaler = computed(
  () =>
    auth.role !== null &&
    ROLES_SIGNALANTS.includes(auth.role) &&
    auth.utilisateur?.id !== annonce.value?.publieePar.id,
);

async function charger() {
  chargement.value = true;
  try {
    annonce.value = await api.get<AnnonceDetail>(`/annonces/${route.params.id}`);
    const [profil, parcelleGeo, historiquePublic] = await Promise.allSettled([
      api.get<ProfilVendeur>(`/avis/profil/${annonce.value.publieePar.id}`),
      api.get<ParcelleCache>(`/parcelles/${annonce.value.parcelle.id}`),
      api.get<HistoriqueParcellePublic>(`/parcelles/${annonce.value.parcelle.id}/historique`),
    ]);
    if (profil.status === "fulfilled") profilVendeur.value = profil.value;
    // Non bloquant : si la geometrie ne charge pas, le reste de la fiche reste consultable, sans
    // la carte de localisation.
    if (parcelleGeo.status === "fulfilled") parcelleCarte.value = parcelleGeo.value;
    if (historiquePublic.status === "fulfilled") historique.value = historiquePublic.value;
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Annonce introuvable";
  } finally {
    chargement.value = false;
  }
}

onMounted(charger);

async function manifesterInteret() {
  erreur.value = null;
  message.value = null;
  envoiEnCours.value = true;
  try {
    await api.post(`/annonces/${route.params.id}/interet`, { message: messageInteret.value.trim() || undefined });
    message.value = "Votre interet a bien ete transmis au vendeur.";
    messageInteret.value = "";
    await charger();
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Impossible d'envoyer votre interet";
  } finally {
    envoiEnCours.value = false;
  }
}

async function demanderVisite() {
  erreur.value = null;
  if (!dateVisite.value) {
    erreur.value = "Choisissez une date et une heure pour la visite";
    return;
  }
  visiteEnCours.value = true;
  try {
    await api.post(`/visites/annonces/${route.params.id}`, {
      dateProposee: new Date(dateVisite.value).toISOString(),
      mode: modeVisite.value,
      message: messageVisite.value.trim() || undefined,
    });
    visiteEnvoyee.value = true;
    visiteOuverte.value = false;
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Impossible d'envoyer la demande de visite";
  } finally {
    visiteEnCours.value = false;
  }
}

async function signaler() {
  erreur.value = null;
  const motif = motifSignalement.value.trim();
  if (motif.length < 10) {
    erreur.value = "Decrivez le probleme en au moins 10 caracteres";
    return;
  }
  signalementEnCours.value = true;
  try {
    await api.post("/signalements", {
      type: typeSignalement.value,
      annonceId: route.params.id,
      motif,
      descriptif: descriptifSignalement.value.trim() || undefined,
    });
    signalementEnvoye.value = true;
    signalementOuvert.value = false;
    typeSignalement.value = "ANNONCE";
    motifSignalement.value = "";
    descriptifSignalement.value = "";
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Impossible d'envoyer le signalement";
  } finally {
    signalementEnCours.value = false;
  }
}

// Identite "Vitrine editoriale" (DA retenue) : meme famille de motifs que la vitrine des
// annonces, choisi de facon deterministe (pas aleatoire) a partir du NUP pour que la meme
// parcelle garde toujours le meme motif entre deux visites.
const MOTIFS_CARTE = [
  { base: "#22452F", clair: "#4A7A56", moyen: "#2E5A3E", sombre: "#1A3624" },
  { base: "#7A431C", clair: "#B76E36", moyen: "#8F5427", sombre: "#5A320F" },
  { base: "#5A4B32", clair: "#8A7550", moyen: "#6B5A3D", sombre: "#453A26" },
];
const motif = computed(() => {
  const nup = annonce.value?.parcelle.nup ?? "";
  let somme = 0;
  for (let i = 0; i < nup.length; i++) somme += nup.charCodeAt(i);
  return MOTIFS_CARTE[somme % MOTIFS_CARTE.length]!;
});

// Vraie tuile satellite (coordonnees reelles de la parcelle) plutot que le degrade illustratif,
// des que les coordonnees sont disponibles.
const visuelSatellite = computed(() => (annonce.value?.centreParcelle ? tuileSatellitePour(annonce.value.centreParcelle.lng, annonce.value.centreParcelle.lat) : null));

const initiales = computed(() =>
  (annonce.value?.publieePar.nomComplet ?? "")
    .split(/\s+/)
    .map((mot) => mot[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase(),
);

function formaterDate(date: string): string {
  return new Date(date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}
</script>

<template>
  <div class="detail-editorial">
    <p v-if="chargement" class="statut-chargement" role="status">Chargement…</p>
    <p v-if="erreur && !annonce" class="alerte alerte-danger" role="alert">{{ erreur }}</p>

    <template v-if="annonce">
      <div class="fil-ariane">
        <RouterLink to="/annonces"><ArrowLeft :size="14" aria-hidden="true" /> Vitrine des annonces</RouterLink>
      </div>

      <div class="disposition">
        <div class="colonne-principale">
          <div
            class="visuel"
            :style="visuelSatellite ? { backgroundImage: `url(${visuelSatellite.url})` } : { background: `linear-gradient(160deg, ${motif.clair}, ${motif.base})` }"
          >
            <span v-if="annonce.statut !== 'ACTIVE'" class="etiquette-statut">{{ annonce.statut === "VENDUE" ? "Vendue" : "Retiree" }}</span>
            <span v-if="visuelSatellite" class="repere-parcelle" :style="{ left: visuelSatellite.positionXPourcent + '%', top: visuelSatellite.positionYPourcent + '%' }" />
            <svg v-else viewBox="0 0 500 320" preserveAspectRatio="xMidYMid slice">
              <rect width="500" height="320" :fill="motif.base" />
              <polygon points="0,0 180,0 130,120 -30,145" :fill="motif.moyen" />
              <polygon points="180,0 400,0 360,110 130,120" :fill="motif.clair" />
              <polygon points="0,145 130,120 170,260 -30,280" :fill="motif.sombre" />
              <polygon points="130,120 360,110 320,280 170,260" :fill="motif.clair" opacity=".9" />
              <polygon points="360,110 400,0 520,15 500,180" :fill="motif.moyen" />
              <polyline points="130,120 360,110 320,280 170,260 130,120" stroke="#F2A93B" stroke-width="1.4" opacity=".55" fill="none" />
            </svg>
          </div>

          <div class="bloc-principal">
            <span class="nup">{{ annonce.parcelle.nup }}</span>
            <h1>Parcelle a {{ annonce.parcelle.commune }}</h1>
            <p class="lieu">
              <MapPin :size="14" aria-hidden="true" />
              <span v-if="annonce.parcelle.arrondissement">{{ annonce.parcelle.arrondissement }} — </span>{{ annonce.parcelle.superficieM2.toLocaleString("fr-FR") }} m²
            </p>

            <p v-if="erreur" class="alerte alerte-danger" role="alert">{{ erreur }}</p>
            <p v-if="message" class="alerte alerte-succes" role="status">{{ message }}</p>

            <p class="prix" :class="{ 'a-discuter': !annonce.prixIndicatifFcfa }">
              {{ annonce.prixIndicatifFcfa ? `${annonce.prixIndicatifFcfa.toLocaleString("fr-FR")} FCFA` : "Prix a discuter avec le vendeur" }}
            </p>

            <div class="badges">
              <span v-if="annonce.verifieeParAndfId" class="badge badge-andf"><ShieldCheck :size="12" aria-hidden="true" /> Situation fonciere controlee par l'ANDF</span>
              <span v-if="annonce.limitesCertifiees" class="badge badge-certifie">Limites certifiees par un geometre</span>
              <!-- E4.5 : badge public, sans jamais reveler l'identite de l'acheteur beneficiaire. -->
              <span v-if="annonce.enExclusivite" class="badge badge-exclusif">En negociation exclusive</span>
            </div>

            <p v-if="annonce.description" class="description">{{ annonce.description }}</p>
            <p v-else class="description description-vide">Le vendeur n'a pas ajoute de description pour cette parcelle.</p>

            <div class="bloc-vendeur">
              <span class="avatar-vendeur">{{ initiales }}</span>
              <div>
                <p class="vendeur-nom">Publiee par {{ annonce.publieePar.nomComplet }}</p>
                <p v-if="profilVendeur" class="vendeur-stats">
                  <span v-if="profilVendeur.noteMoyenne !== null"><Star :size="12" aria-hidden="true" /> {{ profilVendeur.noteMoyenne }} ({{ profilVendeur.nombreAvis }} avis)</span>
                  <span>{{ profilVendeur.ventesConclues }} vente(s) conclue(s)</span>
                </p>
              </div>
            </div>

            <!-- Historique public resume : aide l'acheteur a evaluer le risque avant de s'engager,
                 sans exposer le dossier judiciaire complet (reserve aux roles regaliens). -->
            <div v-if="historique" class="bloc-historique">
              <h2>Historique de la parcelle</h2>

              <div class="historique-section">
                <p class="historique-libelle"><Scale :size="14" aria-hidden="true" /> Situation judiciaire</p>
                <p v-if="historique.statutJudiciaire === 'AUCUN_LITIGE'" class="pastille pastille-ok">Aucun litige ni gel judiciaire connu sur cette parcelle</p>
                <template v-else>
                  <p v-if="historique.statutJudiciaire === 'GEL_EN_COURS'" class="pastille pastille-alerte">Gel conservatoire en cours — mutation bloquee</p>
                  <p v-else class="pastille pastille-info">Litige anterieur, aujourd'hui leve</p>
                  <ul class="liste-evenements">
                    <li v-for="(evenement, i) in historique.evenementsJudiciaires" :key="i">
                      <template v-if="evenement.statut === 'ACTIF'">Gel conservatoire ouvert le {{ formaterDate(evenement.dateGel) }}, procedure en cours.</template>
                      <template v-else>
                        Gel du {{ formaterDate(evenement.dateGel) }} leve le {{ formaterDate(evenement.dateLevee!) }}<template v-if="evenement.motifLevee">&nbsp;— {{ evenement.motifLevee }}</template>.
                      </template>
                    </li>
                  </ul>
                </template>
              </div>

              <div class="historique-section">
                <p class="historique-libelle"><Users :size="14" aria-hidden="true" /> Proprietaires successifs</p>
                <p v-if="!historique.proprietairesSuccessifs.length" class="texte-attenue">Aucune mutation de propriete enregistree avant le proprietaire actuel.</p>
                <ol v-else class="liste-proprietaires">
                  <li v-for="(mutation, i) in historique.proprietairesSuccessifs" :key="i">
                    <span class="mutation-noms">{{ mutation.vendeurNom }} → {{ mutation.acquereurNom }}</span>
                    <span class="mutation-date">{{ formaterDate(mutation.date) }}</span>
                  </li>
                </ol>
              </div>
            </div>

            <!-- Geometrie reelle (PostGIS), pas une illustration : meme composant que la carte
                 cadastrale, pour situer precisement la parcelle et voir ses voisins immediats. -->
            <div v-if="parcelleCarte" class="bloc-localisation">
              <h2>Localisation</h2>
              <div class="conteneur-carte">
                <MapCadastral :parcelles="[parcelleCarte]" />
              </div>
            </div>
          </div>
        </div>

        <aside class="colonne-actions">
          <!-- E3.5 : demander une visite avant de s'engager davantage. -->
          <div v-if="annonce.statut === 'ACTIVE' && auth.role === RoleUtilisateur.ACHETEUR" class="panneau-action">
            <h2><CalendarClock :size="16" aria-hidden="true" /> Demander une visite</h2>
            <p v-if="visiteEnvoyee" class="texte-attenue">
              Votre demande de visite a ete envoyee au vendeur. Retrouvez son statut depuis votre espace « Acheter un terrain ».
            </p>
            <template v-else>
              <button v-if="!visiteOuverte" type="button" class="lien-discret" @click="visiteOuverte = true">Proposer un creneau de visite</button>
              <form v-else class="form-action" @submit.prevent="demanderVisite">
                <label for="date-visite">Date et heure souhaitees</label>
                <input id="date-visite" v-model="dateVisite" type="datetime-local" />
                <div class="options-radio">
                  <label><input v-model="modeVisite" type="radio" value="PRESENTIEL" /> Sur place</label>
                  <label><input v-model="modeVisite" type="radio" value="VIDEO" /> A distance (video)</label>
                </div>
                <textarea v-model="messageVisite" rows="2" placeholder="Un message pour le vendeur (optionnel)" />
                <div class="actions-form">
                  <button type="submit" class="bouton-plein" :disabled="visiteEnCours">Envoyer la demande</button>
                  <button type="button" class="lien-discret" @click="visiteOuverte = false">Annuler</button>
                </div>
              </form>
            </template>
          </div>

          <div v-if="annonce.statut === 'ACTIVE' && auth.role === RoleUtilisateur.ACHETEUR" class="panneau-action">
            <h2><Handshake :size="16" aria-hidden="true" /> Manifester mon interet</h2>
            <p v-if="dejaManifeste" class="texte-attenue">Vous avez deja manifeste votre interet sur cette annonce. Le vendeur a ete notifie.</p>
            <p v-else-if="annonce.enExclusivite" class="texte-attenue">Cette annonce est en negociation exclusive avec un autre acheteur pour le moment.</p>
            <form v-else class="form-action" @submit.prevent="manifesterInteret">
              <textarea v-model="messageInteret" rows="3" placeholder="Un message pour le vendeur (optionnel)" />
              <button type="submit" class="bouton-plein" :disabled="envoiEnCours">Envoyer mon interet</button>
            </form>
          </div>

          <div v-else-if="annonce.statut === 'ACTIVE' && !auth.estConnecte" class="panneau-cta">
            <p>Interessee par cette parcelle ?</p>
            <RouterLink to="/inscription" class="bouton-plein bouton-bloc">Creer un compte acheteur</RouterLink>
          </div>

          <!-- E2.6 : signaler un probleme sur l'annonce (occupant, litige non declare, prix suspect...). -->
          <div v-if="peutSignaler" class="bloc-signalement">
            <p v-if="signalementEnvoye" class="texte-attenue">Signalement transmis a l'equipe de moderation. Merci de contribuer a la fiabilite de la vitrine.</p>
            <template v-else>
              <button v-if="!signalementOuvert" type="button" class="lien-signalement" @click="signalementOuvert = true">
                <Flag :size="13" aria-hidden="true" /> Signaler un probleme sur cette annonce
              </button>
              <form v-else class="form-action" @submit.prevent="signaler">
                <p class="titre-signalement"><Flag :size="14" aria-hidden="true" /> Signaler un probleme</p>
                <div class="options-radio">
                  <label><input v-model="typeSignalement" type="radio" value="ANNONCE" /> Probleme sur l'annonce (occupant, prix suspect...)</label>
                  <label><input v-model="typeSignalement" type="radio" value="LITIGE_FONCIER" /> Litige foncier sur la parcelle</label>
                </div>
                <textarea v-model="motifSignalement" rows="2" placeholder="Ex. parcelle deja occupee, litige familial non declare, prix suspect..." />
                <textarea v-model="descriptifSignalement" rows="2" placeholder="Details complementaires (optionnel)" />
                <div class="actions-form">
                  <button type="submit" class="bouton-danger" :disabled="signalementEnCours">Envoyer le signalement</button>
                  <button type="button" class="lien-discret" @click="signalementOuvert = false">Annuler</button>
                </div>
              </form>
            </template>
          </div>
        </aside>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* Meme identite scopee "Vitrine editoriale" que AnnoncesListeView.vue — voir ce fichier pour le
   contexte de la decision (en-tete partage reste foret & or, seul le contenu change). */
.detail-editorial {
  --ivoire: #faf6ee;
  --papier: #f3ecdc;
  --surface: #ffffff;
  --bronze: #b76e36;
  --bronze-fonce: #7a431c;
  --vert-sceau: #22452f;
  --vert-sceau-fond: #e7eee8;
  --hairline: #e4d9c2;
  --disp: "Fraunces", serif;
  --sans: "Work Sans", sans-serif;

  min-height: 100%;
  font-family: var(--sans);
  background: var(--ivoire);
  color: rgb(var(--color-texte));
  padding-bottom: 3rem;
}
.detail-editorial :deep(h1),
.detail-editorial :deep(h2) {
  font-family: var(--disp);
  font-weight: 600;
  letter-spacing: 0;
}

.statut-chargement {
  text-align: center;
  color: rgb(var(--color-texte-attenue));
  padding: 3rem 0;
}
.alerte {
  max-width: 74rem;
  margin: 1.2rem auto 0;
  padding: 0.7rem 1.75rem;
  font-size: 0.85rem;
  border-radius: 4px;
}
.alerte-danger {
  background: rgb(var(--color-danger) / 0.1);
  color: rgb(var(--color-danger));
}
.alerte-succes {
  background: rgb(var(--color-succes) / 0.1);
  color: rgb(var(--color-succes));
}

.fil-ariane {
  max-width: 74rem;
  margin: 0 auto;
  padding: 1.4rem 1.75rem 0;
}
.fil-ariane a {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: rgb(var(--color-texte-attenue));
  transition: color 0.15s;
}
.fil-ariane a:hover {
  color: var(--bronze-fonce);
}

.disposition {
  max-width: 74rem;
  margin: 0 auto;
  padding: 1.2rem 1.75rem 0;
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 1.6rem;
  align-items: start;
}

.colonne-principale {
  background: var(--surface);
  border: 1px solid var(--hairline);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 20px 45px rgba(36, 31, 23, 0.08);
}
.visuel {
  position: relative;
  height: 14rem;
  background-size: cover;
  background-position: center;
  background-color: var(--papier);
}
.visuel svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
/* Repere = position reelle (fraction de tuile) du centre de la parcelle sur l'image satellite,
   calculee dans tuileSatellitePour(), pas une valeur arbitraire. */
.repere-parcelle {
  position: absolute;
  z-index: 1;
  width: 1rem;
  height: 1rem;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: rgba(242, 169, 59, 0.35);
  border: 2px solid #f2a93b;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.6);
}
.etiquette-statut {
  position: absolute;
  top: 1.1rem;
  left: 1.1rem;
  z-index: 1;
  background: rgba(255, 255, 255, 0.92);
  color: var(--bronze-fonce);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  padding: 0.4rem 0.8rem;
  border-radius: 99px;
}

.bloc-principal {
  padding: 1.8rem 2rem 2.2rem;
}
.nup {
  font-size: 0.78rem;
  font-weight: 600;
  color: rgb(var(--color-texte-attenue));
  letter-spacing: 0.03em;
}
.bloc-principal h1 {
  font-size: 1.6rem;
  font-style: italic;
  font-weight: 500;
  margin: 0.4rem 0 0.3rem;
}
.lieu {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  color: rgb(var(--color-texte-attenue));
  font-size: 0.86rem;
  margin: 0;
}
.prix {
  font-family: var(--disp);
  font-size: 1.8rem;
  font-weight: 600;
  color: var(--bronze-fonce);
  margin: 1rem 0 0;
}
.prix.a-discuter {
  font-family: var(--sans);
  font-size: 1rem;
  font-style: italic;
  font-weight: 400;
  color: rgb(var(--color-texte-attenue));
}
.badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
}
.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.28rem 0.65rem;
  border-radius: 99px;
}
.badge-andf {
  background: var(--vert-sceau-fond);
  color: var(--vert-sceau);
}
.badge-certifie {
  background: #f5e6d3;
  color: var(--bronze-fonce);
}
.badge-exclusif {
  background: var(--papier);
  color: rgb(var(--color-texte-attenue));
  border: 1px solid var(--hairline);
}
.description {
  font-size: 0.9rem;
  line-height: 1.6;
  white-space: pre-line;
  margin: 1.3rem 0 0;
  padding-top: 1.2rem;
  border-top: 1px solid var(--hairline);
}
.description-vide {
  font-style: italic;
  color: rgb(var(--color-texte-attenue));
}
.bloc-vendeur {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin-top: 1.3rem;
  padding-top: 1.2rem;
  border-top: 1px solid var(--hairline);
}
.avatar-vendeur {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.6rem;
  height: 2.6rem;
  border-radius: 50%;
  background: var(--vert-sceau-fond);
  color: var(--vert-sceau);
  font-family: var(--disp);
  font-weight: 600;
  font-size: 0.9rem;
  flex-shrink: 0;
}
.vendeur-nom {
  font-size: 0.85rem;
  font-weight: 600;
  margin: 0;
}
.vendeur-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
  font-size: 0.78rem;
  color: rgb(var(--color-texte-attenue));
  margin: 0.2rem 0 0;
}
.vendeur-stats span {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}
.vendeur-stats svg {
  color: var(--bronze);
  fill: var(--bronze);
}

.bloc-localisation {
  margin-top: 1.3rem;
  padding-top: 1.2rem;
  border-top: 1px solid var(--hairline);
}
.bloc-localisation h2 {
  font-size: 0.92rem;
  font-style: italic;
  font-weight: 500;
  margin: 0 0 0.8rem;
}
.conteneur-carte {
  height: 20rem;
  display: flex;
  border-radius: 8px;
  overflow: hidden;
}

.bloc-historique {
  margin-top: 1.3rem;
  padding-top: 1.2rem;
  border-top: 1px solid var(--hairline);
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}
.bloc-historique h2 {
  font-size: 0.92rem;
  font-style: italic;
  font-weight: 500;
  margin: 0;
}
.historique-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.historique-libelle {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.82rem;
  font-weight: 700;
  margin: 0;
}
.pastille {
  align-self: flex-start;
  font-size: 0.78rem;
  font-weight: 600;
  padding: 0.3rem 0.75rem;
  border-radius: 99px;
  margin: 0;
}
.pastille-ok {
  background: var(--vert-sceau-fond);
  color: var(--vert-sceau);
}
.pastille-alerte {
  background: rgb(var(--color-danger) / 0.1);
  color: rgb(var(--color-danger));
}
.pastille-info {
  background: var(--papier);
  color: var(--bronze-fonce);
}
.liste-evenements {
  list-style: none;
  margin: 0.2rem 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.84rem;
  color: rgb(var(--color-texte));
}
.liste-proprietaires {
  list-style: none;
  counter-reset: mutation;
  margin: 0.2rem 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.liste-proprietaires li {
  counter-increment: mutation;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.3rem 0.6rem;
  font-size: 0.84rem;
  padding-left: 1.3rem;
  position: relative;
}
.liste-proprietaires li::before {
  content: counter(mutation) ".";
  position: absolute;
  left: 0;
  font-weight: 700;
  color: var(--bronze);
}
.mutation-noms {
  font-weight: 600;
}
.mutation-date {
  color: rgb(var(--color-texte-attenue));
  font-size: 0.78rem;
}

/* ---- Colonne actions ---- */
.colonne-actions {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}
.panneau-action,
.panneau-cta {
  background: var(--papier);
  border-radius: 8px;
  padding: 1.4rem 1.5rem;
}
.panneau-action h2 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--sans);
  font-size: 0.9rem;
  font-weight: 700;
  margin: 0 0 0.8rem;
}
.texte-attenue {
  font-size: 0.85rem;
  color: rgb(var(--color-texte-attenue));
  margin: 0;
}
.lien-discret {
  border: 0;
  background: none;
  padding: 0;
  font-family: var(--sans);
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--bronze-fonce);
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
}
.form-action {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}
.form-action label {
  font-size: 0.76rem;
  font-weight: 600;
  color: rgb(var(--color-texte-attenue));
}
.form-action input,
.form-action textarea {
  width: 100%;
  border: 1px solid var(--hairline);
  background: var(--surface);
  border-radius: 4px;
  padding: 0.6rem 0.8rem;
  font-family: var(--sans);
  font-size: 0.84rem;
  color: inherit;
}
.options-radio {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.82rem;
}
.options-radio label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 400;
  color: rgb(var(--color-texte));
}
.options-radio input {
  width: auto;
  accent-color: var(--bronze);
}
.actions-form {
  display: flex;
  gap: 0.6rem;
}
.bouton-plein {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  background: var(--bronze);
  color: #fff;
  font-family: var(--sans);
  font-weight: 600;
  font-size: 0.84rem;
  padding: 0.65rem 1.2rem;
  border-radius: 99px;
  cursor: pointer;
  transition: background 0.15s;
}
.bouton-plein:hover:not(:disabled) {
  background: var(--bronze-fonce);
}
.bouton-plein:disabled {
  opacity: 0.5;
  cursor: default;
}
.bouton-bloc {
  width: 100%;
  margin-top: 0.8rem;
}
.bouton-danger {
  border: 1px solid rgb(var(--color-danger));
  background: none;
  color: rgb(var(--color-danger));
  font-family: var(--sans);
  font-weight: 600;
  font-size: 0.82rem;
  padding: 0.6rem 1.1rem;
  border-radius: 99px;
  cursor: pointer;
}
.panneau-cta p {
  font-size: 0.9rem;
  font-weight: 600;
  margin: 0;
}

.bloc-signalement {
  padding: 0.4rem 0.2rem;
}
.lien-signalement {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  border: 0;
  background: none;
  padding: 0;
  font-family: var(--sans);
  font-size: 0.78rem;
  font-weight: 600;
  color: rgb(var(--color-texte-attenue));
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
}
.lien-signalement:hover {
  color: rgb(var(--color-texte));
}
.titre-signalement {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  font-weight: 700;
  color: rgb(var(--color-danger));
  margin: 0;
}

@media (max-width: 56rem) {
  .disposition {
    grid-template-columns: 1fr;
  }
}
</style>
