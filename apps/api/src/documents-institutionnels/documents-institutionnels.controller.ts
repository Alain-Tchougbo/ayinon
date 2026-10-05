import { Body, Controller, Get, Param, Patch, Post, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  RoleUtilisateur,
  SceellerDocumentInstitutionnelSchema,
  VerifierDocumentInstitutionnelSchema,
  type SceellerDocumentInstitutionnelDto,
  type VerifierDocumentInstitutionnelDto,
} from "@ayinon/shared";
import { CurrentUser, type UtilisateurAuthentifie } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { DocumentsInstitutionnelsService } from "./documents-institutionnels.service";

const ROLES_EMETTEURS = [RoleUtilisateur.AGENT_ANDF, RoleUtilisateur.MAGISTRAT_CSAF, RoleUtilisateur.NOTAIRE, RoleUtilisateur.ADMIN];

@Controller("documents-institutionnels")
export class DocumentsInstitutionnelsController {
  constructor(private readonly documents: DocumentsInstitutionnelsService) {}

  @Roles(...ROLES_EMETTEURS)
  @Post()
  @UseInterceptors(FileInterceptor("fichier"))
  async sceller(
    @Body(new ZodValidationPipe(SceellerDocumentInstitutionnelSchema)) dto: SceellerDocumentInstitutionnelDto,
    @UploadedFile() fichier: Express.Multer.File | undefined,
    @CurrentUser() utilisateur: UtilisateurAuthentifie,
  ) {
    return this.documents.sceller(dto, fichier, utilisateur);
  }

  /** Public : verification Scanner Anti-Fraude, sans authentification (meme principe que les conventions). */
  @Public()
  @Post("verifier")
  async verifier(@Body(new ZodValidationPipe(VerifierDocumentInstitutionnelSchema)) dto: VerifierDocumentInstitutionnelDto) {
    return this.documents.verifier(dto);
  }

  @Roles(...ROLES_EMETTEURS)
  @Get()
  async lister() {
    return this.documents.lister();
  }

  @Roles(...ROLES_EMETTEURS)
  @Get(":id/qr")
  async obtenirQrCode(@Param("id") id: string) {
    return this.documents.obtenirQrCode(id);
  }

  @Roles(...ROLES_EMETTEURS)
  @Patch(":id/invalider")
  async invalider(@Param("id") id: string, @CurrentUser() utilisateur: UtilisateurAuthentifie) {
    return this.documents.invalider(id, utilisateur);
  }
}
