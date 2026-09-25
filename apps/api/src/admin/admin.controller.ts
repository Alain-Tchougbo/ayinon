import { Body, Controller, Get, Param, Patch } from "@nestjs/common";
import {
  ModifierParcelleAdminSchema,
  RoleUtilisateur,
  TraiterDemandeProSchema,
  type ModifierParcelleAdminDto,
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
}
