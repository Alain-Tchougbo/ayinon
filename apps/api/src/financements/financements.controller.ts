import { Body, Controller, Get, Param, Patch, Post, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  DemanderFinancementSchema,
  RoleUtilisateur,
  TraiterFinancementSchema,
  type DemanderFinancementDto,
  type TraiterFinancementDto,
} from "@ayinon/shared";
import { CurrentUser, type UtilisateurAuthentifie } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { FinancementsService } from "./financements.service";

@Controller("financements")
export class FinancementsController {
  constructor(private readonly financements: FinancementsService) {}

  @Roles(RoleUtilisateur.ACHETEUR)
  @Post()
  @UseInterceptors(FileInterceptor("fichier"))
  async demander(
    @Body(new ZodValidationPipe(DemanderFinancementSchema)) dto: DemanderFinancementDto,
    @UploadedFile() fichier: Express.Multer.File | undefined,
    @CurrentUser() acheteur: UtilisateurAuthentifie,
  ) {
    return this.financements.demander(dto, fichier, acheteur);
  }

  @Roles(RoleUtilisateur.ACHETEUR)
  @Get("mes-demandes")
  async mesDemandes(@CurrentUser() acheteur: UtilisateurAuthentifie) {
    return this.financements.mesDemandes(acheteur.id);
  }

  @Roles(RoleUtilisateur.AGENT_BANQUE, RoleUtilisateur.ADMIN)
  @Get("a-traiter")
  async demandesATraiter() {
    return this.financements.demandesATraiter();
  }

  /** E4.8 : verification publique d'une attestation via son code, sans authentification. */
  @Public()
  @Get("verifier/:code")
  async verifierCode(@Param("code") code: string) {
    return this.financements.verifierCode(code);
  }

  @Roles(RoleUtilisateur.AGENT_BANQUE, RoleUtilisateur.ADMIN)
  @Get(":id")
  async obtenirParId(@Param("id") id: string, @CurrentUser() agent: UtilisateurAuthentifie) {
    return this.financements.obtenirParId(id, agent);
  }

  @Roles(RoleUtilisateur.AGENT_BANQUE, RoleUtilisateur.ADMIN)
  @Patch(":id/traiter")
  async traiter(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(TraiterFinancementSchema)) dto: TraiterFinancementDto,
    @CurrentUser() agent: UtilisateurAuthentifie,
  ) {
    return this.financements.traiter(id, dto, agent);
  }
}
