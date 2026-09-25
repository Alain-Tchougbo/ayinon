# User Stories — Plateforme Fonciere AYINON

## Legende et conventions

Format de chaque story : **En tant que** [acteur], **je veux** [action], **afin de** [benefice].
Chaque story porte un identifiant `EX.Y-ACTEUR` (X = numero d'epic, Y = numero dans l'epic) et des criteres d'acceptation (CA) resumes.

Acteurs (codes utilises dans les identifiants) :

| Code | Acteur |
|---|---|
| ACH | Acheteur |
| VEN | Vendeur |
| CIT | Citoyen |
| GEO | Geometre |
| NOT | Notaire |
| MFA | Mandataire familial |
| ANDF | Agent ANDF |
| CSAF | Magistrat CSAF |
| BQ | Agent banque |
| ADM | Admin plateforme |

Niveaux de priorite indicatifs : **P0** = indispensable au lancement (MVP), **P1** = important peu apres, **P2** = amelioration.

Epics couverts : Epic 0 Inscription, Epic 1 Preparation de vente, Epic 2 Verification/publication, Epic 3 Recherche/visite, Epic 4 Offre/negociation/financement, Epic 5 Engagement/sequestre, Epic 6 Acte/paiement/transfert, Epic 7 Apres-vente, Epic 8 Litiges (CSAF), + stories transversales.

---

## Epic 0 — Inscription et habilitation

| ID | Story | CA principaux | Priorite |
|---|---|---|---|
| E0.1-ACH/VEN/CIT | En tant qu'acheteur, vendeur ou citoyen, je veux creer un compte avec mon numero de telephone ou e-mail, afin d'acceder a la plateforme. | Compte cree apres validation d'un code OTP ; mot de passe ou lien magique au choix. | P0 |
| E0.2-ACH/VEN | En tant qu'acheteur ou vendeur, je veux verifier mon identite (piece + selfie), afin d'obtenir un badge « identite verifiee ». | Document lisible, correspondance faciale validee automatiquement ou par un agent ; badge affiche sur le profil. | P0 |
| E0.3-VEN | En tant que vendeur, je veux declarer mon statut (proprietaire, heritier, mandataire, agence), afin que la plateforme adapte les pieces demandees. | Statut enregistre ; formulaire de pieces different selon le statut. | P0 |
| E0.4-MFA | En tant que mandataire familial, je veux televerser mon mandat ou proces-verbal de designation et la liste des ayants droit, afin d'etre habilite a representer la famille. | Document controle par l'admin avant activation du role ; liste des ayants droit stockee. | P0 |
| E0.5-GEO/NOT/BQ | En tant que geometre, notaire ou agent banque, je veux deposer mon numero d'agrement ou d'ordre professionnel, afin d'etre reconnu comme professionnel verifie sur la plateforme. | Numero controle (visuellement ou via un registre externe) ; compte en attente jusqu'a validation admin. | P0 |
| E0.6-ADM | En tant qu'admin, je veux valider ou rejeter les demandes d'inscription des professionnels, afin de garantir que seuls des acteurs legitimes operent sur la plateforme. | File d'attente des demandes ; motif de rejet obligatoire ; notification a l'interesse. | P0 |
| E0.7-ANDF/CSAF | En tant qu'agent ANDF ou magistrat CSAF, je veux recevoir un compte institutionnel cree par l'admin sur demande officielle de mon institution, afin d'acceder aux fonctionnalites reservees a mon role. | Compte cree uniquement par l'admin, jamais en auto-inscription ; authentification a deux facteurs obligatoire. | P0 |
| E0.8-ADM | En tant qu'admin, je veux attribuer des roles, permissions et zones de competence (commune, arrondissement) a chaque compte institutionnel, afin que chacun n'accede qu'aux dossiers relevant de son ressort. | Zones de competence configurables ; acces refuse hors zone. | P1 |
| E0.9-ACH/VEN | En tant qu'acheteur ou vendeur, je veux choisir mes langues et mes canaux de notification preferes, afin de recevoir l'information de facon adaptee. | Choix entre au moins deux langues et SMS/email/WhatsApp/push. | P1 |
| E0.10-Tous | En tant qu'utilisateur quel que soit mon role, je veux pouvoir exporter mes donnees ou fermer mon compte, afin de garder le controle sur mes informations personnelles. | Export au format lisible ; fermeture avec delai de retractation ; dossiers en cours non supprimes. | P2 |

---

## Epic 1 — Preparation de la vente

| ID | Story | CA principaux | Priorite |
|---|---|---|---|
| E1.1-VEN | En tant que vendeur, je veux creer une annonce guidee pas a pas (localisation, superficie, usage, acces, reseaux), afin de publier une parcelle complete sans connaissance technique. | Assistant multi-etapes ; enregistrement automatique en brouillon ; previsualisation avant envoi. | P0 |
| E1.2-VEN | En tant que vendeur, je veux positionner ma parcelle sur une carte et tracer ses limites, afin que l'acheteur voie exactement ce qu'il achete. | Trace sur fond satellite ; superficie calculee automatiquement ; alerte si chevauchement avec une parcelle deja enregistree. | P0 |
| E1.3-VEN | En tant que vendeur, je veux televerser mes documents (titre, plan cadastral, quitus, attestation), afin d'engager la verification. | Formats acceptes definis ; accuse de reception ; documents chiffres au stockage. | P0 |
| E1.4-VEN | En tant que vendeur, je veux declarer honnetement les litiges, hypotheques ou occupations existantes, afin d'eviter un rejet ou une annulation ulterieure. | Champ de declaration obligatoire ; fausse declaration detectee engage la responsabilite du vendeur (mention legale affichee). | P0 |
| E1.5-MFA | En tant que mandataire familial, je veux recueillir le consentement de chaque ayant droit avant la publication d'un bien familial, afin d'eviter une vente contestee ensuite. | Chaque ayant droit recoit une demande de validation ; annonce bloquee tant que le quorum requis n'est pas atteint. | P0 |
| E1.6-VEN | En tant que vendeur, je veux demander un bornage a un geometre partenaire directement depuis l'annonce, afin de faire certifier les limites de ma parcelle. | Liste de geometres disponibles dans la zone ; demande envoyee avec reference de la parcelle. | P0 |
| E1.7-GEO | En tant que geometre, je veux recevoir les demandes de bornage avec la localisation et les documents utiles, afin de planifier mon intervention. | Notification avec fiche parcelle ; acceptation ou refus avec motif ; agenda partage avec le vendeur. | P0 |
| E1.8-GEO | En tant que geometre, je veux deposer mon plan, mon leve GPS et mon rapport de bornage, afin de certifier la superficie et les limites de la parcelle. | Fichier de plan structure (coordonnees) ; rapport horodate et signe electroniquement ; badge « limites certifiees » pose automatiquement sur l'annonce. | P0 |
| E1.9-VEN | En tant que vendeur, je veux obtenir une estimation de prix fondee sur les ventes comparables du secteur, afin de fixer un prix realiste. | Fourchette de prix affichee avec le nombre de references utilisees ; prix minimum prive distinct du prix affiche. | P1 |
| E1.10-VEN | En tant que vendeur, je veux simuler le montant net que je recevrai apres frais et taxes, afin de connaitre mon gain reel avant de publier. | Simulateur integrant commission plateforme, frais de notaire estimes, taxes ; resultat mis a jour si le prix change. | P1 |
| E1.11-ANDF | En tant qu'agent ANDF, je veux consulter le systeme foncier pour verifier l'existence et la situation du titre ou du Certificat de Propriete Fonciere lie a une parcelle mise en vente, afin de confirmer qu'elle peut etre vendue. | Recherche par reference cadastrale ou coordonnees ; statut renvoye : conforme / a completer / anomalie, avec motif. | P0 |
| E1.12-ANDF | En tant qu'agent ANDF, je veux demander des pieces complementaires au vendeur lorsque le controle revele une anomalie, afin de securiser la transaction avant publication. | Message structure au vendeur avec liste des pieces manquantes ; annonce suspendue jusqu'a reponse. | P0 |
| E1.13-NOT | En tant que notaire, je veux donner un avis prealable sur la conformite des pieces d'une future vente, afin d'anticiper les blocages lors de l'acte. | Avis facultatif consultable par le vendeur ; horodate et non contraignant a ce stade. | P2 |
| E1.14-ADM | En tant qu'admin, je veux detecter les annonces a risque (doublons, photos suspectes, prix aberrant), afin de les mettre en revue avant diffusion. | Regles automatiques de detection ; file de moderation ; action de suspension ou de demande de correction. | P1 |

---

## Epic 2 — Verification et publication de l'annonce

| ID | Story | CA principaux | Priorite |
|---|---|---|---|
| E2.1-VEN | En tant que vendeur, je veux suivre le statut de verification de mon annonce (en attente, complement demande, validee), afin de savoir ou j'en suis. | Statut visible en temps reel ; historique des echanges avec l'ANDF conserve. | P0 |
| E2.2-ANDF | En tant qu'agent ANDF, je veux poser le badge « situation fonciere controlee » une fois ma verification terminee, afin d'informer l'acheteur du niveau de confiance de l'annonce. | Badge visible publiquement ; lie a la date et a l'identifiant de l'agent (non nominatif pour le public). | P0 |
| E2.3-GEO | En tant que geometre, je veux poser le badge « limites certifiees » apres depot de mon rapport, afin de valoriser une annonce dont les limites sont fiables. | Badge pose automatiquement a la validation du rapport de bornage. | P0 |
| E2.4-VEN | En tant que vendeur, je veux publier, mettre en pause, modifier ou retirer mon annonce a tout moment, afin de garder le controle sur sa visibilite. | Historique des versions conserve ; une annonce reservee ne peut etre republiee sans lever la reservation. | P0 |
| E2.5-VEN | En tant que vendeur, je veux partager le lien de mon annonce sur WhatsApp ou les reseaux sociaux, afin d'elargir mon audience. | Lien avec apercu (image, prix, superficie) genere automatiquement. | P1 |

---

## Epic 3 — Recherche, visite et contact

| ID | Story | CA principaux | Priorite |
|---|---|---|---|
| E2.6-CIT | En tant que citoyen, je veux consulter une annonce publique et signaler un probleme (parcelle familiale non consultee, occupant, litige connu), afin d'alerter la plateforme avant qu'un acheteur ne soit lese. | Formulaire de signalement accessible sans compte transactionnel ; accuse de reception. | P0 |
| E2.7-ADM | En tant qu'admin, je veux recevoir et qualifier les signalements citoyens, afin de suspendre une annonce si le signalement est fonde. | File de signalements ; suspension avec notification au vendeur et motif ; levee possible apres reponse du vendeur. | P0 |
| E2.8-ANDF | En tant qu'agent ANDF, je veux poser un verrou sur une parcelle signalee en attendant verification, afin d'empecher toute transaction pendant l'examen. | Verrou visible sur la fiche parcelle ; levee uniquement par l'agent ANDF competent. | P1 |
| E3.1-ACH | En tant qu'acheteur, je veux rechercher des parcelles par zone, prix, superficie et niveau de verification, afin de trouver rapidement des biens qui correspondent a mon projet. | Filtres combinables ; resultats en liste et sur carte ; temps de reponse < 2 s. | P0 |
| E3.2-ACH | En tant qu'acheteur, je veux sauvegarder une recherche et recevoir une alerte sur les nouvelles annonces correspondantes, afin de ne rien manquer. | Alerte par notification ou email ; frequence configurable. | P1 |
| E3.3-ACH | En tant qu'acheteur, je veux comparer plusieurs annonces cote a cote, afin de decider entre plusieurs options. | Comparaison sur prix, superficie, badges, distance ; jusqu'a 3 annonces a la fois. | P1 |
| E3.4-ACH | En tant qu'acheteur, je veux consulter le profil du vendeur (anciennete, ventes passees, avis), afin d'evaluer sa fiabilite avant de le contacter. | Note moyenne visible ; nombre de ventes conclues ; avis des acheteurs precedents. | P1 |
| E3.5-ACH | En tant qu'acheteur, je veux demander une visite, en presentiel ou en video a distance, afin d'evaluer la parcelle avant de m'engager. | Choix de creneau ; confirmation ou refus par le vendeur ; possibilite de reprogrammer. | P0 |
| E3.6-VEN/MFA | En tant que vendeur ou mandataire familial, je veux accepter, refuser ou deleguer une visite a un agent de terrain, afin de gerer ma disponibilite. | Delegation avec attribution d'un accompagnateur ; statut de la visite mis a jour pour toutes les parties. | P0 |
| E3.7-GEO | En tant que geometre, je veux etre associe a une visite pour montrer les bornes posees, afin de rassurer l'acheteur sur les limites reelles. | Invitation optionnelle a la visite envoyee par le vendeur ; confirmation de presence. | P2 |
| E3.8-CIT | En tant que citoyen, je veux consulter le statut d'une parcelle avant une transaction hors plateforme ou pour verifier un bien familial, afin de me proteger d'une fraude. | Recherche par reference ou localisation, accessible sans compte transactionnel. | P1 |
| E3.9-ADM | En tant qu'admin, je veux detecter les comportements suspects (comptes multiples, tentative de contact hors plateforme), afin de prevenir la fraude. | Regles de detection automatique ; alerte a l'equipe de moderation. | P1 |

---

## Epic 4 — Offre, negociation et financement

| ID | Story | CA principaux | Priorite |
|---|---|---|---|
| E4.1-ACH | En tant qu'acheteur, je veux faire une offre avec prix, conditions et calendrier de paiement, afin d'engager formellement la negociation. | Offre horodatee ; conditions suspensives selectionnables (verification titre, financement, bornage). | P0 |
| E4.2-ACH | En tant qu'acheteur, je veux contre-proposer, retirer ou renouveler une offre, afin de garder de la flexibilite dans la negociation. | Historique complet des offres conserve comme preuve. | P0 |
| E4.3-VEN/MFA | En tant que vendeur ou mandataire familial, je veux comparer plusieurs offres recues, afin de choisir la plus avantageuse. | Vue comparative prix / conditions / delai / serieux de l'acheteur (niveau de verification). | P0 |
| E4.4-MFA | En tant que mandataire familial, je veux faire valider l'acceptation d'une offre par les ayants droit avant de repondre a l'acheteur, afin d'eviter une contestation ulterieure. | Vote ou signature de chaque ayant droit requis avant que l'offre ne soit marquee acceptee. | P0 |
| E4.5-VEN | En tant que vendeur, je veux accorder une exclusivite temporaire a un acheteur, afin de securiser une negociation serieuse sans recevoir d'autres offres concurrentes. | Duree definie ; annonce marquee « en negociation exclusive » ; levee automatique a expiration. | P1 |
| E4.6-ACH | En tant qu'acheteur, je veux demander un accord de financement a une banque partenaire depuis la plateforme, afin de securiser mon budget avant de m'engager. | Demande envoyee avec les documents autorises par l'acheteur ; statut de la demande suivi. | P1 |
| E4.7-BQ | En tant qu'agent banque, je veux consulter la demande de financement et les documents transmis par l'acheteur, afin d'evaluer sa capacite d'emprunt. | Acces limite aux pieces autorisees par l'acheteur ; horodatage de la consultation. | P1 |
| E4.8-BQ | En tant qu'agent banque, je veux emettre une attestation de fonds ou un accord de principe, afin que l'acheteur puisse l'utiliser dans sa negociation. | Document genere et signe electroniquement, verifiable par le vendeur via un code. | P1 |
| E4.9-BQ | En tant qu'agent banque, je veux enregistrer la garantie envisagee (hypotheque) liee a un financement, afin de preparer son inscription lors de l'acte. | Garantie associee au dossier de transaction, visible du notaire. | P1 |
| E4.10-NOT | En tant que notaire, je veux etre consulte en amont sur la structure d'une vente complexe (financement, indivision), afin de securiser les etapes suivantes. | Acces en lecture au dossier avant signature de la promesse ; avis consigne dans le dossier. | P2 |

---

## Epic 5 — Engagement et sequestre

| ID | Story | CA principaux | Priorite |
|---|---|---|---|
| E5.1-ACH/VEN | En tant qu'acheteur ou vendeur, je veux signer electroniquement la promesse de vente, afin de formaliser notre accord sans deplacement. | Signature horodatee et infalsifiable ; document verrouille apres double signature. | P0 |
| E5.2-MFA | En tant que mandataire familial, je veux signer la promesse au nom de la famille avec les preuves de consentement jointes, afin que l'engagement soit opposable a tous les ayants droit. | Signature liee au dossier de consentement de l'Epic 1 ; refus si consentement incomplet. | P0 |
| E5.3-NOT | En tant que notaire, je veux rediger ou valider la promesse de vente et ouvrir le dossier de transaction, afin de securiser juridiquement la suite du processus. | Modele de promesse conforme au droit en vigueur ; dossier avec toutes les pieces deja collectees. | P0 |
| E5.4-ACH | En tant qu'acheteur, je veux verser mon depot de reservation sur un compte sequestre, afin de garantir mon serieux sans risquer mon argent avant la vente. | Paiement par mobile money, virement ou carte ; fonds bloques, non transferables au vendeur avant conditions remplies. | P0 |
| E5.5-BQ | En tant qu'agent banque, je veux ouvrir le compte sequestre et confirmer l'encaissement du depot, afin de garantir la securite des fonds pour les deux parties. | Confirmation visible par l'acheteur et le vendeur ; releve des mouvements consultable. | P0 |
| E5.6-BQ | En tant qu'agent banque, je veux suivre les paiements par tranches selon le calendrier convenu, afin d'assurer la tracabilite des versements. | Echeancier affiche ; alerte en cas de retard de paiement. | P1 |
| E5.7-ANDF | En tant qu'agent ANDF, je veux poser un verrou temporaire sur la parcelle engagee dans une transaction, afin d'empecher toute double vente pendant le processus. | Verrou visible sur la fiche parcelle ; toute autre offre bloquee automatiquement. | P0 |
| E5.8-ACH | En tant qu'acheteur, je veux demander le remboursement de mon depot si une condition suspensive echoue, afin de ne pas perdre mon argent pour une raison hors de mon controle. | Demande instruite par le notaire et la banque ; delai de remboursement affiche. | P0 |
| E5.9-ADM | En tant qu'admin, je veux surveiller les delais de chaque etape et relancer les acteurs en retard, afin d'eviter le blocage des transactions. | Tableau de bord des delais ; relance automatique apres un seuil configurable. | P1 |

---

## Epic 6 — Acte, paiement et transfert

| ID | Story | CA principaux | Priorite |
|---|---|---|---|
| E6.1-NOT | En tant que notaire, je veux preparer le projet d'acte et convoquer les parties, afin de finaliser juridiquement la vente. | Modele d'acte pre-rempli a partir du dossier ; convocation avec date et lieu ou lien de signature a distance. | P0 |
| E6.2-ACH/VEN | En tant qu'acheteur ou vendeur, je veux relire le projet d'acte et signaler une erreur avant signature, afin d'eviter une erreur definitive. | Commentaires horodates sur le projet ; version corrigee renvoyee avant signature finale. | P0 |
| E6.3-ACH/VEN/MFA | En tant qu'acheteur, vendeur ou mandataire familial, je veux signer l'acte final, afin de conclure la vente. | Signature electronique ou presentielle selon la loi en vigueur ; document verrouille apres signature de toutes les parties. | P0 |
| E6.4-GEO | En tant que geometre, je veux deposer le plan definitif en cas de division ou reunion de parcelles, afin que la mutation soit techniquement coherente. | Plan lie au dossier de l'acte ; validation croisee avec le plan de bornage initial. | P1 |
| E6.5-ANDF | En tant qu'agent ANDF, je veux instruire la demande de mutation et mettre a jour le registre foncier, afin d'enregistrer officiellement le changement de proprietaire. | Registre mis a jour ; nouveau titre ou Certificat de Propriete Fonciere emis au nom de l'acheteur ; ancien titre archive. | P0 |
| E6.6-NOT | En tant que notaire, je veux calculer les frais et droits dus et suivre leur paiement, afin de finaliser le dossier avant depot a l'ANDF. | Detail des frais affiche aux parties ; blocage du depot tant que les frais ne sont pas regles. | P0 |
| E6.7-BQ | En tant qu'agent banque, je veux liberer les fonds sequestres au vendeur sur instruction du notaire une fois les conditions remplies, afin de clore la transaction financiere. | Liberation declenchee uniquement par validation croisee notaire + statut ANDF ; recu genere automatiquement. | P0 |
| E6.8-BQ | En tant qu'agent banque, je veux inscrire l'hypotheque convenue lors du financement, afin de garantir le credit accorde a l'acheteur. | Inscription liee au nouveau titre ; visible sur la fiche parcelle mise a jour. | P1 |
| E6.9-MFA | En tant que mandataire familial, je veux repartir les fonds recus selon les regles convenues avec la famille, afin d'assurer une distribution transparente et tracable. | Repartition enregistree dans le dossier ; justificatif accessible a chaque ayant droit. | P1 |
| E6.10-ACH | En tant qu'acheteur, je veux recevoir mon titre ou Certificat de Propriete Fonciere et mes justificatifs dans mon espace personnel, afin de disposer d'une preuve definitive de propriete. | Documents telechargeables ; notification de disponibilite. | P0 |
| E6.11-ADM | En tant qu'admin, je veux gerer les blocages techniques (paiement en echec, piece rejetee), afin de debloquer une transaction sans intervenir sur le fond juridique du dossier. | Outils de diagnostic technique ; toute decision de fond reste a l'acteur competent (notaire, ANDF, banque). | P1 |

---

## Epic 7 — Apres la vente

| ID | Story | CA principaux | Priorite |
|---|---|---|---|
| E7.1-ACH | En tant qu'acheteur, je veux acceder a un coffre numerique regroupant titre, acte, plans et recus, afin de retrouver tous mes documents en un seul endroit. | Coffre personnel accessible en permanence ; export possible en PDF groupe. | P0 |
| E7.2-ACH | En tant qu'acheteur, je veux commander une surveillance periodique de ma parcelle (photos, alertes d'occupation), afin de detecter rapidement une intrusion ou un empietement. | Service optionnel ; alerte envoyee en cas de changement detecte. | P2 |
| E7.3-ACH | En tant qu'acheteur, je veux mettre ma parcelle en gestion, en location ou en revente sur la plateforme, afin de valoriser mon bien plus tard sans ressaisir mes informations. | Reutilisation automatique des donnees deja verifiees de la parcelle. | P2 |
| E7.4-BQ | En tant qu'agent banque, je veux suivre l'hypotheque inscrite et gerer sa mainlevee une fois le credit rembourse, afin de tenir a jour la situation de la garantie. | Mainlevee transmise a l'ANDF pour mise a jour du registre. | P1 |
| E7.5-ANDF | En tant qu'agent ANDF, je veux refleter tout changement (nouveau proprietaire, levee d'hypotheque) dans la fiche parcelle, afin que le registre reste fiable dans le temps. | Fiche parcelle toujours a jour ; historique des proprietaires conserve. | P0 |
| E7.6-CIT | En tant que citoyen, je veux consulter le statut public actualise d'une parcelle apres une vente, afin de verifier une information avant une transaction future. | Statut public reflete en temps reel les changements valides par l'ANDF. | P1 |
| E7.7-ACH/VEN | En tant qu'acheteur ou vendeur, je veux noter mon interlocuteur a la fin de la transaction, afin d'aider les futurs utilisateurs a evaluer sa fiabilite. | Note et commentaire moderes avant publication ; reciproque entre les deux parties. | P1 |
| E7.8-ADM | En tant qu'admin, je veux archiver automatiquement chaque dossier clos et generer des rapports d'activite, afin de garder une tracabilite complete et de mesurer l'usage de la plateforme. | Archive consultable en cas de litige futur ; rapports exportables. | P1 |

---

## Epic 8 — Litiges et recours (CSAF)

| ID | Story | CA principaux | Priorite |
|---|---|---|---|
| E8.1-CIT/ACH/VEN/MFA | En tant que citoyen, acheteur, vendeur ou mandataire familial, je veux ouvrir un signalement ou une contestation avec preuves a l'appui, afin de faire valoir mes droits sur une parcelle. | Formulaire structure ; pieces jointes ; accuse de reception avec numero de dossier. | P0 |
| E8.2-ADM | En tant qu'admin, je veux qualifier un signalement et geler la transaction concernee si necessaire, afin d'eviter qu'une vente litigieuse n'aboutisse pendant l'instruction. | Gel reversible ; notification a toutes les parties du dossier concerne. | P0 |
| E8.3-ANDF | En tant qu'agent ANDF, je veux fournir l'etat de la parcelle et l'historique des droits enregistres dans le cadre d'un litige, afin d'eclairer l'instruction du dossier. | Extrait d'historique genere en un clic, horodate, non modifiable. | P0 |
| E8.4-NOT/GEO | En tant que notaire ou geometre, je veux fournir mes actes et plans comme elements de preuve dans un dossier de litige, afin de contribuer a son instruction. | Documents transmis avec tracabilite de la demande et du depot. | P1 |
| E8.5-BQ | En tant qu'agent banque, je veux fournir l'historique des flux financiers lies a une transaction contestee et geler les fonds concernes sur instruction, afin de preserver les interets des parties en attendant la decision. | Gel des fonds reversible uniquement sur instruction du magistrat ou de l'admin habilite. | P0 |
| E8.6-CSAF | En tant que magistrat CSAF, je veux acceder au dossier complet et horodate d'une transaction contestee (annonce, verifications, promesses, actes, paiements, echanges), afin de statuer en connaissance de cause. | Acces en lecture seule, reserve aux dossiers de sa competence territoriale et materielle ; export possible pour la procedure judiciaire. | P0 |
| E8.7-CSAF | En tant que magistrat CSAF, je veux ordonner une mesure conservatoire (blocage de la parcelle, suspension d'une vente), afin de preserver la situation le temps de la procedure. | Mesure appliquee automatiquement sur la fiche parcelle ; notification immediate aux parties concernees. | P0 |
| E8.8-CSAF | En tant que magistrat CSAF, je veux televerser ma decision definitive, afin que la plateforme applique ses effets sur le statut de la parcelle et de la transaction. | Decision horodatee et authentifiee ; statut de la parcelle mis a jour automatiquement (levee du gel, annulation de vente, transfert force selon le cas). | P0 |
| E8.9-Tous | En tant que partie prenante d'un dossier de litige, je veux suivre l'etat d'avancement de la procedure sans acceder aux pieces qui ne me concernent pas, afin de rester informe tout en respectant la confidentialite du dossier. | Vue d'avancement limitee (etapes, dates), sans acces aux pieces reservees aux parties habilitees. | P1 |

---

## Stories transversales

| ID | Story | CA principaux | Priorite |
|---|---|---|---|
| ET.1-Tous | En tant qu'utilisateur quel que soit mon role, je veux recevoir des notifications sur les evenements qui me concernent, afin de ne rater aucune etape importante de mes dossiers. | Notifications par push, SMS, email ou WhatsApp selon preference ; centre de notifications dans l'application. | P0 |
| ET.2-Tous | En tant qu'utilisateur, je veux echanger des messages avec les autres parties d'un dossier directement sur la plateforme, afin de garder une preuve ecrite de nos echanges. | Messagerie horodatee, non modifiable apres envoi, rattachee au dossier concerne. | P0 |
| ET.3-ADM | En tant qu'admin, je veux consulter un journal d'audit de toutes les actions effectuees sur un dossier, afin de garantir la tracabilite en cas de controle ou de litige. | Journal horodate, signe, incluant l'identite de l'auteur de chaque action ; acces egalement possible pour un magistrat sur requisition. | P0 |
| ET.4-Tous | En tant qu'utilisateur, je veux acceder a une aide (chat, WhatsApp, telephone) adaptee a mon role, afin d'etre accompagne en cas de difficulte. | Support differencie grand public / professionnels / institutions ; delai de reponse affiche. | P1 |
| ET.5-ADM | En tant qu'admin, je veux configurer les permissions d'acces aux donnees sensibles selon le role et le consentement de la personne concernee, afin de respecter la confidentialite de chacun. | Matrice de permissions par role ; consentement explicite requis pour tout acces a une donnee personnelle par un tiers (ex. banque). | P0 |
| ET.6-Tous | En tant qu'utilisateur, je veux que toute action importante (signature, paiement, decision) soit horodatee et infalsifiable, afin que la plateforme fasse foi en cas de desaccord ou de procedure judiciaire. | Horodatage certifie ; integrite verifiable (hash ou equivalent) ; export possible pour une procedure. | P0 |
| ET.7-Tous | En tant qu'utilisateur avec une connexion limitee ou un usage mobile, je veux que la plateforme reste utilisable en 2G/3G et sur telephone d'entree de gamme, afin de ne pas etre exclu par des contraintes techniques. | Interface allegee disponible ; synchronisation differee en cas de coupure reseau. | P1 |
| ET.8-ADM | En tant qu'admin, je veux que la plateforme ne puisse jamais modifier un acte notarie, une decision judiciaire ou une inscription au registre foncier autrement que par les acteurs legalement habilites, afin de respecter la separation entre l'outil numerique et l'autorite legale de chaque institution. | Toute modification de ces objets requiert l'action du role competent (notaire, ANDF, CSAF) ; aucune action admin ne peut s'y substituer. | P0 |
