import { Module } from "@nestjs/common";
import { CryptoAuditModule } from "../crypto-audit/crypto-audit.module";
import { SequestresController } from "./sequestres.controller";
import { SequestresService } from "./sequestres.service";

@Module({
  imports: [CryptoAuditModule],
  controllers: [SequestresController],
  providers: [SequestresService],
})
export class SequestresModule {}
