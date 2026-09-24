import { Module } from "@nestjs/common";
import { CryptoAuditModule } from "../crypto-audit/crypto-audit.module";
import { OtpModule } from "../otp/otp.module";
import { ParcellesController } from "./parcelles.controller";
import { ParcellesService } from "./parcelles.service";

@Module({
  imports: [CryptoAuditModule, OtpModule],
  controllers: [ParcellesController],
  providers: [ParcellesService],
  exports: [ParcellesService],
})
export class ParcellesModule {}
