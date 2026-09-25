import { Body, Controller, Get, Param, Patch } from "@nestjs/common";
import {
  ModifierParcelleAdminSchema,
  RoleUtilisateur,
  SuspendreAnnonceSchema,
  TraiterDemandeProSchema,
  type ModifierParcelleAdminDto,
  type SuspendreAnnonceDto,
  type TraiterDemandeProDto,
} from "@ayinon/shared";
import { CurrentUser, type UtilisateurAuthentifie } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { AdminService } from "./admin.service";

@Controller("admin")
@Roles(RoleUtilisateur.ADMIN)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get("vue-ensemble")
  async vueEnsemble() {
    return this.admin.vueEnsemble();
  }

  @Get("utilisateurs")
  async listerUtilisateurs() {
    return this.admin.listerUtilisateurs();
  }

  /** E3.9 : comptes partageant le meme numero de telephone, a revoir manuellement. */
  @Get("comptes-lies")
  async comptesLies() {
    return this.admin.comptesLiesParTelephone();
  }

  @Get("proprietaires")
  async listerProprietaires() {
    return this.admin.listerProprietaires();
  }

  @Get("documents")
  async listerDocuments() {
    return this.admin.listerDocuments();
  }

  @Get("parcelles")
  async listerParcelles() {
    return this.admin.listerParcelles();
  }

  @Patch("parcelles/:id")
  async modifierParcelle(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(ModifierParcelleAdminSchema)) dto: ModifierParcelleAdminDto,
    @CurrentUser() utilisateur: UtilisateurAuthentifie,
  ) {
    return this.admin.modifierParcelle(id, dto, utilisateur);
  }

  /** E0.6 : file d'attente des demandes de compte professionnel. */
  @Get("demandes-professionnelles")
  async demandesProfessionnelles() {
    return this.admin.demandesProfessionnellesEnAttente();
  }

  @Patch("demandes-professionnelles/:id")
  async traiterDemandePro(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(TraiterDemandeProSchema)) dto: TraiterDemandeProDto,
    @CurrentUser() utilisateur: UtilisateurAuthentifie,
  ) {
    return this.admin.traiterDemandePro(id, dto, utilisateur);
  }

  /** E1.14 : detection automatique d'annonces a risque (prix aberrant par rapport a la moyenne
   * communale reelle). */
  @Get("annonces-a-risque")
  async annoncesARisque() {
    return this.admin.annoncesARisque();
  }

  @Patch("annonces/:id/suspendre")
  async suspendreAnnonce(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(SuspendreAnnonceSchema)) dto: SuspendreAnnonceDto,
    @CurrentUser() utilisateur: UtilisateurAuthentifie,
  ) {
    return this.admin.suspendreAnnonce(id, dto, utilisateur);
  }
}
