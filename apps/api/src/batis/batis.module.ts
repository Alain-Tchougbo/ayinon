import { Module } from "@nestjs/common";
import { CryptoAuditModule } from "../crypto-audit/crypto-audit.module";
import { BatisController } from "./batis.controller";
import { BatisService } from "./batis.service";

@Module({
  imports: [CryptoAuditModule],
  controllers: [BatisController],
  providers: [BatisService],
  exports: [BatisService],
})
export class BatisModule {}
