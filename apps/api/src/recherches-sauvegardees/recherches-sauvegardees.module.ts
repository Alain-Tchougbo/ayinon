import { Module } from "@nestjs/common";
import { RecherchesSauvegardeesController } from "./recherches-sauvegardees.controller";
import { RecherchesSauvegardeesService } from "./recherches-sauvegardees.service";

@Module({
  controllers: [RecherchesSauvegardeesController],
  providers: [RecherchesSauvegardeesService],
})
export class RecherchesSauvegardeesModule {}
