import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import {
  DemandeVerrouParcelleSchema,
  RechercheParcelleSchema,
  RoleUtilisateur,
  SimulationFraisSchema,
  type DemandeVerrouParcelleDto,
  type RechercheParcelleDto,
  type SimulationFraisDto,
} from "@ayinon/shared";
import { CurrentUser, type UtilisateurAuthentifie } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { ParcellesService } from "./parcelles.service";

@Controller("parcelles")
export class ParcellesController {
  constructor(private readonly parcelles: ParcellesService) {}

  @Public()
  @Get()
  async listerToutes() {
    return this.parcelles.listerToutes();
  }

  @Public()
  @Post("recherche")
  async rechercher(@Body(new ZodValidationPipe(RechercheParcelleSchema)) dto: RechercheParcelleDto) {
    return this.parcelles.rechercher(dto);
  }

  @Public()
  @Post("simuler-frais")
  async simulerFrais(@Body(new ZodValidationPipe(SimulationFraisSchema)) dto: SimulationFraisDto) {
    return this.parcelles.simulerFrais(dto);
  }

  @Public()
  @Get(":id")
  async obtenirParId(@Param("id") id: string) {
    return this.parcelles.obtenirParId(id);
  }

  @Roles(RoleUtilisateur.CITOYEN, RoleUtilisateur.VENDEUR)
  @Post("otp-verrou")
  async demanderOtpVerrou(@CurrentUser() utilisateur: UtilisateurAuthentifie) {
    return this.parcelles.demanderOtpVerrou(utilisateur);
  }

  @Roles(RoleUtilisateur.CITOYEN, RoleUtilisateur.VENDEUR)
  @Post("verrou")
  async definirVerrou(
    @Body(new ZodValidationPipe(DemandeVerrouParcelleSchema)) dto: DemandeVerrouParcelleDto,
    @CurrentUser() utilisateur: UtilisateurAuthentifie,
  ) {
    return this.parcelles.definirVerrouAntiVente(dto.parcelleId, dto.verrouille, dto.codeOtp, utilisateur);
  }
}
