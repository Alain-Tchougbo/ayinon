import { Body, Controller, Get, Post } from "@nestjs/common";
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

  @Roles(RoleUtilisateur.MAGISTRAT_CSAF)
  @Post("levee")
  async leverGel(
    @Body(new ZodValidationPipe(LeveeGelSchema)) dto: LeveeGelDto,
    @CurrentUser() magistrat: UtilisateurAuthentifie,
  ) {
    return this.csaf.leverGel(dto, magistrat);
  }

  @Roles(RoleUtilisateur.MAGISTRAT_CSAF, RoleUtilisateur.AGENT_ANDF, RoleUtilisateur.ADMIN)
  @Get("conflits-actifs")
  async listerConflitsActifs() {
    return this.csaf.listerConflitsActifs();
  }
}
