import { Module } from "@nestjs/common";
import { CryptoAuditModule } from "../crypto-audit/crypto-audit.module";
import { CsafModule } from "../csaf/csaf.module";
import { OtpModule } from "../otp/otp.module";
import { FamillesController } from "./familles.controller";
import { FamillesService } from "./familles.service";

@Module({
  imports: [CryptoAuditModule, OtpModule, CsafModule],
  controllers: [FamillesController],
  providers: [FamillesService],
  exports: [FamillesService],
})
export class FamillesModule {}
