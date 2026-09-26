import { Module } from "@nestjs/common";
import { CryptoAuditModule } from "../crypto-audit/crypto-audit.module";
import { AvisController } from "./avis.controller";
import { AvisService } from "./avis.service";

@Module({
  imports: [CryptoAuditModule],
  controllers: [AvisController],
  providers: [AvisService],
})
export class AvisModule {}
