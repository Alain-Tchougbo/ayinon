# Architecture — AYINON

## 1. Vue d'ensemble

```
                         ┌─────────────────────────────────────────┐
                         │            CITOYEN / GEOMETRE            │
                         │      FAMILLE / AGENT ANDF / MAGISTRAT     │
                         └───────────────────┬───────────────────────┘
                                              │ HTTPS
                         ┌────────────────────▼────────────────────┐
                         │   FRONTEND — Vue 3 + Vite (PWA)           │
                         │   MapLibre-GL · Pinia · Dexie (IndexedDB) │
                         │   Web Speech API · Scanner QR (jsQR)      │
                         │   Service Worker (Workbox / vite-pwa)     │
                         └───────────────┬───────────┬───────────────┘
                                          │           │ (hors-ligne)
                              API REST    │           ▼
                         (cookies HttpOnly,│   File d'actions locale
                          CSRF double-sub) │   (Dexie: actionsEnAttente)
                                          ▼           │ sync au retour reseau
                         ┌─────────────────────────────▼─────────────┐
                         │   BACKEND — NestJS (TypeScript)            │
                         │  ┌────────┬───────────┬──────────────┐    │
                         │  │  Auth  │  RBAC      │  Throttler   │    │
                         │  │  JWT   │  Guards    │  Helmet      │    │
                         │  └────────┴───────────┴──────────────┘    │
                         │  Modules metier : parcelles · geometre ·   │
                         │  conventions · familles · csaf · andf ·    │
                         │  sync · crypto-audit                        │
                         └───────────────┬─────────────────────────────┘
                                          │ Prisma ($queryRaw pour le spatial)
                         ┌─────────────────▼─────────────────────────┐
                         │  PostgreSQL + PostGIS                       │
                         │  ST_Intersects / ST_Area / ST_DWithin       │
                         └──────────────────────────────────────────────┘
```

Le **service de signature cryptographique** (`CryptoAuditService` + `Ed25519KeysService`, dans
`apps/api/src/crypto-audit`) est transverse : il est consomme par les modules `parcelles`, `conventions`,
`geometre`, `familles` et `csaf` pour sceller chaque operation sensible dans un registre d'audit chaine
(voir [SECURITE.md](SECURITE.md)).

## 2. Schema de donnees (extrait)

Source de verite : [apps/api/prisma/schema.prisma](../apps/api/prisma/schema.prisma).

| Table | Role |
|---|---|
| `Utilisateur` | Comptes RBAC (7 roles), lie optionnellement a un `Proprietaire` |
| `Proprietaire` | Identite civile (citoyen, diaspora, collectivite familiale, Etat) |
| `Parcelle` | `nup` unique, `geom geometry(Polygon,4326)`, `statut` (TITREE/EN_COURS/GEL_CSAF/DOMAINE_PUBLIC), `poleTerritorial`, `verrouAntiVente` |
| `Titre` | Titre foncier delivre, hash + signature |
| `Convention` | Convention de vente scellee (hash SHA-256, signature Ed25519, QR) |
| `PlanBornage` | Plan de bornage geometre, `chevauchementDetecte`, `parcellesEnConflit` |
| `MandataireFamille` / `SignatureFamille` | Protocole multi-signature familiale (quorum Aine + Representante des femmes + Cadet) |
| `BanOpposition` / `Opposition` | Affichage de ban legal (15 jours, `DUREE_BAN_OPPOSITION_JOURS`) |
| `ConflitCsaf` | Gel conservatoire judiciaire (statut ACTIF/LEVE, restauration du statut anterieur) |
| `MutationAudit` | Registre d'audit chaine (ledger), portee nationale |
| `CodeOtp` / `RefreshToken` | Confirmation d'actions sensibles, rotation des sessions |

Les colonnes geometriques sont declarees `Unsupported("geometry(...)")` (Prisma ne modelise pas nativement
les types spatiaux) : toute lecture/ecriture passe par `$queryRaw`/`$executeRaw` dans les services concernes
(`ParcellesService`, `GeometreService`).

## 3. Detection de chevauchement geometrique

1. **Client** (`useOverlapDetection.ts`, Turf.js) : pre-verification instantanee pendant la saisie du
   geometre, contre les parcelles deja chargees dans le store — retour visuel immediat, non bloquant.
2. **Serveur** (`GeometreService.importerBornage`) : source de verite. Requete PostGIS
   `ST_Intersects(parcelle.geom, nouvelle_geometrie)` puis `ST_Area(ST_Intersection(...)::geography)` pour
   chiffrer la surface en conflit. Le plan est marque `chevauchementDetecte` et **la signature du geometre
   est refusee tant que le conflit n'est pas resolu** (`GeometreService.signerPlan`).

## 4. Offline-first

- **Cache de lecture** : `apps/web/src/db/localDb.ts` (Dexie/IndexedDB) miroir des parcelles consultees ;
  `stores/parcelles.store.ts` bascule automatiquement sur le cache si le reseau echoue.
- **File d'ecriture differee** : les depots d'opposition effectues hors-ligne sont mis en file
  (`actionsEnAttente`) et rejoues via `POST /api/sync/push` au retour reseau
  (`services/syncService.ts`, ecouteur `window.addEventListener('online', ...)`).
- **Delta de synchronisation** : `GET /api/sync/pull?depuis=<horodatage>` ne renvoie que les parcelles
  modifiees depuis la derniere synchronisation.
- **Service Worker** : `vite-plugin-pwa` (strategie `generateSW`), mise en cache `NetworkFirst` des reponses
  `GET /api/parcelles*` pour une consultation cadastrale utilisable en zone blanche.
- **Choix documente** : la synchronisation est geree applicativement (Dexie + evenement `online`) plutot que
  via la Background Sync API du navigateur, non supportee sur Safari/iOS — plus fiable cross-plateforme pour
  des terminaux d'entree de gamme.

## 5. Accessibilite multimodale

`useVoiceAssistant.ts` lit chaque page en francais via la Web Speech API native (aucune dependance, fonctionne
hors-ligne des que la voix systeme est installee). Les langues Fɔngbe, Yorùbá et Bariba s'appuient sur une
infrastructure d'enregistrements humains pre-produits (`public/audio/<langue>/<phraseId>.mp3`, catalogue dans
`src/voice/phrases.ts`) avec repli automatique et gracieux vers le francais si l'enregistrement n'existe pas
encore pour une phrase donnee. **Point d'integration restant pour la production** : faire enregistrer le
catalogue de phrases par des locuteurs natifs.

## 6. Perimetre non code dans cette version

Modelises dans le schema de donnees mais sans dashboard dedie (hors choix de perimetre de cette iteration) :

- **Notaires** : arbre genealogique de la parcelle (deductible de `MutationAudit`/`Convention`), controle des
  charges et hypotheques, enregistrement de l'acte de mutation.
- **Module Diaspora avance** : mandat numerique trace, alertes WhatsApp/SMS en temps reel (le champ
  `Proprietaire.estDiaspora` et le compte `diaspora1@ayinon.bj` sont deja en place pour une extension directe).

## 7. Securite

Voir [SECURITE.md](SECURITE.md) pour le detail RBAC, JWT, CSRF, et le fonctionnement du registre d'audit
cryptographique chaine.
