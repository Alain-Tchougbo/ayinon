import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import {
  ProposerCessionSchema,
  RepondreCessionSchema,
  RoleUtilisateur,
  ValiderCessionSchema,
  type ProposerCessionDto,
  type RepondreCessionDto,
  type ValiderCessionDto,
} from "@ayinon/shared";
import { CurrentUser, type UtilisateurAuthentifie } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { CessionsService } from "./cessions.service";

@Controller("cessions")
export class CessionsController {
  constructor(private readonly cessions: CessionsService) {}

  @Roles(RoleUtilisateur.VENDEUR)
  @Post()
  async proposer(@Body(new ZodValidationPipe(ProposerCessionSchema)) dto: ProposerCessionDto, @CurrentUser() utilisateur: UtilisateurAuthentifie) {
    return this.cessions.proposer(dto, utilisateur);
  }

  @Roles(RoleUtilisateur.ACHETEUR)
  @Get("mes-propositions-recues")
  async mesPropositionsRecues(@CurrentUser() utilisateur: UtilisateurAuthentifie) {
    return this.cessions.mesPropositionsRecues(utilisateur.id);
  }

  @Roles(RoleUtilisateur.VENDEUR)
  @Get("mes-cessions-emises")
  async mesCessionsEmises(@CurrentUser() utilisateur: UtilisateurAuthentifie) {
    return this.cessions.mesCessionsEmises(utilisateur.id);
  }

  @Roles(RoleUtilisateur.ACHETEUR)
  @Get("mes-cessions-acquises")
  async mesCessionsAcquises(@CurrentUser() utilisateur: UtilisateurAuthentifie) {
    return this.cessions.mesCessionsAcquises(utilisateur.id);
  }

  /** E7.1 : coffre numerique — les titres reellement obtenus par cet acquereur, en un seul endroit. */
  @Roles(RoleUtilisateur.ACHETEUR, RoleUtilisateur.CITOYEN)
  @Get("mes-titres")
  async mesTitres(@CurrentUser() utilisateur: UtilisateurAuthentifie) {
    return this.cessions.mesTitres(utilisateur.id);
  }

  @Roles(RoleUtilisateur.AGENT_ANDF, RoleUtilisateur.ADMIN)
  @Get("a-valider")
  async aValider() {
    return this.cessions.aValider();
  }

  @Roles(RoleUtilisateur.VENDEUR, RoleUtilisateur.ACHETEUR, RoleUtilisateur.AGENT_ANDF, RoleUtilisateur.MAGISTRAT_CSAF, RoleUtilisateur.ADMIN)
  @Get(":id")
  async obtenirParId(@Param("id") id: string, @CurrentUser() utilisateur: UtilisateurAuthentifie) {
    return this.cessions.obtenirParId(id, utilisateur);
  }

  @Roles(RoleUtilisateur.ACHETEUR)
  @Patch(":id/repondre")
  async repondre(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(RepondreCessionSchema)) dto: RepondreCessionDto,
    @CurrentUser() utilisateur: UtilisateurAuthentifie,
  ) {
    return this.cessions.repondre(id, dto, utilisateur);
  }

  @Roles(RoleUtilisateur.AGENT_ANDF, RoleUtilisateur.ADMIN)
  @Patch(":id/valider")
  async valider(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(ValiderCessionSchema)) dto: ValiderCessionDto,
    @CurrentUser() utilisateur: UtilisateurAuthentifie,
  ) {
    return this.cessions.valider(id, dto, utilisateur);
  }
}
