import { BadRequestException, Injectable, PipeTransform } from "@nestjs/common";
import type { ZodSchema } from "zod";

/**
 * Valide et transforme le body/query d'une requete via un schema Zod partage
 * avec le frontend (packages/shared). Usage : @Body(new ZodValidationPipe(MonSchema)) dto: MonDto
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown) {
    const resultat = this.schema.safeParse(value);
    if (!resultat.success) {
      throw new BadRequestException({
        message: "Validation echouee",
        erreurs: resultat.error.flatten(),
      });
    }
    return resultat.data;
  }
}
