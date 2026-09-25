import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { RoleUtilisateur, SauvegarderRechercheSchema, type SauvegarderRechercheDto } from "@ayinon/shared";
import { CurrentUser, type UtilisateurAuthentifie } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { RecherchesSauvegardeesService } from "./recherches-sauvegardees.service";

@Controller("recherches-sauvegardees")
@Roles(RoleUtilisateur.ACHETEUR)
export class RecherchesSauvegardeesController {
  constructor(private readonly recherches: RecherchesSauvegardeesService) {}

  @Post()
  async sauvegarder(@Body(new ZodValidationPipe(SauvegarderRechercheSchema)) dto: SauvegarderRechercheDto, @CurrentUser() acheteur: UtilisateurAuthentifie) {
    return this.recherches.sauvegarder(dto, acheteur);
  }

  @Get()
  async mesRecherches(@CurrentUser() acheteur: UtilisateurAuthentifie) {
    return this.recherches.mesRecherches(acheteur.id);
  }

  @Patch(":id/consulter")
  async consulter(@Param("id") id: string, @CurrentUser() acheteur: UtilisateurAuthentifie) {
    return this.recherches.consulter(id, acheteur);
  }

  @Delete(":id")
  async supprimer(@Param("id") id: string, @CurrentUser() acheteur: UtilisateurAuthentifie) {
    await this.recherches.supprimer(id, acheteur);
    return { supprime: true };
  }
}
