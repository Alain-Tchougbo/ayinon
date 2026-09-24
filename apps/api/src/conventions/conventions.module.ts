import { Module } from "@nestjs/common";
import { CryptoAuditModule } from "../crypto-audit/crypto-audit.module";
import { CsafModule } from "../csaf/csaf.module";
import { ConventionsController } from "./conventions.controller";
import { ConventionsService } from "./conventions.service";

@Module({
  imports: [CryptoAuditModule, CsafModule],
  controllers: [ConventionsController],
  providers: [ConventionsService],
})
export class ConventionsModule {}
