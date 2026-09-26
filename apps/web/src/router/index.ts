import { RoleUtilisateur } from "@ayinon/shared";
import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth.store";

declare module "vue-router" {
  interface RouteMeta {
    rolesAutorises?: RoleUtilisateur[];
    necessiteAuth?: boolean;
    /** Force PublicLayout meme si connecte (voir App.vue) : la vitrine reste accessible depuis le
     * logo sans jamais perdre la session (contrairement a "/", dont le contenu et l'habillage
     * varient selon auth.estConnecte). */
    forcerPublic?: boolean;
    titre: string;
  }
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "accueil", component: () => import("../views/AccueilView.vue"), meta: { titre: "Accueil" } },
    {
      path: "/public",
      name: "accueil-public",
      component: () => import("../views/AccueilPublicView.vue"),
      meta: { titre: "Accueil", forcerPublic: true },
    },
    { path: "/carte", name: "carte", component: () => import("../views/CarteView.vue"), meta: { titre: "Carte cadastrale" } },
    { path: "/aide", name: "aide", component: () => import("../views/AideView.vue"), meta: { titre: "Aide" } },
    {
      path: "/scanner",
      name: "scanner",
      component: () => import("../views/citoyen/ScannerView.vue"),
      meta: { titre: "Scanner anti-fraude" },
    },
    {
      path: "/simulateur-frais",
      name: "simulateur",
      component: () => import("../views/citoyen/SimulateurFraisView.vue"),
      meta: { titre: "Simulateur de frais" },
    },
    { path: "/connexion", name: "connexion", component: () => import("../views/auth/LoginView.vue"), meta: { titre: "Connexion" } },
    { path: "/inscription", name: "inscription", component: () => import("../views/auth/InscriptionView.vue"), meta: { titre: "Creer un compte" } },
    {
      path: "/annonces",
      name: "annonces",
      component: () => import("../views/annonces/AnnoncesListeView.vue"),
      meta: { titre: "Vitrine des annonces" },
    },
    {
      path: "/annonces/:id",
      name: "annonce-detail",
      component: () => import("../views/annonces/AnnonceDetailView.vue"),
      meta: { titre: "Annonce" },
    },
    {
      path: "/vendre",
      name: "vendre",
      component: () => import("../views/vendeur/VendreView.vue"),
      meta: { necessiteAuth: true, rolesAutorises: [RoleUtilisateur.VENDEUR], titre: "Vendre un terrain" },
    },
    {
      path: "/acheter",
      name: "acheter",
      component: () => import("../views/acheteur/AcheterView.vue"),
      meta: { necessiteAuth: true, rolesAutorises: [RoleUtilisateur.ACHETEUR], titre: "Acheter un terrain" },
    },
    {
      path: "/passeport-foncier",
      name: "passeport-foncier",
      component: () => import("../views/citoyen/PasseportFoncierView.vue"),
      meta: { necessiteAuth: true, rolesAutorises: [RoleUtilisateur.CITOYEN], titre: "Passeport foncier" },
    },
    {
      path: "/geometre",
      name: "geometre",
      component: () => import("../views/geometre/ImportTopoView.vue"),
      meta: { necessiteAuth: true, rolesAutorises: [RoleUtilisateur.GEOMETRE], titre: "Import de bornage" },
    },
    {
      path: "/geometre/batis",
      name: "geometre-batis",
      component: () => import("../views/geometre/ValidationBatisView.vue"),
      meta: {
        necessiteAuth: true,
        rolesAutorises: [RoleUtilisateur.GEOMETRE, RoleUtilisateur.AGENT_ANDF, RoleUtilisateur.ADMIN],
        titre: "Validation des batis",
      },
    },
    {
      path: "/famille",
      name: "famille",
      component: () => import("../views/famille/MultiSignatureView.vue"),
      meta: {
        necessiteAuth: true,
        rolesAutorises: [RoleUtilisateur.CITOYEN, RoleUtilisateur.MANDATAIRE_FAMILIAL, RoleUtilisateur.AGENT_ANDF, RoleUtilisateur.ADMIN],
        titre: "Multi-signature familiale",
      },
    },
    {
      path: "/andf",
      name: "andf",
      component: () => import("../views/andf/ConsolePolesView.vue"),
      meta: {
        necessiteAuth: true,
        rolesAutorises: [RoleUtilisateur.AGENT_ANDF, RoleUtilisateur.MAGISTRAT_CSAF, RoleUtilisateur.ADMIN],
        titre: "Console des poles",
      },
    },
    {
      path: "/andf/cessions",
      name: "andf-cessions",
      component: () => import("../views/andf/ValidationCessionsView.vue"),
      meta: {
        necessiteAuth: true,
        rolesAutorises: [RoleUtilisateur.AGENT_ANDF, RoleUtilisateur.ADMIN],
        titre: "Validation des cessions",
      },
    },
    {
      path: "/andf/usage-sol",
      name: "andf-usage-sol",
      component: () => import("../views/andf/ValidationUsageSolView.vue"),
      meta: {
        necessiteAuth: true,
        rolesAutorises: [RoleUtilisateur.AGENT_ANDF, RoleUtilisateur.ADMIN],
        titre: "Validation usage du sol",
      },
    },
    {
      path: "/csaf",
      name: "csaf",
      component: () => import("../views/andf/GelCsafView.vue"),
      meta: { necessiteAuth: true, rolesAutorises: [RoleUtilisateur.MAGISTRAT_CSAF], titre: "Gel conservatoire CSAF" },
    },
    {
      path: "/banque/solvabilite",
      name: "banque-solvabilite",
      component: () => import("../views/banque/SolvabiliteView.vue"),
      meta: {
        necessiteAuth: true,
        rolesAutorises: [RoleUtilisateur.AGENT_BANQUE, RoleUtilisateur.ADMIN],
        titre: "Verification de solvabilite",
      },
    },
    {
      path: "/mes-signalements",
      name: "mes-signalements",
      component: () => import("../views/signalements/MesSignalementsView.vue"),
      meta: {
        necessiteAuth: true,
        rolesAutorises: [RoleUtilisateur.CITOYEN, RoleUtilisateur.VENDEUR, RoleUtilisateur.ACHETEUR, RoleUtilisateur.MANDATAIRE_FAMILIAL],
        titre: "Mes signalements",
      },
    },
    {
      path: "/admin",
      name: "admin",
      component: () => import("../views/admin/AdminView.vue"),
      meta: { necessiteAuth: true, rolesAutorises: [RoleUtilisateur.ADMIN], titre: "Back-office" },
    },
    { path: "/:pathMatch(.*)*", name: "introuvable", component: () => import("../views/IntrouvableView.vue"), meta: { titre: "Page introuvable" } },
  ],
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  if (auth.chargementInitial) {
    await auth.chargerSession();
  }

  if (to.meta.necessiteAuth && !auth.estConnecte) {
    return { name: "connexion", query: { redirection: to.fullPath } };
  }

  // Un utilisateur deja connecte n'a rien a faire sur l'ecran de connexion ou d'inscription
  // (favori, bouton precedent) : y rester l'afficherait dans le chrome "tableau de bord" avec,
  // absurdement, un formulaire lui redemandant de se connecter/creer un compte.
  if ((to.name === "connexion" || to.name === "inscription") && auth.estConnecte) {
    return { name: "accueil" };
  }

  if (to.meta.rolesAutorises && (!auth.role || !to.meta.rolesAutorises.includes(auth.role))) {
    return { name: "accueil" };
  }

  return true;
});

router.afterEach((to) => {
  document.title = to.meta.titre ? `${to.meta.titre} — AYINON` : "AYINON";
});

export default router;
