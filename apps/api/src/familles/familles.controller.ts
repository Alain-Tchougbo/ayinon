import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import {
  DeposerOppositionSchema,
  OuvrirMultiSignatureSchema,
  RoleUtilisateur,
  SignerMandatSchema,
  type DeposerOppositionDto,
  type OuvrirMultiSignatureDto,
  type SignerMandatDto,
} from "@ayinon/shared";
import { CurrentUser, type UtilisateurAuthentifie } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { FamillesService } from "./familles.service";

@Controller("familles")
export class FamillesController {
  constructor(private readonly familles: FamillesService) {}

  @Roles(RoleUtilisateur.CITOYEN, RoleUtilisateur.MANDATAIRE_FAMILIAL, RoleUtilisateur.AGENT_ANDF, RoleUtilisateur.ADMIN)
  @Post("multi-signature")
  async ouvrirMultiSignature(
    @Body(new ZodValidationPipe(OuvrirMultiSignatureSchema)) dto: OuvrirMultiSignatureDto,
    @CurrentUser() utilisateur: UtilisateurAuthentifie,
  ) {
    return this.familles.ouvrirMultiSignature(dto, utilisateur);
  }

  @Roles(RoleUtilisateur.MANDATAIRE_FAMILIAL)
  @Post("otp-signature")
  async demanderOtp(@CurrentUser() utilisateur: UtilisateurAuthentifie) {
    return this.familles.demanderOtpSignature(utilisateur);
  }

  @Roles(RoleUtilisateur.MANDATAIRE_FAMILIAL)
  @Post("signer")
  async signer(
    @Body(new ZodValidationPipe(SignerMandatSchema)) dto: SignerMandatDto,
    @CurrentUser() utilisateur: UtilisateurAuthentifie,
  ) {
    return this.familles.signerMandat(dto, utilisateur);
  }

  /** Public : un voisin non enregistre doit pouvoir s'opposer pendant l'affichage de ban. */
  @Public()
  @Post("oppositions")
  async deposerOpposition(@Body(new ZodValidationPipe(DeposerOppositionSchema)) dto: DeposerOppositionDto) {
    return this.familles.deposerOpposition(dto);
  }

  @Roles(RoleUtilisateur.AGENT_ANDF, RoleUtilisateur.ADMIN)
  @Patch("bans/:id/cloturer")
  async cloturerBan(@Param("id") id: string) {
    return this.familles.cloturerBan(id);
  }

  @Get("parcelles/:id/etat")
  async obtenirEtat(@Param("id") id: string) {
    return this.familles.obtenirEtatParcelle(id);
  }
}
