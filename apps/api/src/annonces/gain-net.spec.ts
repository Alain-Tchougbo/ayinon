import { simulerGainNet } from "@ayinon/shared";

describe("simulerGainNet — E1.10, simulateur de gain net vendeur", () => {
  it("deduit commission, frais notariaux et taxe du prix de vente", () => {
    const resultat = simulerGainNet(10_000_000);
    expect(resultat.commissionPlateformeFcfa).toBe(200_000);
    expect(resultat.fraisNotariauxFcfa).toBe(100_000);
    expect(resultat.taxeFcfa).toBe(500_000);
    expect(resultat.totalDeductionsFcfa).toBe(800_000);
    expect(resultat.montantNetFcfa).toBe(9_200_000);
  });

  it("renvoie un montant net nul pour un prix de vente nul", () => {
    const resultat = simulerGainNet(0);
    expect(resultat.montantNetFcfa).toBe(0);
  });
});
