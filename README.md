# GymMate

GymMate aide les membres d'une même salle à trouver un partenaire et à préparer une séance : profil sportif, salle, demande, acceptation ou refus, relation, séance et chat.

Le parcours obligatoire relie deux comptes de la même salle. Un troisième compte, dans une autre salle, sert à vérifier que les données des deux premiers restent inaccessibles.

## Fonctionnalités réalisées

- Inscription, connexion, restauration de session et déconnexion.
- Profil sportif enregistré dans Firestore, avec reprise si le compte existe déjà mais que le profil n'est pas encore écrit.
- Choix d'une salle une seule fois, puis liste des autres membres de cette salle et fiche détaillée.
- Demande d'entraînement, acceptation ou refus. L'acceptation crée dans une seule transaction la relation, le chat et la séance.
- Séances à venir et historique : annulation, ou séance marquée terminée après l'heure de fin.
- Messages en temps réel, limités aux deux membres de la relation.
- Règles d'accès dans `firestore.rules`.
- Au-delà du socle : position et tri des salles par distance, photo de profil conservée sur le téléphone, rappel local, ajout au calendrier du téléphone, thème clair ou sombre.

La photo n'est pas envoyée à Firebase Storage. Elle reste dans les fichiers de l'application.

## Versions

Relevées dans `package-lock.json` le 24 novembre 2026.

| Outil | Version |
| --- | --- |
| Node.js | 26.13.1 |
| npm | 12.2.3 |
| Expo | 57.0.23 |
| Expo Router | 57.0.21 |
| React Native | 0.86.3 |
| React | 19.2.3 |
| Firebase JS | 13.0.0 |
| TypeScript | 6.0.3 |
| AsyncStorage | 2.2.0 |

L'application se lance avec Expo Go compatible SDK 57, ou dans le navigateur avec `npx expo start`.

## Installation

```bash
npm install
```

Puis copier l'exemple d'environnement :

```bash
copy .env.example .env.local
```

Renseigner `.env.local`. Ce fichier est ignoré par Git. Aucune clé d'administration ne doit être ajoutée au dépôt.

## Configuration Firebase

Créer un projet Firebase et une application Web. Activer Authentication avec Email/Mot de passe. Créer Firestore avec des règles fermées au départ, puis publier le fichier `firestore.rules` du dépôt.

Variables attendues :

| Console Firebase | Variable |
| --- | --- |
| apiKey | `EXPO_PUBLIC_FIREBASE_API_KEY` |
| authDomain | `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` |
| projectId | `EXPO_PUBLIC_FIREBASE_PROJECT_ID` |
| appId | `EXPO_PUBLIC_FIREBASE_APP_ID` |

Dans Firestore, créer les trois salles avant les essais. Les adresses doivent être fictives.

| Identifiant | Nom | Ville |
| --- | --- | --- |
| `gym_sqy` | Campus Gym SQY | Guyancourt |
| `gym_versailles` | Studio Forme Versailles | Versailles |
| `gym_paris` | Campus Training Paris | Paris |

Chaque document de salle contient `name`, `city`, `address` et `createdAt`. Les coordonnées utilisées pour le tri par distance sont dans l'application : SQY 48,77 / 2,08 et Paris 48,86 / 2,35.

Noter dans ce README la localisation choisie pour Firestore au moment de la création de la base. Elle n'est pas dans le code.

Aucun index composite n'est requis : les listes de demandes, relations et séances sont filtrées sur un seul champ, puis triées dans l'application. Les messages utilisent `orderBy(createdAt)`, indexé automatiquement.

Après chaque changement de `.env.local` ou de règles, relancer Expo et republier les règles dans la console.

## Comptes de test

Les comptes se créent dans l'application. Il ne faut pas coller un document `users` à la main : l'identifiant doit être celui d'Authentication.

| Rôle | Exemple | Salle | Niveau | Objectif |
| --- | --- | --- | --- | --- |
| A | Lina | Campus Gym SQY | Débutant | Remise en forme |
| B | Sami | Campus Gym SQY | Intermédiaire | Régularité |
| C | Nora | Campus Training Paris | Débutant | Cardio |

Compléter le profil, choisir la salle, puis suivre `docs/tests.md`.

## Lancement

```bash
npx expo start
```

Ouvrir le projet dans Expo Go, ou appuyer sur `w` pour le navigateur. Le rappel, la photo locale et le calendrier se vérifient sur le téléphone.

## Dossier docs

- `docs/suivi.md` : ce qui a été réalisé à chaque jalon.
- `docs/modele-donnees.md` : collections et champs.
- `docs/limites.md` : limites connues.
- `docs/tests.md` : recette T01 à T12, exécutée sur l'émulateur le 24 novembre 2026. T12 reste partiel.

Les captures d'écran et les captures Firestore se déposent dans `docs/captures/` après la recette. Elles ne sont pas encore dans le dépôt.

## Structure

Les écrans sont dans `src/app`. Les accès Firebase sont dans `src/services`. Les types et les validations sont dans `src/types` et `src/utils`.
