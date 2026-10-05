import { Controller, Get, Param } from "@nestjs/common";
import { RoleUtilisateur } from "@ayinon/shared";
import { Public } from "../common/decorators/public.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { CryptoAuditService } from "./crypto-audit.service";

@Controller("audit")
export class CryptoAuditController {
  constructor(private readonly cryptoAudit: CryptoAuditService) {}

  /** Verification globale d'integrite du registre — reserve aux acteurs regaliens. */
  @Get("integrite")
  @Roles(RoleUtilisateur.ADMIN, RoleUtilisateur.AGENT_ANDF, RoleUtilisateur.MAGISTRAT_CSAF)
  async verifierIntegrite() {
    return this.cryptoAudit.verifierIntegriteRegistre();
  }

  @Get("cle-publique")
  @Public()
  clePublique() {
    return { clePubliquePem: this.cryptoAudit.clePubliqueRegistre };
  }

  /** Dossier de preuves numerique : historique chronologique complet d'une parcelle pour instruire
   * un dossier judiciaire ou dresser un acte (NOTAIRE : voir l'historique avant de sceller une
   * convention, meme besoin que E6.7). */
  @Get("parcelles/:id/historique")
  @Roles(RoleUtilisateur.ADMIN, RoleUtilisateur.AGENT_ANDF, RoleUtilisateur.MAGISTRAT_CSAF, RoleUtilisateur.NOTAIRE)
  async historiqueParcelle(@Param("id") id: string) {
    return this.cryptoAudit.historiqueParcelle(id);
  }
}
