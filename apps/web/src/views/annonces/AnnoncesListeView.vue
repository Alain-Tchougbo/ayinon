<script setup lang="ts">
import { Bell, BellRing, MapPin, Scale, ShieldCheck, Store, Trash2, X } from "@lucide/vue";
import { RoleUtilisateur } from "@ayinon/shared";
import { computed, onMounted, ref } from "vue";
import { ApiError, api } from "../../services/api";
import { useAuthStore } from "../../stores/auth.store";
import { tuileSatellitePour } from "../../services/tuileSatellite";

interface AnnonceResume {
  id: string;
  prixIndicatifFcfa: number | null;
  description: string | null;
  verifieeParAndfId: string | null;
  parcelle: { nup: string; commune: string; arrondissement: string | null; superficieM2: number };
  limitesCertifiees: boolean;
  enExclusivite: boolean;
  centreParcelle: { lng: number; lat: number } | null;
}

interface EstimationPrix {
  nombreReferences: number;
  moyenneFcfaParM2: number | null;
  message: string;
}

interface RechercheSauvegardee {
  id: string;
  nom: string;
  commune: string | null;
  prixMinFcfa: number | null;
  prixMaxFcfa: number | null;
  superficieMinM2: number | null;
  superficieMaxM2: number | null;
  verifieeAndf: boolean | null;
  limitesCertifiees: boolean | null;
  nombreNouvelles: number;
}

const auth = useAuthStore();
const annonces = ref<AnnonceResume[]>([]);
const chargement = ref(false);
const erreur = ref<string | null>(null);
const message = ref<string | null>(null);

// E3.3 : comparaison cote a cote, jusqu'a 3 annonces a la fois.
const MAX_COMPARAISON = 3;
const idsComparaison = ref<string[]>([]);
const annoncesComparees = computed(() => idsComparaison.value.map((id) => annonces.value.find((a) => a.id === id)).filter((a): a is AnnonceResume => Boolean(a)));

function basculerComparaison(id: string) {
  const index = idsComparaison.value.indexOf(id);
  if (index !== -1) {
    idsComparaison.value.splice(index, 1);
  } else if (idsComparaison.value.length < MAX_COMPARAISON) {
    idsComparaison.value.push(id);
  }
}

const communeEstimation = ref("");
const estimation = ref<EstimationPrix | null>(null);
const estimationEnCours = ref(false);

const FILTRES_VIDES = {
  commune: "",
  prixMinFcfa: "",
  prixMaxFcfa: "",
  superficieMinM2: "",
  superficieMaxM2: "",
  verifieeAndf: false,
  limitesCertifiees: false,
};
const filtres = ref({ ...FILTRES_VIDES });
// Les champs type="number" font caster leur valeur en Number par Vue (v-model natif), pas une
// string malgre le typage initial : String(v) avant .trim() evite un plantage du rendu.
const filtresActifs = computed(() => Object.values(filtres.value).some((v) => (typeof v === "boolean" ? v : String(v).trim() !== "")));

// E3.2 : recherche sauvegardee avec alerte in-app (pas de SMS/email/push reel, voir docs/decisions.md).
const mesRecherches = ref<RechercheSauvegardee[]>([]);
const nomRecherche = ref("");
const sauvegardeOuverte = ref(false);
const actionRechercheEnCours = ref(false);

async function charger() {
  chargement.value = true;
  erreur.value = null;
  try {
    const params = new URLSearchParams();
    if (filtres.value.commune.trim()) params.set("commune", filtres.value.commune.trim());
    if (filtres.value.prixMinFcfa) params.set("prixMinFcfa", filtres.value.prixMinFcfa);
    if (filtres.value.prixMaxFcfa) params.set("prixMaxFcfa", filtres.value.prixMaxFcfa);
    if (filtres.value.superficieMinM2) params.set("superficieMinM2", filtres.value.superficieMinM2);
    if (filtres.value.superficieMaxM2) params.set("superficieMaxM2", filtres.value.superficieMaxM2);
    if (filtres.value.verifieeAndf) params.set("verifieeAndf", "true");
    if (filtres.value.limitesCertifiees) params.set("limitesCertifiees", "true");
    const qs = params.toString();
    annonces.value = await api.get<AnnonceResume[]>(`/annonces${qs ? `?${qs}` : ""}`);
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Impossible de charger la vitrine des annonces";
  } finally {
    chargement.value = false;
  }
}

function reinitialiserFiltres() {
  filtres.value = { ...FILTRES_VIDES };
  charger();
}

async function chargerMesRecherches() {
  if (auth.role !== RoleUtilisateur.ACHETEUR) return;
  try {
    mesRecherches.value = await api.get<RechercheSauvegardee[]>("/recherches-sauvegardees");
  } catch {
    // Silencieux : la vitrine reste utilisable meme si les recherches sauvegardees ne chargent pas.
  }
}

onMounted(() => {
  charger();
  chargerMesRecherches();
});

async function sauvegarderRecherche() {
  erreur.value = null;
  message.value = null;
  if (!nomRecherche.value.trim()) return;
  actionRechercheEnCours.value = true;
  try {
    await api.post("/recherches-sauvegardees", {
      nom: nomRecherche.value.trim(),
      commune: filtres.value.commune.trim() || undefined,
      prixMinFcfa: filtres.value.prixMinFcfa || undefined,
      prixMaxFcfa: filtres.value.prixMaxFcfa || undefined,
      superficieMinM2: filtres.value.superficieMinM2 || undefined,
      superficieMaxM2: filtres.value.superficieMaxM2 || undefined,
      verifieeAndf: filtres.value.verifieeAndf || undefined,
      limitesCertifiees: filtres.value.limitesCertifiees || undefined,
    });
    message.value = "Recherche sauvegardee. Vous serez alerte des qu'une nouvelle annonce correspond.";
    nomRecherche.value = "";
    sauvegardeOuverte.value = false;
    await chargerMesRecherches();
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Impossible de sauvegarder cette recherche";
  } finally {
    actionRechercheEnCours.value = false;
  }
}

async function appliquerRecherche(r: RechercheSauvegardee) {
  filtres.value = {
    commune: r.commune ?? "",
    prixMinFcfa: r.prixMinFcfa != null ? String(r.prixMinFcfa) : "",
    prixMaxFcfa: r.prixMaxFcfa != null ? String(r.prixMaxFcfa) : "",
    superficieMinM2: r.superficieMinM2 != null ? String(r.superficieMinM2) : "",
    superficieMaxM2: r.superficieMaxM2 != null ? String(r.superficieMaxM2) : "",
    verifieeAndf: Boolean(r.verifieeAndf),
    limitesCertifiees: Boolean(r.limitesCertifiees),
  };
  await charger();
  try {
    await api.patch(`/recherches-sauvegardees/${r.id}/consulter`);
    await chargerMesRecherches();
  } catch {
    // L'alerte n'a pas pu etre remise a zero : sans consequence sur la recherche elle-meme.
  }
}

async function supprimerRecherche(id: string) {
  actionRechercheEnCours.value = true;
  try {
    await api.delete(`/recherches-sauvegardees/${id}`);
    await chargerMesRecherches();
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Suppression impossible";
  } finally {
    actionRechercheEnCours.value = false;
  }
}

async function estimer() {
  const commune = communeEstimation.value.trim();
  if (!commune) return;
  estimationEnCours.value = true;
  try {
    estimation.value = await api.get<EstimationPrix>(`/annonces/estimation-prix?commune=${encodeURIComponent(commune)}`);
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Estimation impossible";
  } finally {
    estimationEnCours.value = false;
  }
}

// Vitrine editoriale (DA retenue) : la premiere annonce recue est mise en avant en "vedette",
// le reste rejoint la grille secondaire. Pas de champ "mise en avant" en base : c'est un choix
// d'affichage (position dans les resultats), pas une donnee fabriquee.
const anconceVedette = computed(() => annonces.value[0] ?? null);
const autresAnnonces = computed(() => annonces.value.slice(1));

// Bandeau de confiance : chiffres reels derives des annonces chargees (pas des totaux fictifs) —
// seul "6 poles territoriaux" est une constante reelle du decoupage administratif ANDF.
const nombreVerifieesAndf = computed(() => annonces.value.filter((a) => a.verifieeParAndfId).length);

// Motifs illustres des cartes secondaires : 3 palettes qui tournent par index, pour varier le
// rendu visuel sans dependre d'une photo (aucune photo de parcelle n'existe dans le systeme).
const MOTIFS_CARTE = [
  { base: "#22452F", clair: "#4A7A56", moyen: "#2E5A3E", sombre: "#1A3624" },
  { base: "#7A431C", clair: "#B76E36", moyen: "#8F5427", sombre: "#5A320F" },
  { base: "#5A4B32", clair: "#8A7550", moyen: "#6B5A3D", sombre: "#453A26" },
];
function motifPour(index: number) {
  // Le modulo garantit un index dans les bornes ; non-null sur puisqu'un tableau litteral non
  // vide ne peut pas renvoyer undefined ici, malgre le typage strict de l'acces par index.
  return MOTIFS_CARTE[index % MOTIFS_CARTE.length]!;
}

/** Vraie tuile satellite si la parcelle a des coordonnees ; sinon degrade illustratif en repli
 * (jamais de photo generique/trompeuse presentee comme etant celle d'un terrain precis). */
function visuelPour(a: AnnonceResume, index: number) {
  if (a.centreParcelle) {
    const tuile = tuileSatellitePour(a.centreParcelle.lng, a.centreParcelle.lat);
    return { image: tuile, degrade: null };
  }
  return { image: null, degrade: motifPour(index) };
}
const visuelVedette = computed(() => (anconceVedette.value ? visuelPour(anconceVedette.value, 0) : null));
</script>

<template>
  <div class="marche-editorial">
    <div class="entete-vitrine">
      <h1>Chaque parcelle a une histoire verifiee</h1>
      <p>Des terrains publies par des vendeurs verifies AYINON — consultez librement, comparez, creez un compte pour manifester votre interet.</p>
    </div>

    <p v-if="erreur" class="alerte alerte-danger" role="alert">{{ erreur }}</p>
    <p v-if="message" class="alerte alerte-succes" role="status">{{ message }}</p>

    <!-- E3.1 : filtres combinables (zone, prix, superficie, niveau de verification). -->
    <div class="barre-recherche">
      <form class="recherche-carte" @submit.prevent="charger">
        <input v-model="filtres.commune" placeholder="Commune (ex. Cotonou)" />
        <input v-model="filtres.prixMinFcfa" type="number" placeholder="Prix min (FCFA)" />
        <input v-model="filtres.prixMaxFcfa" type="number" placeholder="Prix max (FCFA)" />
        <input v-model="filtres.superficieMinM2" type="number" placeholder="Superficie min (m²)" />
        <input v-model="filtres.superficieMaxM2" type="number" placeholder="Superficie max (m²)" />
        <button type="submit" :disabled="chargement">Rechercher</button>
      </form>
      <div class="options-recherche">
        <label><input v-model="filtres.verifieeAndf" type="checkbox" /> Situation controlee ANDF</label>
        <label><input v-model="filtres.limitesCertifiees" type="checkbox" /> Limites certifiees</label>
        <button v-if="filtresActifs" type="button" class="lien-discret" @click="reinitialiserFiltres">
          <X :size="12" aria-hidden="true" /> Reinitialiser
        </button>
        <button
          v-if="auth.role === RoleUtilisateur.ACHETEUR && filtresActifs && !sauvegardeOuverte"
          type="button"
          class="lien-discret"
          @click="sauvegardeOuverte = true"
        >
          <Bell :size="12" aria-hidden="true" /> Sauvegarder cette recherche
        </button>
      </div>
      <div v-if="sauvegardeOuverte" class="ligne-sauvegarde">
        <input v-model="nomRecherche" placeholder="Nom de cette recherche (ex. Terrains a Cotonou)" />
        <button type="button" class="bouton-plein" :disabled="actionRechercheEnCours || !nomRecherche.trim()" @click="sauvegarderRecherche">Enregistrer</button>
        <button type="button" class="lien-discret" @click="sauvegardeOuverte = false">Annuler</button>
      </div>
    </div>

    <section class="conteneur">
      <!-- E3.3 : comparaison cote a cote, jusqu'a 3 annonces selectionnees via la case "Comparer". -->
      <div v-if="annoncesComparees.length > 0" class="panneau-comparaison">
        <div class="entete-panneau">
          <h2><Scale :size="16" aria-hidden="true" /> Comparaison ({{ annoncesComparees.length }}/{{ MAX_COMPARAISON }})</h2>
          <button type="button" class="lien-discret" @click="idsComparaison = []">Vider</button>
        </div>
        <div class="table-scroll">
          <table>
            <tbody>
              <tr>
                <td class="cle">Parcelle</td>
                <td v-for="a in annoncesComparees" :key="a.id" class="valeur-forte">
                  <RouterLink :to="`/annonces/${a.id}`">{{ a.parcelle.nup }}</RouterLink>
                </td>
              </tr>
              <tr>
                <td class="cle">Commune</td>
                <td v-for="a in annoncesComparees" :key="a.id">{{ a.parcelle.commune }}</td>
              </tr>
              <tr>
                <td class="cle">Superficie</td>
                <td v-for="a in annoncesComparees" :key="a.id">{{ a.parcelle.superficieM2.toLocaleString("fr-FR") }} m²</td>
              </tr>
              <tr>
                <td class="cle">Prix</td>
                <td v-for="a in annoncesComparees" :key="a.id" class="valeur-prix">
                  {{ a.prixIndicatifFcfa ? `${a.prixIndicatifFcfa.toLocaleString("fr-FR")} FCFA` : "A discuter" }}
                </td>
              </tr>
              <tr>
                <td class="cle">Situation ANDF</td>
                <td v-for="a in annoncesComparees" :key="a.id" :class="a.verifieeParAndfId ? 'positif' : 'neutre'">
                  {{ a.verifieeParAndfId ? "Controlee" : "Non controlee" }}
                </td>
              </tr>
              <tr>
                <td class="cle">Limites certifiees</td>
                <td v-for="a in annoncesComparees" :key="a.id" :class="a.limitesCertifiees ? 'positif' : 'neutre'">
                  {{ a.limitesCertifiees ? "Oui" : "Non" }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <p v-if="chargement" class="statut-chargement" role="status">Chargement…</p>

      <div v-else-if="annonces.length === 0" class="etat-vide">
        <span class="etat-vide-icone"><Store :size="22" aria-hidden="true" /></span>
        <p class="etat-vide-titre">{{ filtresActifs ? "Aucune annonce ne correspond a ces filtres" : "Aucune annonce active pour le moment" }}</p>
        <p class="etat-vide-texte">
          {{
            filtresActifs
              ? "Elargissez vos criteres ou sauvegardez cette recherche pour etre alerte des qu'une parcelle correspondante sera publiee."
              : "Les vendeurs verifies AYINON n'ont pas encore de parcelle publiee. Revenez bientot."
          }}
        </p>
        <button v-if="filtresActifs" type="button" class="bouton-contour" @click="reinitialiserFiltres">Reinitialiser les filtres</button>
      </div>

      <template v-else>
        <!-- Annonce vedette : la premiere des resultats, pas un champ "mise en avant" fabrique. -->
        <RouterLink :to="`/annonces/${anconceVedette!.id}`" class="vedette">
          <div
            class="vedette-visuel"
            :style="
              visuelVedette!.image
                ? { backgroundImage: `url(${visuelVedette!.image.url})` }
                : { background: `linear-gradient(160deg, ${visuelVedette!.degrade!.clair}, ${visuelVedette!.degrade!.base})` }
            "
          >
            <span v-if="anconceVedette!.enExclusivite" class="etiquette-vedette">En negociation exclusive</span>
            <span
              v-if="visuelVedette!.image"
              class="repere-parcelle"
              :style="{ left: visuelVedette!.image.positionXPourcent + '%', top: visuelVedette!.image.positionYPourcent + '%' }"
            />
            <svg v-else viewBox="0 0 500 400" preserveAspectRatio="xMidYMid slice">
              <rect width="500" height="400" :fill="motifPour(0).base" />
              <polygon points="0,0 180,0 130,150 -30,180" :fill="motifPour(0).moyen" />
              <polygon points="180,0 400,0 360,140 130,150" :fill="motifPour(0).clair" />
              <polygon points="0,180 130,150 170,320 -30,340" :fill="motifPour(0).sombre" />
              <polygon points="130,150 360,140 320,340 170,320" :fill="motifPour(0).clair" opacity=".9" />
              <polygon points="360,140 400,0 520,20 500,220" :fill="motifPour(0).moyen" />
              <polyline points="130,150 360,140 320,340 170,320 130,150" stroke="#F2A93B" stroke-width="1.4" opacity=".55" fill="none" />
            </svg>
          </div>
          <div class="vedette-corps">
            <span class="nup-vedette">{{ anconceVedette!.parcelle.nup }}</span>
            <h2>Parcelle a {{ anconceVedette!.parcelle.commune }}</h2>
            <p class="lieu">
              <span v-if="anconceVedette!.parcelle.arrondissement">{{ anconceVedette!.parcelle.arrondissement }} — </span>{{
                anconceVedette!.parcelle.superficieM2.toLocaleString("fr-FR")
              }} m²
            </p>
            <p v-if="anconceVedette!.description" class="description">{{ anconceVedette!.description }}</p>
            <p class="prix-vedette" :class="{ 'a-discuter': !anconceVedette!.prixIndicatifFcfa }">
              {{ anconceVedette!.prixIndicatifFcfa ? `${anconceVedette!.prixIndicatifFcfa.toLocaleString("fr-FR")} FCFA` : "Prix a discuter" }}
            </p>
            <div class="badges-vedette">
              <span v-if="anconceVedette!.verifieeParAndfId" class="badge badge-andf"><ShieldCheck :size="12" aria-hidden="true" /> Situation controlee ANDF</span>
              <span v-if="anconceVedette!.limitesCertifiees" class="badge badge-certifie">Limites certifiees</span>
            </div>
            <span class="lien-dossier">Voir le dossier complet →</span>
          </div>
        </RouterLink>

        <div v-if="autresAnnonces.length > 0" class="entete-section">
          <h3>Autres parcelles disponibles</h3>
          <span>{{ annonces.length }} annonce(s) trouvee(s)</span>
        </div>

        <div v-if="autresAnnonces.length > 0" class="grille-annonces">
          <div v-for="(a, i) in autresAnnonces" :key="a.id" class="carte-annonce">
            <label class="case-comparer-flottante" @click.stop>
              <input
                type="checkbox"
                :checked="idsComparaison.includes(a.id)"
                :disabled="!idsComparaison.includes(a.id) && idsComparaison.length >= MAX_COMPARAISON"
                @change="basculerComparaison(a.id)"
              />
              Comparer
            </label>
            <RouterLink :to="`/annonces/${a.id}`" class="carte-lien">
              <div
                class="motif"
                :style="
                  visuelPour(a, i).image
                    ? { backgroundImage: `url(${visuelPour(a, i).image!.url})` }
                    : { background: `linear-gradient(160deg, ${visuelPour(a, i).degrade!.clair}, ${visuelPour(a, i).degrade!.base})` }
                "
              />
              <div class="carte-corps">
                <p class="nup">{{ a.parcelle.nup }}</p>
                <p class="lieu"><MapPin :size="12" aria-hidden="true" /> {{ a.parcelle.commune }}<span v-if="a.parcelle.arrondissement">, {{ a.parcelle.arrondissement }}</span></p>
                <p class="superficie">{{ a.parcelle.superficieM2.toLocaleString("fr-FR") }} m²</p>
                <p class="prix" :class="{ 'a-discuter': !a.prixIndicatifFcfa }">{{ a.prixIndicatifFcfa ? `${a.prixIndicatifFcfa.toLocaleString("fr-FR")} FCFA` : "Prix a discuter" }}</p>
                <div v-if="a.verifieeParAndfId || a.limitesCertifiees || a.enExclusivite" class="badges">
                  <span v-if="a.verifieeParAndfId" class="badge badge-andf">Situation controlee ANDF</span>
                  <span v-if="a.limitesCertifiees" class="badge badge-certifie">Limites certifiees</span>
                  <!-- E4.5 : badge public, sans jamais reveler l'identite de l'acheteur beneficiaire. -->
                  <span v-if="a.enExclusivite" class="badge badge-exclusif">En negociation exclusive</span>
                </div>
              </div>
            </RouterLink>
          </div>
        </div>
      </template>

      <div class="outils">
        <div class="panneau-outil">
          <h3>Estimer un prix par commune</h3>
          <p class="desc">Base sur les cessions validees et enregistrees par l'ANDF dans cette commune.</p>
          <form class="ligne-estimation" @submit.prevent="estimer">
            <input v-model="communeEstimation" placeholder="Ex. Cotonou" />
            <button type="submit" :disabled="estimationEnCours || !communeEstimation.trim()">Estimer</button>
          </form>
          <div v-if="estimation" class="resultat-estimation">
            <p v-if="estimation.moyenneFcfaParM2 !== null" class="valeur">{{ estimation.moyenneFcfaParM2.toLocaleString("fr-FR") }} FCFA / m² en moyenne</p>
            <p class="message">{{ estimation.message }}</p>
          </div>
        </div>

        <!-- E3.2 : recherches sauvegardees, avec alerte in-app sur les nouvelles annonces correspondantes. -->
        <div v-if="mesRecherches.length > 0" class="panneau-outil">
          <h3>Vos recherches sauvegardees</h3>
          <p class="desc">Soyez alerte des qu'une nouvelle parcelle correspond a vos criteres.</p>
          <div class="liste-recherches">
            <div v-for="r in mesRecherches" :key="r.id" class="ligne-recherche">
              <button type="button" class="ligne-recherche-bouton" @click="appliquerRecherche(r)">
                <BellRing v-if="r.nombreNouvelles > 0" :size="14" aria-hidden="true" />
                <Bell v-else :size="14" aria-hidden="true" />
                {{ r.nom }}
              </button>
              <span v-if="r.nombreNouvelles > 0" class="badge-nouveau">{{ r.nombreNouvelles }} nouvelle(s)</span>
              <button type="button" class="bouton-supprimer" aria-label="Supprimer cette recherche" @click="supprimerRecherche(r.id)">
                <Trash2 :size="14" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div class="confiance">
      <div class="confiance-int">
        <div>
          <h3>Verifie a chaque etape</h3>
          <p>Chaque annonce marquee « Situation controlee ANDF » a ete verifiee par un agent territorial. La chaine d'audit AYINON rend toute alteration detectable.</p>
        </div>
        <div class="confiance-chiffres">
          <div><strong>6</strong><span>poles territoriaux</span></div>
          <div><strong>{{ annonces.length }}</strong><span>annonce(s) publiee(s)</span></div>
          <div><strong>{{ nombreVerifieesAndf }}</strong><span>verifiee(s) ANDF</span></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Identite "Vitrine editoriale" (DA retenue pour la marketplace) : scopee a ce composant pour ne
   pas modifier les tokens globaux ni les autres pages — voir la question posee a l'utilisateur
   avant integration (l'en-tete partage reste dans l'identite foret & or). */
.marche-editorial {
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

  font-family: var(--sans);
  background: var(--ivoire);
  color: rgb(var(--color-texte));
}
.marche-editorial :deep(h1),
.marche-editorial :deep(h2),
.marche-editorial :deep(h3) {
  font-family: var(--disp);
  font-weight: 600;
  letter-spacing: 0;
}

.entete-vitrine {
  max-width: 44rem;
  margin: 0 auto;
  padding: 2.6rem 1.75rem 0;
  text-align: center;
}
.entete-vitrine h1 {
  font-size: 2rem;
  font-style: italic;
  font-weight: 500;
}
.entete-vitrine p {
  color: rgb(var(--color-texte-attenue));
  font-size: 0.92rem;
  margin: 0.7rem 0 0;
}

.alerte {
  max-width: 60rem;
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

/* ---- Barre de recherche ---- */
.barre-recherche {
  max-width: 60rem;
  margin: 1.6rem auto 0;
  padding: 0 1.75rem;
}
.recherche-carte {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  background: var(--surface);
  border: 1px solid var(--hairline);
  border-radius: 6px;
  padding: 0.6rem;
  box-shadow: 0 14px 34px rgba(36, 31, 23, 0.08);
}
.recherche-carte input {
  border: 0;
  border-right: 1px solid var(--hairline);
  background: transparent;
  font-family: var(--sans);
  font-size: 0.85rem;
  color: inherit;
  padding: 0.6rem 0.9rem;
  flex: 1;
  min-width: 7rem;
}
.recherche-carte input:last-of-type {
  border-right: 0;
}
.recherche-carte input::placeholder {
  color: rgb(var(--color-texte-attenue));
}
.recherche-carte input:focus {
  outline: 0;
}
.recherche-carte button {
  border: 0;
  background: var(--bronze);
  color: #fff;
  font-family: var(--sans);
  font-weight: 600;
  font-size: 0.84rem;
  padding: 0.7rem 1.6rem;
  border-radius: 99px;
  cursor: pointer;
  transition: background 0.15s;
}
.recherche-carte button:hover:not(:disabled) {
  background: var(--bronze-fonce);
}
.recherche-carte button:disabled {
  opacity: 0.5;
  cursor: default;
}
.options-recherche {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 1.4rem;
  margin-top: 0.8rem;
  font-size: 0.8rem;
  color: rgb(var(--color-texte-attenue));
}
.options-recherche label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.options-recherche input {
  accent-color: var(--bronze);
}
.lien-discret {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  border: 0;
  background: none;
  padding: 0;
  font-family: var(--sans);
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--bronze-fonce);
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
}
.ligne-sauvegarde {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  max-width: 60rem;
  margin: 0.8rem auto 0;
}
.ligne-sauvegarde input {
  flex: 1;
  min-width: 14rem;
  border: 1px solid var(--hairline);
  background: var(--surface);
  border-radius: 4px;
  padding: 0.6rem 0.9rem;
  font-family: var(--sans);
  font-size: 0.84rem;
}
.bouton-plein {
  border: 0;
  background: var(--bronze);
  color: #fff;
  font-family: var(--sans);
  font-weight: 600;
  font-size: 0.82rem;
  padding: 0.6rem 1.1rem;
  border-radius: 99px;
  cursor: pointer;
}
.bouton-plein:disabled {
  opacity: 0.5;
  cursor: default;
}
.bouton-contour {
  border: 1px solid var(--encre, currentColor);
  background: none;
  color: inherit;
  font-family: var(--sans);
  font-weight: 600;
  font-size: 0.82rem;
  padding: 0.6rem 1.3rem;
  border-radius: 99px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.bouton-contour:hover {
  background: rgb(var(--color-texte));
  color: var(--ivoire);
}

.conteneur {
  max-width: 74rem;
  margin: 0 auto;
  padding: 2.6rem 1.75rem;
}

/* ---- Comparaison ---- */
.panneau-comparaison {
  background: var(--surface);
  border: 1px solid var(--hairline);
  border-radius: 8px;
  padding: 1.3rem 1.5rem;
  margin-bottom: 2rem;
}
.entete-panneau {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.9rem;
}
.entete-panneau h2 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--sans);
  font-size: 0.88rem;
  font-weight: 700;
}
.table-scroll {
  overflow-x: auto;
}
.panneau-comparaison table {
  width: 100%;
  min-width: 32rem;
  border-collapse: collapse;
  font-size: 0.85rem;
}
.panneau-comparaison td {
  padding: 0.55rem 0.8rem 0.55rem 0;
  border-bottom: 1px solid var(--hairline);
}
.panneau-comparaison tr:last-child td {
  border-bottom: 0;
}
.panneau-comparaison .cle {
  font-size: 0.74rem;
  font-weight: 600;
  color: rgb(var(--color-texte-attenue));
  white-space: nowrap;
}
.panneau-comparaison .valeur-forte {
  font-weight: 700;
}
.panneau-comparaison .valeur-forte a:hover {
  text-decoration: underline;
}
.panneau-comparaison .valeur-prix {
  font-weight: 700;
  color: var(--bronze-fonce);
}
.panneau-comparaison .positif {
  color: var(--vert-sceau);
  font-weight: 600;
}
.panneau-comparaison .neutre {
  color: rgb(var(--color-texte-attenue));
}

/* ---- Etat vide / chargement ---- */
.statut-chargement {
  text-align: center;
  color: rgb(var(--color-texte-attenue));
  font-size: 0.88rem;
  padding: 3rem 0;
}
.etat-vide {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  border: 1px dashed var(--hairline);
  border-radius: 8px;
  padding: 3.5rem 1.5rem;
  text-align: center;
}
.etat-vide-icone {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  background: var(--vert-sceau-fond);
  color: var(--vert-sceau);
}
.etat-vide-titre {
  font-weight: 700;
  margin: 0;
}
.etat-vide-texte {
  max-width: 26rem;
  font-size: 0.85rem;
  color: rgb(var(--color-texte-attenue));
  margin: 0;
}

/* ---- Annonce vedette ---- */
.vedette {
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  background: var(--surface);
  border: 1px solid var(--hairline);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 20px 45px rgba(36, 31, 23, 0.08);
}
.vedette-visuel {
  position: relative;
  min-height: 18rem;
  background-size: cover;
  background-position: center;
  background-color: var(--papier);
}
.vedette-visuel svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
/* Repere = position reelle (fraction de tuile) du centre de la parcelle sur l'image satellite,
   pas une valeur arbitraire — calculee dans tuileSatellitePour(). */
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
.etiquette-vedette {
  position: absolute;
  top: 1.3rem;
  left: 1.3rem;
  z-index: 1;
  background: rgba(255, 255, 255, 0.92);
  color: var(--bronze-fonce);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  padding: 0.4rem 0.8rem;
  border-radius: 99px;
}
.vedette-corps {
  padding: 2rem 2.2rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.nup-vedette {
  font-size: 0.78rem;
  font-weight: 600;
  color: rgb(var(--color-texte-attenue));
  letter-spacing: 0.03em;
}
.vedette-corps h2 {
  font-size: 1.6rem;
  font-style: italic;
  font-weight: 500;
  margin: 0.4rem 0 0.3rem;
}
.vedette-corps .lieu {
  color: rgb(var(--color-texte-attenue));
  font-size: 0.86rem;
  margin: 0;
}
.vedette-corps .description {
  font-size: 0.84rem;
  color: rgb(var(--color-texte-attenue));
  margin: 0.6rem 0 0;
}
.vedette-corps .prix-vedette {
  font-family: var(--disp);
  font-size: 1.9rem;
  font-weight: 600;
  color: var(--bronze-fonce);
  margin: 1rem 0;
}
.vedette-corps .prix-vedette.a-discuter {
  font-family: var(--sans);
  font-size: 1rem;
  font-style: italic;
  font-weight: 400;
  color: rgb(var(--color-texte-attenue));
}
.badges-vedette {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.2rem;
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
.lien-dossier {
  align-self: flex-start;
  border: 1px solid rgb(var(--color-texte));
  padding: 0.65rem 1.4rem;
  border-radius: 99px;
  font-family: var(--sans);
  font-size: 0.82rem;
  font-weight: 600;
  transition: background 0.15s, color 0.15s;
}
.vedette:hover .lien-dossier {
  background: rgb(var(--color-texte));
  color: var(--ivoire);
}

/* ---- Grille secondaire ---- */
.entete-section {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin: 2.6rem 0 1.2rem;
}
.entete-section h3 {
  font-size: 1.05rem;
  font-style: italic;
  font-weight: 500;
}
.entete-section span {
  font-size: 0.78rem;
  color: rgb(var(--color-texte-attenue));
}

.grille-annonces {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
  gap: 1.3rem;
}
.carte-annonce {
  position: relative;
}
.case-comparer-flottante {
  position: absolute;
  top: 0.6rem;
  right: 0.6rem;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  background: rgba(255, 255, 255, 0.95);
  padding: 0.3rem 0.6rem;
  border-radius: 99px;
  font-size: 0.68rem;
  color: rgb(var(--color-texte));
  box-shadow: 0 2px 6px rgba(36, 31, 23, 0.15);
}
.case-comparer-flottante input {
  accent-color: var(--bronze);
}
.carte-lien {
  display: block;
  background: var(--surface);
  border: 1px solid var(--hairline);
  border-radius: 8px;
  overflow: hidden;
  transition: transform 0.15s, box-shadow 0.15s;
}
.carte-lien:hover {
  transform: translateY(-3px);
  box-shadow: 0 16px 32px rgba(36, 31, 23, 0.1);
}
.motif {
  height: 6.5rem;
  background-size: cover;
  background-position: center;
  background-color: var(--papier);
}
.carte-corps {
  padding: 1.1rem 1.2rem;
}
.carte-corps .nup {
  font-size: 0.9rem;
  font-weight: 700;
  margin: 0;
}
.carte-corps .lieu {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.78rem;
  color: rgb(var(--color-texte-attenue));
  margin: 0.35rem 0 0;
}
.carte-corps .superficie {
  font-size: 0.8rem;
  color: rgb(var(--color-texte-attenue));
  margin: 0.5rem 0 0;
}
.carte-corps .prix {
  font-family: var(--disp);
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--bronze-fonce);
  margin: 0.25rem 0 0;
}
.carte-corps .prix.a-discuter {
  font-family: var(--sans);
  font-style: italic;
  font-weight: 400;
  font-size: 0.8rem;
  color: rgb(var(--color-texte-attenue));
}
.carte-corps .badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.6rem;
}

/* ---- Outils (estimation + recherches sauvegardees) ---- */
.outils {
  display: flex;
  flex-wrap: wrap;
  gap: 1.4rem;
  margin-top: 2.8rem;
}
.panneau-outil {
  flex: 1 1 22rem;
  background: var(--papier);
  border-radius: 8px;
  padding: 1.6rem 1.8rem;
}
.panneau-outil h3 {
  font-size: 1rem;
  font-style: italic;
  font-weight: 500;
  margin-bottom: 0.5rem;
}
.panneau-outil .desc {
  font-size: 0.82rem;
  color: rgb(var(--color-texte-attenue));
  margin: 0 0 1rem;
}
.ligne-estimation {
  display: flex;
  gap: 0.5rem;
}
.ligne-estimation input {
  flex: 1;
  border: 1px solid var(--hairline);
  background: var(--surface);
  border-radius: 4px;
  padding: 0.6rem 0.9rem;
  font-size: 0.84rem;
  font-family: var(--sans);
}
.ligne-estimation button {
  border: 0;
  background: var(--bronze);
  color: #fff;
  border-radius: 99px;
  padding: 0.6rem 1.1rem;
  font-weight: 600;
  font-size: 0.82rem;
  font-family: var(--sans);
  cursor: pointer;
}
.ligne-estimation button:disabled {
  opacity: 0.5;
  cursor: default;
}
.resultat-estimation {
  margin-top: 0.8rem;
  font-size: 0.82rem;
}
.resultat-estimation .valeur {
  font-weight: 700;
  margin: 0 0 0.2rem;
}
.resultat-estimation .message {
  color: rgb(var(--color-texte-attenue));
  margin: 0;
}
.liste-recherches {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.ligne-recherche {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  background: var(--surface);
  border-radius: 4px;
  padding: 0.65rem 0.9rem;
}
.ligne-recherche-bouton {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  border: 0;
  background: none;
  padding: 0;
  font-family: var(--sans);
  font-size: 0.84rem;
  font-weight: 600;
  color: inherit;
  cursor: pointer;
  text-align: left;
}
.ligne-recherche-bouton svg {
  color: var(--bronze-fonce);
  flex-shrink: 0;
}
.badge-nouveau {
  background: var(--bronze);
  color: #fff;
  font-size: 0.68rem;
  font-weight: 700;
  padding: 0.2rem 0.55rem;
  border-radius: 99px;
  flex-shrink: 0;
}
.bouton-supprimer {
  border: 0;
  background: none;
  color: rgb(var(--color-texte-attenue));
  cursor: pointer;
  padding: 0.2rem;
  flex-shrink: 0;
}
.bouton-supprimer:hover {
  color: rgb(var(--color-danger));
}

/* ---- Bandeau de confiance ---- */
.confiance {
  background: var(--vert-sceau);
  color: #fff;
  padding: 2.2rem 1.75rem;
  margin-top: 2.5rem;
}
.confiance-int {
  max-width: 74rem;
  margin: 0 auto;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 1.5rem;
  align-items: center;
}
.confiance h3 {
  font-size: 1.1rem;
  font-style: italic;
  font-weight: 500;
  color: #fff;
}
.confiance p {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.8);
  margin: 0.3rem 0 0;
  max-width: 28rem;
}
.confiance-chiffres {
  display: flex;
  gap: 2.2rem;
}
.confiance-chiffres div {
  text-align: center;
}
.confiance-chiffres strong {
  display: block;
  font-family: var(--disp);
  font-size: 1.5rem;
}
.confiance-chiffres span {
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.7);
}
</style>
