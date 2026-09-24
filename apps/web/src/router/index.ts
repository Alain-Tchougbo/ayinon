import { RoleUtilisateur } from "@ayinon/shared";
import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth.store";

declare module "vue-router" {
  interface RouteMeta {
    rolesAutorises?: RoleUtilisateur[];
    necessiteAuth?: boolean;
    titre: string;
  }
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "accueil", component: () => import("../views/AccueilView.vue"), meta: { titre: "Accueil" } },
    { path: "/carte", name: "carte", component: () => import("../views/CarteView.vue"), meta: { titre: "Carte cadastrale" } },
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
      path: "/cession",
      name: "cession",
      component: () => import("../views/citoyen/CessionView.vue"),
      meta: { necessiteAuth: true, rolesAutorises: [RoleUtilisateur.CITOYEN], titre: "Ceder ou acquerir un terrain" },
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

  if (to.meta.rolesAutorises && (!auth.role || !to.meta.rolesAutorises.includes(auth.role))) {
    return { name: "accueil" };
  }

  return true;
});

router.afterEach((to) => {
  document.title = to.meta.titre ? `${to.meta.titre} — AYINON` : "AYINON";
});

export default router;
