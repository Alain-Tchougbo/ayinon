import { Module } from "@nestjs/common";
import { CryptoAuditModule } from "../crypto-audit/crypto-audit.module";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

@Module({
  imports: [CryptoAuditModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
