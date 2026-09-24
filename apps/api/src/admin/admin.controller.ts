import { Body, Controller, Get, Param, Patch } from "@nestjs/common";
import { ModifierParcelleAdminSchema, RoleUtilisateur, type ModifierParcelleAdminDto } from "@ayinon/shared";
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
}
