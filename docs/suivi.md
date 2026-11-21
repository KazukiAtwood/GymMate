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
