# Suivi des jalons

## J5 · Identifier

Compte utilisable : inscription, connexion, déconnexion et profil sportif enregistré dans Firestore.

### Ce qui fonctionne

- Inscription avec nom, e-mail, mot de passe et confirmation. Le bouton reste inactif pendant l'envoi.
- Création de `users/{uid}` avec `gymId: null`, puis complétion du profil sportif.
- Si le compte est créé mais que le document profil échoue, l'utilisateur reprend le formulaire sans nouvelle inscription.
- Connexion, restauration de session au lancement, et déconnexion qui retire l'accès aux écrans privés.
- Le profil est prérempli depuis Firestore et réenregistré avec `updateDoc`.
- Un profil incomplet reste sur le formulaire. Un profil complet ouvre les onglets.
- Le choix de salle reste pour le J6 : `gymId` reste `null` et n'est pas modifiable.

### Test réalisé

Vérification TypeScript du projet (`npx tsc --noEmit`).

Parcours à refaire sur l'appareil, avec `.env.local` renseigné et `firestore.rules` publié :

1. Créer le compte A (Lina) et enregistrer un profil complet.
2. Fermer puis rouvrir l'application : la session et le profil sont toujours là.
3. Se déconnecter, puis se reconnecter avec un mauvais mot de passe : message générique, formulaire à nouveau utilisable.
4. Depuis le profil, se déconnecter : l'accueil s'affiche, et un lien direct vers Découvrir ne reste pas ouvert.

### Difficulté

Les règles Firestore du dépôt doivent être publiées dans la console. Tant qu'elles ne le sont pas, l'enregistrement du profil est refusé et l'écran l'indique.

## J6 · Découvrir

Choix d'une salle, puis lecture des autres membres de cette salle.

### Ce qui fonctionne

- Les salles sont lues depuis `gyms` et filtrées localement par nom ou ville.
- La confirmation enregistre `users/{uid}.gymId` une seule fois. Le document de salle doit exister et le profil sportif doit être complet.
- Découvrir charge les profils `where gymId ==` la salle courante et retire le compte connecté.
- La fiche membre affiche les informations sportives. Un membre d'une autre salle est refusé par les règles.
- Une salle vide propose un message et un rechargement.

### Test réalisé

Vérification TypeScript (`npx tsc --noEmit`).

À refaire avec deux comptes après publication des règles :

1. A et B choisissent Campus Gym SQY. C choisit Campus Training Paris.
2. A voit B dans Découvrir, pas son propre profil, pas C.
3. A ouvre la fiche de B. Un accès direct au profil de C est refusé.
4. Le profil de A affiche le nom de la salle choisie.

### Difficulté

Les règles du J5 refusaient encore tout `gymId` non nul. Elles sont mises à jour dans `firestore.rules` et doivent être republiées avant le choix de salle.
