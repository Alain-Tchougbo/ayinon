import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { CreationBatiSchema, RoleUtilisateur, ValidationBatiSchema, type CreationBatiDto, type ValidationBatiDto } from "@ayinon/shared";
import { CurrentUser, type UtilisateurAuthentifie } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { BatisService } from "./batis.service";

const ROLES_VALIDATION_BATI = [RoleUtilisateur.GEOMETRE, RoleUtilisateur.AGENT_ANDF, RoleUtilisateur.ADMIN];

@Controller("batis")
export class BatisController {
  constructor(private readonly batis: BatisService) {}

  @Public()
  @Get("a-valider")
  async listerAValider() {
    return this.batis.listerAValider();
  }

  @Public()
  @Get()
  async listerToutes() {
    return this.batis.listerToutes();
  }

  @Public()
  @Get("parcelle/:parcelleId")
  async listerParParcelle(@Param("parcelleId") parcelleId: string) {
    return this.batis.listerParParcelle(parcelleId);
  }

  @Roles(...ROLES_VALIDATION_BATI)
  @Post()
  async creer(@Body(new ZodValidationPipe(CreationBatiSchema)) dto: CreationBatiDto, @CurrentUser() utilisateur: UtilisateurAuthentifie) {
    return this.batis.creer(dto, utilisateur);
  }

  @Roles(...ROLES_VALIDATION_BATI)
  @Patch(":id/valider")
  async valider(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(ValidationBatiSchema)) dto: ValidationBatiDto,
    @CurrentUser() utilisateur: UtilisateurAuthentifie,
  ) {
    return this.batis.valider(id, dto, utilisateur);
  }

  @Roles(...ROLES_VALIDATION_BATI)
  @Delete(":id")
  async rejeter(@Param("id") id: string, @CurrentUser() utilisateur: UtilisateurAuthentifie) {
    await this.batis.rejeter(id, utilisateur);
    return { message: "Bati rejete" };
  }
}
