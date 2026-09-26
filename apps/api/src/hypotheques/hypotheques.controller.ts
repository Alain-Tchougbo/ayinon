import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import {
  InscrireHypothequeSchema,
  LeverHypothequeSchema,
  RoleUtilisateur,
  VerifierSolvabiliteSchema,
  type InscrireHypothequeDto,
  type LeverHypothequeDto,
  type VerifierSolvabiliteDto,
} from "@ayinon/shared";
import { CurrentUser, type UtilisateurAuthentifie } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { HypothequesService } from "./hypotheques.service";

@Controller("hypotheques")
@Roles(RoleUtilisateur.AGENT_BANQUE, RoleUtilisateur.ADMIN)
export class HypothequesController {
  constructor(private readonly hypotheques: HypothequesService) {}

  @Post("verifier-solvabilite")
  async verifierSolvabilite(@Body(new ZodValidationPipe(VerifierSolvabiliteSchema)) dto: VerifierSolvabiliteDto) {
    return this.hypotheques.verifierSolvabilite(dto.nup);
  }

  @Post()
  async inscrire(@Body(new ZodValidationPipe(InscrireHypothequeSchema)) dto: InscrireHypothequeDto, @CurrentUser() utilisateur: UtilisateurAuthentifie) {
    return this.hypotheques.inscrire(dto, utilisateur);
  }

  @Get("mes-inscriptions")
  async mesInscriptions(@CurrentUser() utilisateur: UtilisateurAuthentifie) {
    return this.hypotheques.mesInscriptions(utilisateur.id);
  }

  @Patch(":id/lever")
  async lever(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(LeverHypothequeSchema)) dto: LeverHypothequeDto,
    @CurrentUser() utilisateur: UtilisateurAuthentifie,
  ) {
    return this.hypotheques.lever(id, dto, utilisateur);
  }
}
