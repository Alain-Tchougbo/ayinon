import { Module } from "@nestjs/common";
import { CryptoAuditModule } from "../crypto-audit/crypto-audit.module";
import { VisitesController } from "./visites.controller";
import { VisitesService } from "./visites.service";

@Module({
  imports: [CryptoAuditModule],
  controllers: [VisitesController],
  providers: [VisitesService],
})
export class VisitesModule {}
