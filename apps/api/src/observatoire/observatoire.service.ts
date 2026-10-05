import { Injectable } from "@nestjs/common";
import { LIBELLE_POLE_TERRITORIAL, PoleTerritorial, StatutConflitCsaf, StatutCession, StatutParcelle } from "@ayinon/shared";
import { PrismaService } from "../prisma/prisma.service";

const FENETRE_RECENTE_JOURS = 30;

export interface StatistiquesObservatoire {
  genereLe: string;
  totalParcelles: number;
  parcellesParStatut: Record<StatutParcelle, number>;
  parcellesParPole: Array<{ pole: PoleTerritorial; libelle: string; totalParcelles: number; superficieTotaleM2: number }>;
  conflitsCsafActifs: number;
  conventionsValideesTotal: number;
  conventionsValideesRecentes: number;
  parcellesAvecLimitesCertifiees: number;
}

/**
 * Observatoire foncier public : agregats en lecture seule sur des donnees deja en base (aucun
 * chiffre invente), expose sans authentification pour appuyer la transparence de la plateforme et
 * servir de point d'acces en donnees ouvertes pour des chercheurs/ONG (voir challenge/PITCH_DECK).
 */
@Injectable()
export class ObservatoireService {
  constructor(private readonly prisma: PrismaService) {}

  async statistiques(): Promise<StatistiquesObservatoire> {
    const depuis = new Date(Date.now() - FENETRE_RECENTE_JOURS * 24 * 60 * 60 * 1000);

    const [parStatutBrut, parPoleBrut, conflitsCsafActifs, conventionsValideesTotal, conventionsValideesRecentes, plansCertifies] =
      await Promise.all([
        this.prisma.parcelle.groupBy({ by: ["statut"], _count: { _all: true } }),
        this.prisma.parcelle.groupBy({ by: ["poleTerritorial"], _count: { _all: true }, _sum: { superficieM2: true } }),
        this.prisma.conflitCsaf.count({ where: { statut: StatutConflitCsaf.ACTIF } }),
        this.prisma.convention.count({ where: { statutCession: StatutCession.VALIDEE } }),
        // Approximation honnete : filtre sur createdAt plutot que dateValidation (absente sur les
        // conventions historiques/seedees), comme deja assume ailleurs sur la plateforme pour les
        // indicateurs secondaires (voir docs/decisions.md).
        this.prisma.convention.count({ where: { statutCession: StatutCession.VALIDEE, createdAt: { gte: depuis } } }),
        this.prisma.planBornage.groupBy({ by: ["parcelleId"], where: { signeParId: { not: null }, chevauchementDetecte: false } }),
      ]);

    const parcellesParStatut = Object.fromEntries(Object.values(StatutParcelle).map((s) => [s, 0])) as Record<StatutParcelle, number>;
    let totalParcelles = 0;
    for (const g of parStatutBrut) {
      parcellesParStatut[g.statut] = g._count._all;
      totalParcelles += g._count._all;
    }

    const parcellesParPole = Object.values(PoleTerritorial).map((pole) => {
      const groupe = parPoleBrut.find((g) => g.poleTerritorial === pole);
      return {
        pole,
        libelle: LIBELLE_POLE_TERRITORIAL[pole],
        totalParcelles: groupe?._count._all ?? 0,
        superficieTotaleM2: groupe?._sum.superficieM2 ?? 0,
      };
    });

    return {
      genereLe: new Date().toISOString(),
      totalParcelles,
      parcellesParStatut,
      parcellesParPole,
      conflitsCsafActifs,
      conventionsValideesTotal,
      conventionsValideesRecentes,
      parcellesAvecLimitesCertifiees: plansCertifies.length,
    };
  }
}
