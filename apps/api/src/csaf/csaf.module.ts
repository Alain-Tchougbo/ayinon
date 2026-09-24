import { Module } from "@nestjs/common";
import { CryptoAuditModule } from "../crypto-audit/crypto-audit.module";
import { CsafController } from "./csaf.controller";
import { CsafService } from "./csaf.service";

@Module({
  imports: [CryptoAuditModule],
  controllers: [CsafController],
  providers: [CsafService],
  exports: [CsafService],
})
export class CsafModule {}
