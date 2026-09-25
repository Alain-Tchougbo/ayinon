import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { DeclarerSequestreSchema, RoleUtilisateur, type DeclarerSequestreDto } from "@ayinon/shared";
import { CurrentUser, type UtilisateurAuthentifie } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { SequestresService } from "./sequestres.service";

@Controller("sequestres")
export class SequestresController {
  constructor(private readonly sequestres: SequestresService) {}

  @Roles(RoleUtilisateur.ACHETEUR)
  @Post()
  async declarer(@Body(new ZodValidationPipe(DeclarerSequestreSchema)) dto: DeclarerSequestreDto, @CurrentUser() utilisateur: UtilisateurAuthentifie) {
    return this.sequestres.declarer(dto, utilisateur);
  }

  @Roles(RoleUtilisateur.ACHETEUR)
  @Get("mes-sequestres")
  async mesSequestres(@CurrentUser() utilisateur: UtilisateurAuthentifie) {
    return this.sequestres.mesSequestres(utilisateur.id);
  }

  @Roles(RoleUtilisateur.AGENT_BANQUE, RoleUtilisateur.ADMIN)
  @Get("a-confirmer")
  async aConfirmer() {
    return this.sequestres.aConfirmer();
  }

  @Roles(RoleUtilisateur.AGENT_BANQUE, RoleUtilisateur.ADMIN)
  @Patch(":id/confirmer")
  async confirmer(@Param("id") id: string, @CurrentUser() utilisateur: UtilisateurAuthentifie) {
    return this.sequestres.confirmer(id, utilisateur);
  }
}
