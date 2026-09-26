import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { DemanderVisiteSchema, RepondreVisiteSchema, RoleUtilisateur, type DemanderVisiteDto, type RepondreVisiteDto } from "@ayinon/shared";
import { CurrentUser, type UtilisateurAuthentifie } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { VisitesService } from "./visites.service";

@Controller("visites")
export class VisitesController {
  constructor(private readonly visites: VisitesService) {}

  @Roles(RoleUtilisateur.ACHETEUR)
  @Post("annonces/:annonceId")
  async demander(
    @Param("annonceId") annonceId: string,
    @Body(new ZodValidationPipe(DemanderVisiteSchema)) dto: DemanderVisiteDto,
    @CurrentUser() utilisateur: UtilisateurAuthentifie,
  ) {
    return this.visites.demander(annonceId, dto, utilisateur);
  }

  @Roles(RoleUtilisateur.ACHETEUR)
  @Get("mes-demandes")
  async mesVisitesDemandees(@CurrentUser() utilisateur: UtilisateurAuthentifie) {
    return this.visites.mesVisitesDemandees(utilisateur.id);
  }

  @Roles(RoleUtilisateur.VENDEUR)
  @Get("recues")
  async visitesRecues(@CurrentUser() utilisateur: UtilisateurAuthentifie) {
    return this.visites.visitesRecues(utilisateur.id);
  }

  @Roles(RoleUtilisateur.VENDEUR, RoleUtilisateur.ACHETEUR)
  @Patch(":id/repondre")
  async repondre(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(RepondreVisiteSchema)) dto: RepondreVisiteDto,
    @CurrentUser() utilisateur: UtilisateurAuthentifie,
  ) {
    return this.visites.repondre(id, dto, utilisateur);
  }
}
