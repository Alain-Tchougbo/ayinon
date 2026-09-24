import type { Config } from "tailwindcss";

/**
 * Systeme de design semantique AYINON : les couleurs pointent vers des variables CSS
 * (voir src/assets/styles/tokens.css) qui changent de valeur selon le theme actif
 * (clair / sombre / contraste eleve plein-soleil) sans jamais toucher aux classes Tailwind.
 */
export default {
  content: ["./index.html", "./src/**/*.{vue,ts}"],
  darkMode: ["class", '[data-theme="sombre"]'],
  theme: {
    extend: {
      colors: {
        fond: "var(--color-fond)",
        surface: "var(--color-surface)",
        "surface-haute": "var(--color-surface-haute)",
        texte: "var(--color-texte)",
        "texte-attenue": "var(--color-texte-attenue)",
        bordure: "var(--color-bordure)",
        primaire: {
          DEFAULT: "var(--color-primaire)",
          contraste: "var(--color-primaire-contraste)",
        },
        accent: "var(--color-accent)",
        statut: {
          titree: "var(--color-statut-titree)",
          "en-cours": "var(--color-statut-en-cours)",
          gel: "var(--color-statut-gel)",
          "domaine-public": "var(--color-statut-domaine-public)",
        },
        danger: "var(--color-danger)",
        succes: "var(--color-succes)",
      },
      fontFamily: {
        sans: ["'Inter'", "system-ui", "sans-serif"],
      },
      borderRadius: {
        carte: "1rem",
      },
    },
  },
  plugins: [],
} satisfies Config;
