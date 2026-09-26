import { RoleUtilisateur } from "@ayinon/shared";
import { ref } from "vue";
import { api } from "../services/api";
import { useAuthStore } from "../stores/auth.store";

export interface NotificationItem {
  id: string;
  titre: string;
  sousTitre: string;
  lien: string;
}

const items = ref<NotificationItem[]>([]);

/**
 * Notifications de l'en-tete : jamais une pastille decorative. Chaque role affiche une vraie
 * liste d'evenements issus de son propre flux metier (propositions de cession recues, signatures
 * familiales en attente, cessions a valider, conflits CSAF actifs...). Pas de flux -> liste vide,
 * plutot que d'inventer une donnee.
 */
export function useNotifications() {
  const auth = useAuthStore();

  async function rafraichir() {
    if (!auth.estConnecte) {
      items.value = [];
      return;
    }
    try {
      if (auth.role === RoleUtilisateur.VENDEUR) {
        interface AnnonceAvecInterets {
          parcelle: { nup: string; commune: string };
          interets: Array<{ id: string; statut: string; acheteur: { nomComplet: string } }>;
        }
        interface VisiteRecue {
          id: string;
          statut: string;
          acheteur: { nomComplet: string };
          annonce: { parcelle: { nup: string; commune: string } };
        }
        const [mesAnnonces, visitesRecues] = await Promise.all([
          api.get<AnnonceAvecInterets[]>("/annonces/mes-annonces"),
          api.get<VisiteRecue[]>("/visites/recues"),
        ]);
        const interets = mesAnnonces.flatMap((a) =>
          a.interets
            .filter((i) => i.statut === "EN_ATTENTE")
            .map((i) => ({
              id: `interet-${i.id}`,
              titre: `Interet de ${i.acheteur.nomComplet}`,
              sousTitre: `${a.parcelle.nup} — ${a.parcelle.commune}`,
              lien: "/vendre",
            })),
        );
        const visites = visitesRecues
          .filter((v) => v.statut === "DEMANDEE")
          .map((v) => ({
            id: `visite-${v.id}`,
            titre: `Visite demandee par ${v.acheteur.nomComplet}`,
            sousTitre: `${v.annonce.parcelle.nup} — ${v.annonce.parcelle.commune}`,
            lien: "/vendre",
          }));
        items.value = [...interets, ...visites];
      } else if (auth.role === RoleUtilisateur.ACHETEUR) {
        interface MonInteret {
          id: string;
          statut: string;
          annonce: { parcelle: { nup: string; commune: string } };
        }
        interface PropositionRecue {
          id: string;
          vendeurNom: string;
          parcelle: { nup: string; commune: string };
        }
        interface MaVisite {
          id: string;
          statut: string;
          annonce: { parcelle: { nup: string; commune: string } };
        }
        const [mesInterets, propositionsRecues, mesVisites] = await Promise.all([
          api.get<MonInteret[]>("/annonces/mes-interets"),
          api.get<PropositionRecue[]>("/cessions/mes-propositions-recues"),
          api.get<MaVisite[]>("/visites/mes-demandes"),
        ]);
        const retenus = mesInterets
          .filter((i) => i.statut === "RETENU")
          .map((i) => ({
            id: `interet-${i.id}`,
            titre: "Votre interet a ete retenu",
            sousTitre: `${i.annonce.parcelle.nup} — ${i.annonce.parcelle.commune}`,
            lien: "/acheter",
          }));
        const propositions = propositionsRecues.map((c) => ({
          id: `proposition-${c.id}`,
          titre: `Proposition de cession de ${c.vendeurNom}`,
          sousTitre: `${c.parcelle.nup} — ${c.parcelle.commune}`,
          lien: "/acheter",
        }));
        const reprogrammations = mesVisites
          .filter((v) => v.statut === "REPROGRAMMEE")
          .map((v) => ({
            id: `visite-${v.id}`,
            titre: "Nouvelle date de visite proposee",
            sousTitre: `${v.annonce.parcelle.nup} — ${v.annonce.parcelle.commune}`,
            lien: "/acheter",
          }));
        items.value = [...retenus, ...propositions, ...reprogrammations];
      } else if (auth.role === RoleUtilisateur.MANDATAIRE_FAMILIAL) {
        interface SignatureEnAttente {
          id: string;
          parcelle: { nup: string; commune: string };
        }
        const signatures = await api.get<SignatureEnAttente[]>("/familles/mes-signatures-en-attente");
        items.value = signatures.map((s) => ({
          id: `signature-${s.id}`,
          titre: "Signature requise",
          sousTitre: `${s.parcelle.nup} — ${s.parcelle.commune}`,
          lien: "/famille",
        }));
      } else if (auth.role === RoleUtilisateur.AGENT_ANDF || auth.role === RoleUtilisateur.ADMIN) {
        interface CessionAValider {
          id: string;
          vendeurNom: string;
          acquereurNom: string;
          parcelle: { nup: string; commune: string };
        }
        const aValider = await api.get<CessionAValider[]>("/cessions/a-valider");
        items.value = aValider.map((c) => ({
          id: `cession-${c.id}`,
          titre: `Cession de ${c.vendeurNom} vers ${c.acquereurNom}`,
          sousTitre: `${c.parcelle.nup} — ${c.parcelle.commune}`,
          lien: "/andf/cessions",
        }));
      } else if (auth.role === RoleUtilisateur.MAGISTRAT_CSAF) {
        interface ConflitCsaf {
          id: string;
          motif: string;
          parcelle: { nup: string; commune: string };
        }
        const conflits = await api.get<ConflitCsaf[]>("/csaf/conflits-actifs");
        items.value = conflits.map((c) => ({
          id: `conflit-${c.id}`,
          titre: c.motif,
          sousTitre: `${c.parcelle.nup} — ${c.parcelle.commune}`,
          lien: "/csaf",
        }));
      } else {
        items.value = [];
      }
    } catch {
      items.value = [];
    }
  }

  return { items, rafraichir };
}
