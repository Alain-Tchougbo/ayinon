# Decisions prises sans validation intermediaire

Journal des choix d'implementation tranches seul lors de la mise en oeuvre du backlog
`docs/user-stories.md`, avec la raison qui les justifie.

## Roles ACHETEUR / VENDEUR

CITOYEN reste le compte de base (proprietaire, passeport foncier, scanner anti-fraude,
simulateur de frais, terre familiale). VENDEUR et ACHETEUR sont des roles distincts,
dedies au parcours d'achat/vente (E1 a E6). Chaque compte porte un seul role a la fois,
comme tous les autres roles du systeme (un geometre ne peut pas etre aussi agent ANDF) :
une personne qui veut a la fois vendre et acheter ouvre deux comptes. Alternative
ecartee : faire porter plusieurs roles a un meme compte, qui aurait demande de repenser
tout le systeme de permissions (`@Roles`) construit sur un role unique par utilisateur.

## Sequestre (Epic 5)

Aucun mouvement d'argent reel : ni mobile money, ni virement, ni carte bancaire. Un vrai
sequestre demanderait une integration avec un prestataire de paiement reglemente, hors de
portee et hors sujet pour une plateforme de securisation fonciere. Construit comme un
**suivi de statut** uniquement (`Sequestre` 1-1 avec une `Convention`) :

- E5.4 : l'acheteur declare un depot des que la cession qu'il a acceptee (`ACCEPTEE`) est en
  attente de validation ANDF — que la cession vienne de la vitrine ou d'une proposition
  directe, le mecanisme est identique.
- E5.5 : un agent banque confirme l'encaissement declare (`DEPOT_DECLARE` -> `DEPOT_CONFIRME`)
  depuis une file dediee (`/sequestres/a-confirmer`), sans jamais manipuler de fonds reels.
- E6.7/E5.8 : liberation et remboursement ne sont **jamais** des actions manuelles — ils
  decoulent automatiquement du sort de la cession dans `CessionsService.valider()` : validee
  par l'ANDF -> `LIBERE` ; rejetee par l'ANDF -> `REMBOURSE`. Puisqu'aucun argent reel n'est
  en jeu, il n'y a rien a « demander » : le statut suit fidelement et immediatement la
  decision deja prise par l'autorite competente, sans etape de confirmation supplementaire
  qui n'aurait aucune substance financiere derriere elle.
- Sans notaire dans cette iteration (voir plus bas), la validation ANDF — deja le
  declencheur du transfert de propriete — sert aussi de declencheur a la liberation, a la
  place du binome notaire+ANDF prevu par E6.7.

## Restauration du parcours de cession directe (hors vitrine)

En verifiant le parcours acheteur/vendeur de bout en bout, une route `/cession` s'est
revelee **inaccessible a qui que ce soit** : restreinte au role CITOYEN dans le routeur,
alors que `CessionsController` exige VENDEUR (proposer) et ACHETEUR (repondre) depuis la
scission des roles plus tot dans cette session — un reliquat jamais nettoye. Plutot que de
simplement elargir les roles autorises sur l'ancienne page (qui melangeait les deux
perspectives sur un seul ecran, adapte a un CITOYEN pouvant jouer les deux roles, plus au
modele actuel a un role par compte), la fonctionnalite a ete repartie dans les espaces deja
dedies : "Proposer une cession directement" + historique dans `VendreView.vue` (cote
vendeur), "Propositions recues" + reponse dans `AcheterView.vue` (cote acheteur).
`CessionView.vue` et la route `/cession` sont supprimes. Les references stagnantes a
`/cession` dans le tableau de bord, l'accueil et les notifications du role CITOYEN ont
egalement ete retirees — un CITOYEN ne peut plus ceder ou acquerir de terrain, coherent
avec la decision "Roles ACHETEUR / VENDEUR" ci-dessus deja actee en debut de session.

Corrige au passage un veritable bug introduit par le verrou anti double-vente de cette
session (voir plus haut) : quand l'ANDF rejette une cession issue de la vitrine, l'interet
retenu restait bloque au statut RETENU indefiniment, empechant toute nouvelle manifestation
d'interet sur l'annonce meme apres l'echec. `CessionsService.valider()` repasse desormais
cet interet a DECLINE des que la cession est rejetee, ce qui reouvre l'annonce.

## Verification d'identite (E0.2)

Pas de reconnaissance faciale automatique (aucun fournisseur de biometrie integre). La
verification d'identite, quand elle sera construite, prendra la forme d'un depot de piece
+ selfie avec **revue manuelle par un admin** (comme deja fait pour les professionnels,
E0.5/E0.6), jamais une correspondance faciale automatisee simulee.

## Notifications (ET.1)

In-app uniquement (pastille reelle dans l'en-tete, deja branchee sur des decomptes reels
par role). Pas de SMS, WhatsApp ou push reels : aucune passerelle n'est integree et il
serait malhonnete d'en simuler une qui ne livre rien.

## Messagerie (ET.2)

Non construite dans cette iteration. Le formulaire "message" attache a une manifestation
d'interet (`InteretAchat.message`) sert de premiere brique mais ne constitue pas un fil de
discussion complet.

## Notaire (role NOTAIRE)

Le role existe dans le RBAC (autorise sur `POST /conventions`) mais n'a toujours aucun
tableau de bord dedie. Reste hors perimetre par choix explicite du porteur de projet en
debut de session ; les epics 5/6 qui le mentionnent (redaction de promesse, calcul des
frais notaries) ne sont pas construits.

## Vitrine (Epic 1-3)

Le vendeur retient un interet -> une Convention est creee directement au statut ACCEPTEE
(pas PROPOSEE), puisque les deux parties ont deja convenu via l'annonce et la
manifestation d'interet. Elle rejoint ensuite le pipeline de validation ANDF existant
(`/cessions/a-valider`, `CessionsService.valider`) : la vitrine est une seconde porte
d'entree vers le meme pipeline de cession deja construit et verifie, pas un pipeline
parallele. Seul ajout a `valider()` : quand la cession validee provient d'une annonce
(`annonceId` renseigne), l'annonce passe au statut VENDUE dans la meme transaction, pour
qu'elle disparaisse de la vitrine et qu'aucun autre acheteur ne manifeste son interet sur
une parcelle deja transferee.

Le badge "limites certifiees" (E2.3) n'est jamais stocke comme un booleen dedie : il se
deduit a chaque lecture de l'existence d'un `PlanBornage` signe et non conflictuel, pour
ne jamais desynchroniser un badge affiche de la realite technique du bornage.

## Signalements (E2.6/E2.7/E8.1/E8.2)

Un seul modele `Signalement` sert les deux besoins du backlog (probleme sur une annonce et litige
foncier plus large), avec un champ `type` qui distingue le traitement :
- `ANNONCE` fonde -> l'admin retire lui-meme l'annonce (c'est de la moderation de contenu, un acte
  qui lui revient legitimement).
- `LITIGE_FONCIER` fonde -> **aucun gel automatique**. La qualification admin rend seulement le
  signalement visible dans une file consultee par le magistrat CSAF (`/signalements/litiges-fondes`,
  affichee en tete de `GelCsafView.vue` avec un bouton "Instruire ce dossier" qui pre-remplit la
  recherche). Le gel reste un acte que seul un magistrat CSAF peut poser via `CsafService.gelerParcelle`
  (ET.8 : « aucune action admin ne peut se substituer » a l'autorite competente).

Le depot d'un signalement exige d'etre connecte (CITOYEN/VENDEUR/ACHETEUR/MANDATAIRE_FAMILIAL,
liste d'acteurs d'E8.1) plutot que reellement anonyme comme le suggere la formulation d'E2.6(«
accessible sans compte transactionnel ») : la tracabilite d'ET.6 (toute action importante horodatee
et attribuee) l'emporte sur l'anonymat total, qui aurait aussi ouvert la porte a des signalements
non tracables donc invérifiables.

Point d'entree unique en l'etat : le formulaire de signalement n'existe que depuis le detail d'une
annonce (`AnnonceDetailView.vue`), avec un choix de type (probleme d'annonce / litige foncier). Il
n'existe pas encore de page de detail generique par parcelle en dehors d'une annonce publiee : un
litige sur une parcelle qui n'a jamais ete mise en vente ne peut pas encore etre signale par ce
canal. A elargir si le besoin se confirme.

Pas de notification (email/SMS/push) envoyee au signalant ou aux parties lors de la qualification :
coherent avec la decision « Notifications » ci-dessous (in-app uniquement, aucune passerelle
integree). Le signalant peut consulter l'etat de ses signalements via `/signalements/mes-signalements`
(expose cote API, pas encore relie a une vue dediee cote frontend).

## Anti double-negociation sur une annonce (esprit E5.7)

Des qu'un interet est retenu sur une annonce (une cession ACCEPTEE existe deja), toute nouvelle
manifestation d'interet et toute nouvelle retenue sur la meme annonce sont refusees tant que
l'annonce reste ACTIVE (elle ne passe VENDUE qu'a la validation ANDF). Sans ce verrou, un second
acheteur aurait pu manifester son interet — voire etre retenu a son tour par erreur — sur une
parcelle deja en cours de cession, ce qui aurait pu produire deux Convention concurrentes pour la
meme parcelle.

## Avis reciproque et coffre numerique (E7.7, E7.1, E3.4)

Un avis (1 a 5, commentaire optionnel) ne peut etre depose que par une des deux parties reelles
d'une `Convention` deja `VALIDEE`, sur l'autre partie, une seule fois (contrainte unique
`conventionId`+`auteurId`). Publie **immediatement**, sans file de moderation prealable (a la
difference de ce que suggere le CA d'E7.7) : construire une moderation dediee pour une seule
fonctionnalite secondaire n'etait pas justifie dans le temps imparti, et la plateforme n'a nulle
part ailleurs de pipeline de moderation de contenu generique reutilisable (les signalements, eux,
ont leur propre flux explicite de qualification admin — voir plus haut). A reconsiderer si les avis
deviennent un vecteur d'abus.

Le "coffre numerique" (E7.1) reste circonscrit a ce qui existe reellement en base : les `Titre`
delivres a l'acquereur, exportables en JSON (memes donnees reelles — hash, signature Ed25519 —
que le dossier de preuves CSAF, pas un document PDF fabrique). Pas de gestion de bail/location/
revente (E7.3, P2) ni de surveillance periodique (E7.2, P2) dans cette iteration.

Le profil vendeur consultable depuis une annonce (E3.4 : "anciennete, ventes passees, avis") se
limite a la note moyenne, au nombre d'avis et au nombre de ventes conclues (`Convention.creeParId`
+ `statutCession: VALIDEE`) — pas de page de profil dediee ni de liste paginee des avis, juste un
resume affiche sur la fiche d'annonce.

## Decision definitive CSAF (E8.8)

La levee d'un gel porte desormais la decision definitive du magistrat, avec trois effets
possibles : LEVEE_SIMPLE (restaure le statut anterieur, comportement historique), ANNULATION_VENTE
(rejette en plus toute cession `PROPOSEE`/`ACCEPTEE` en cours sur la parcelle et retire ses
annonces actives), TRANSFERT_FORCE (meme effet qu'ANNULATION_VENTE, et reassigne directement
`Parcelle.proprietaireId` au nom designe par la decision — cree un nouveau `Proprietaire` si
necessaire, exactement comme `CessionsService.valider()` le fait deja pour un acquereur sans
compte proprietaire prealable). Le document de la decision est optionnel et, comme celui deja
accepte par le Scanner Anti-Fraude (`ConventionsService`), stocke reellement sur disque (hash
SHA-256 dans le nom de fichier) mais **non servi par une route de telechargement** dans cette
iteration — limitation deja existante avant ce changement, non introduite ici.

Pas de notaire implique dans l'instruction de la decision (role hors perimetre, voir plus haut) :
le magistrat CSAF agit seul, coherent avec E8.7 ou lui seul peut deja ordonner un gel.

## Demandes de visite (E3.5/E3.6)

Cycle simplifie : l'acheteur propose un creneau (date/heure + mode presentiel/video), le vendeur
confirme, refuse, ou reprogramme une fois (propose une autre date que l'acheteur doit alors
confirmer/refuser a son tour). Deux simplifications deliberees par rapport au CA du backlog :

- **Pas de delegation a un "accompagnateur de terrain"** (mentionnee dans E3.6) : aucun role de ce
  type n'existe dans le systeme, en inventer un uniquement pour cette fonctionnalite secondaire
  aurait ete disproportionne.
- **Le mode VIDEO ne suppose aucune integration de visioconference reelle** (Zoom, Meet...) : les
  parties conviennent elles-memes du lien a utiliser, exactement comme les autres canaux non
  integres de la plateforme (voir "Notifications" plus bas).

Aucun motif n'est exige pour refuser une visite (contrairement aux cessions ou aux signalements) :
le CA d'E3.5/E3.6 ne le demande pas explicitement, et une visite refusee est un evenement mineur
comparee au rejet d'une cession ou d'un signalement.

## Inscription professionnelle et validation admin (E0.5/E0.6)

GEOMETRE, NOTAIRE et AGENT_BANQUE peuvent desormais s'inscrire en libre-service comme
CITOYEN/VENDEUR/ACHETEUR (avec numero d'agrement/d'ordre obligatoire), mais leur compte reste
bloque a la connexion (`StatutValidationPro.EN_ATTENTE`) meme apres confirmation du code envoye
par e-mail, tant qu'un admin ne l'a pas approuve depuis une file dediee (`/admin`, onglet
"Demandes professionnelles"). Ceci corrige une incoherence trouvee dans le code existant : les
comptes professionnels n'avaient jamais que la voie "admin cree tout directement", ce qui ne
correspond pas au parcours reel du backlog (E0.5 : le professionnel se presente lui-meme, E0.6 :
l'admin verifie ensuite). Les comptes institutionnels (AGENT_ANDF/MAGISTRAT_CSAF/ADMIN, E0.7)
restent, eux, exclusivement crees par un admin — jamais d'auto-inscription, sur exigence d'une
demande officielle de l'institution.

Aucune notification (e-mail/SMS) n'avertit le professionnel de la decision de l'admin, coherent
avec la decision "Notifications" plus bas (aucune passerelle reelle integree) : il decouvre le
resultat en retentant de se connecter, avec le motif de rejet affiche le cas echeant.

## Recherche et filtres sur la vitrine (E3.1)

Filtres combinables (commune, prix min/max, superficie min/max, badges "situation controlee
ANDF"/"limites certifiees") sur `GET /annonces`, en querystring plutot qu'un `POST /recherche`
dedie : coherent avec `estimation-prix`, deja en querystring sur la meme ressource. Le CA
mentionne aussi un affichage "sur carte" en plus de la liste — non construit dans cette
iteration (la carte existante, `CarteView.vue`, affiche toutes les parcelles cadastrales, pas
specifiquement les annonces actives ni leurs filtres) ; la liste filtrable couvre le besoin
principal (trouver rapidement un bien qui correspond). Recherche sauvegardee avec alerte (E3.2)
et comparaison cote a cote (E3.3), toutes deux P1, restent hors perimetre.

## Simulateur de gain net vendeur (E1.10)

Trois taux forfaitaires indicatifs (commission plateforme 2%, frais notariaux vendeur 1%, taxe
sur la plus-value 5%) — aucun de ces taux n'a de base reglementaire ou commerciale arretee a ce
stade du projet, ils servent uniquement a donner un ordre de grandeur honnete, explicitement
qualifie comme tel dans l'interface ("Simulation a taux forfaitaires indicatifs, pas un calcul
fiscal definitif"). Implemente comme une fonction pure partagee (`packages/shared/src/calculs/gain-net.ts`)
appelee directement cote client (recalcul instantane a chaque frappe dans le champ prix, sans
aucun aller-retour reseau) plutot que via un endpoint API : contrairement a l'estimation de prix
(E1.9, qui interroge des cessions reelles en base) ou au simulateur de frais acheteur existant
(qui appelle le backend), ce calcul ne depend d'aucune donnee serveur — le faire transiter par
une requete HTTP a chaque frappe n'aurait ajoute que de la latence sans aucun benefice.

## Estimation de prix (E1.9)

Calculee uniquement a partir des `Convention` reellement `VALIDEE` dans la meme commune
(prix/m² moyen). Aucune donnee de marche externe, aucun chiffre invente. Le nombre de
references utilisees est toujours renvoye, avec un avertissement explicite si ce nombre
est faible (< 3), plutot que de presenter une estimation comme fiable sans l'etre.

## Dossier de financement bancaire (E4.6-E4.9)

Demande de financement independante d'une annonce precise (champ `annonceId` optionnel) :
un acheteur peut vouloir un accord de principe avant meme d'avoir trouve un bien. Aucun
scoring automatique ni verification de revenus reelle — la banque partenaire (AGENT_BANQUE)
tranche elle-meme, avec un simple montant souhaite et un justificatif optionnel en piece
jointe (meme mecanisme de stockage que les decisions CSAF : hash SHA-256 sur disque, chemin
en base). L'acces de la banque a une demande est horodate des la premiere ouverture
(`dateConsultation`, pose une seule fois) pour repondre a l'exigence E4.7 de tracabilite,
sans notification en temps reel (coherent avec l'absence de passerelle e-mail/SMS deja
actee ailleurs).

Un accord de principe genere un `codeVerification` aleatoire (8 caracteres hexadecimaux) :
c'est le mecanisme complet de l'E4.8 ("attestation verifiable par le vendeur via un code"),
sans generation de PDF ni document formel — le vendeur saisit le code dans une page publique
(`GET /financements/verifier/:code`, sans authentification) et obtient une confirmation
minimale (nom de l'acheteur, montant accorde). Comme pour les documents CSAF, aucune route
ne sert le fichier justificatif televerse en telechargement — limitation deja actee pour les
autres uploads de la plateforme, pas specifique a cette fonctionnalite.

## Remboursement du sequestre sur decision CSAF (E5.8/E8.5)

Bug reel trouve en relisant `CsafService.leverGel()` a la lumiere d'E8.5 ("geler les fonds
concernes... afin de preserver les interets des parties en attendant la decision") : quand
un magistrat annule une vente (ANNULATION_VENTE/TRANSFERT_FORCE), les `Convention`
concernees passent bien en `REJETEE`, mais le `Sequestre` associe n'etait jamais mis a jour —
un depot deja declare ou confirme par la banque serait reste bloque indefiniment a
`DEPOT_DECLARE`/`DEPOT_CONFIRME`, sans qu'aucune autorite ne le solde. Corrige en repliquant
exactement le mecanisme deja utilise par `CessionsService.valider()` lors d'un rejet ANDF :
tout sequestre non deja `LIBERE`/`REMBOURSE` lie a une cession annulee par le CSAF passe a
`REMBOURSE`, avec un `motifRemboursement` citant la decision et une entree d'audit dediee.
Aucun changement frontend necessaire : `AcheterView.vue`/`VendreView.vue` affichent deja le
statut du sequestre de facon generique (`LIBELLE_STATUT_SEQUESTRE`), REMBOURSE s'y reflete
donc automatiquement.
