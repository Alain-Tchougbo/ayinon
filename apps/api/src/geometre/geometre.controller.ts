import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import {
  ImportBornageSchema,
  RoleUtilisateur,
  SignaturePlanBornageSchema,
  type ImportBornageDto,
  type SignaturePlanBornageDto,
} from "@ayinon/shared";
import { CurrentUser, type UtilisateurAuthentifie } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { GeometreService } from "./geometre.service";

@Controller("geometre")
export class GeometreController {
  constructor(private readonly geometre: GeometreService) {}

  @Roles(RoleUtilisateur.GEOMETRE)
  @Post("bornage")
  async importerBornage(@Body(new ZodValidationPipe(ImportBornageSchema)) dto: ImportBornageDto) {
    return this.geometre.importerBornage(dto);
  }

  @Roles(RoleUtilisateur.GEOMETRE)
  @Post("bornage/signer")
  async signerPlan(
    @Body(new ZodValidationPipe(SignaturePlanBornageSchema)) dto: SignaturePlanBornageDto,
    @CurrentUser() utilisateur: UtilisateurAuthentifie,
  ) {
    return this.geometre.signerPlan(dto, utilisateur);
  }

  @Get("parcelles/:id/bornage")
  async listerParParcelle(@Param("id") id: string) {
    return this.geometre.listerParParcelle(id);
  }
}
