import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import {
  CreerAnnonceSchema,
  ManifesterInteretSchema,
  RetenirInteretSchema,
  RoleUtilisateur,
  VerifierAnnonceSchema,
  type CreerAnnonceDto,
  type ManifesterInteretDto,
  type RetenirInteretDto,
  type VerifierAnnonceDto,
} from "@ayinon/shared";
import { CurrentUser, type UtilisateurAuthentifie } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { AnnoncesService } from "./annonces.service";

@Controller("annonces")
export class AnnoncesController {
  constructor(private readonly annonces: AnnoncesService) {}

  @Public()
  @Get()
  async listerActives() {
    return this.annonces.listerActives();
  }

  @Public()
  @Get("estimation-prix")
  async estimerPrix(@Query("commune") commune: string) {
    return this.annonces.estimerPrix(commune);
  }

  @Roles(RoleUtilisateur.VENDEUR)
  @Get("mes-annonces")
  async mesAnnonces(@CurrentUser() utilisateur: UtilisateurAuthentifie) {
    return this.annonces.mesAnnonces(utilisateur.id);
  }

  @Roles(RoleUtilisateur.ACHETEUR)
  @Get("mes-interets")
  async mesInterets(@CurrentUser() utilisateur: UtilisateurAuthentifie) {
    return this.annonces.mesInterets(utilisateur.id);
  }

  @Public()
  @Get(":id")
  async obtenirParId(@Param("id") id: string) {
    return this.annonces.obtenirParId(id);
  }

  @Roles(RoleUtilisateur.VENDEUR)
  @Post()
  async creer(@Body(new ZodValidationPipe(CreerAnnonceSchema)) dto: CreerAnnonceDto, @CurrentUser() utilisateur: UtilisateurAuthentifie) {
    return this.annonces.creer(dto, utilisateur);
  }

  @Roles(RoleUtilisateur.VENDEUR)
  @Patch(":id/retirer")
  async retirer(@Param("id") id: string, @CurrentUser() utilisateur: UtilisateurAuthentifie) {
    return this.annonces.retirer(id, utilisateur);
  }

  @Roles(RoleUtilisateur.ACHETEUR)
  @Post(":id/interet")
  async manifesterInteret(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(ManifesterInteretSchema)) dto: ManifesterInteretDto,
    @CurrentUser() utilisateur: UtilisateurAuthentifie,
  ) {
    return this.annonces.manifesterInteret(id, dto, utilisateur);
  }

  @Roles(RoleUtilisateur.VENDEUR)
  @Patch(":id/interets/:interetId/retenir")
  async retenirInteret(
    @Param("id") id: string,
    @Param("interetId") interetId: string,
    @Body(new ZodValidationPipe(RetenirInteretSchema)) dto: RetenirInteretDto,
    @CurrentUser() utilisateur: UtilisateurAuthentifie,
  ) {
    return this.annonces.retenirInteret(id, interetId, dto, utilisateur);
  }

  @Roles(RoleUtilisateur.AGENT_ANDF, RoleUtilisateur.ADMIN)
  @Patch(":id/verifier")
  async verifierParAndf(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(VerifierAnnonceSchema)) dto: VerifierAnnonceDto,
    @CurrentUser() utilisateur: UtilisateurAuthentifie,
  ) {
    return this.annonces.verifierParAndf(id, dto, utilisateur);
  }
}
