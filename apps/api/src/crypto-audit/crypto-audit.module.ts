import { Module } from "@nestjs/common";
import { CryptoAuditController } from "./crypto-audit.controller";
import { CryptoAuditService } from "./crypto-audit.service";
import { Ed25519KeysService } from "./ed25519-keys.service";

@Module({
  controllers: [CryptoAuditController],
  providers: [CryptoAuditService, Ed25519KeysService],
  exports: [CryptoAuditService, Ed25519KeysService],
})
export class CryptoAuditModule {}
