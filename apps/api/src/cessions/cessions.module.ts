import { Module } from "@nestjs/common";
import { CryptoAuditModule } from "../crypto-audit/crypto-audit.module";
import { CsafModule } from "../csaf/csaf.module";
import { CessionsController } from "./cessions.controller";
import { CessionsService } from "./cessions.service";

@Module({
  imports: [CryptoAuditModule, CsafModule],
  controllers: [CessionsController],
  providers: [CessionsService],
})
export class CessionsModule {}
