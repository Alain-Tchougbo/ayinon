import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import {
  DeposerSignalementSchema,
  QualifierSignalementSchema,
  RoleUtilisateur,
  StatutSignalement,
  type DeposerSignalementDto,
  type QualifierSignalementDto,
} from "@ayinon/shared";
import { CurrentUser, type UtilisateurAuthentifie } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { SignalementsService } from "./signalements.service";

const ROLES_SIGNALANTS = [
  RoleUtilisateur.CITOYEN,
  RoleUtilisateur.VENDEUR,
  RoleUtilisateur.ACHETEUR,
  RoleUtilisateur.MANDATAIRE_FAMILIAL,
];

@Controller("signalements")
export class SignalementsController {
  constructor(private readonly signalements: SignalementsService) {}

  @Roles(...ROLES_SIGNALANTS)
  @Post()
  async deposer(
    @Body(new ZodValidationPipe(DeposerSignalementSchema)) dto: DeposerSignalementDto,
    @CurrentUser() utilisateur: UtilisateurAuthentifie,
  ) {
    return this.signalements.deposer(dto, utilisateur);
  }

  @Roles(...ROLES_SIGNALANTS)
  @Get("mes-signalements")
  async mesSignalements(@CurrentUser() utilisateur: UtilisateurAuthentifie) {
    return this.signalements.mesSignalements(utilisateur.id);
  }

  @Roles(RoleUtilisateur.MAGISTRAT_CSAF, RoleUtilisateur.AGENT_ANDF, RoleUtilisateur.ADMIN)
  @Get("litiges-fondes")
  async litigesFondes() {
    return this.signalements.litigesFondes();
  }

  @Roles(RoleUtilisateur.ADMIN)
  @Get()
  async lister(@Query("statut") statut?: StatutSignalement) {
    return this.signalements.lister(statut);
  }

  @Roles(RoleUtilisateur.ADMIN)
  @Patch(":id/qualifier")
  async qualifier(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(QualifierSignalementSchema)) dto: QualifierSignalementDto,
    @CurrentUser() admin: UtilisateurAuthentifie,
  ) {
    return this.signalements.qualifier(id, dto, admin);
  }
}
