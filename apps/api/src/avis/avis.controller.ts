import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { DeposerAvisSchema, RoleUtilisateur, type DeposerAvisDto } from "@ayinon/shared";
import { CurrentUser, type UtilisateurAuthentifie } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { AvisService } from "./avis.service";

@Controller("avis")
export class AvisController {
  constructor(private readonly avis: AvisService) {}

  @Roles(RoleUtilisateur.VENDEUR, RoleUtilisateur.ACHETEUR)
  @Post()
  async deposer(@Body(new ZodValidationPipe(DeposerAvisSchema)) dto: DeposerAvisDto, @CurrentUser() utilisateur: UtilisateurAuthentifie) {
    return this.avis.deposer(dto, utilisateur);
  }

  @Public()
  @Get("profil/:utilisateurId")
  async profil(@Param("utilisateurId") utilisateurId: string) {
    return this.avis.profil(utilisateurId);
  }
}
