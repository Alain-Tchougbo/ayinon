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
portee et hors sujet pour une plateforme de securisation fonciere. Le sequestre est
represente comme un **suivi de statut** uniquement (depot declare -> confirme -> libere),
sans jamais pretendre detenir de fonds reels. A construire dans une prochaine iteration ;
en attendant, le depot de reservation reste absent plutot que simule de facon trompeuse.

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

## Estimation de prix (E1.9)

Calculee uniquement a partir des `Convention` reellement `VALIDEE` dans la meme commune
(prix/m² moyen). Aucune donnee de marche externe, aucun chiffre invente. Le nombre de
references utilisees est toujours renvoye, avec un avertissement explicite si ce nombre
est faible (< 3), plutot que de presenter une estimation comme fiable sans l'etre.
