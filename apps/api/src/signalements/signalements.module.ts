import { Module } from "@nestjs/common";
import { CryptoAuditModule } from "../crypto-audit/crypto-audit.module";
import { SignalementsController } from "./signalements.controller";
import { SignalementsService } from "./signalements.service";

@Module({
  imports: [CryptoAuditModule],
  controllers: [SignalementsController],
  providers: [SignalementsService],
})
export class SignalementsModule {}
