import { Controller, Get } from "@nestjs/common";
import { RoleUtilisateur } from "@ayinon/shared";
import { Roles } from "../common/decorators/roles.decorator";
import { NotaireService } from "./notaire.service";

@Controller("notaire")
@Roles(RoleUtilisateur.NOTAIRE, RoleUtilisateur.ADMIN)
export class NotaireController {
  constructor(private readonly notaire: NotaireService) {}

  @Get("documents")
  async listerDocuments() {
    return this.notaire.listerDocuments();
  }
}
