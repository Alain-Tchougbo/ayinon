import { Module } from "@nestjs/common";
import { CryptoAuditModule } from "../crypto-audit/crypto-audit.module";
import { FinancementsController } from "./financements.controller";
import { FinancementsService } from "./financements.service";

@Module({
  imports: [CryptoAuditModule],
  controllers: [FinancementsController],
  providers: [FinancementsService],
})
export class FinancementsModule {}
