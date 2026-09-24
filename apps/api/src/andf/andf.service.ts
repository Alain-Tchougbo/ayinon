import { Injectable } from "@nestjs/common";
import { LIBELLE_POLE_TERRITORIAL, PoleTerritorial, StatutConflitCsaf, StatutParcelle } from "@ayinon/shared";
import { PrismaService } from "../prisma/prisma.service";

interface StatistiquesPole {
  pole: PoleTerritorial;
  libelle: string;
  totalParcelles: number;
  superficieTotaleM2: number;
  parStatut: Record<StatutParcelle, number>;
  conflitsCsafActifs: number;
}

/** Console de pilotage decentralisee — un tableau de bord par pole territorial (zonage, gel CSAF, ...). */
@Injectable()
export class AndfService {
  constructor(private readonly prisma: PrismaService) {}

  async statistiquesParPole(): Promise<StatistiquesPole[]> {
    const [groupes, conflitsActifs] = await Promise.all([
      this.prisma.parcelle.groupBy({
        by: ["poleTerritorial", "statut"],
        _count: { _all: true },
        _sum: { superficieM2: true },
      }),
      this.prisma.conflitCsaf.findMany({
        where: { statut: StatutConflitCsaf.ACTIF },
        include: { parcelle: { select: { poleTerritorial: true } } },
      }),
    ]);

    const poles = Object.values(PoleTerritorial) as PoleTerritorial[];
    return poles.map((pole) => {
      const groupesDuPole = groupes.filter((g) => g.poleTerritorial === pole);
      const parStatut = Object.fromEntries(Object.values(StatutParcelle).map((s) => [s, 0])) as Record<StatutParcelle, number>;
      let totalParcelles = 0;
      let superficieTotaleM2 = 0;
      for (const g of groupesDuPole) {
        parStatut[g.statut as StatutParcelle] = g._count._all;
        totalParcelles += g._count._all;
        superficieTotaleM2 += g._sum.superficieM2 ?? 0;
      }

      return {
        pole,
        libelle: LIBELLE_POLE_TERRITORIAL[pole],
        totalParcelles,
        superficieTotaleM2,
        parStatut,
        conflitsCsafActifs: conflitsActifs.filter((c) => c.parcelle.poleTerritorial === pole).length,
      };
    });
  }
}
