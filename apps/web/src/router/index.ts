import { RoleUtilisateur } from "@ayinon/shared";
import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth.store";

declare module "vue-router" {
  interface RouteMeta {
    rolesAutorises?: RoleUtilisateur[];
    necessiteAuth?: boolean;
  }
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "accueil", component: () => import("../views/AccueilView.vue") },
    { path: "/carte", name: "carte", component: () => import("../views/CarteView.vue") },
    { path: "/scanner", name: "scanner", component: () => import("../views/citoyen/ScannerView.vue") },
    { path: "/simulateur-frais", name: "simulateur", component: () => import("../views/citoyen/SimulateurFraisView.vue") },
    { path: "/connexion", name: "connexion", component: () => import("../views/auth/LoginView.vue") },
    {
      path: "/passeport-foncier",
      name: "passeport-foncier",
      component: () => import("../views/citoyen/PasseportFoncierView.vue"),
      meta: { necessiteAuth: true, rolesAutorises: [RoleUtilisateur.CITOYEN] },
    },
    {
      path: "/geometre",
      name: "geometre",
      component: () => import("../views/geometre/ImportTopoView.vue"),
      meta: { necessiteAuth: true, rolesAutorises: [RoleUtilisateur.GEOMETRE] },
    },
    {
      path: "/famille",
      name: "famille",
      component: () => import("../views/famille/MultiSignatureView.vue"),
      meta: {
        necessiteAuth: true,
        rolesAutorises: [RoleUtilisateur.CITOYEN, RoleUtilisateur.MANDATAIRE_FAMILIAL, RoleUtilisateur.AGENT_ANDF, RoleUtilisateur.ADMIN],
      },
    },
    {
      path: "/andf",
      name: "andf",
      component: () => import("../views/andf/ConsolePolesView.vue"),
      meta: { necessiteAuth: true, rolesAutorises: [RoleUtilisateur.AGENT_ANDF, RoleUtilisateur.MAGISTRAT_CSAF, RoleUtilisateur.ADMIN] },
    },
    {
      path: "/csaf",
      name: "csaf",
      component: () => import("../views/andf/GelCsafView.vue"),
      meta: { necessiteAuth: true, rolesAutorises: [RoleUtilisateur.MAGISTRAT_CSAF] },
    },
    { path: "/:pathMatch(.*)*", name: "introuvable", component: () => import("../views/IntrouvableView.vue") },
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

export default router;
