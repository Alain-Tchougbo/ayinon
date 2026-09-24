import { Body, Controller, Param, Patch, Post, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  EnregistrerConventionSchema,
  RoleUtilisateur,
  VerifierConventionSchema,
  type EnregistrerConventionDto,
  type VerifierConventionDto,
} from "@ayinon/shared";
import { CurrentUser, type UtilisateurAuthentifie } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { ConventionsService } from "./conventions.service";

@Controller("conventions")
export class ConventionsController {
  constructor(private readonly conventions: ConventionsService) {}

  @Roles(RoleUtilisateur.CITOYEN, RoleUtilisateur.NOTAIRE, RoleUtilisateur.ADMIN)
  @Post()
  @UseInterceptors(FileInterceptor("fichier"))
  async enregistrer(
    @Body(new ZodValidationPipe(EnregistrerConventionSchema)) dto: EnregistrerConventionDto,
    @UploadedFile() fichier: Express.Multer.File | undefined,
    @CurrentUser() utilisateur: UtilisateurAuthentifie,
  ) {
    return this.conventions.enregistrer(dto, fichier, utilisateur);
  }

  /** Public : un citoyen peut verifier une convention scannee sans etre connecte. */
  @Public()
  @Post("verifier")
  async verifier(@Body(new ZodValidationPipe(VerifierConventionSchema)) dto: VerifierConventionDto) {
    return this.conventions.verifier(dto);
  }

  @Roles(RoleUtilisateur.NOTAIRE, RoleUtilisateur.ADMIN, RoleUtilisateur.MAGISTRAT_CSAF)
  @Patch(":id/invalider")
  async invalider(@Param("id") id: string) {
    return this.conventions.invalider(id);
  }
}
