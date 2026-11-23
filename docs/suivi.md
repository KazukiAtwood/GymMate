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

## J7 · Demander

Envoi d'une demande d'entraînement et listes reçues / envoyées.

### Ce qui fonctionne

- Depuis la fiche d'un membre de la même salle, on propose un sport, une date et un créneau.
- Le document `trainingRequests` est créé avec le statut `pending`, les deux participants et `timeZone: Europe/Paris`.
- Une nouvelle tentative du même envoi réutilise le même identifiant.
- L'onglet Demandes sépare Reçues et Envoyées, avec le badge En attente, Acceptée ou Refusée.
- Les règles n'autorisent la lecture qu'aux deux participants. Accepter ou refuser reste le J8.

### Test à faire

Après publication des règles : Patrick propose à Sami Musculation demain de 18:00 à 19:00. La demande apparaît dans Envoyées chez Patrick et dans Reçues chez Sami. Une date passée est refusée. Un deuxième appui ne crée pas une deuxième demande.

## J8 · Relier

Accepter une demande crée, dans une seule transaction, la relation, le chat et la séance. Refuser ne change que la demande.

### Ce qui fonctionne

- Le destinataire accepte ou refuse une demande encore `pending`.
- L'acceptation lit la demande et la relation, puis écrit le statut `accepted`, `relations/{pairId}`, `chats/{pairId}` et `trainingSessions/{requestId}`.
- `pairId` est le couple d'UID trié, joint par `__`. Une deuxième séance entre les mêmes personnes réutilise la relation et le chat.
- Une acceptation déjà enregistrée ne crée pas une deuxième séance. Un créneau passé ne peut plus être accepté.
- Un refus passe la demande à `rejected` et laisse une relation déjà existante inchangée.
- Mes relations liste les partenaires et ouvre le chat. Mes séances sépare À venir et Historique.
- Un participant peut annuler une séance planifiée, ou la marquer terminée après l'heure de fin.

### Test à faire

Après republication de `firestore.rules` :

1. Sami refuse une demande de Patrick : statut Refusée, rien dans Relations ni Séances.
2. Sami accepte une autre demande : une relation, un chat et une séance visibles des deux côtés.
3. Un deuxième appui sur Accepter ne crée pas une autre séance.
4. Une nouvelle demande acceptée ajoute une séance et conserve la même relation.
5. Patrick annule la séance : Sami voit Annulée dans Historique après actualisation.

### Difficulté

Les règles doivent être republiées. L'envoi des messages du chat reste le J9 : la conversation s'ouvre et n'a pas encore de saisie.
