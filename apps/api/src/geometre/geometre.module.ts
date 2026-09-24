import { Module } from "@nestjs/common";
import { CryptoAuditModule } from "../crypto-audit/crypto-audit.module";
import { GeometreController } from "./geometre.controller";
import { GeometreService } from "./geometre.service";

@Module({
  imports: [CryptoAuditModule],
  controllers: [GeometreController],
  providers: [GeometreService],
})
export class GeometreModule {}
