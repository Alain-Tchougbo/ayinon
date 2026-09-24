# Plan de demonstration live — 3 minutes

Prerequis avant de monter sur scene : `pnpm db:up`, `pnpm seed`, `pnpm dev:api`, `pnpm dev:web` — voir
[README.md](../README.md). Garder un second onglet ouvert sur `/andf` (connecte en `csaf1@ayinon.bj`) pour
la sequence finale.

## 0:00 – 0:20 — Accroche

> « Au Benin, un litige foncier sur deux part d'une double vente ou d'une cession clandestine. AYINON rend
> ca techniquement impossible. »

Ouvrir `/carte` (public, aucune connexion requise). Montrer la legende 4 couleurs, zoomer sur Cotonou pour
reveler deux parcelles adjacentes (verte = titree, jaune = en cours).

## 0:20 – 0:50 — Citoyen : verification instantanee + anti-fraude

1. Page d'accueil, saisir le NUP `BJ-LIT-COT-0001` → bascule sur la carte, la parcelle est localisee.
2. Aller sur `/scanner`, ouvrir « Saisie manuelle », coller le JSON `{payload, signatureEd25519}` d'une
   convention enregistree au prealable (voir README pour generer une convention de demo via
   `POST /api/conventions`) → **« Document authentique »** avec vendeur/acquereur/montant.
3. Modifier un caractere du `hashSha256` dans le champ, verifier a nouveau → **rejet immediat**
   (« Signature cryptographique invalide »). Message : *« Impossible a un demarcheur de contrefaire un
   document — la moindre alteration casse la signature. »*

## 0:50 – 1:20 — Geometre : chevauchement bloque automatiquement

1. Se connecter en `geometre1@ayinon.bj`, aller sur `/geometre`.
2. Choisir la parcelle `BJ-LIT-COT-0001`, cliquer « Pre-remplir un exemple (demo) » (genere un polygone qui
   chevauche la parcelle voisine `BJ-LIT-COT-0002`), importer.
3. Le systeme affiche **« Chevauchement detecte (PostGIS) »** avec la surface d'intersection en m² — calcul
   spatial reel, pas une simulation.
4. Tenter de signer : **refuse**. *« Aucun empietement ne peut etre officialise — meme par erreur. »*

## 1:20 – 1:50 — Collectivite familiale : consensus + ban de 15 jours

1. Se connecter en `mandataire.aine@ayinon.bj`, aller sur `/famille`, rechercher la parcelle familiale
   (deja preparee dans le seed, 3 signatures en attente).
2. Demander le code, signer (« Approuver ») — repeter rapidement en argumentant que dans la vraie vie,
   l'Aine, la Representante des femmes et un Cadet le font chacun depuis leur telephone.
3. Une fois le quorum simule atteint (les 2 autres comptes deja signes en coulisses avant la demo, ou
   signer en direct avec `mandataire.femmes@ayinon.bj` / `mandataire.cadet@ayinon.bj` dans des onglets
   prepares) → **le ban de 15 jours s'ouvre automatiquement**, visible a l'ecran.
4. **Couper le Wi-Fi du poste** (bandeau « Hors-ligne » visible), deposer une opposition depuis le
   formulaire → message *« enregistree localement, sera transmise des le retour du reseau »*. Rebrancher le
   Wi-Fi : l'opposition part automatiquement (`services/syncService.ts`). *« Meme un voisin en brousse peut
   faire valoir ses droits. »*

## 1:50 – 2:20 — Etat & CSAF : le bouton rouge

1. Se connecter en `csaf1@ayinon.bj`, aller sur `/csaf`.
2. Rechercher une parcelle titree, saisir motif + reference de dossier, confirmer le gel.
3. Revenir sur `/carte` (deuxieme onglet, meme si non connecte) : **la parcelle passe au rouge en direct**.
4. Tenter, dans l'onglet citoyen, d'enregistrer une convention de vente sur cette parcelle → **bloque**
   (« Parcelle sous gel conservatoire judiciaire »). *« Une seule decision judiciaire, et c'est bloque sur
   tout le territoire, instantanement. »*

## 2:20 – 2:50 — La preuve : le registre ne ment pas

1. Appeler `GET /api/audit/integrite` (onglet reseau ou `curl`) → `{"valide": true, "nombreEntrees": N}`.
2. *« Chaque action que vous venez de voir — recherche, gel, signature, opposition — est chainee
   cryptographiquement, façon registre infalsifiable. Si quelqu'un modifie une seule ligne en base
   directement, » * — montrer (prepare en amont, pas en live) le meme appel apres une alteration manuelle en
   base → `{"valide": false, "premiereAlterationId": "...", "raison": "..."}`. *« Le systeme le sait, et
   sait exactement ou. »*
3. Console `/andf` : vue d'ensemble par pole territorial, conflits CSAF actifs comptabilises en direct.

## 2:50 – 3:00 — Cloture

> « AYINON ne digitalise pas juste un registre papier : il rend la fraude fonciere techniquement
> detectable, le consensus familial verifiable, et la justice foncière executoire en un clic — partout au
> Benin, meme sans reseau. »

## Filet de securite

- Si le Wi-Fi de la salle est capricieux : le scanner anti-fraude fonctionne **entierement hors-ligne**
  (verification Ed25519 locale via Web Crypto API, des que la cle publique a ete chargee une premiere fois
  en ligne) — bon filet de demonstration en cas de coupure impromptue.
- Garder `pnpm test:api` (chaine d'audit + chevauchement PostGIS) pret a lancer en cas de question technique
  du jury sur la fiabilite : deux suites de tests passent en moins de 2 secondes.
