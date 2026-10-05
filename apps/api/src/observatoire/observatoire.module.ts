import { Module } from "@nestjs/common";
import { ObservatoireController } from "./observatoire.controller";
import { ObservatoireService } from "./observatoire.service";

@Module({
  controllers: [ObservatoireController],
  providers: [ObservatoireService],
})
export class ObservatoireModule {}
