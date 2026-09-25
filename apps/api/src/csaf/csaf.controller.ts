import { Body, Controller, Get, Post, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { GelConservatoireSchema, LeveeGelSchema, RoleUtilisateur, type GelConservatoireDto, type LeveeGelDto } from "@ayinon/shared";
import { CurrentUser, type UtilisateurAuthentifie } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { CsafService } from "./csaf.service";

@Controller("csaf")
export class CsafController {
  constructor(private readonly csaf: CsafService) {}

  @Roles(RoleUtilisateur.MAGISTRAT_CSAF)
  @Post("gel")
  async gelerParcelle(
    @Body(new ZodValidationPipe(GelConservatoireSchema)) dto: GelConservatoireDto,
    @CurrentUser() magistrat: UtilisateurAuthentifie,
  ) {
    return this.csaf.gelerParcelle(dto, magistrat);
  }

  /** E8.8 : la decision definitive (document televerse en option) porte les effets appliques. */
  @Roles(RoleUtilisateur.MAGISTRAT_CSAF)
  @Post("levee")
  @UseInterceptors(FileInterceptor("fichierDecision"))
  async leverGel(
    @Body(new ZodValidationPipe(LeveeGelSchema)) dto: LeveeGelDto,
    @UploadedFile() fichierDecision: Express.Multer.File | undefined,
    @CurrentUser() magistrat: UtilisateurAuthentifie,
  ) {
    return this.csaf.leverGel(dto, fichierDecision, magistrat);
  }

  @Roles(RoleUtilisateur.MAGISTRAT_CSAF, RoleUtilisateur.AGENT_ANDF, RoleUtilisateur.ADMIN)
  @Get("conflits-actifs")
  async listerConflitsActifs() {
    return this.csaf.listerConflitsActifs();
  }
}
