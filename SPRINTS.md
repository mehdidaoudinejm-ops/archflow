# ArchFlow — Plan de Sprints Claude Code

> Ce fichier contient les 10 sprints du Module DPGF.
> Pour chaque sprint : copie la section "MISSION CLAUDE CODE" et colle-la dans ton terminal Claude Code.
> Mets à jour le statut dans CLAUDE.md après chaque sprint terminé.

---

## Comment utiliser ce fichier

1. Ouvre ton terminal dans le dossier du projet
2. Lance `claude` (Claude Code)
3. Copie-colle la mission du sprint en cours
4. Laisse Claude Code travailler — il peut faire plusieurs actions à la suite
5. Quand il a fini, teste manuellement ce qui a été construit
6. Si tout fonctionne, passe au sprint suivant

---

## Sprint S01 — Setup projet + authentification

**Durée estimée** : 1-2h
**Prérequis** : Compte Supabase créé, compte Vercel créé, Node.js installé

---

### MISSION CLAUDE CODE — S01

```
Tu construis ArchFlow, un SaaS pour architectes d'intérieur.
Lis le fichier CLAUDE.md pour comprendre le projet complet avant de commencer.

OBJECTIF DE CE SPRINT :
Initialiser le projet Next.js et construire le système d'authentification complet.

ÉTAPES À RÉALISER DANS L'ORDRE :

1. Initialiser le projet Next.js 14 avec TypeScript et Tailwind :
   npx create-next-app@latest archflow --typescript --tailwind --app --src-dir

2. Installer toutes les dépendances du projet :
   - @supabase/supabase-js @supabase/ssr
   - prisma @prisma/client
   - @anthropic-ai/sdk
   - resend react-email @react-email/components
   - stripe @stripe/stripe-js
   - zod
   - @tanstack/react-table
   - recharts
   - @react-pdf/renderer
   - shadcn/ui (initialiser avec : npx shadcn-ui@latest init)
   - Installer les composants shadcn : button, input, label, card, dialog, dropdown-menu, table, badge, toast, separator, sheet, avatar, progress

3. Créer le fichier .env.example avec toutes les variables listées dans CLAUDE.md section 6.

4. Configurer Prisma :
   - Créer prisma/schema.prisma avec le modèle de données COMPLET de la section 5 du CLAUDE.md
   - Configurer la connexion Supabase dans schema.prisma

5. Créer src/lib/supabase.ts avec :
   - createBrowserClient() pour le client côté navigateur
   - createServerClient() pour le client côté serveur (Server Components)

6. Créer src/lib/auth.ts avec :
   - getSession() : récupère la session courante depuis Supabase
   - requireRole(allowedRoles: Role[]) : vérifie le rôle de l'utilisateur, throw si non autorisé
   - getUserWithProfile() : récupère l'utilisateur + son profil Prisma

7. Créer src/middleware.ts qui :
   - Protège toutes les routes sous /(shell)/ → redirige vers /login si non connecté
   - Protège toutes les routes sous /portal/ → vérifie le token JWT entreprise
   - Protège toutes les routes sous /client/ → vérifie que l'utilisateur est CLIENT
   - Laisse passer les routes /login, /register, /api/webhooks/*

8. Créer les pages d'authentification :
   - src/app/(auth)/login/page.tsx : formulaire email + mot de passe, lien "Mot de passe oublié"
   - src/app/(auth)/register/page.tsx : formulaire pour créer un compte ARCHITECT (nom, email, mot de passe, nom du cabinet)
   - src/app/(auth)/forgot-password/page.tsx : formulaire email pour reset
   - Design inspiré de Mesetys : fond --bg, card centrée, logo ArchFlow en DM Serif Display, accents verts

9. Créer le layout shell src/app/(shell)/layout.tsx avec :
   - Topbar : logo ArchFlow, nom du projet actif, cloche notifications, avatar
   - Sidebar : navigation par module (DPGF actif, autres grisés avec "Bientôt")
   - Zone principale : slot pour le contenu

10. Créer src/app/(shell)/dashboard/page.tsx :
    - Liste des projets de l'agence
    - Bouton "Créer un projet"
    - État vide si aucun projet

11. Créer l'API route src/app/api/projects/route.ts :
    - GET : liste les projets de l'agence de l'utilisateur connecté
    - POST : crée un nouveau projet (name, address)

DESIGN À RESPECTER (voir CLAUDE.md section 9) :
- Police DM Serif Display (titres) + DM Sans (corps) via Google Fonts dans layout.tsx
- Variables CSS dans globals.css exactement comme spécifié dans CLAUDE.md
- Vert #1A5C3A comme couleur principale
- Interface aérée, beaucoup d'espace blanc, ombres très légères

À LA FIN, vérifie que :
- npm run dev fonctionne sans erreur
- npx tsc --noEmit ne retourne aucune erreur TypeScript
- La page /login s'affiche avec le bon design
- La redirection fonctionne (/ → /login si non connecté, /login → /dashboard si connecté)
```

---

## Sprint S02 — Base de données + migrations

**Durée estimée** : 1h
**Prérequis** : S01 terminé, URL Supabase configurée dans .env.local

---

### MISSION CLAUDE CODE — S02

```
Lis le fichier CLAUDE.md avant de commencer.

OBJECTIF : Appliquer le modèle de données Prisma et créer les données de test.

ÉTAPES :

1. Vérifier que prisma/schema.prisma est complet (toutes les tables de CLAUDE.md section 5).
   Si des tables manquent, les ajouter maintenant.

2. Appliquer la migration initiale :
   npx prisma migrate dev --name init

3. Créer src/lib/prisma.ts — client Prisma singleton :
   - Utiliser le pattern singleton pour éviter trop de connexions en dev
   - Exporter le client prisma

4. Créer prisma/seed.ts qui crée des données de test réalistes :
   - 1 agence : "Cabinet Durand Architecture"
   - 1 utilisateur ARCHITECT : jean@durand-archi.fr / Test1234!
   - 1 projet : "Villa Martignon — Paris 16e"
   - 1 DPGF avec 2 lots et 5 postes (utiliser des vrais intitulés de travaux)
   - 3 entreprises (comptes COMPANY) : entreprise-a@test.fr, entreprise-b@test.fr, entreprise-c@test.fr
   - 10 entrées dans la bibliothèque d'intitulés (postes de démo)

5. Lancer le seed :
   npx prisma db seed

6. Créer src/app/api/projects/[projectId]/route.ts :
   - GET : retourne les détails d'un projet (vérifie que l'utilisateur appartient à l'agence)

7. Vérifier avec Prisma Studio que les données sont bien créées :
   npx prisma studio

À LA FIN :
- npx prisma studio montre les tables avec les données seed
- npx tsc --noEmit sans erreur
```

---

## Sprint S03 — DPGF : structure + CRUD

**Durée estimée** : 2-3h
**Prérequis** : S02 terminé

---

### MISSION CLAUDE CODE — S03

```
Lis CLAUDE.md avant de commencer.

OBJECTIF : Construire les API CRUD pour la DPGF, les lots et les postes.

ÉTAPES :

1. Créer les routes API DPGF :

   src/app/api/dpgf/[dpgfId]/route.ts
   - GET : retourne la DPGF complète avec ses lots, sous-lots et postes
     → IMPORTANT : ne jamais retourner unitPriceArchi si l'appelant est COMPANY
   - PATCH : modifie le statut de la DPGF

   src/app/api/dpgf/[dpgfId]/lots/route.ts
   - GET : liste les lots d'une DPGF
   - POST : crée un lot (name, position auto-calculée)

   src/app/api/dpgf/[dpgfId]/lots/[lotId]/route.ts
   - PATCH : modifie nom, position d'un lot
   - DELETE : supprime un lot (avec confirmation si des offres existent)

   src/app/api/dpgf/[dpgfId]/lots/[lotId]/posts/route.ts
   - GET : liste les postes d'un lot
   - POST : crée un poste (title, unit, qtyArchi, unitPriceArchi, isOptional, commentArchi)
     → Calcule automatiquement le ref (ex: "01.02.03")

   src/app/api/dpgf/[dpgfId]/lots/[lotId]/posts/[postId]/route.ts
   - PATCH : modifie un poste
   - DELETE : archive le poste (ne pas supprimer si des OfferPost existent)

   src/app/api/dpgf/[dpgfId]/lots/reorder/route.ts
   - PATCH : reçoit un tableau de { lotId, position } et met à jour les positions

2. Créer les hooks React :

   src/hooks/useDPGF.ts
   - Fetche la DPGF et ses lots/postes
   - Expose : dpgf, lots, isLoading, error
   - Expose les mutations : addLot, updateLot, deleteLot, addPost, updatePost, deletePost, reorderLots

3. Créer src/app/(shell)/(modules)/dpgf/[projectId]/page.tsx :
   - Page principale de la DPGF
   - Affiche les stats en haut (estimatif total, nb postes, prix manquants)
   - Render le composant DPGFTable (à créer au sprint suivant — pour l'instant placeholder)
   - Boutons : "Importer PDF/Excel", "Exporter PDF", "Lancer l'AO"

4. Ajouter la validation Zod sur toutes les routes POST/PATCH :
   - Créer src/lib/validations/dpgf.ts avec les schémas Zod pour Lot et Post

5. Écrire les tests de l'API avec des fetch directs (pas de framework de test) :
   - Créer src/tests/dpgf.http avec des exemples de requêtes REST commentées

À LA FIN :
- Toutes les routes API répondent correctement (tester avec curl ou l'extension REST Client de VS Code)
- npx tsc --noEmit sans erreur
- Les données créées via POST apparaissent dans Prisma Studio
```

---

## Sprint S04 — DPGF : éditeur tableau en ligne

**Durée estimée** : 3-4h (sprint le plus complexe)
**Prérequis** : S03 terminé

---

### MISSION CLAUDE CODE — S04

```
Lis CLAUDE.md avant de commencer. C'est le sprint le plus critique visuellement.

OBJECTIF : Construire le tableau DPGF éditeur — interface principale de la plateforme.

ÉTAPES :

1. Créer src/components/dpgf/DPGFTable.tsx :
   Tableau avec TanStack Table, colonnes :
   - Réf (auto, non éditable, style monospace gris)
   - Intitulé (éditable en clic, input inline)
   - Qté archi (éditable, input numérique)
   - Unité (éditable, select : m², ml, u, kg, forfait, h, m³, ens.)
   - P. Unit. € (éditable, input numérique — masqué si l'utilisateur est COMPANY)
   - Total € (calculé automatiquement, non éditable)
   - Actions (bouton "⋯" → dropdown : Dupliquer, Supprimer, Ajouter à la bibliothèque)

2. Rows spéciales :
   - LotRow : ligne de séparation pour chaque lot avec nom + total du lot + chevron plier/déplier
   - AddPostRow : ligne "+ Ajouter un poste" sous chaque lot
   - AddLotRow : bouton en bas du tableau "+ Ajouter un lot"

3. Édition inline :
   - Clic sur une cellule éditable → remplace le texte par un input
   - Perte de focus ou Entrée → sauvegarde via PATCH API
   - Pas de bouton "Sauvegarder" visible — auto-save immédiat
   - Indicateur discret "Sauvegardé ✓" pendant 2s après chaque save

4. Calculs temps réel :
   - Total par poste = qtyArchi × unitPriceArchi (affiché immédiatement, avant save)
   - Total par lot = somme des totaux des postes
   - Total général = somme des totaux des lots
   - Afficher "—" si prix manquant, pas 0

5. Drag & drop pour réordonner les lots :
   - Utiliser @dnd-kit/core et @dnd-kit/sortable
   - Handle de drag sur la LotRow (icône ⠿)
   - Appeler l'API /lots/reorder au drop

6. Badges et indicateurs :
   - Badge "OPTIONNEL" violet sur les postes optionnels
   - Texte en rouge/orange si prix unitaire manquant
   - Nombre de "prix manquants" dans les stats en haut

7. Virtualisation pour les longues listes :
   - Utiliser @tanstack/react-virtual
   - Activer si plus de 50 postes visibles

8. Créer src/components/dpgf/StatsBar.tsx :
   - 4 cartes de stats : Estimatif total / Nb postes / Prix manquants / Bibliothèque
   - Design : cartes blanches, ombre légère, chiffres en DM Serif Display

9. Créer src/components/dpgf/DPGFToolbar.tsx :
   - Barre d'outils au-dessus du tableau
   - Recherche plein texte (filtre les postes en temps réel)
   - Bouton "+ Depuis bibliothèque" (ouvre un Sheet latéral)
   - Boutons "Importer", "Exporter PDF", "Lancer l'AO"

10. Assembler dans src/app/(shell)/(modules)/dpgf/[projectId]/page.tsx :
    - StatsBar → DPGFToolbar → DPGFTable

DESIGN (impératif) :
- Respecter exactement les tokens CSS de CLAUDE.md section 9
- Lot rows : fond #F3F3F0, texte gras
- Hover sur les lignes : fond #FAFAF8
- Inputs inline : border-bottom uniquement (pas de border complet)
- Colonnes numériques : text-align right, font-variant-numeric tabular-nums

À LA FIN :
- Le tableau s'affiche avec les données seed
- L'édition inline fonctionne sur toutes les colonnes
- Les totaux se mettent à jour en temps réel
- Le drag & drop des lots fonctionne
- npx tsc --noEmit sans erreur
```

---

## Sprint S05 — Bibliothèque d'intitulés

**Durée estimée** : 1-2h
**Prérequis** : S04 terminé

---

### MISSION CLAUDE CODE — S05

```
Lis CLAUDE.md avant de commencer.

OBJECTIF : Construire la bibliothèque d'intitulés réutilisables.

ÉTAPES :

1. Routes API :
   src/app/api/library/route.ts
   - GET : liste les intitulés de l'agence (filtre : search, trade, unit)
   - POST : ajoute un intitulé (title, unit, avgPrice, trade)

   src/app/api/library/[id]/route.ts
   - DELETE : supprime un intitulé

   src/app/api/dpgf/[dpgfId]/lots/[lotId]/posts/from-library/route.ts
   - POST : crée un poste à partir d'un intitulé de la bibliothèque
   - Met à jour le usageCount de l'entrée bibliothèque

   src/app/api/dpgf/[dpgfId]/lots/[lotId]/posts/[postId]/save-to-library/route.ts
   - POST : sauvegarde un poste existant dans la bibliothèque

2. Composant src/components/dpgf/LibrarySheet.tsx :
   - Sheet (panel latéral droit) qui s'ouvre depuis la toolbar
   - Barre de recherche plein texte
   - Filtres : corps de métier (Démolition, Plâtrerie, Électricité, Plomberie, Peinture, Menuiserie, Revêtements, Mobilier, Divers)
   - Liste des intitulés : titre, unité, prix moyen, badge corps de métier
   - Bouton "+" sur chaque intitulé → l'insère comme nouveau poste dans le lot sélectionné

3. Bouton "Sauvegarder dans la bibliothèque" dans le dropdown "⋯" de chaque poste :
   - Ouvre une mini dialog de confirmation
   - Permet de choisir le corps de métier avant de sauvegarder

4. Mise à jour des stats dans StatsBar :
   - La carte "Bibliothèque" affiche le nombre réel d'intitulés de l'agence

À LA FIN :
- Ouvrir le panel bibliothèque depuis le tableau
- Chercher un intitulé et l'insérer dans la DPGF
- Sauvegarder un poste dans la bibliothèque depuis son menu
- npx tsc --noEmit sans erreur
```

---

## Sprint S06 — Appel d'offre + invitation entreprises

**Durée estimée** : 3-4h
**Prérequis** : S05 terminé, Resend configuré

---

### MISSION CLAUDE CODE — S06

```
Lis CLAUDE.md avant de commencer.

OBJECTIF : Construire le système d'appel d'offre et d'invitation des entreprises.

ÉTAPES :

1. Routes API :
   src/app/api/ao/route.ts — POST : créer et envoyer un AO
   src/app/api/ao/[aoId]/route.ts — GET / PATCH / DELETE
   src/app/api/ao/[aoId]/invite/route.ts — POST : inviter une entreprise
   src/app/api/ao/[aoId]/companies/route.ts — GET : liste des entreprises invitées + statuts
   src/app/api/ao/[aoId]/close/route.ts — POST : clôturer l'AO

2. Logique d'invitation (src/lib/invite.ts) :
   - Générer un token JWT signé avec expiration = deadline AO + 48h
   - Vérifier si l'email a déjà un compte :
     * Compte COMPANY existant → envoyer email "nouvel AO disponible"
     * Compte ARCHITECT existant → retourner erreur 409 avec message explicite
     * Pas de compte → envoyer email d'invitation avec lien de création de compte
   - L'URL d'invitation forcée : /register/company?token=XXX&ao=YYY

3. Page d'inscription entreprise :
   src/app/(auth)/register/company/page.tsx
   - Vérifie la validité du token JWT à l'arrivée sur la page
   - Si invalide ou expiré : page "Ce lien n'est plus valide"
   - Si valide : formulaire (nom société, corps de métier, prénom, nom, mot de passe)
   - À la validation : crée le compte COMPANY + l'associe à l'AO + redirige vers le portail

4. Templates emails (src/emails/) :
   src/emails/InvitationEmail.tsx — email d'invitation première visite
   src/emails/NewAOEmail.tsx — notification compte existant
   src/emails/OfferReceivedEmail.tsx — notification architecte à réception offre

5. Wizard de création d'AO :
   src/app/(shell)/(modules)/dpgf/[projectId]/ao/page.tsx
   Étape 1 : Sélection des lots à inclure (checkboxes avec nb postes + estimatif par lot)
   Étape 2 : Paramètres (deadline, instructions texte riche, pièces demandées, AO payant)
   Étape 3 : Invitation entreprises (input email + bouton "Inviter", liste des entreprises ajoutées)
   Étape 4 : Récapitulatif + bouton "Envoyer l'AO"

6. Page de suivi AO :
   src/app/(shell)/(modules)/dpgf/[projectId]/ao/[aoId]/page.tsx
   - Statut par entreprise (tableau avec indicateurs)
   - Bouton "Relancer les entreprises sans réponse"
   - Compte à rebours jusqu'à la deadline
   - Bouton "Clôturer l'AO"

7. Middleware portal :
   src/middleware.ts — ajouter la vérification du token JWT pour /portal/*

À LA FIN :
- Créer un AO via le wizard
- Inviter une entreprise par email (vérifier la réception dans Resend dashboard)
- L'email contient un lien valide vers l'inscription
- Le compte entreprise créé est bien de type COMPANY
- npx tsc --noEmit sans erreur
```

---

## Sprint S07 — Portail entreprise

**Durée estimée** : 3-4h
**Prérequis** : S06 terminé

---

### MISSION CLAUDE CODE — S07

```
Lis CLAUDE.md avant de commencer.

OBJECTIF : Construire le portail de saisie des prix pour les entreprises.

ÉTAPES :

1. Layout portail (distinct du shell architecte) :
   src/app/portal/layout.tsx
   - Topbar simplifiée : logo ArchFlow, nom de l'AO, deadline + countdown, avatar entreprise
   - Sidebar : Mon offre / Plans DCE / Questions / Mes documents / Progression
   - Pas de navigation vers d'autres projets (cloisonnement strict)

2. Routes API portail :
   src/app/api/portal/[aoId]/route.ts
   - GET : retourne la DPGF (SANS estimatif archi), infos AO, statut de l'offre
   - Vérification : le compte connecté est bien COMPANY + est bien invité à cet AO

   src/app/api/portal/[aoId]/offer/route.ts
   - GET : retourne l'offre en cours (pour reprendre la saisie)
   - POST/PATCH : sauvegarde les prix (autosave)
   - PUT : soumet l'offre définitivement (avec validations)

3. Page de saisie des prix :
   src/app/portal/[aoId]/page.tsx
   
   Tableau de saisie :
   - Colonnes : Réf, Intitulé, Qté archi, [Ma qté si option activée], Unité, Mon prix, Total
   - Colonnes estimatif archi = ABSENTES côté portail
   - Input numérique sur "Mon prix" — focus auto sur le premier vide
   - Si allowCustomQty = true : colonne "Ma qté" avec input + motif obligatoire si modifié
   - Badge OPTIONNEL + case "Ne pas chiffrer" sur postes optionnels
   - Total calculé = qtyRetenue × unitPrice en temps réel
   - Autosave 3 secondes après la dernière frappe (debounce)

4. Validation à la soumission :
   - Tous les postes obligatoires ont un prix > 0 (ou explicitement à 0 avec confirmation)
   - Toutes les quantités modifiées ont un motif renseigné
   - Modale de confirmation avec récapitulatif (total par lot + total général)
   - Après soumission : page de confirmation + PDF récapitulatif téléchargeable

5. Gestion pièces admin :
   src/app/portal/[aoId]/documents/page.tsx (admin docs)
   - Liste des documents demandés avec statut
   - Upload par drag & drop vers Supabase Storage
   - Notification email à l'architecte à chaque dépôt

6. Hook useOffer.ts :
   - Gère l'état local de l'offre en cours
   - Debounce de l'autosave
   - Optimistic updates pour la réactivité

7. Indicateur de progression dans la sidebar :
   - Calcul : (postes renseignés / postes obligatoires) × 100
   - Barre de progression verte

À LA FIN :
- Se connecter avec un compte entreprise depuis le lien d'invitation
- Saisir des prix, vérifier l'autosave dans Prisma Studio
- Proposer une quantité différente avec motif
- Soumettre l'offre et vérifier la notification email à l'architecte
- npx tsc --noEmit sans erreur
```

---

## Sprint S08 — DCE + Q&A + Espace client

**Durée estimée** : 3-4h
**Prérequis** : S07 terminé

---

### MISSION CLAUDE CODE — S08

```
Lis CLAUDE.md avant de commencer.

OBJECTIF : Section DCE (plans), module Q&A et espace client.

SECTION DCE :

1. Routes API :
   src/app/api/ao/[aoId]/documents/route.ts — GET / POST (upload)
   src/app/api/ao/[aoId]/documents/[docId]/route.ts — PATCH / DELETE
   src/app/api/ao/[aoId]/documents/[docId]/read/route.ts — POST (marquer comme lu)
   src/app/api/ao/[aoId]/documents/zip/route.ts — GET (générer zip de tous les docs)

2. Upload vers Supabase Storage :
   - Bucket "dce-documents" avec RLS : accessible uniquement aux membres de l'agence et aux entreprises invitées à cet AO
   - Génération d'URL présignées (expiration 1h) pour l'accès aux fichiers
   - Versionning : si un fichier du même nom existe, incrémenter la révision

3. Page DCE architecte :
   src/app/(shell)/(modules)/dpgf/[projectId]/dce/page.tsx
   - Zone d'upload drag & drop
   - Documents groupés par catégorie (Plans / CCTP / Notices / Photos / Divers)
   - Tableau : nom, révision, taille, date, nb lectures par entreprise
   - Badge OBLIGATOIRE sur les docs marqués obligatoires

4. Page DCE portail entreprise :
   src/app/portal/[aoId]/plans/page.tsx
   - Liste des documents avec visionneuse PDF intégrée (react-pdf)
   - Marquer comme lu automatiquement à l'ouverture
   - Badge "Nouveau" si révision récente (< 24h)
   - Bouton télécharger tout en zip

MODULE Q&A :

5. Routes API :
   src/app/api/ao/[aoId]/qa/route.ts — GET / POST
   src/app/api/ao/[aoId]/qa/[qaId]/route.ts — PATCH (changer visibilité)
   src/app/api/ao/[aoId]/qa/[qaId]/answer/route.ts — POST (répondre)

6. Page Q&A architecte :
   src/app/(shell)/(modules)/dpgf/[projectId]/qa/page.tsx
   - Liste toutes les questions, filtrables par statut / visibilité / entreprise
   - Interface de réponse inline
   - Bouton changer visibilité (privée → publique)

7. Page Q&A portail :
   src/app/portal/[aoId]/questions/page.tsx
   - Formulaire de question (titre, corps, visibilité, ref poste optionnel)
   - Liste des Q&A publics (avec nom de l'émetteur masqué)
   - Ses propres Q&A privés

ESPACE CLIENT :

8. Routes API :
   src/app/api/client/[projectId]/consultation/route.ts
   - GET : retourne uniquement les données publiables selon clientPublished et publishedElements
   - PATCH : (architecte uniquement) publier/dépublier des éléments

9. Layout client :
   src/app/client/layout.tsx — topbar simplifiée "Espace client"

10. Page client :
    src/app/client/[projectId]/page.tsx
    - Countdown deadline
    - Métriques : nb entreprises, nb offres reçues, estimatif archi par lot
    - Avancement anonymisé par entreprise
    - Section "Analyse" : verrouillée jusqu'à publication par l'architecte

11. Interface de publication (côté architecte) :
    Dans le dashboard analyse (sprint S09) : bouton "Publier au client"
    Dialog avec checkboxes : Synthèse / Tableau simplifié / Entreprises retenues / Recommandations / PDF

À LA FIN :
- Uploader un document DCE, le voir côté portail entreprise
- Poser une question en tant qu'entreprise, y répondre en tant qu'architecte
- L'espace client affiche l'avancement anonymisé
- npx tsc --noEmit sans erreur
```

---

## Sprint S09 — Dashboard analyse des offres

**Durée estimée** : 3h
**Prérequis** : S08 terminé

---

### MISSION CLAUDE CODE — S09

```
Lis CLAUDE.md avant de commencer.

OBJECTIF : Dashboard de comparaison des offres — le module le plus différenciant.

ÉTAPES :

1. Route API :
   src/app/api/ao/[aoId]/analysis/route.ts
   - GET : retourne toutes les offres avec leurs postes
   - Calcule côté serveur : min/max par poste, écart vs estimatif, divergences de métrés
   - Ne jamais retourner les données d'une entreprise à une autre entreprise

2. Page dashboard :
   src/app/(shell)/(modules)/dpgf/[projectId]/analyse/page.tsx

3. StatsBar analyse (4 cartes) :
   - Estimatif archi total
   - Offre la plus basse (+ % vs estimatif)
   - Offre la plus haute (+ % vs estimatif)
   - Écart min/max

4. Alerte divergences de métrés :
   - Banner orange si des entreprises ont proposé des quantités différentes
   - Lien vers la section de détail

5. Graphique comparaison totaux (Recharts) :
   - Barres groupées : estimatif + offre de chaque entreprise
   - Couleur : gris pour estimatif, vert pour la moins chère, rouge si > estimatif + 15%
   - Légende propre

6. Tableau comparatif (TanStack Table) :
   - Colonnes fixes : Intitulé, Qté, Estimatif
   - Colonnes dynamiques : une par entreprise (prix unit + total)
   - Colonnes calculées : Min / Max / Écart
   - Surligné en vert = prix minimum de la ligne
   - Surligné en rouge = prix maximum de la ligne
   - Icône ⚠ orange sur les postes avec divergence de métrés
   - Filtrable par lot (select dropdown)
   - Triable par total entreprise (croissant / décroissant)

7. Panel sélection entreprises :
   - Card par entreprise : nom, total offre, boutons "Sélectionner" / "Retenue ✓" / "Écarter"
   - Note interne par entreprise (textarea)
   - Entreprise retenue : card mise en avant avec bordure verte

8. Génération rapport PDF :
   src/lib/generate-report.tsx (React-PDF)
   - Page de garde : nom projet, date, architecte
   - Tableau comparatif complet
   - Section divergences de métrés
   - Entreprises retenues avec justification
   - Route API : src/app/api/ao/[aoId]/report/route.ts

9. Publication au client (dialog) :
   Bouton "Publier au client" → Dialog avec checkboxes → PATCH /api/client/[projectId]/consultation

À LA FIN :
- Le dashboard s'affiche avec les données seed des 3 entreprises test
- Les cellules min/max sont bien colorées
- Le rapport PDF se génère et se télécharge
- La publication au client fonctionne (vérifier côté espace client)
- npx tsc --noEmit sans erreur
```

---

## Sprint S10 — Import IA + Stripe + Emails + Finalisation

**Durée estimée** : 4-5h
**Prérequis** : S09 terminé, clés API Anthropic et Stripe configurées

---

### MISSION CLAUDE CODE — S10

```
Lis CLAUDE.md avant de commencer.

OBJECTIF : Import DPGF par IA, paiements Stripe et finalisation production.

IMPORT IA :

1. Route API d'upload et d'analyse :
   src/app/api/ai-import/route.ts — POST : reçoit le fichier, l'envoie à l'IA
   src/app/api/ai-import/[importId]/route.ts — GET : statut de l'import

2. Logique d'import (src/lib/ai-import.ts) :
   - Détecter le type de fichier (xlsx/csv → Claude texte, PDF → Claude vision)
   - Pour Excel/CSV : lire avec SheetJS, convertir en texte tabulaire, envoyer à Claude
   - Pour PDF : convertir en base64, envoyer comme image à Claude claude-sonnet-4-6
   - Prompt système EXACT (voir CDC v3 section B3.2) :
     * Retourner uniquement du JSON
     * Format : { lots: [{ name, sublots: [{ name, posts: [{ title, qty, unit, unit_price, confidence }] }] }] }
     * confidence : score 0-100 par champ
     * null si valeur incertaine (jamais inventer)
   - Si traitement > 30s → Upstash QStash pour traitement asynchrone + notification

3. Page de vérification :
   src/app/(shell)/(modules)/dpgf/[projectId]/import/page.tsx
   - Tableau de prévisualisation avec les données extraites
   - Champs à faible confiance (< 80%) surlignés en orange avec tooltip
   - Score de confiance global affiché en haut
   - Édition directe dans le tableau de prévisualisation
   - Bouton "Relancer l'analyse" si résultat insuffisant
   - Bouton "Importer dans ma DPGF" → insère les données + propose sauvegarde bibliothèque

4. Dialog upload :
   src/components/dpgf/ImportDialog.tsx
   - Zone drag & drop
   - Formats acceptés : .xlsx, .xls, .csv, .pdf
   - Max 20 Mo
   - Spinner "Analyse IA en cours..." pendant le traitement

STRIPE :

5. Abonnements architecte :
   src/app/api/stripe/checkout/route.ts — créer une session de paiement abonnement
   src/app/api/stripe/portal/route.ts — rediriger vers le portail client Stripe
   src/app/api/webhooks/stripe/route.ts — gérer les événements Stripe (paiement réussi, annulation)
   src/app/(shell)/settings/billing/page.tsx — page de gestion abonnement

6. AO payant pour entreprises :
   Avant l'accès au portail : vérifier isPaid + paymentStatus
   Si AO payant et non payé → redirection vers Stripe Checkout

EMAILS — COMPLÉTION :

7. Compléter tous les templates emails manquants :
   src/emails/OfferSubmittedEmail.tsx — confirmation à l'entreprise
   src/emails/ReminderEmail.tsx — relance J-7 et J-3
   src/emails/DocumentUpdatedEmail.tsx — nouveau document DCE
   src/emails/QAAnswerEmail.tsx — réponse à une question
   src/emails/AnalysisPublishedEmail.tsx — analyse publiée au client
   src/emails/CompanySelectedEmail.tsx — entreprise retenue/non retenue

8. Job de relance automatique (Upstash QStash) :
   src/app/api/jobs/reminders/route.ts
   - Déclenché quotidiennement par QStash
   - Envoie les relances J-7 et J-3 aux entreprises sans offre

FINALISATION :

9. Gestion des erreurs globale :
   src/app/error.tsx — page d'erreur globale Next.js
   src/app/not-found.tsx — page 404

10. Variables d'environnement production :
    Créer .env.example complet et à jour

11. Déploiement Vercel :
    - Configurer les variables d'environnement dans Vercel
    - Configurer le webhook Stripe pour l'URL de production
    - npx prisma migrate deploy (migration production)

12. Tests finaux :
    Parcours complet de bout en bout :
    ✓ Créer un compte architecte
    ✓ Créer un projet + une DPGF
    ✓ Importer une DPGF depuis Excel via IA
    ✓ Lancer un AO + inviter des entreprises
    ✓ Se connecter en tant qu'entreprise + soumettre une offre
    ✓ Consulter le dashboard d'analyse
    ✓ Publier l'analyse au client
    ✓ Vérifier l'espace client

À LA FIN :
- L'application est déployée sur Vercel
- URL de production fonctionnelle
- npx tsc --noEmit sans erreur
- Tous les emails arrivent correctement
```

---

## Récapitulatif des sprints

| # | Objectif | Durée est. | Difficulté |
|---|----------|-----------|------------|
| S01 | Setup + Auth | 1-2h | ⭐⭐ |
| S02 | Base de données + Seed | 1h | ⭐⭐ |
| S03 | DPGF CRUD API | 2-3h | ⭐⭐⭐ |
| S04 | Tableau éditeur DPGF | 3-4h | ⭐⭐⭐⭐⭐ |
| S05 | Bibliothèque intitulés | 1-2h | ⭐⭐ |
| S06 | Appel d'offre + invitations | 3-4h | ⭐⭐⭐⭐ |
| S07 | Portail entreprise | 3-4h | ⭐⭐⭐⭐ |
| S08 | DCE + Q&A + Espace client | 3-4h | ⭐⭐⭐ |
| S09 | Dashboard analyse | 3h | ⭐⭐⭐⭐ |
| S10 | IA + Stripe + Déploiement | 4-5h | ⭐⭐⭐⭐ |
| S11–S15 | UX/fixes, waitlist, admin, prod | — | — |
| S16 | Responsive mobile complet | 2-3h | ⭐⭐⭐ |
| **Total** | | **~27-38h** | |

---

## Conseils pour travailler avec Claude Code

**Avant chaque sprint :**
- Vérifie que le sprint précédent est vraiment terminé (`npm run dev` sans erreur)
- Mets à jour le tableau d'avancement dans CLAUDE.md

**Pendant le sprint :**
- Si Claude Code bloque sur un point, reformule la demande plus précisément
- Si une erreur TypeScript persiste, donne le message d'erreur exact à Claude Code
- Ne passe jamais au sprint suivant avec des erreurs TypeScript non résolues

**Si quelque chose ne marche pas :**
- Copie l'erreur exacte et demande à Claude Code de la corriger
- Utilise `npx prisma studio` pour vérifier les données en base
- Vérifie les logs dans le terminal Next.js (le serveur de dev)

**Commits Git :**
Après chaque sprint fonctionnel :
```bash
git add .
git commit -m "Sprint S0X terminé — [description courte]"
git push
```
