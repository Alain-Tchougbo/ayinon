import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import type { Response } from "express";

/** Uniformise la forme des erreurs renvoyees par l'API (utile pour l'UI et les logs d'audit). */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const corps = exception instanceof HttpException ? exception.getResponse() : { message: "Erreur interne du serveur" };

    response.status(status).json({
      horodatage: new Date().toISOString(),
      ...(typeof corps === "string" ? { message: corps } : corps),
    });
  }
}
