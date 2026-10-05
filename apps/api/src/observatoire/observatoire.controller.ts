import { Controller, Get } from "@nestjs/common";
import { Public } from "../common/decorators/public.decorator";
import { ObservatoireService } from "./observatoire.service";

@Controller("observatoire")
export class ObservatoireController {
  constructor(private readonly observatoire: ObservatoireService) {}

  /** Public : sert aussi d'API ouverte en lecture pour des chercheurs/ONG (agregats anonymises). */
  @Public()
  @Get()
  async statistiques() {
    return this.observatoire.statistiques();
  }
}
