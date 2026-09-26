import { Module } from "@nestjs/common";
import { CryptoAuditModule } from "../crypto-audit/crypto-audit.module";
import { HypothequesController } from "./hypotheques.controller";
import { HypothequesService } from "./hypotheques.service";

@Module({
  imports: [CryptoAuditModule],
  controllers: [HypothequesController],
  providers: [HypothequesService],
})
export class HypothequesModule {}
