import { Module } from "@nestjs/common";
import { FamillesModule } from "../familles/familles.module";
import { ParcellesModule } from "../parcelles/parcelles.module";
import { SyncController } from "./sync.controller";
import { SyncService } from "./sync.service";

@Module({
  imports: [ParcellesModule, FamillesModule],
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}
