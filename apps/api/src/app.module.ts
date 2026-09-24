import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AndfModule } from "./andf/andf.module";
import { AuthModule } from "./auth/auth.module";
import { CessionsModule } from "./cessions/cessions.module";
import { CsrfGuard } from "./common/guards/csrf.guard";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { RolesGuard } from "./common/guards/roles.guard";
import { ConventionsModule } from "./conventions/conventions.module";
import { CryptoAuditModule } from "./crypto-audit/crypto-audit.module";
import { CsafModule } from "./csaf/csaf.module";
import { FamillesModule } from "./familles/familles.module";
import { GeometreModule } from "./geometre/geometre.module";
import { OtpModule } from "./otp/otp.module";
import { ParcellesModule } from "./parcelles/parcelles.module";
import { PrismaModule } from "./prisma/prisma.module";
import { SyncModule } from "./sync/sync.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ name: "default", ttl: 60_000, limit: 120 }]),
    PrismaModule,
    AuthModule,
    OtpModule,
    ParcellesModule,
    CryptoAuditModule,
    ConventionsModule,
    CessionsModule,
    GeometreModule,
    FamillesModule,
    CsafModule,
    AndfModule,
    SyncModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
