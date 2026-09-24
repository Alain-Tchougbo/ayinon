import { Controller, Get } from "@nestjs/common";
import { RoleUtilisateur } from "@ayinon/shared";
import { Roles } from "../common/decorators/roles.decorator";
import { AndfService } from "./andf.service";

@Controller("andf")
export class AndfController {
  constructor(private readonly andf: AndfService) {}

  @Roles(RoleUtilisateur.AGENT_ANDF, RoleUtilisateur.MAGISTRAT_CSAF, RoleUtilisateur.ADMIN)
  @Get("statistiques-poles")
  async statistiquesParPole() {
    return this.andf.statistiquesParPole();
  }
}
