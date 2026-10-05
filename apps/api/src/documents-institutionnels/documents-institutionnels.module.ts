import { Module } from "@nestjs/common";
import { CryptoAuditModule } from "../crypto-audit/crypto-audit.module";
import { DocumentsInstitutionnelsController } from "./documents-institutionnels.controller";
import { DocumentsInstitutionnelsService } from "./documents-institutionnels.service";

@Module({
  imports: [CryptoAuditModule],
  controllers: [DocumentsInstitutionnelsController],
  providers: [DocumentsInstitutionnelsService],
})
export class DocumentsInstitutionnelsModule {}
