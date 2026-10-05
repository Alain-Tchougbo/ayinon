import { Module } from "@nestjs/common";
import { NotaireController } from "./notaire.controller";
import { NotaireService } from "./notaire.service";

@Module({
  controllers: [NotaireController],
  providers: [NotaireService],
})
export class NotaireModule {}
