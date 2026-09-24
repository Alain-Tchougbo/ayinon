import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { PousserActionsSchema, type PousserActionsDto } from "@ayinon/shared";
import { Public } from "../common/decorators/public.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { SyncService } from "./sync.service";

@Controller("sync")
export class SyncController {
  constructor(private readonly sync: SyncService) {}

  /** Public : consultation cadastrale disponible sans compte, y compris pour rafraichir le cache local. */
  @Public()
  @Get("pull")
  async pull(@Query("depuis") depuis?: string) {
    return this.sync.pull(depuis);
  }

  @Public()
  @Post("push")
  async push(@Body(new ZodValidationPipe(PousserActionsSchema)) dto: PousserActionsDto) {
    return this.sync.pousserActionsEnAttente(dto.actions);
  }
}
