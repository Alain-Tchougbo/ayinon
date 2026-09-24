import { Module } from "@nestjs/common";
import { AndfController } from "./andf.controller";
import { AndfService } from "./andf.service";

@Module({
  controllers: [AndfController],
  providers: [AndfService],
})
export class AndfModule {}
