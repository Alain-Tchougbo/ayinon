import type { Config } from "tailwindcss";

/**
 * Systeme de design semantique AYINON : les couleurs pointent vers des variables CSS
 * (voir src/assets/styles/tokens.css) qui changent de valeur selon le theme actif
 * (clair / sombre / contraste eleve plein-soleil) sans jamais toucher aux classes Tailwind.
 */
/** rgb(var(--x) / <alpha-value>) — seule forme qui permet a Tailwind de generer les
 *  modificateurs d'opacite (bg-primaire/10, text-primaire-contraste/70...) pour une couleur
 *  personnalisee. Les variables dans tokens.css sont donc des triplets "R G B", pas des #hex. */
function couleur(nomVariable: string) {
  return `rgb(var(${nomVariable}) / <alpha-value>)`;
}

export default {
  content: ["./index.html", "./src/**/*.{vue,ts}"],
  darkMode: ["class", '[data-theme="sombre"]'],
  theme: {
    extend: {
      colors: {
        fond: couleur("--color-fond"),
        surface: couleur("--color-surface"),
        "surface-haute": couleur("--color-surface-haute"),
        texte: couleur("--color-texte"),
        "texte-attenue": couleur("--color-texte-attenue"),
        bordure: couleur("--color-bordure"),
        primaire: {
          DEFAULT: couleur("--color-primaire"),
          hover: couleur("--color-primaire-hover"),
          fonce: couleur("--color-primaire-fonce"),
          contraste: couleur("--color-primaire-contraste"),
        },
        accent: {
          DEFAULT: couleur("--color-accent"),
          contraste: couleur("--color-accent-contraste"),
        },
        statut: {
          titree: couleur("--color-statut-titree"),
          "en-cours": couleur("--color-statut-en-cours"),
          gel: couleur("--color-statut-gel"),
          "domaine-public": couleur("--color-statut-domaine-public"),
        },
        danger: couleur("--color-danger"),
        succes: couleur("--color-succes"),
        "anneau-focus": couleur("--color-anneau-focus"),
      },
      fontFamily: {
        sans: [
          "'Manrope'",
          "system-ui",
          "-apple-system",
          "'Segoe UI'",
          "Roboto",
          "sans-serif",
        ],
        affichage: [
          "'Space Grotesk'",
          "system-ui",
          "-apple-system",
          "'Segoe UI'",
          "sans-serif",
        ],
      },
      borderRadius: {
        carte: "1rem",
      },
      boxShadow: {
        carte: "var(--ombre-carte)",
        flottant: "var(--ombre-flottante)",
      },
    },
  },
  plugins: [],
} satisfies Config;
