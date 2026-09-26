import { Module } from "@nestjs/common";
import { CryptoAuditModule } from "../crypto-audit/crypto-audit.module";
import { CsafModule } from "../csaf/csaf.module";
import { AnnoncesController } from "./annonces.controller";
import { AnnoncesService } from "./annonces.service";

@Module({
  imports: [CryptoAuditModule, CsafModule],
  controllers: [AnnoncesController],
  providers: [AnnoncesService],
})
export class AnnoncesModule {}
